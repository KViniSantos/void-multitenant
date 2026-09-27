import { z } from "zod";
import {
  DEFAULT_STOREFRONT_CONFIG,
  type StorefrontConfig,
  type StorefrontSectionKey,
  type TenantType,
} from "./database.types.ts";

const sectionKeys = ["categories", "featured", "catalog", "about", "contact", "gallery"] as const satisfies readonly StorefrontSectionKey[];
const sectionKeySchema = z.enum(sectionKeys);
const httpsUrl = z.string().trim().max(500).refine((value) => !value || /^https:\/\//i.test(value), "Use um link seguro iniciado por https://.");
const optionalUrl = z.string().url();

const sectionOrderSchema = z.array(sectionKeySchema).max(sectionKeys.length)
  .default(DEFAULT_STOREFRONT_CONFIG.section_order)
  .transform((order) => {
    const uniqueOrder = [...new Set(order)];
    return [...uniqueOrder, ...sectionKeys.filter((key) => !uniqueOrder.includes(key))];
  });

/**
 * Shared storefront settings schema. Nested defaults allow configs saved before
 * a setting existed to keep their values while receiving defaults for new fields.
 */
export const storefrontConfigSchema = z.object({
  font_family: z.enum(["montserrat", "inter", "roboto", "lora", "playfair"]).default(DEFAULT_STOREFRONT_CONFIG.font_family),
  navigation: z.object({
    show_home_link: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.navigation.show_home_link),
    show_category_links: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.navigation.show_category_links),
    show_category_filters: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.navigation.show_category_filters),
    show_featured_link: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.navigation.show_featured_link),
    show_about_link: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.navigation.show_about_link),
    show_contact_link: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.navigation.show_contact_link),
    show_whatsapp_cta: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.navigation.show_whatsapp_cta),
    show_gallery_link: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.navigation.show_gallery_link),
  }).default(DEFAULT_STOREFRONT_CONFIG.navigation),
  hero: z.object({
    enabled: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.hero.enabled),
    mode: z.enum(["static", "split", "carousel"]).default(DEFAULT_STOREFRONT_CONFIG.hero.mode),
    title: z.string().trim().min(1).max(80).default(DEFAULT_STOREFRONT_CONFIG.hero.title),
    description: z.string().trim().max(500).default(DEFAULT_STOREFRONT_CONFIG.hero.description),
    cta_label: z.string().trim().max(50).default(DEFAULT_STOREFRONT_CONFIG.hero.cta_label),
    image_urls: z.array(optionalUrl).max(8).default(DEFAULT_STOREFRONT_CONFIG.hero.image_urls),
  }).default(DEFAULT_STOREFRONT_CONFIG.hero),
  sections: z.object({
    categories: z.object({
      enabled: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.sections.categories.enabled),
      title: z.string().trim().min(1).max(80).default(DEFAULT_STOREFRONT_CONFIG.sections.categories.title),
    }).default(DEFAULT_STOREFRONT_CONFIG.sections.categories),
    featured: z.object({
      enabled: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.sections.featured.enabled),
      title: z.string().trim().min(1).max(80).default(DEFAULT_STOREFRONT_CONFIG.sections.featured.title),
      layout: z.enum(["cards", "banners"]).default(DEFAULT_STOREFRONT_CONFIG.sections.featured.layout),
    }).default(DEFAULT_STOREFRONT_CONFIG.sections.featured),
    catalog: z.object({
      enabled: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.sections.catalog.enabled),
      title: z.string().trim().min(1).max(80).default(DEFAULT_STOREFRONT_CONFIG.sections.catalog.title),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).default(DEFAULT_STOREFRONT_CONFIG.sections.catalog.columns),
    }).default(DEFAULT_STOREFRONT_CONFIG.sections.catalog),
    about: z.object({
      enabled: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.sections.about.enabled),
      title: z.string().trim().min(1).max(80).default(DEFAULT_STOREFRONT_CONFIG.sections.about.title),
      text: z.string().trim().max(3000).default(DEFAULT_STOREFRONT_CONFIG.sections.about.text),
      image_url: optionalUrl.nullable().default(DEFAULT_STOREFRONT_CONFIG.sections.about.image_url),
    }).default(DEFAULT_STOREFRONT_CONFIG.sections.about),
    contact: z.object({
      enabled: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.sections.contact.enabled),
      title: z.string().trim().min(1).max(80).default(DEFAULT_STOREFRONT_CONFIG.sections.contact.title),
    }).default(DEFAULT_STOREFRONT_CONFIG.sections.contact),
    gallery: z.object({
      enabled: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.sections.gallery.enabled),
      title: z.string().trim().min(1).max(80).default(DEFAULT_STOREFRONT_CONFIG.sections.gallery.title),
      image_urls: z.array(optionalUrl).max(8).default(DEFAULT_STOREFRONT_CONFIG.sections.gallery.image_urls),
    }).default(DEFAULT_STOREFRONT_CONFIG.sections.gallery),
  }).default(DEFAULT_STOREFRONT_CONFIG.sections),
  section_order: sectionOrderSchema,
  footer: z.object({
    enabled: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.footer.enabled),
    show_logo: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.footer.show_logo),
    show_categories: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.footer.show_categories),
    show_contact: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.footer.show_contact),
    cnpj: z.string().trim().max(24).default(DEFAULT_STOREFRONT_CONFIG.footer.cnpj),
    hours: z.string().trim().max(120).default(DEFAULT_STOREFRONT_CONFIG.footer.hours),
    email: z.string().trim().email().or(z.literal("")).default(DEFAULT_STOREFRONT_CONFIG.footer.email),
    address: z.string().trim().max(300).default(DEFAULT_STOREFRONT_CONFIG.footer.address),
    instagram: httpsUrl.default(DEFAULT_STOREFRONT_CONFIG.footer.instagram),
    facebook: httpsUrl.default(DEFAULT_STOREFRONT_CONFIG.footer.facebook),
    tiktok: httpsUrl.default(DEFAULT_STOREFRONT_CONFIG.footer.tiktok),
    youtube: httpsUrl.default(DEFAULT_STOREFRONT_CONFIG.footer.youtube),
    show_platform_credit: z.boolean().default(DEFAULT_STOREFRONT_CONFIG.footer.show_platform_credit),
  }).default(DEFAULT_STOREFRONT_CONFIG.footer),
});

export function normalizeStorefrontConfig(value: unknown): StorefrontConfig {
  const parsed = storefrontConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_STOREFRONT_CONFIG;
}

export function shouldShowGallery(
  tenantType: TenantType,
  gallery: StorefrontConfig["sections"]["gallery"],
) {
  return tenantType === "services" && gallery.enabled && gallery.image_urls.length > 0;
}
