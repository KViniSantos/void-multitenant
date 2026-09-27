import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { getProductByDomain, isPlatformHost, recordProductView } from "@/lib/storefront-data";
import { normalizeDomain } from "@/lib/validation";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ productSlug: string }> };

async function currentDomain() {
  const list = await headers();
  const raw = list.get("x-forwarded-host")?.split(",")[0]?.trim() || list.get("host") || "localhost";
  const domain = normalizeDomain(raw.replace(/:\d+$/, ""));
  return isPlatformHost(domain) ? null : domain;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const domain = await currentDomain();
  if (!domain) return { title: "Produto não encontrado" };
  const data = await getProductByDomain(domain, productSlug);
  if (!data) return { title: "Produto não encontrado" };
  return { title: `${data.product.name} | ${data.store.name}`, description: data.product.description || `Conheça ${data.product.name} na ${data.store.name}.`, openGraph: { title: data.product.name, description: data.product.description, images: data.product.image_urls.slice(0, 1) } };
}

export default async function DomainProductPage({ params }: Props) {
  const { productSlug } = await params;
  const domain = await currentDomain();
  if (!domain) notFound();
  const data = await getProductByDomain(domain, productSlug);
  if (!data) notFound();
  await recordProductView(data.product.tenant_id, data.product.id);
  return <ProductDetail data={data} basePath="/" />;
}
