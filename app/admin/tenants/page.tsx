import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { ToggleTenantButton } from "@/components/toggle-tenant-button";

export const metadata = { title: "Lojas da plataforma" };

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { supabase } = await requirePlatformAdmin();
  const [tenantResult, params] = await Promise.all([
    supabase.from("tenants").select("id,name,slug,domain,owner_id,active,created_at").order("created_at", { ascending: false }),
    searchParams,
  ]);
  const tenants = tenantResult.data ?? [];
  const ownerIds = [...new Set(tenants.map((tenant) => tenant.owner_id))];
  const owners = ownerIds.length ? await supabase.from("profiles").select("id,email").in("id", ownerIds) : { data: [] };
  const ownerEmail = new Map((owners.data ?? []).map((owner) => [owner.id, owner.email]));

  return <main className="admin-content"><div className="page-heading"><div><span className="eyebrow eyebrow-dark">GESTÃO DE CLIENTES</span><h1>Lojas<span className="heading-period">.</span></h1><p>Crie e acompanhe as vitrines da plataforma.</p></div><Link className="button button-dark" href="/admin/tenants/new">+ Criar loja</Link></div>{params.created ? <div className="action-message action-message--success" style={{ marginBottom: 16 }}>Loja criada. O proprietário receberá um convite por e-mail.</div> : null}
    <section className="panel tenant-table"><div className="tenant-table-head"><span>LOJA</span><span>PROPRIETÁRIO</span><span>DOMÍNIO</span><span>STATUS</span><span>CRIADA</span><span>AÇÕES</span></div>{tenants.map((tenant) => <article className="tenant-admin-row" key={tenant.id}><div className="tenant-name-cell"><span>{tenant.name.slice(0, 1).toUpperCase()}</span><div><strong>{tenant.name}</strong><small>/{tenant.slug}</small></div></div><span className="tenant-owner-cell">{ownerEmail.get(tenant.owner_id) ?? "—"}</span><span className="tenant-domain-cell">{tenant.domain ?? "—"}</span><span className={tenant.active ? "status-pill status-active" : "status-pill status-draft"}>{tenant.active ? "Ativa" : "Pausada"}</span><span className="tenant-created">{formatDate(tenant.created_at)}</span><div className="admin-tenant-actions"><Link className="button-small button-outline" href={`/admin/tenants/${tenant.id}`}>Editar</Link><ToggleTenantButton id={tenant.id} active={tenant.active} /></div></article>)}{!tenants.length ? <div className="category-empty"><span>◌</span><strong>Nenhuma loja cadastrada.</strong><p>Crie a primeira loja para começar.</p></div> : null}</section>
  </main>;
}
