import Link from "next/link";
import { requireTenant } from "@/lib/access";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const { supabase, tenant } = await requireTenant();
  const [productsResult, categoriesResult] = await Promise.all([
    supabase.from("products").select("id,name,price,active,created_at").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
  ]);
  const { data: products } = productsResult;
  const categoriesCount = categoriesResult.count ?? 0;
  const activeProducts = products?.filter((product) => product.active).length ?? 0;
  const publicUrl = tenant.domain ? `https://${tenant.domain}` : `/${tenant.slug}`;

  return <main className="dashboard-content">
    <div className="page-heading"><div><span className="eyebrow eyebrow-dark">BOM TE VER POR AQUI</span><h1>Olá, {tenant.name}<span className="heading-period">.</span></h1><p>Um espaço para cuidar da sua loja e deixar tudo pronto para vender.</p></div><Link href="/dashboard/products/new" className="button button-dark">+ Adicionar produto</Link></div>
    <section className="stats-grid">
      <article className="stat-card stat-card-featured"><span>PRODUTOS ATIVOS</span><strong>{activeProducts}</strong><small>visíveis na sua vitrine</small><i>↗</i></article>
      <article className="stat-card"><span>CATEGORIAS</span><strong>{categoriesCount}</strong><small>organizam seus produtos</small><i>◫</i></article>
      <article className="stat-card"><span>ENDEREÇO DA LOJA</span><strong className="stat-domain">{tenant.domain ?? `/${tenant.slug}`}</strong><small>{tenant.domain ? "Domínio configurado" : "Endereço de prévia"}</small><i>⌁</i></article>
    </section>
    <section className="dashboard-columns">
      <div className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-dark">SEU CATÁLOGO</span><h2>Adicionados recentemente</h2></div><Link className="text-link" href="/dashboard/products">Ver todos <span>→</span></Link></div>
        {products?.length ? <div className="recent-list">{products.map((product) => <div className="recent-row" key={product.id}><div className="recent-product-icon">✳</div><div><strong>{product.name}</strong><span>{product.active ? "Publicado na vitrine" : "Rascunho"}</span></div><strong>{formatCurrency(product.price)}</strong></div>)}</div> : <div className="empty-inline"><span>✳</span><div><strong>A vitrine começa com uma boa escolha.</strong><p>Cadastre seu primeiro produto para ele aparecer aqui.</p></div><Link href="/dashboard/products/new" className="text-link">Adicionar <span>↗</span></Link></div>}
      </div>
      <aside className="panel launch-panel"><span className="eyebrow">UM BOM COMEÇO</span><h2>Sua loja está pronta para receber visitantes.</h2><p>Confira como os clientes vão ver seus produtos e compartilhe a vitrine.</p><Link className="button button-lime" href={publicUrl} target={tenant.domain ? "_blank" : undefined}>Abrir minha loja <span>↗</span></Link><div className="launch-mark" aria-hidden="true">v.</div></aside>
    </section>
    {!tenant.whatsapp_number ? <div className="setup-banner"><span>↗</span><div><strong>Quase lá: configure seu WhatsApp.</strong><p>Clientes poderão montar o carrinho e enviar o pedido direto para você.</p></div><Link href="/dashboard/settings">Configurar agora <span>→</span></Link></div> : null}
  </main>;
}
