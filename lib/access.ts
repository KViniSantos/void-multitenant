import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Tenant } from "@/lib/database.types";

export async function getUserContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, tenant: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,platform_role,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id,owner_id,name,slug,domain,logo_url,primary_color,secondary_color,whatsapp_number,active,created_at,updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    user,
    profile: profile as Profile | null,
    tenant: tenant as Tenant | null,
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
