import Link from "next/link";
import { ProductForm } from "@/components/product-form";
import { requireTenant } from "@/lib/access";

export const metadata = { title: "Adicionar produto" };

export default async function NewProductPage() {
  const { supabase, tenant } = await requireTenant();
  const { data } = await supabase.from("categories").select("id,name,active").eq("tenant_id", tenant.id).order("name");
  const singular = tenant.tenant_type === "food" ? "item do cardápio" : tenant.tenant_type === "services" ? "serviço" : "produto";
  const createLabel = tenant.tenant_type === "food" ? "Adicionar item" : tenant.tenant_type === "services" ? "Adicionar serviço" : "Adicionar produto";
  return <main className="dashboard-content editor-page"><div className="breadcrumbs"><Link href="/dashboard/products">{tenant.tenant_type === "food" ? "Cardápio" : tenant.tenant_type === "services" ? "Serviços" : "Produtos"}</Link><span>/</span><span>{createLabel}</span></div><div className="page-heading compact-heading"><div><span className="eyebrow eyebrow-dark">NOVO {singular.toLocaleUpperCase("pt-BR")}</span><h1>{createLabel}<span className="heading-period">.</span></h1><p>Preencha os detalhes que seus clientes precisam para decidir.</p></div></div><ProductForm tenantId={tenant.id} tenantType={tenant.tenant_type} categories={data ?? []} /></main>;
}
