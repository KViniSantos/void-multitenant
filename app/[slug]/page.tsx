import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { getStorefrontBySlug } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

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

export default async function SlugStorePage({ params }: Props) {
  const { slug } = await params;
  const store = await getStorefrontBySlug(slug);
  if (!store) notFound();
  return <Storefront store={store} />;
}
