import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { requireTenant } from "@/lib/access";
import type { Product } from "@/lib/database.types";

export const metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, tenant } = await requireTenant();
  const [productResult, categoryResult] = await Promise.all([
    supabase.from("products").select("*").eq("tenant_id", tenant.id).eq("id", id).maybeSingle(),
    supabase.from("categories").select("id,name,active").eq("tenant_id", tenant.id).order("name"),
  ]);
  if (!productResult.data) notFound();
  const collectionLabel = tenant.tenant_type === "food" ? "Cardápio" : tenant.tenant_type === "services" ? "Serviços" : "Produtos";
  return <main className="dashboard-content editor-page"><div className="breadcrumbs"><Link href="/dashboard/products">{collectionLabel}</Link><span>/</span><span>Editar</span></div><div className="page-heading compact-heading"><div><span className="eyebrow eyebrow-dark">EDIÇÃO DE {collectionLabel.toLocaleUpperCase("pt-BR")}</span><h1>{productResult.data.name}<span className="heading-period">.</span></h1><p>Atualize os detalhes que seus clientes vão ver.</p></div></div><ProductForm tenantId={tenant.id} tenantType={tenant.tenant_type} product={productResult.data as Product} categories={categoryResult.data ?? []} /></main>;
}
