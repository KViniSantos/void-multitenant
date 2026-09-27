import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/access";

export const metadata = { title: "Domínios" };

export default async function DomainsPage({ searchParams }: { searchParams: Promise<{ pagina?: string; busca?: string }> }) {
  const { supabase } = await requirePlatformAdmin();
  const params = await searchParams;
  const requested = Number.parseInt(params.pagina ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 100_000) : 1;
  const search = (params.busca ?? "").trim().slice(0, 80);
  let query = supabase.from("tenants").select("id,name,slug,domain,active", { count: "exact" });
  if (search) query = query.or(`name.ilike.%${search.replace(/[\\%_,]/g, "\\$&")}%,domain.ilike.%${search.replace(/[\\%_,]/g, "\\$&")}%`);
  const result = await query.order("name").range((page - 1) * 30, page * 30 - 1);
  const total = result.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / 30));
  const currentPage = Math.min(page, pages);
  const tenants = currentPage === page ? result.data ?? [] : (await query.order("name").range((currentPage - 1) * 30, currentPage * 30 - 1)).data ?? [];
  const pageHref = (nextPage: number) => {
    const queryParams = new URLSearchParams();
    if (nextPage > 1) queryParams.set("pagina", String(nextPage));
    if (search) queryParams.set("busca", search);
    const serialized = queryParams.toString();
    return `/admin/domains${serialized ? `?${serialized}` : ""}`;
  };
  return <main className="admin-content"><div className="page-heading"><div><span className="eyebrow eyebrow-dark">ENDEREÇOS DAS LOJAS</span><h1>Domínios<span className="heading-period">.</span></h1><p>Veja os domínios associados e abra o cadastro para atualizar cada loja.</p></div><Link href="/admin/tenants/new" className="button button-dark">+ Criar loja</Link></div><div className="domain-setup-note"><strong>Como conectar um domínio próprio</strong><ol><li>Confirme com o lojista que ele controla o domínio.</li><li>Adicione o domínio ao projeto da VOID na Vercel.</li><li>Configure no DNS os registros exatos mostrados pela Vercel e aguarde a validação.</li><li>Salve o domínio abaixo na loja e confirme que o certificado HTTPS está ativo.</li></ol><p>O campo salvo no banco faz o roteamento da loja. Ele não adiciona o domínio à Vercel nem valida a propriedade automaticamente.</p></div><form className="product-list-filters" action="/admin/domains" method="get"><label><span className="visually-hidden">Buscar domínio ou loja</span><input name="busca" defaultValue={search} placeholder="Buscar pelo nome da loja ou domínio" /></label><button className="button button-outline" type="submit">Buscar</button></form><section className="panel domain-admin-list"><div className="domain-admin-row domain-admin-heading"><span>LOJA</span><span>DOMÍNIO</span><span>ESTADO NO APP</span><span /></div>{tenants.map((tenant) => <article className="domain-admin-row" key={tenant.id}><div><strong>{tenant.name}</strong><small>/{tenant.slug}</small></div><span>{tenant.domain ?? "Sem domínio próprio"}</span><span className={tenant.domain ? "status-pill status-draft" : "status-pill status-active"}>{tenant.domain ? "Validação Vercel/DNS" : "Usando endereço de prévia"}</span><Link className="button-small button-outline" href={`/admin/tenants/${tenant.id}`}>Editar</Link></article>)}{!tenants.length ? <div className="category-empty"><strong>Nenhuma loja encontrada.</strong></div> : null}</section>{total > 30 ? <nav className="admin-pagination" aria-label="Paginação de domínios"><Link className={currentPage <= 1 ? "is-disabled" : ""} href={pageHref(Math.max(1, currentPage - 1))}>← Anterior</Link><span>Página {currentPage} de {pages} · {total} lojas</span><Link className={currentPage >= pages ? "is-disabled" : ""} href={pageHref(Math.min(pages, currentPage + 1))}>Próxima →</Link></nav> : null}</main>;
}
