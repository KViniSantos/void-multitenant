import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/access";

export default async function StorePreviewPage() {
  const { tenant } = await requireTenant();
  redirect(tenant.domain ? `https://${tenant.domain}` : `/${tenant.slug}`);
}
