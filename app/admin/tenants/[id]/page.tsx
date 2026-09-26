import Link from "next/link";
import { notFound } from "next/navigation";
import { EditTenantForm } from "@/components/admin-tenant-form";
import { requirePlatformAdmin } from "@/lib/access";
import type { Tenant } from "@/lib/database.types";

export const metadata = { title: "Editar loja" };

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requirePlatformAdmin();
  const { data } = await supabase.from("tenants").select("id,owner_id,name,slug,domain,logo_url,primary_color,secondary_color,whatsapp_number,active,created_at,updated_at").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { data: owner } = await supabase.from("profiles").select("email").eq("id", data.owner_id).maybeSingle();
  return <main className="admin-content"><div className="breadcrumbs"><Link href="/admin/tenants">Lojas</Link><span>/</span><span>{data.name}</span></div><div className="page-heading"><div><span className="eyebrow eyebrow-dark">GESTÃO DA LOJA</span><h1>{data.name}<span className="heading-period">.</span></h1><p>Atualize os dados, o proprietário e o status da vitrine.</p></div></div><div className="admin-create-form"><EditTenantForm tenant={data as Tenant} ownerEmail={owner?.email ?? ""} /></div></main>;
}
