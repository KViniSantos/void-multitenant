import type { ReactNode } from "react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/access";
import { signOutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requirePlatformAdmin();
  return <div className="admin-layout"><header className="admin-header"><Link className="brand-lockup" href="/admin"><span className="brand-mark">v.</span><span>vitrine<span className="brand-dot">.</span></span><span className="admin-badge">Plataforma</span></Link><nav className="admin-quick-nav" aria-label="Administração"><Link href="/admin">Visão geral</Link><Link href="/admin/tenants">Lojas</Link><Link href="/admin/domains">Domínios</Link></nav><div className="admin-header-right"><span>{profile?.email}</span><form action={signOutAction}><button type="submit">Sair da plataforma&nbsp; ↗</button></form></div></header>{children}</div>;
}
