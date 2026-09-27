import Link from "next/link";
import { requireTenant } from "@/lib/access";
import { formatCatalogPrice, getVerticalLabels } from "@/lib/verticals";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const { supabase, tenant } = await requireTenant();
  const labels = getVerticalLabels(tenant.tenant_type);
  const [productsResult, categoriesResult, activeResult, metricsResult] = await Promise.all([
    supabase.from("products").select("id,name,price,pricing_mode,active,created_at").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("active", true),
    supabase.rpc("get_tenant_product_metrics", { p_tenant_id: tenant.id, p_since: null }),
  ]);
  const { data: products } = productsResult;
  const categoriesCount = categoriesResult.count ?? 0;
  const activeProducts = activeResult.count ?? 0;
  const metrics = (metricsResult.data ?? { views: 0, top_products: [] }) as unknown as { views: number; top_products: { product_id: string; name: string; views: number; image_url: string | null }[] };
  const productViews = Number(metrics.views) || 0;
  const publicUrl = tenant.domain ? `https://${tenant.domain}` : `/${tenant.slug}`;

  return <main className="dashboard-content">
    <div className="page-heading"><div><span className="eyebrow eyebrow-dark">BOM TE VER POR AQUI</span><h1>Olá, {tenant.name}<span className="heading-period">.</span></h1><p>Um espaço para cuidar da sua loja e deixar tudo pronto para atender seus clientes.</p></div><Link href="/dashboard/products/new" className="button button-dark">+ {labels.createItem}</Link></div>
    <section className="stats-grid stats-grid-analytics">
      <article className="stat-card stat-card-featured"><span>{labels.items.toLocaleUpperCase("pt-BR")} ATIVOS</span><strong>{activeProducts}</strong><small>visíveis na sua vitrine</small><i>↗</i></article>
      <article className="stat-card"><span>CATEGORIAS</span><strong>{categoriesCount}</strong><small>organizam {labels.itemPlural}</small><i>◫</i></article>
      <article className="stat-card"><span>CLIQUES EM PRODUTOS</span><strong>{productViews}</strong><small>últimos 30 dias</small><i>⌁</i></article>
      <article className="stat-card"><span>ENDEREÇO DA LOJA</span><strong className="stat-domain">{tenant.domain ?? `/${tenant.slug}`}</strong><small>{tenant.domain ? "Domínio configurado" : "Endereço de prévia"}</small><i>⌁</i></article>
    </section>
    <section className="dashboard-columns">
      <div className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-dark">SEU CATÁLOGO</span><h2>Adicionados recentemente</h2></div><Link className="text-link" href="/dashboard/products">Ver todos <span>→</span></Link></div>
        {products?.length ? <div className="recent-list">{products.map((product) => <div className="recent-row" key={product.id}><div className="recent-product-icon">✳</div><div><strong>{product.name}</strong><span>{product.active ? "Publicado na vitrine" : "Rascunho"}</span></div><strong>{formatCatalogPrice(product.pricing_mode, product.price)}</strong></div>)}</div> : <div className="empty-inline"><span>✳</span><div><strong>A vitrine começa com uma boa escolha.</strong><p>Cadastre seu primeiro {labels.itemSingular} para ele aparecer aqui.</p></div><Link href="/dashboard/products/new" className="text-link">Adicionar <span>↗</span></Link></div>}
      </div>
      <aside className="panel launch-panel"><span className="eyebrow">UM BOM COMEÇO</span><h2>Sua loja está pronta para receber visitantes.</h2><p>Confira como os clientes vão ver seus produtos e compartilhe a vitrine.</p><Link className="button button-lime" href={publicUrl} target={tenant.domain ? "_blank" : undefined}>Abrir minha loja <span>↗</span></Link><div className="launch-mark" aria-hidden="true">v.</div></aside>
    </section>
    <section className="panel dashboard-top-products"><div className="panel-heading"><div><span className="eyebrow eyebrow-dark">ÚLTIMOS 30 DIAS</span><h2>Produtos mais acessados</h2></div><span className="dashboard-metric-note">{productViews} {productViews === 1 ? "clique" : "cliques"}</span></div>{metrics.top_products.length ? <div className="top-product-list">{metrics.top_products.map((product, index) => <article key={product.product_id}><span className="top-product-rank">0{index + 1}</span><div><strong>{product.name}</strong><small>Visualizações do produto</small></div><b>{product.views}</b></article>)}</div> : <p className="dashboard-no-views">Os acessos às páginas dos produtos aparecerão aqui.</p>}</section>
    {!tenant.whatsapp_number ? <div className="setup-banner"><span>↗</span><div><strong>Quase lá: configure seu WhatsApp.</strong><p>{tenant.tenant_type === "services" ? "Clientes poderão consultar seus serviços e pedir um orçamento." : tenant.tenant_type === "food" ? "Clientes poderão montar o pedido e enviar direto para você." : "Clientes poderão montar a sacola e enviar o pedido direto para você."}</p></div><Link href="/dashboard/settings">Configurar agora <span>→</span></Link></div> : null}
  </main>;
}
