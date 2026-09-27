import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { LandingPage } from "@/components/landing-page";
import { getStorefrontByDomain, isPlatformHost } from "@/lib/storefront-data";
import { normalizeDomain } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function currentDomain() {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const rawHost = forwarded || headersList.get("host") || "localhost";
  const hostname = normalizeDomain(rawHost.replace(/:\d+$/, ""));
  return isPlatformHost(hostname) ? null : hostname;
}

async function currentStore(query: { page?: number; categoryId?: string | null; availability?: string | null } = {}) {
  const domain = await currentDomain();
  return domain ? getStorefrontByDomain(domain, query) : null;
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

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams;
  const value = (key: string) => typeof search[key] === "string" ? search[key] as string : "";
  const requestedPage = Number.parseInt(value("pagina"), 10);
  const requested = {
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100_000) : 1,
    categoryId: value("categoria") || null,
    availability: value("disponibilidade") || null,
  };
  const store = await currentStore(requested);
  if (store) {
    const totalPages = Math.max(1, Math.ceil(store.total_products / 24));
    const page = Math.min(requested.page, totalPages);
    if (page !== requested.page) {
      const corrected = await currentStore({ ...requested, page });
      if (corrected) return <Storefront store={corrected} filters={{ ...requested, page, totalPages }} basePath="/" />;
    }
    return <Storefront store={store} filters={{ ...requested, totalPages }} basePath="/" />;
  }

  const headersList = await headers();
  const rawHost = headersList.get("x-forwarded-host")?.split(",")[0]?.trim() || headersList.get("host") || "localhost";
  if (!isPlatformHost(normalizeDomain(rawHost.replace(/:\d+$/, "")))) notFound();
  return <LandingPage />;
}
