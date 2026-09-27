import { z } from "zod";
import type { StorefrontConfig } from "@/lib/database.types";

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const normalizeDomain = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "");

export const normalizeWhatsAppNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (normalized.length < 8 || normalized.length > 15 || normalized.startsWith("0")) return null;
  return normalized;
};

const whatsappSchema = z.string().trim().max(32).transform((value, context) => {
  if (!value) return null;
  const normalized = normalizeWhatsAppNumber(value);
  if (!normalized) {
    context.addIssue({ code: "custom", message: "Informe um número internacional válido, com 8 a 15 dígitos." });
    return z.NEVER;
  }
  return normalized;
});
const domainSchema = z.string().trim().max(253).transform((value, context) => {
  if (!value) return null;
  const normalized = normalizeDomain(value);
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalized)) {
    context.addIssue({ code: "custom", message: "Informe um domínio válido, sem https:// ou caminhos." });
    return z.NEVER;
  }
  return normalized;
});

export const tenantSettingsSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da loja.").max(80),
  storefront_template: z.enum(["technology", "nature", "sports", "essentials"]),
  storefront_config: z.string().max(24_000).transform((value, context): StorefrontConfig => {
    let input: unknown;
    try { input = JSON.parse(value); } catch {
      context.addIssue({ code: "custom", message: "As configurações visuais estão inválidas." });
      return z.NEVER;
    }
    const bool = z.boolean();
    const title = z.string().trim().min(1).max(80);
    const social = z.string().trim().max(500).refine((url) => !url || /^https:\/\//i.test(url), "Use um link seguro iniciado por https://.");
    const schema = z.object({
      font_family: z.enum(["montserrat", "inter", "roboto", "lora", "playfair"]).default("montserrat"),
      navigation: z.object({ show_home_link: bool, show_category_links: bool, show_category_filters: bool, show_featured_link: bool, show_about_link: bool, show_contact_link: bool, show_whatsapp_cta: bool }),
      hero: z.object({ enabled: bool, mode: z.enum(["static", "split", "carousel"]), title, description: z.string().trim().max(500), cta_label: z.string().trim().max(50), image_urls: z.array(z.string().url()).max(8) }),
      sections: z.object({
        categories: z.object({ enabled: bool, title }),
        featured: z.object({ enabled: bool, title, layout: z.enum(["cards", "banners"]) }),
        catalog: z.object({ enabled: bool, title, columns: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) }),
        about: z.object({ enabled: bool, title, text: z.string().trim().max(3000), image_url: z.string().url().nullable() }),
        contact: z.object({ enabled: bool, title }),
      }),
      section_order: z.array(z.enum(["categories", "featured", "catalog", "about", "contact"])).length(5).refine((items) => new Set(items).size === 5, "A ordem das seções está inválida."),
      footer: z.object({ enabled: bool, show_logo: bool, show_categories: bool, show_contact: bool, cnpj: z.string().trim().max(24), hours: z.string().trim().max(120), email: z.string().trim().email().or(z.literal("")), address: z.string().trim().max(300), instagram: social, facebook: social, tiktok: social, youtube: social, show_platform_credit: bool }),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      context.addIssue({ code: "custom", message: parsed.error.issues[0]?.message ?? "Confira os campos das seções e do rodapé." });
      return z.NEVER;
    }
    return parsed.data;
  }),
  whatsapp_number: whatsappSchema,
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do produto.").max(100),
  description: z.string().trim().max(2000).default(""),
  price: z.number().finite().min(0, "O preço não pode ser negativo.").max(999999999),
  card_price: z.number().finite().min(0, "O preço no cartão não pode ser negativo.").max(999999999),
  category_id: z.string().uuid().nullable(),
  active: z.boolean(),
  availability: z.enum(["in_stock", "preorder", "sold_out"]),
  product_condition: z.enum(["new", "used", "refurbished"]),
  stock_quantity: z.number().int().nonnegative().nullable(),
  featured: z.boolean(),
  highlights: z.array(z.string().trim().min(1).max(180, "Cada destaque pode ter até 180 caracteres.")).max(20, "Informe no máximo 20 destaques para este produto."),
  detail_sections: z.array(z.object({
    title: z.string().trim().min(1).max(80),
    items: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(240) })).max(12, "Cada seção pode ter no máximo 12 informações."),
  })).max(6, "O produto pode ter no máximo 6 seções de informação."),
  attributes: z.array(z.object({
    name: z.string().trim().min(1, "Informe o nome de cada atributo.").max(40),
    values: z.array(z.string().trim().min(1).max(80)).min(1, "Informe ao menos um valor para cada atributo.").max(20, "Cada atributo pode ter no máximo 20 opções."),
  })).max(8, "O produto pode ter no máximo 8 atributos.")
    .refine((items) => new Set(items.map((item) => item.name.toLocaleLowerCase("pt-BR"))).size === items.length, "Os nomes dos atributos devem ser diferentes.")
    .refine((items) => items.every((item) => new Set(item.values.map((value) => value.toLocaleLowerCase("pt-BR"))).size === item.values.length), "Remova valores repetidos dentro de um atributo."),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(60),
  active: z.boolean(),
});

export const tenantCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .refine((value) => !["admin", "dashboard", "login", "update-password", "auth", "_next"].includes(value), "Esse endereço é reservado pelo painel."),
  owner_email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  domain: domainSchema,
  whatsapp_number: whatsappSchema,
  storefront_template: z.enum(["technology", "nature", "sports", "essentials"]).default("essentials"),
});

export function formBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
