import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { getProductByStoreSlug, recordProductView } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string; productSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const data = await getProductByStoreSlug(slug, productSlug);
  if (!data) return { title: "Produto não encontrado" };
  return { title: `${data.product.name} | ${data.store.name}`, description: data.product.description || `Conheça ${data.product.name} na ${data.store.name}.`, openGraph: { title: data.product.name, description: data.product.description, images: data.product.image_urls.slice(0, 1) } };
}

export default async function StoreProductPage({ params }: Props) {
  const { slug, productSlug } = await params;
  const data = await getProductByStoreSlug(slug, productSlug);
  if (!data) notFound();
  await recordProductView(data.product.tenant_id, data.product.id);
  return <ProductDetail data={data} basePath={`/${slug}`} />;
}
