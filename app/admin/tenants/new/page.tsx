import Link from "next/link";
import { CreateTenantForm } from "@/components/admin-tenant-form";
import { requirePlatformAdmin } from "@/lib/access";

export const metadata = { title: "Criar loja" };

export default async function NewTenantPage() {
  await requirePlatformAdmin();
  return <main className="admin-content"><div className="breadcrumbs"><Link href="/admin/tenants">Lojas</Link><span>/</span><span>Nova loja</span></div><div className="page-heading"><div><span className="eyebrow eyebrow-dark">UM NOVO NEGÓCIO</span><h1>Criar loja<span className="heading-period">.</span></h1><p>Cadastre a loja e convide quem vai cuidar dela.</p></div></div><div className="admin-create-form"><CreateTenantForm /></div></main>;
}
