import Image from "next/image";
import Link from "next/link";
import { DeleteProductButton } from "@/components/delete-product-button";
import { requireTenant } from "@/lib/access";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Produtos" };
const PAGE_SIZE = 24;
type Search = { pagina?: string; busca?: string; status?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase, tenant } = await requireTenant();
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.pagina ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100_000) : 1;
  const search = (params.busca ?? "").trim().slice(0, 80);
  const status = ["active", "hidden"].includes(params.status ?? "") ? params.status : "";
  const query = () => {
    let builder = supabase.from("products").select("id,name,slug,category_id,price,image_url,active,availability,featured,updated_at,created_at", { count: "exact" }).eq("tenant_id", tenant.id);
    if (search) builder = builder.ilike("name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
    if (status === "active") builder = builder.eq("active", true);
    if (status === "hidden") builder = builder.eq("active", false);
    return builder.order("created_at", { ascending: false });
  };
  const from = (page - 1) * PAGE_SIZE;
  const [firstProductResult, categoryResult] = await Promise.all([
    query().range(from, from + PAGE_SIZE - 1),
    supabase.from("categories").select("id,name").eq("tenant_id", tenant.id).order("name"),
  ]);
  let productResult = firstProductResult;
  const total = productResult.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  if (currentPage !== page) productResult = await query().range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);
  const products = productResult.data ?? [];
  const categories = new Map((categoryResult.data ?? []).map((category) => [category.id, category.name]));
  const href = (nextPage: number) => {
    const url = new URLSearchParams();
    if (nextPage > 1) url.set("pagina", String(nextPage));
    if (search) url.set("busca", search);
    if (status) url.set("status", status);
    const queryString = url.toString();
    return `/dashboard/products${queryString ? `?${queryString}` : ""}`;
  };

  return <main className="dashboard-content">
    <div className="page-heading"><div><span className="eyebrow eyebrow-dark">SEU CATÁLOGO</span><h1>Produtos<span className="heading-period">.</span></h1><p>Uma coleção boa começa com cada detalhe bem cuidado.</p></div><Link href="/dashboard/products/new" className="button button-dark">+ Adicionar produto</Link></div>
    <form className="product-list-filters" action="/dashboard/products" method="get"><label><span className="visually-hidden">Buscar produtos</span><input name="busca" defaultValue={search} placeholder="Buscar produto pelo nome" /></label><label><span className="visually-hidden">Status do produto</span><select name="status" defaultValue={status}><option value="">Todos os status</option><option value="active">Ativos</option><option value="hidden">Ocultos</option></select></label><button className="button button-outline" type="submit">Filtrar</button></form>
    {products.length ? <section className="panel products-panel"><div className="table-heading"><span>PRODUTO</span><span>CATEGORIA</span><span>PREÇO</span><span>STATUS</span><span>ATUALIZADO</span><span /></div>{products.map((product) => <article className="product-admin-row" key={product.id}><div className="admin-product-main">{product.image_url ? <Image className="admin-product-image" src={product.image_url} alt="" width={58} height={58} /> : <span className="admin-product-placeholder">✳</span>}<div><strong>{product.name}</strong><small>/{product.slug}{product.featured ? " · Destaque" : ""}</small></div></div><span className="product-admin-category">{product.category_id ? categories.get(product.category_id) ?? "Sem categoria" : "Sem categoria"}</span><strong className="admin-price">{formatCurrency(product.price)}</strong><span className={product.active ? "status-pill status-active" : "status-pill status-draft"}>{product.active ? product.availability === "in_stock" ? "Pronta entrega" : product.availability === "preorder" ? "Sob encomenda" : "Indisponível" : "Oculto"}</span><span className="product-updated">{formatDate(product.updated_at)}</span><div className="row-actions"><Link href={`/dashboard/products/${product.id}`} className="button-small button-outline">Editar</Link><DeleteProductButton id={product.id} name={product.name} /></div></article>)}</section> : <section className="panel empty-table"><span className="empty-state-mark">✳</span><h2>{search || status ? "Nenhum produto corresponde aos filtros." : "Comece pela sua primeira peça."}</h2><p>{search || status ? "Tente outra busca ou limpe os filtros." : "Adicione uma foto, conte um pouco sobre o produto e escolha onde ele aparece."}</p>{search || status ? <Link href="/dashboard/products" className="button button-outline">Limpar filtros</Link> : <Link href="/dashboard/products/new" className="button button-dark">Adicionar primeiro produto <span>↗</span></Link>}</section>}
    {total > PAGE_SIZE ? <nav className="admin-pagination" aria-label="Paginação de produtos"><Link className={currentPage <= 1 ? "is-disabled" : ""} aria-disabled={currentPage <= 1} href={href(Math.max(1, currentPage - 1))}>← Anterior</Link><span>Página {currentPage} de {pages} · {total} produtos</span><Link className={currentPage >= pages ? "is-disabled" : ""} aria-disabled={currentPage >= pages} href={href(Math.min(pages, currentPage + 1))}>Próxima →</Link></nav> : null}
  </main>;
}
