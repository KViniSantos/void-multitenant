import "server-only";

import { cache } from "react";
import { z } from "zod";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DEFAULT_STOREFRONT_CONFIG, type PublicProductDetail, type PublicStorefront, type StorefrontProduct } from "@/lib/database.types";

export const PUBLIC_CATALOG_PAGE_SIZE = 24;
const templateSchema = z.enum(["technology", "nature", "sports", "essentials"]);
const sectionKeySchema = z.enum(["categories", "featured", "catalog", "about", "contact"]);
const storefrontConfigSchema = z.object({
  font_family: z.enum(["montserrat", "inter", "roboto", "lora", "playfair"]).default("montserrat"),
  navigation: z.object({ show_home_link: z.boolean(), show_category_links: z.boolean(), show_category_filters: z.boolean(), show_featured_link: z.boolean(), show_about_link: z.boolean(), show_contact_link: z.boolean(), show_whatsapp_cta: z.boolean() }),
  hero: z.object({
    enabled: z.boolean(), mode: z.enum(["static", "split", "carousel"]), title: z.string(),
    description: z.string(), cta_label: z.string(), image_urls: z.array(z.string()),
  }),
  sections: z.object({
    categories: z.object({ enabled: z.boolean(), title: z.string() }),
    featured: z.object({ enabled: z.boolean(), title: z.string(), layout: z.enum(["cards", "banners"]) }),
    catalog: z.object({ enabled: z.boolean(), title: z.string(), columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) }),
    about: z.object({ enabled: z.boolean(), title: z.string(), text: z.string(), image_url: z.string().nullable() }),
    contact: z.object({ enabled: z.boolean(), title: z.string() }),
  }),
  section_order: z.array(sectionKeySchema),
  footer: z.object({
    enabled: z.boolean(), show_logo: z.boolean(), show_categories: z.boolean(), show_contact: z.boolean(),
    cnpj: z.string(), hours: z.string(), email: z.string(), address: z.string(), instagram: z.string(),
    facebook: z.string(), tiktok: z.string(), youtube: z.string(), show_platform_credit: z.boolean(),
  }),
});

const storefrontProductSchema = z.object({
  id: z.string().uuid(), category_id: z.string().uuid().nullable(), category_name: z.string().nullable(),
  name: z.string(), slug: z.string(), description: z.string(), price: z.number(), card_price: z.number(), image_url: z.string().nullable(),
  image_urls: z.array(z.string()), availability: z.enum(["in_stock", "preorder", "sold_out"]),
  product_condition: z.enum(["new", "used", "refurbished"]), stock_quantity: z.number().int().nullable(),
  featured: z.boolean(), highlights: z.array(z.string()),
  attributes: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
});

const storeBrandSchema = z.object({
  id: z.string().uuid(), name: z.string(), slug: z.string(), domain: z.string().nullable(), logo_url: z.string().nullable(),
  primary_color: z.string(), secondary_color: z.string(),
  storefront_template: templateSchema, whatsapp_number: z.string().nullable(),
  storefront_config: storefrontConfigSchema,
});

const storefrontSchema = storeBrandSchema.extend({
  categories: z.array(z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() })),
  products: z.array(storefrontProductSchema), featured_products: z.array(storefrontProductSchema),
  total_products: z.number().int().nonnegative(),
});

const productDetailSchema = z.object({
  store: storeBrandSchema,
  product: storefrontProductSchema.extend({
    tenant_id: z.string().uuid(),
    detail_sections: z.array(z.object({
      title: z.string(),
      items: z.array(z.object({ label: z.string(), value: z.string() })),
    })),
  }),
  related_products: z.array(storefrontProductSchema),
});

export type StorefrontQuery = { page?: number; categoryId?: string | null; availability?: string | null };

function getPageArgs(query: StorefrontQuery) {
  const requestedPage = Number.isInteger(query.page) && Number(query.page) > 0 ? Number(query.page) : 1;
  const page = Math.min(requestedPage, 100_000);
  return { page, limit: PUBLIC_CATALOG_PAGE_SIZE, offset: (page - 1) * PUBLIC_CATALOG_PAGE_SIZE };
}

function resolveConfig(value: unknown) {
  const result = storefrontConfigSchema.safeParse(value);
  if (result.success) return result.data;
  return DEFAULT_STOREFRONT_CONFIG;
}

async function fetchStorefront(
  functionName: "get_public_storefront_by_domain_page" | "get_public_storefront_by_slug_page",
  lookupKey: string,
  lookupValue: string,
  query: StorefrontQuery,
): Promise<PublicStorefront | null> {
  if (!lookupValue || !isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { limit, offset } = getPageArgs(query);
  const categoryId = query.categoryId && z.string().uuid().safeParse(query.categoryId).success ? query.categoryId : null;
  const availability = ["in_stock", "preorder", "sold_out"].includes(query.availability ?? "") ? query.availability ?? null : null;
  const args = { p_limit: limit, p_offset: offset, p_category_id: categoryId, p_availability: availability };
  const { data, error } = functionName === "get_public_storefront_by_domain_page"
    ? await supabase.rpc(functionName, { ...args, p_domain: lookupValue })
    : await supabase.rpc(functionName, { ...args, p_slug: lookupValue });
  if (error || data === null) return null;
  const parsed = storefrontSchema.safeParse(data);
  if (!parsed.success) return null;
  return { ...parsed.data, storefront_config: resolveConfig(parsed.data.storefront_config) } as PublicStorefront;
}

export const getStorefrontByDomain = cache(async (domain: string, query: StorefrontQuery = {}) =>
  fetchStorefront("get_public_storefront_by_domain_page", "p_domain", domain, query));

export const getStorefrontBySlug = cache(async (slug: string, query: StorefrontQuery = {}) =>
  fetchStorefront("get_public_storefront_by_slug_page", "p_slug", slug, query));

async function fetchProductDetail(
  functionName: "get_public_product_by_domain" | "get_public_product_by_store_slug",
  lookupValue: string,
  productSlug: string,
): Promise<PublicProductDetail | null> {
  if (!lookupValue || !productSlug || !isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = functionName === "get_public_product_by_domain"
    ? await supabase.rpc(functionName, { p_domain: lookupValue, p_product_slug: productSlug })
    : await supabase.rpc(functionName, { p_store_slug: lookupValue, p_product_slug: productSlug });
  if (error || data === null) return null;
  const parsed = productDetailSchema.safeParse(data);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    store: { ...parsed.data.store, storefront_config: resolveConfig(parsed.data.store.storefront_config) },
  } as PublicProductDetail;
}

export const getProductByStoreSlug = cache(async (storeSlug: string, productSlug: string) =>
  fetchProductDetail("get_public_product_by_store_slug", storeSlug, productSlug));

export const getProductByDomain = cache(async (domain: string, productSlug: string) =>
  fetchProductDetail("get_public_product_by_domain", domain, productSlug));

export async function recordProductView(tenantId: string, productId: string) {
  if (!isSupabaseConfigured()) return;
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("increment_product_view", { p_tenant_id: tenantId, p_product_id: productId });
}

export function isPlatformHost(hostname: string) {
  const configured = (process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost")
    .split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
  return configured.includes(hostname) || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
}

export function productHref(_store: Pick<PublicStorefront, "slug" | "domain">, product: Pick<StorefrontProduct, "slug">, basePath: string) {
  return `${basePath.replace(/\/$/, "")}/produto/${product.slug}`;
}
