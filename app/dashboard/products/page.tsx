import Image from "next/image";
import Link from "next/link";
import { DeleteProductButton } from "@/components/delete-product-button";
import { requireTenant } from "@/lib/access";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Produtos" };

export default async function ProductsPage() {
  const { supabase, tenant } = await requireTenant();
  const [productResult, categoryResult] = await Promise.all([
    supabase.from("products").select("id,name,slug,category_id,price,image_url,active,updated_at").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
    supabase.from("categories").select("id,name").eq("tenant_id", tenant.id),
  ]);
  const products = productResult.data ?? [];
  const categories = new Map((categoryResult.data ?? []).map((category) => [category.id, category.name]));

  return <main className="dashboard-content">
    <div className="page-heading"><div><span className="eyebrow eyebrow-dark">SEU CATÁLOGO</span><h1>Produtos<span className="heading-period">.</span></h1><p>Uma coleção boa começa com cada detalhe bem cuidado.</p></div><Link href="/dashboard/products/new" className="button button-dark">+ Adicionar produto</Link></div>
    {products.length ? <section className="panel products-panel"><div className="table-heading"><span>PRODUTO</span><span>CATEGORIA</span><span>PREÇO</span><span>STATUS</span><span>ATUALIZADO</span><span /></div>{products.map((product) => <article className="product-admin-row" key={product.id}><div className="admin-product-main">{product.image_url ? <Image className="admin-product-image" src={product.image_url} alt="" width={58} height={58} unoptimized /> : <span className="admin-product-placeholder">✳</span>}<div><strong>{product.name}</strong><small>/{product.slug}</small></div></div><span className="product-admin-category">{product.category_id ? categories.get(product.category_id) ?? "Sem categoria" : "Sem categoria"}</span><strong className="admin-price">{formatCurrency(product.price)}</strong><span className={product.active ? "status-pill status-active" : "status-pill status-draft"}>{product.active ? "Ativo" : "Oculto"}</span><span className="product-updated">{formatDate(product.updated_at)}</span><div className="row-actions"><Link href={`/dashboard/products/${product.id}`} className="button-small button-outline">Editar</Link><DeleteProductButton id={product.id} name={product.name} /></div></article>)}</section> : <section className="panel empty-table"><span className="empty-state-mark">✳</span><h2>Comece pela sua primeira peça.</h2><p>Adicione uma foto, conte um pouco sobre o produto e escolha onde ele aparece.</p><Link href="/dashboard/products/new" className="button button-dark">Adicionar primeiro produto <span>↗</span></Link></section>}
  </main>;
}
