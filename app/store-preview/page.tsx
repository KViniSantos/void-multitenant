import { notFound } from "next/navigation";
import { StorefrontPreviewCanvas } from "@/components/storefront-preview";
import { requireTenant } from "@/lib/access";
import { getStorefrontBySlug } from "@/lib/storefront-data";

export const metadata = { title: "Prévia da vitrine" };
export const dynamic = "force-dynamic";

export default async function StorePreviewPage() {
  const { tenant } = await requireTenant();
  const store = await getStorefrontBySlug(tenant.slug);
  if (!store || store.id !== tenant.id) notFound();
  return <StorefrontPreviewCanvas initialStore={store} />;
}
