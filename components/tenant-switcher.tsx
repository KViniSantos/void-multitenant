import Image from "next/image";
import { switchTenantAction } from "@/app/actions/tenant";
import type { TenantSummary } from "@/lib/database.types";

export function TenantSwitcher({ tenants, activeTenantId }: { tenants: TenantSummary[]; activeTenantId?: string }) {
  return <div className="tenant-switcher-grid">{tenants.map((tenant) => <form action={switchTenantAction} key={tenant.id}><input type="hidden" name="tenant_id" value={tenant.id} /><button className={`tenant-switcher-card ${tenant.id === activeTenantId ? "is-active" : ""}`} type="submit"><span className="tenant-switcher-logo">{tenant.logo_url ? <Image src={tenant.logo_url} alt="" fill sizes="58px" /> : tenant.name.slice(0, 1).toUpperCase()}</span><span className="tenant-switcher-copy"><strong>{tenant.name}</strong><small>{tenant.domain ?? `/${tenant.slug}`}</small></span>{tenant.id === activeTenantId ? <span className="tenant-switcher-current">Atual</span> : <span className="tenant-switcher-open">Abrir ↗</span>}</button></form>)}</div>;
}
