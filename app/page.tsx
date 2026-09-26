import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { LandingPage } from "@/components/landing-page";
import { getStorefrontByDomain, isPlatformHost } from "@/lib/storefront-data";
import { normalizeDomain } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function currentStore() {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const rawHost = forwarded || headersList.get("host") || "localhost";
  const hostname = normalizeDomain(rawHost.replace(/:\d+$/, ""));
  if (isPlatformHost(hostname)) return null;
  return getStorefrontByDomain(hostname);
}

export async function generateMetadata(): Promise<Metadata> {
  const store = await currentStore();
  if (!store) return {};
  const description = `Conheça a seleção de produtos da ${store.name} e fale com a loja pelo WhatsApp.`;
  return {
    title: `${store.name} | Catálogo online`,
    description,
    openGraph: { title: store.name, description, images: store.logo_url ? [store.logo_url] : [] },
    icons: store.logo_url ? { icon: store.logo_url } : undefined,
  };
}

export default async function HomePage() {
  const store = await currentStore();
  if (store) return <Storefront store={store} />;

  const headersList = await headers();
  const rawHost = headersList.get("x-forwarded-host")?.split(",")[0]?.trim() || headersList.get("host") || "localhost";
  if (!isPlatformHost(normalizeDomain(rawHost.replace(/:\d+$/, "")))) notFound();
  return <LandingPage />;
}
