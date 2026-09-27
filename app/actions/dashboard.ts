"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/access";
import { isTenantAssetUrl } from "@/lib/assets";
import { firstIssue, type ActionState } from "@/lib/actions";
import { formBoolean, formText, productSchema, categorySchema, tenantSettingsSchema, slugify } from "@/lib/validation";
import { parsePriceInput } from "@/lib/input-formatting";

const uuidSchema = z.string().uuid();

export async function saveProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, tenant } = await requireTenant();
  const idValue = formText(formData, "id");
  const id = idValue ? uuidSchema.safeParse(idValue) : null;
  if (id && !id.success) return { error: "Produto inválido." };

  let detailSections: unknown;
  try { detailSections = JSON.parse(formText(formData, "detail_sections")); }
  catch { return { error: "As seções de informações adicionais estão inválidas." }; }
  let attributes: unknown;
  try { attributes = JSON.parse(formText(formData, "attributes")); }
  catch { return { error: "Os atributos do produto estão inválidos." }; }
  const parsed = productSchema.safeParse({
    name: formText(formData, "name"),
    description: formText(formData, "description"),
    price: parsePriceInput(formText(formData, "price")),
    card_price: parsePriceInput(formText(formData, "card_price")),
    category_id: formText(formData, "category_id") || null,
    active: formBoolean(formData.get("active")),
    availability: formText(formData, "availability"),
    product_condition: formText(formData, "product_condition"),
    stock_quantity: formText(formData, "stock_quantity") === "" ? null : Number(formText(formData, "stock_quantity")),
    featured: formBoolean(formData.get("featured")),
    highlights: formText(formData, "highlights").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    detail_sections: detailSections,
    attributes,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error.issues) };

  const current = id?.success
    ? await supabase.from("products").select("id,image_url,image_urls").eq("tenant_id", tenant.id).eq("id", id.data).maybeSingle()
    : { data: null, error: null };
  if (id?.success && (!current.data || current.error)) return { error: "Produto não encontrado nesta loja." };

  let slug = slugify(parsed.data.name) || `produto-${crypto.randomUUID().slice(0, 8)}`;
  const { data: collision } = await supabase.from("products").select("id").eq("tenant_id", tenant.id).eq("slug", slug).maybeSingle();
  if (collision && collision.id !== (id?.success ? id.data : null)) {
    slug = `${slug.slice(0, 38)}-${crypto.randomUUID().slice(0, 8)}`;
  }

  let retainedImageUrls: string[] = [];
  let imageListWasSubmitted = false;
  try {
    const rawImages = formText(formData, "image_urls");
    if (rawImages) {
      const parsedImages = JSON.parse(rawImages);
      if (!Array.isArray(parsedImages) || !parsedImages.every((url) => typeof url === "string")) {
        return { error: "A lista de fotos do produto está inválida." };
      }
      if (parsedImages.length > 8) return { error: "Um produto pode ter no máximo 8 fotos." };
      retainedImageUrls = parsedImages;
      imageListWasSubmitted = true;
    }
  } catch { return { error: "A lista de fotos do produto está inválida." }; }
  if (!imageListWasSubmitted && current.data) retainedImageUrls = current.data.image_urls?.length ? current.data.image_urls : current.data.image_url ? [current.data.image_url] : [];
  if (!retainedImageUrls.every((url) => isTenantAssetUrl(url, tenant.id, "products"))) {
    return { error: "Uma das fotos não pertence ao armazenamento desta loja. Selecione as imagens novamente." };
  }
  const imageUrls = retainedImageUrls;
  const values = {
    tenant_id: tenant.id,
    category_id: parsed.data.category_id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    price: parsed.data.price,
    card_price: parsed.data.card_price,
    image_url: imageUrls[0] ?? null,
    image_urls: imageUrls,
    availability: parsed.data.availability,
    product_condition: parsed.data.product_condition,
    stock_quantity: parsed.data.stock_quantity,
    featured: parsed.data.featured,
    highlights: parsed.data.highlights,
    detail_sections: parsed.data.detail_sections,
    attributes: parsed.data.attributes,
    active: parsed.data.active,
  };

  const { error } = id?.success
    ? await supabase.from("products").update(values).eq("tenant_id", tenant.id).eq("id", id.data)
    : await supabase.from("products").insert(values);
  if (error) {
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

export async function toggleCategoryAction(formData: FormData) {
  const { supabase, tenant } = await requireTenant();
  const id = uuidSchema.safeParse(formData.get("id"));
  const active = formBoolean(formData.get("active"));
  if (!id.success) return;
  await supabase.from("categories").update({ active: !active }).eq("tenant_id", tenant.id).eq("id", id.data);
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/products");
}

export async function saveSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, tenant } = await requireTenant();
  const rawWhatsApp = formText(formData, "whatsapp_number").trim();
  let rawConfig = formText(formData, "storefront_config");
  try {
    const config = JSON.parse(rawConfig);
    if (config?.footer && typeof config.footer === "object") config.footer.cnpj = formText(formData, "footer_cnpj");
    rawConfig = JSON.stringify(config);
  } catch { return { error: "As configurações visuais estão inválidas." }; }
  const parsed = tenantSettingsSchema.safeParse({
    name: formText(formData, "name"),
    storefront_template: formText(formData, "storefront_template"),
    storefront_config: rawConfig,
    whatsapp_number: rawWhatsApp,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error.issues) };
  const logoUrl = formText(formData, "logo_url").trim() || null;
  const storefrontConfig = parsed.data.storefront_config;
  if (logoUrl && !isTenantAssetUrl(logoUrl, tenant.id, "logo")) return { error: "A logo informada não pertence ao armazenamento desta loja." };
  if (!storefrontConfig.hero.image_urls.every((url) => isTenantAssetUrl(url, tenant.id, "banners"))) {
    return { error: "Uma das imagens do banner não pertence ao armazenamento desta loja." };
  }
  if (storefrontConfig.sections.about.image_url && !isTenantAssetUrl(storefrontConfig.sections.about.image_url, tenant.id, "about")) {
    return { error: "A imagem da seção Sobre não pertence ao armazenamento desta loja." };
  }
  const { error } = await supabase.from("tenants").update({
    name: parsed.data.name,
    storefront_template: parsed.data.storefront_template,
    storefront_config: storefrontConfig,
    whatsapp_number: parsed.data.whatsapp_number,
    logo_url: logoUrl,
  }).eq("id", tenant.id);
  if (error) return { error: "Não foi possível salvar as configurações." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath(`/${tenant.slug}`);
  return { success: "Configurações salvas." };
}
