"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/access";
import { uploadTenantAsset } from "@/lib/assets";
import { firstIssue, type ActionState } from "@/lib/actions";
import { formBoolean, formText, productSchema, categorySchema, tenantSettingsSchema, slugify } from "@/lib/validation";

const uuidSchema = z.string().uuid();

export async function saveProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, tenant } = await requireTenant();
  const idValue = formText(formData, "id");
  const id = idValue ? uuidSchema.safeParse(idValue) : null;
  if (id && !id.success) return { error: "Produto inválido." };

  const parsed = productSchema.safeParse({
    name: formText(formData, "name"),
    description: formText(formData, "description"),
    price: formText(formData, "price"),
    category_id: formText(formData, "category_id") || null,
    active: formBoolean(formData.get("active")),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error.issues) };

  const current = id?.success
    ? await supabase.from("products").select("id,image_url").eq("tenant_id", tenant.id).eq("id", id.data).maybeSingle()
    : { data: null, error: null };
  if (id?.success && (!current.data || current.error)) return { error: "Produto não encontrado nesta loja." };

  let slug = slugify(parsed.data.name) || `produto-${crypto.randomUUID().slice(0, 8)}`;
  const { data: collision } = await supabase.from("products").select("id").eq("tenant_id", tenant.id).eq("slug", slug).maybeSingle();
  if (collision && collision.id !== (id?.success ? id.data : null)) {
    slug = `${slug.slice(0, 38)}-${crypto.randomUUID().slice(0, 8)}`;
  }

  const uploaded = await uploadTenantAsset(supabase, formData.get("image"), tenant.id, "products");
  if (uploaded.error) return { error: uploaded.error };
  const imageUrl = uploaded.url ?? current.data?.image_url ?? null;
  const values = {
    tenant_id: tenant.id,
    category_id: parsed.data.category_id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    price: parsed.data.price,
    image_url: imageUrl,
    active: parsed.data.active,
  };

  const { error } = id?.success
    ? await supabase.from("products").update(values).eq("tenant_id", tenant.id).eq("id", id.data)
    : await supabase.from("products").insert(values);
  if (error) {
    if (uploaded.path) await supabase.storage.from("store-assets").remove([uploaded.path]);
    return { error: "Não foi possível salvar o produto. Confira a categoria e tente novamente." };
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
  return { success: "Produto salvo com sucesso." };
}

export async function deleteProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, tenant } = await requireTenant();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Produto inválido." };
  const { error } = await supabase.from("products").delete().eq("tenant_id", tenant.id).eq("id", id.data);
  if (error) return { error: "Não foi possível excluir o produto." };
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
  return { success: "Produto excluído." };
}

export async function saveCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, tenant } = await requireTenant();
  const idValue = formText(formData, "id");
  const id = idValue ? uuidSchema.safeParse(idValue) : null;
  if (id && !id.success) return { error: "Categoria inválida." };
  const parsed = categorySchema.safeParse({
    name: formText(formData, "name"),
    active: formBoolean(formData.get("active")),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error.issues) };

  let slug = slugify(parsed.data.name) || `categoria-${crypto.randomUUID().slice(0, 8)}`;
  const { data: collision } = await supabase.from("categories").select("id").eq("tenant_id", tenant.id).eq("slug", slug).maybeSingle();
  if (collision && collision.id !== (id?.success ? id.data : null)) {
    slug = `${slug.slice(0, 38)}-${crypto.randomUUID().slice(0, 8)}`;
  }

  const values = { tenant_id: tenant.id, name: parsed.data.name, slug, active: parsed.data.active };
  const { error } = id?.success
    ? await supabase.from("categories").update(values).eq("tenant_id", tenant.id).eq("id", id.data)
    : await supabase.from("categories").insert(values);
  if (error) return { error: "Não foi possível salvar a categoria." };
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  return { success: "Categoria salva." };
}

export async function deleteCategoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, tenant } = await requireTenant();
  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Categoria inválida." };

  const detached = await supabase.from("products").update({ category_id: null })
    .eq("tenant_id", tenant.id).eq("category_id", id.data);
  if (detached.error) return { error: "Não foi possível atualizar os produtos desta categoria." };
  const { error } = await supabase.from("categories").delete().eq("tenant_id", tenant.id).eq("id", id.data);
  if (error) return { error: "Não foi possível excluir a categoria." };
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
  return { success: "Categoria excluída. Os produtos foram mantidos sem categoria." };
}

export async function saveSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, tenant } = await requireTenant();
  const rawWhatsApp = formText(formData, "whatsapp_number").trim();
  const parsed = tenantSettingsSchema.safeParse({
    name: formText(formData, "name"),
    primary_color: formText(formData, "primary_color"),
    secondary_color: formText(formData, "secondary_color"),
    whatsapp_number: rawWhatsApp,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error.issues) };

  const uploaded = await uploadTenantAsset(supabase, formData.get("logo"), tenant.id, "logo");
  if (uploaded.error) return { error: uploaded.error };
  const { error } = await supabase.from("tenants").update({
    name: parsed.data.name,
    primary_color: parsed.data.primary_color,
    secondary_color: parsed.data.secondary_color,
    whatsapp_number: parsed.data.whatsapp_number,
    ...(uploaded.url ? { logo_url: uploaded.url } : {}),
  }).eq("id", tenant.id);
  if (error) {
    if (uploaded.path) await supabase.storage.from("store-assets").remove([uploaded.path]);
    return { error: "Não foi possível salvar as configurações." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath(`/${tenant.slug}`);
  return { success: "Configurações salvas." };
}
