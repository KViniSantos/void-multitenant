import "server-only";

import { cache } from "react";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PublicStorefront } from "@/lib/database.types";
import { z } from "zod";

const storefrontSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  domain: z.string().nullable(),
  logo_url: z.string().nullable(),
  primary_color: z.string(),
  secondary_color: z.string(),
  whatsapp_number: z.string().nullable(),
  categories: z.array(z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() })),
  products: z.array(z.object({
    id: z.string().uuid(),
    category_id: z.string().uuid().nullable(),
    category_name: z.string().nullable(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    price: z.number(),
    image_url: z.string().nullable(),
  })),
});

export const getStorefrontByDomain = cache(async (domain: string): Promise<PublicStorefront | null> => {
  if (!domain || !isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_storefront_by_domain", { p_domain: domain });
  if (error || data === null) return null;
  const parsed = storefrontSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
});

export const getStorefrontBySlug = cache(async (slug: string): Promise<PublicStorefront | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_storefront_by_slug", { p_slug: slug });
  if (error || data === null) return null;
  const parsed = storefrontSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
});

export function isPlatformHost(hostname: string) {
  const configured = (process.env.NEXT_PUBLIC_PLATFORM_HOST ?? "localhost")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(hostname) || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app");
}
