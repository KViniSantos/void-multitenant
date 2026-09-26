import { z } from "zod";

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

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal, por exemplo #1E3A34.");
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
  primary_color: colorSchema,
  secondary_color: colorSchema,
  whatsapp_number: whatsappSchema,
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do produto.").max(100),
  description: z.string().trim().max(2000).default(""),
  price: z.coerce.number().finite().min(0, "O preço não pode ser negativo.").max(999999999),
  category_id: z.string().uuid().nullable(),
  active: z.boolean(),
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
});

export function formBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

export function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
