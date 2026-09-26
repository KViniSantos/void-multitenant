import { SettingsForm } from "@/components/settings-form";
import { requireTenant } from "@/lib/access";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { tenant } = await requireTenant();
  return <main className="dashboard-content editor-page"><div className="page-heading compact-heading"><div><span className="eyebrow eyebrow-dark">DO SEU JEITO</span><h1>Configurações<span className="heading-period">.</span></h1><p>O essencial da loja, em um só lugar.</p></div></div><SettingsForm tenant={tenant} /></main>;
}
