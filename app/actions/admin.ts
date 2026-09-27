"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/access";
import { firstIssue } from "@/lib/actions";
import { formBoolean, formText, normalizeDomain, normalizeWhatsAppNumber, slugify, tenantCreateSchema } from "@/lib/validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/actions";
import { uploadTenantAsset } from "@/lib/assets";

const idSchema = z.string().uuid();

async function ensureOwnerAccount(email: string) {
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,email").eq("email", email).maybeSingle();
  if (profile) return { id: profile.id, invited: false };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) throw new Error("Configure NEXT_PUBLIC_SITE_URL para enviar convites.");
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${baseUrl.replace(/\/$/, "")}/auth/confirm?next=/update-password`,
  });
  if (error || !data.user) throw new Error("Não foi possível enviar o convite. Confira o e-mail e o SMTP do Supabase.");
  return { id: data.user.id, invited: true };
}

export async function createTenantAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requirePlatformAdmin();
  const parsed = tenantCreateSchema.safeParse({
    name: formText(formData, "name"),
    slug: slugify(formText(formData, "slug") || formText(formData, "name")),
    owner_email: formText(formData, "owner_email"),
    domain: formText(formData, "domain"),
    whatsapp_number: formText(formData, "whatsapp_number"),
    tenant_type: formText(formData, "tenant_type") || "retail",
    storefront_template: formText(formData, "storefront_template") || "essentials",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error.issues) };

  let ownerInvited = false;
  try {
    const owner = await ensureOwnerAccount(parsed.data.owner_email);
    ownerInvited = owner.invited;
    const tenantId = crypto.randomUUID();
    const logo = await uploadTenantAsset(createSupabaseAdminClient(), formData.get("logo"), tenantId, "logo");
    if (logo.error) return { error: logo.error };
    const { error } = await supabase.from("tenants").insert({
      id: tenantId,
      owner_id: owner.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      domain: parsed.data.domain,
      whatsapp_number: parsed.data.whatsapp_number,
      tenant_type: parsed.data.tenant_type,
      storefront_template: parsed.data.storefront_template,
      active: true,
      primary_color: "#183F36",
      secondary_color: "#D6ED74",
      logo_url: logo.url,
    });
    if (error && logo.path) await createSupabaseAdminClient().storage.from("store-assets").remove([logo.path]);
    if (error?.code === "23505") return { error: "Esse slug ou domínio já está em uso." };
    if (error) return { error: "Não foi possível criar a loja. Confira os dados." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível criar a loja." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tenants");
  redirect(`/admin/tenants?created=${ownerInvited ? "invited" : "existing"}`);
}

export async function updateTenantAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Loja inválida." };
  const name = formText(formData, "name").trim();
  const slug = slugify(formText(formData, "slug"));
  const email = formText(formData, "owner_email").trim().toLowerCase();
  const rawDomain = formText(formData, "domain").trim();
  const domain = rawDomain ? normalizeDomain(rawDomain) : null;
  const rawWhatsApp = formText(formData, "whatsapp_number").trim();
  const whatsapp = rawWhatsApp ? normalizeWhatsAppNumber(rawWhatsApp) : null;
  if (rawWhatsApp && !whatsapp) return { error: "Informe um número internacional válido, com 8 a 15 dígitos." };
  const errors = z.object({
    name: z.string().min(2).max(80),
    slug: z.string().min(2).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine((value) => !["admin", "dashboard", "login", "update-password", "auth", "_next"].includes(value)),
    email: z.string().email(),
    domain: z.string().max(253).regex(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/).nullable(),
    whatsapp: z.string().max(15).nullable(),
    tenant_type: z.enum(["retail", "food", "services"]),
    storefront_template: z.enum(["technology", "nature", "sports", "essentials"]),
  }).safeParse({ name, slug, email, domain, whatsapp, tenant_type: formText(formData, "tenant_type"), storefront_template: formText(formData, "storefront_template") });
  if (!errors.success) return { error: firstIssue(errors.error.issues) };

  try {
    const owner = await ensureOwnerAccount(email);
    const logo = await uploadTenantAsset(createSupabaseAdminClient(), formData.get("logo"), id.data, "logo");
    if (logo.error) return { error: logo.error };
    const { error } = await supabase.from("tenants").update({
      name, slug, owner_id: owner.id, domain, whatsapp_number: whatsapp,
      tenant_type: errors.data.tenant_type,
      storefront_template: errors.data.storefront_template,
      active: formBoolean(formData.get("active")),
      ...(logo.url ? { logo_url: logo.url } : {}),
    }).eq("id", id.data);
    if (error && logo.path) await createSupabaseAdminClient().storage.from("store-assets").remove([logo.path]);
    if (error?.code === "23505") return { error: "Esse slug ou domínio já está em uso." };
    if (error?.code === "23514") return { error: "Antes de trocar o tipo, converta os itens incompatíveis com o novo negócio." };
    if (error) return { error: "Não foi possível atualizar a loja." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível atualizar a loja." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${id.data}`);
  return { success: "Loja atualizada." };
}

export async function toggleTenantAction(formData: FormData) {
  const { supabase } = await requirePlatformAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const active = formBoolean(formData.get("active"));
  if (!id.success) return;
  await supabase.from("tenants").update({ active: !active }).eq("id", id.data);
  revalidatePath("/admin");
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${id.data}`);
}
