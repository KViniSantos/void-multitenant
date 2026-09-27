"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/access";
import { uploadTenantAsset, uploadTenantAssets } from "@/lib/assets";
import { firstIssue, type ActionState } from "@/lib/actions";
import { formBoolean, formText, productSchema, categorySchema, tenantSettingsSchema, slugify } from "@/lib/validation";
import { parsePriceInput } from "@/lib/input-formatting";

const uuidSchema = z.string().uuid();

export async function saveProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, tenant } = await requireTenant();
  const idValue = formText(formData, "id");
  const id = idValue ? uuidSchema.safeParse(idValue) : null;
  if (id && !id.success) return { error: "Produto inválido." };

  const parsed = productSchema.safeParse({
    name: formText(formData, "name"),
    description: formText(formData, "description"),
    price: parsePriceInput(formText(formData, "price")),
    category_id: formText(formData, "category_id") || null,
    active: formBoolean(formData.get("active")),
    availability: formText(formData, "availability"),
    product_condition: formText(formData, "product_condition"),
    stock_quantity: formText(formData, "stock_quantity") === "" ? null : Number(formText(formData, "stock_quantity")),
    featured: formBoolean(formData.get("featured")),
    highlights: formText(formData, "highlights").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
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
      retainedImageUrls = parsedImages.slice(0, 8);
      imageListWasSubmitted = true;
    }
  } catch { return { error: "A lista de fotos do produto está inválida." }; }
  if (!imageListWasSubmitted && current.data) retainedImageUrls = current.data.image_urls?.length ? current.data.image_urls : current.data.image_url ? [current.data.image_url] : [];
  const uploaded = await uploadTenantAssets(supabase, formData.getAll("images"), tenant.id, "products", Math.max(0, 8 - retainedImageUrls.length));
  if (uploaded.error) return { error: uploaded.error };
  const imageUrls = [...retainedImageUrls, ...uploaded.urls];
  const values = {
    tenant_id: tenant.id,
    category_id: parsed.data.category_id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    price: parsed.data.price,
    image_url: imageUrls[0] ?? null,
    image_urls: imageUrls,
    availability: parsed.data.availability,
    product_condition: parsed.data.product_condition,
    stock_quantity: parsed.data.stock_quantity,
    featured: parsed.data.featured,
    highlights: parsed.data.highlights,
    active: parsed.data.active,
  };

  const { error } = id?.success
    ? await supabase.from("products").update(values).eq("tenant_id", tenant.id).eq("id", id.data)
    : await supabase.from("products").insert(values);
  if (error) {
    if (uploaded.paths.length) await supabase.storage.from("store-assets").remove(uploaded.paths);
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

  const uploadedLogo = await uploadTenantAsset(supabase, formData.get("logo"), tenant.id, "logo");
  if (uploadedLogo.error) return { error: uploadedLogo.error };
  const bannerFiles = formData.getAll("banner_images").filter((file) => file instanceof File && file.size > 0);
  const maxNewBanners = 8 - parsed.data.storefront_config.hero.image_urls.length;
  if (bannerFiles.length > maxNewBanners) {
    if (uploadedLogo.path) await supabase.storage.from("store-assets").remove([uploadedLogo.path]);
    return { error: `Mantenha no máximo 8 imagens no banner. Você já tem ${parsed.data.storefront_config.hero.image_urls.length}.` };
  }
  const uploadedBanners = await uploadTenantAssets(supabase, bannerFiles, tenant.id, "banners", maxNewBanners);
  if (uploadedBanners.error) {
    if (uploadedLogo.path) await supabase.storage.from("store-assets").remove([uploadedLogo.path]);
    return { error: uploadedBanners.error };
  }
  const uploadedAbout = await uploadTenantAsset(supabase, formData.get("about_image"), tenant.id, "about");
  if (uploadedAbout.error) {
    const paths = [...uploadedBanners.paths, ...(uploadedLogo.path ? [uploadedLogo.path] : [])];
    if (paths.length) await supabase.storage.from("store-assets").remove(paths);
    return { error: uploadedAbout.error };
  }
  const storefrontConfig = parsed.data.storefront_config;
  storefrontConfig.hero.image_urls = [...storefrontConfig.hero.image_urls, ...uploadedBanners.urls].slice(0, 8);
  if (uploadedAbout.url) storefrontConfig.sections.about.image_url = uploadedAbout.url;
  const { error } = await supabase.from("tenants").update({
    name: parsed.data.name,
    storefront_template: parsed.data.storefront_template,
    storefront_config: storefrontConfig,
    whatsapp_number: parsed.data.whatsapp_number,
    ...(uploadedLogo.url ? { logo_url: uploadedLogo.url } : {}),
  }).eq("id", tenant.id);
  if (error) {
    const paths = [...uploadedBanners.paths, ...(uploadedLogo.path ? [uploadedLogo.path] : []), ...(uploadedAbout.path ? [uploadedAbout.path] : [])];
    if (paths.length) await supabase.storage.from("store-assets").remove(paths);
    return { error: "Não foi possível salvar as configurações." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath(`/${tenant.slug}`);
  return { success: "Configurações salvas." };
}
