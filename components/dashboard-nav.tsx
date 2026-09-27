"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import type { Tenant } from "@/lib/database.types";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: "⌂", exact: true },
  { href: "/dashboard/products", label: "Produtos", icon: "▧" },
  { href: "/dashboard/categories", label: "Categorias", icon: "◫" },
  { href: "/dashboard/settings", label: "Configurações", icon: "⚙" },
];

export function DashboardNav({ tenantSlug, storeName, tenants = [], platformAdmin = false }: { tenantSlug?: string; storeName?: string; tenants?: Pick<Tenant, "id" | "name">[]; platformAdmin?: boolean }) {
  const pathname = usePathname();
  const storeHref = tenantSlug ? `/${tenantSlug}` : "/dashboard/setup-needed";
  return (
    <aside className="dashboard-sidebar">
      <Link className="brand-lockup" href="/dashboard">
        <span className="brand-mark">v.</span>
        <span>vitrine<span className="brand-dot">.</span></span>
      </Link>
      <div className="sidebar-label">ESPAÇO DA LOJA</div>
      {storeName ? <div className="sidebar-store"><span className="store-avatar">{storeName.slice(0, 1).toUpperCase()}</span><span>{storeName}</span><span className="online-dot" /></div> : null}
      <nav className="sidebar-links" aria-label="Navegação da loja">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} className={`sidebar-link${active ? " active" : ""}`}><span className="sidebar-icon">{link.icon}</span>{link.label}</Link>;
        })}
        {tenants.length > 1 ? <Link href="/dashboard/stores" className={`sidebar-link${pathname === "/dashboard/stores" ? " active" : ""}`}><span className="sidebar-icon">▦</span>Trocar loja</Link> : null}
        {platformAdmin ? <Link href="/admin" className="sidebar-link"><span className="sidebar-icon">⌘</span>Admin da plataforma</Link> : null}
      </nav>
      <div className="sidebar-bottom">
        <Link href={storeHref} className="sidebar-link"><span className="sidebar-icon">↗</span>Ver minha loja</Link>
        <form action={signOutAction}><button className="sidebar-link sidebar-logout" type="submit"><span className="sidebar-icon">⇥</span>Sair da conta</button></form>
        <div className="sidebar-footnote">Feito para vender com<br />conversa e confiança.</div>
      </div>
    </aside>
  );
}
