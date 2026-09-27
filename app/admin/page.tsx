import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/access";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Administração da plataforma" };

export default async function AdminHomePage() {
  const { supabase } = await requirePlatformAdmin();
  const [total, active, inactive, recent, metricsResult] = await Promise.all([
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("active", false),
    supabase.from("tenants").select("id,name,slug,domain,owner_id,active,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.rpc("get_platform_product_metrics", { p_since: null }),
  ]);
  const tenants = recent.data ?? [];
  const ownerIds = [...new Set(tenants.map((tenant) => tenant.owner_id))];
  const owners = ownerIds.length ? await supabase.from("profiles").select("id,email").in("id", ownerIds) : { data: [] };
  const ownerEmail = new Map((owners.data ?? []).map((owner) => [owner.id, owner.email]));
  const metrics = (metricsResult.data ?? { views: 0, top_tenants: [], top_products: [] }) as unknown as { views: number; top_tenants: { tenant_id: string; name: string; views: number }[]; top_products: { product_id: string; product_name: string; tenant_name: string; views: number }[] };

  return <main className="admin-content"><div className="page-heading"><div><span className="eyebrow eyebrow-dark">ADMINISTRAÇÃO DA PLATAFORMA</span><h1>Olá, admin<span className="heading-period">.</span></h1><p>Acompanhe as lojas e mantenha tudo organizado.</p></div><Link className="button button-dark" href="/admin/tenants/new">+ Criar loja</Link></div>
    <section className="admin-kpis admin-kpis-four"><article className="admin-kpi"><span>TODAS AS LOJAS</span><strong>{total.count ?? 0}</strong></article><article className="admin-kpi"><span>ATIVAS</span><strong>{active.count ?? 0}</strong></article><article className="admin-kpi"><span>PAUSADAS</span><strong>{inactive.count ?? 0}</strong></article><article className="admin-kpi"><span>CLIQUES EM PRODUTOS · 30 DIAS</span><strong>{Number(metrics.views) || 0}</strong></article></section>
    <section className="panel tenant-table"><div className="panel-heading" style={{ padding: "20px 19px 12px" }}><div><span className="eyebrow eyebrow-dark">ACOMPANHAMENTO</span><h2 className="panel-heading-title">Lojas recentes</h2></div><Link className="text-link" href="/admin/tenants">Ver todas <span>→</span></Link></div><div className="tenant-table-head"><span>LOJA</span><span>PROPRIETÁRIO</span><span>DOMÍNIO</span><span>STATUS</span><span>CRIADA</span><span /></div>{tenants.length ? tenants.map((tenant) => <article className="tenant-admin-row" key={tenant.id}><div className="tenant-name-cell"><span>{tenant.name.slice(0, 1).toUpperCase()}</span><div><strong>{tenant.name}</strong><small>/{tenant.slug}</small></div></div><span className="tenant-owner-cell">{ownerEmail.get(tenant.owner_id) ?? "—"}</span><span className="tenant-domain-cell">{tenant.domain ?? "—"}</span><span className={tenant.active ? "status-pill status-active" : "status-pill status-draft"}>{tenant.active ? "Ativa" : "Pausada"}</span><span className="tenant-created">{formatDate(tenant.created_at)}</span><Link className="button-small button-outline" href={`/admin/tenants/${tenant.id}`}>Abrir</Link></article>) : <div className="category-empty"><span>◌</span><strong>Nenhuma loja cadastrada.</strong><p>Crie a primeira loja e envie o convite ao proprietário.</p></div>}</section>
    <section className="admin-activity-grid"><article className="panel admin-activity-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-dark">ENGAJAMENTO</span><h2>Lojas mais acessadas</h2></div></div>{metrics.top_tenants.length ? metrics.top_tenants.map((tenant) => <div className="admin-activity-row" key={tenant.tenant_id}><span>{tenant.name}</span><strong>{tenant.views} acessos</strong></div>) : <p className="dashboard-no-views">Os acessos às páginas de produtos aparecerão aqui.</p>}</article><article className="panel admin-activity-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-dark">PRODUTOS</span><h2>Mais acessados</h2></div></div>{metrics.top_products.length ? metrics.top_products.map((product) => <div className="admin-activity-row" key={product.product_id}><span><b>{product.product_name}</b><small>{product.tenant_name}</small></span><strong>{product.views} acessos</strong></div>) : <p className="dashboard-no-views">Nenhum acesso registrado ainda.</p>}</article></section>
  </main>;
}
