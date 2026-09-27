import Link from "next/link";
import { ProductForm } from "@/components/product-form";
import { requireTenant } from "@/lib/access";

export const metadata = { title: "Adicionar produto" };

export default async function NewProductPage() {
  const { supabase, tenant } = await requireTenant();
  const { data } = await supabase.from("categories").select("id,name,active").eq("tenant_id", tenant.id).order("name");
  return <main className="dashboard-content editor-page"><div className="breadcrumbs"><Link href="/dashboard/products">Produtos</Link><span>/</span><span>Adicionar produto</span></div><div className="page-heading compact-heading"><div><span className="eyebrow eyebrow-dark">UM NOVO FAVORITO</span><h1>Adicionar produto<span className="heading-period">.</span></h1><p>Os campos com * ajudam a deixar seu catálogo mais claro.</p></div></div><ProductForm tenantId={tenant.id} categories={data ?? []} /></main>;
}
