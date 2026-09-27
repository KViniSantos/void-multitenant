import "server-only";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Tenant, TenantSummary } from "@/lib/database.types";

type UserContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  tenants: TenantSummary[];
};

export async function getUserContext(): Promise<UserContext> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, tenant: null, tenants: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,platform_role,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: tenantData } = await supabase
    .from("tenants")
    .select("id,name,slug,domain,logo_url,tenant_type,active,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);
  const tenants = (tenantData ?? []) as TenantSummary[];
  const tenantCookie = (await cookies()).get("void_active_tenant")?.value;
  const selectedTenant = tenants.find((item) => item.id === tenantCookie) ?? tenants[0] ?? null;
  const { data: fullTenant } = selectedTenant
    ? await supabase.from("tenants").select("*").eq("id", selectedTenant.id).eq("owner_id", user.id).maybeSingle()
    : { data: null };
  const tenant = (fullTenant ?? null) as Tenant | null;

  return {
    supabase,
    user,
    profile: profile as Profile | null,
    tenant,
    tenants,
  };
}

export async function requireSignedIn() {
  const context = await getUserContext();
  if (!context.user) redirect("/login");
  return context;
}

export async function requireTenant() {
  const context = await requireSignedIn();
  if (!context.tenant) {
    if (context.profile?.platform_role === "platform_admin") redirect("/admin");
    redirect("/dashboard/setup-needed");
  }
  return { ...context, tenant: context.tenant };
}

export async function requirePlatformAdmin() {
  const context = await requireSignedIn();
  if (context.profile?.platform_role !== "platform_admin") redirect("/dashboard");
  return context;
}
