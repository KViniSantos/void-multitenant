import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { getStorefrontBySlug } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function parseFilters(search: Record<string, string | string[] | undefined>) {
  const value = (key: string) => typeof search[key] === "string" ? search[key] as string : "";
  const requestedPage = Number.parseInt(value("pagina"), 10);
  return {
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100_000) : 1,
    categoryId: value("categoria") || null,
    availability: value("disponibilidade") || null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStorefrontBySlug(slug);
  if (!store) return { title: "Loja não encontrada" };
  const description = `Conheça a seleção de produtos da ${store.name} e fale com a loja pelo WhatsApp.`;
  return {
    title: `${store.name} | Catálogo online`,
    description,
    openGraph: { title: store.name, description, images: store.logo_url ? [store.logo_url] : [] },
    icons: store.logo_url ? { icon: store.logo_url } : undefined,
  };
}

export default async function SlugStorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const requested = parseFilters(await searchParams);
  const store = await getStorefrontBySlug(slug, requested);
  if (!store) notFound();
  const totalPages = Math.max(1, Math.ceil(store.total_products / 24));
  const page = Math.min(requested.page, totalPages);
  if (page !== requested.page) {
    const corrected = await getStorefrontBySlug(slug, { ...requested, page });
    if (corrected) return <Storefront store={corrected} filters={{ ...requested, page, totalPages }} basePath={`/${slug}`} />;
  }
  return <Storefront store={store} filters={{ ...requested, totalPages }} basePath={`/${slug}`} />;
}
