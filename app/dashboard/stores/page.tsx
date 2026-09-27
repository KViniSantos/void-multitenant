import { redirect } from "next/navigation";
import { TenantSwitcher } from "@/components/tenant-switcher";
import { getUserContext } from "@/lib/access";

export const metadata = { title: "Escolher loja" };

export default async function StorePickerPage() {
  const { user, profile, tenant, tenants } = await getUserContext();
  if (!user) redirect("/login");
  if (!tenants.length) redirect(profile?.platform_role === "platform_admin" ? "/admin" : "/dashboard/setup-needed");
  return <main className="dashboard-content"><div className="page-heading"><div><span className="eyebrow eyebrow-dark">SUAS LOJAS</span><h1>Escolha uma loja<span className="heading-period">.</span></h1><p>Abra o espaço que você quer gerenciar.</p></div></div><section className="panel store-picker-panel"><TenantSwitcher tenants={tenants} activeTenantId={tenant?.id} /></section></main>;
}
