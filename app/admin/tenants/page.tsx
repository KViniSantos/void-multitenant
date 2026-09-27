import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { ToggleTenantButton } from "@/components/toggle-tenant-button";

export const metadata = { title: "Lojas da plataforma" };
const PAGE_SIZE = 30;
type Search = { created?: string; pagina?: string; busca?: string; status?: string };

export default async function TenantsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { supabase } = await requirePlatformAdmin();
  const params = await searchParams;
  const requested = Number.parseInt(params.pagina ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 100_000) : 1;
  const search = (params.busca ?? "").trim().slice(0, 80);
  const status = ["active", "inactive"].includes(params.status ?? "") ? params.status : "";
  const query = () => {
    let builder = supabase.from("tenants").select("id,name,slug,domain,owner_id,active,created_at", { count: "exact" });
    if (search) builder = builder.ilike("name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
    if (status === "active") builder = builder.eq("active", true);
    if (status === "inactive") builder = builder.eq("active", false);
    return builder.order("created_at", { ascending: false });
  };
  const [tenantResult, metricsResult] = await Promise.all([
    query().range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.rpc("get_platform_product_metrics", { p_since: null }),
  ]);
  const total = tenantResult.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const tenants = currentPage === page ? tenantResult.data ?? [] : (await query().range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)).data ?? [];
  const ownerIds = [...new Set(tenants.map((tenant) => tenant.owner_id))];
  const owners = ownerIds.length ? await supabase.from("profiles").select("id,email").in("id", ownerIds) : { data: [] };
  const ownerEmail = new Map((owners.data ?? []).map((owner) => [owner.id, owner.email]));
  const metrics = (metricsResult.data ?? { views: 0 }) as unknown as { views: number };
  const pageHref = (nextPage: number) => {
    const url = new URLSearchParams();
    if (nextPage > 1) url.set("pagina", String(nextPage));
    if (search) url.set("busca", search);
    if (status) url.set("status", status);
    return `/admin/tenants${url.size ? `?${url}` : ""}`;
  };

  return <main className="admin-content"><div className="page-heading"><div><span className="eyebrow eyebrow-dark">GESTÃO DE CLIENTES</span><h1>Lojas<span className="heading-period">.</span></h1><p>{total} vitrines cadastradas · {Number(metrics.views) || 0} acessos a produtos nos últimos 30 dias.</p></div><div className="admin-page-actions"><Link className="button button-outline" href="/admin/domains">Domínios</Link><Link className="button button-dark" href="/admin/tenants/new">+ Criar loja</Link></div></div>{params.created ? <div className="action-message action-message--success" style={{ marginBottom: 16 }}>{params.created === "invited" ? "Loja criada e convite enviado ao novo proprietário. Ele precisará aceitar o convite e definir uma senha." : "Loja criada e associada à conta já existente. Nenhum convite foi enviado."}</div> : null}
    <form className="product-list-filters" action="/admin/tenants" method="get"><label><span className="visually-hidden">Buscar loja</span><input name="busca" defaultValue={search} placeholder="Buscar loja pelo nome" /></label><label><span className="visually-hidden">Status da loja</span><select name="status" defaultValue={status}><option value="">Todos os status</option><option value="active">Ativas</option><option value="inactive">Pausadas</option></select></label><button className="button button-outline" type="submit">Filtrar</button></form>
    <section className="panel tenant-table"><div className="tenant-table-head"><span>LOJA</span><span>PROPRIETÁRIO</span><span>DOMÍNIO</span><span>STATUS</span><span>CRIADA</span><span>AÇÕES</span></div>{tenants.map((tenant) => <article className="tenant-admin-row" key={tenant.id}><div className="tenant-name-cell"><span>{tenant.name.slice(0, 1).toUpperCase()}</span><div><strong>{tenant.name}</strong><small>/{tenant.slug}</small></div></div><span className="tenant-owner-cell">{ownerEmail.get(tenant.owner_id) ?? "—"}</span><span className="tenant-domain-cell">{tenant.domain ?? "—"}</span><span className={tenant.active ? "status-pill status-active" : "status-pill status-draft"}>{tenant.active ? "Ativa" : "Pausada"}</span><span className="tenant-created">{formatDate(tenant.created_at)}</span><div className="admin-tenant-actions"><Link className="button-small button-outline" href={`/admin/tenants/${tenant.id}`}>Editar</Link><ToggleTenantButton id={tenant.id} active={tenant.active} /></div></article>)}{!tenants.length ? <div className="category-empty"><span>◌</span><strong>Nenhuma loja encontrada.</strong><p>Altere os filtros ou crie a primeira loja.</p></div> : null}</section>
    {total > PAGE_SIZE ? <nav className="admin-pagination" aria-label="Paginação de lojas"><Link className={currentPage <= 1 ? "is-disabled" : ""} href={pageHref(Math.max(1, currentPage - 1))}>← Anterior</Link><span>Página {currentPage} de {pages} · {total} lojas</span><Link className={currentPage >= pages ? "is-disabled" : ""} href={pageHref(Math.min(pages, currentPage + 1))}>Próxima →</Link></nav> : null}
  </main>;
}
