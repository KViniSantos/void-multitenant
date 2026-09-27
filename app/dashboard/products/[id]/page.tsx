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
  return <main className="dashboard-content editor-page"><div className="breadcrumbs"><Link href="/dashboard/products">Produtos</Link><span>/</span><span>Editar</span></div><div className="page-heading compact-heading"><div><span className="eyebrow eyebrow-dark">EDIÇÃO DE PRODUTO</span><h1>{productResult.data.name}<span className="heading-period">.</span></h1><p>Atualize os detalhes que seus clientes vão ver.</p></div></div><ProductForm tenantId={tenant.id} product={productResult.data as Product} categories={categoryResult.data ?? []} /></main>;
}
