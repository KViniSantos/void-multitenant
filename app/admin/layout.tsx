import type { ReactNode } from "react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/access";
import { signOutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requirePlatformAdmin();
  return <div className="admin-layout"><header className="admin-header"><Link className="brand-lockup" href="/admin"><span className="brand-mark">v.</span><span>vitrine<span className="brand-dot">.</span></span><span className="admin-badge">Plataforma</span></Link><div className="admin-header-right"><span>{profile?.email}</span><form action={signOutAction}><button type="submit">Sair da plataforma&nbsp; ↗</button></form></div></header>{children}</div>;
}
