import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import Link from "next/link";
import { getUserContext } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, tenant, tenants } = await getUserContext();
  if (!user) redirect("/login");
  if (!tenant && profile?.platform_role === "platform_admin") redirect("/admin");
  return <div className="dashboard-shell"><DashboardNav tenantSlug={tenant?.slug} storeName={tenant?.name} tenantType={tenant?.tenant_type} tenants={tenants} platformAdmin={profile?.platform_role === "platform_admin"} /><div className="dashboard-main"><header className="mobile-dashboard-header"><span className="brand-lockup"><span className="brand-mark">v.</span><span>vitrine<span className="brand-dot">.</span></span></span><span>{tenant?.name ?? "Sua loja"}</span>{tenants.length > 1 ? <Link href="/dashboard/stores">Trocar</Link> : null}</header>{children}</div></div>;
}
