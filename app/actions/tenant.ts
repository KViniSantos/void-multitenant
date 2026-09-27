"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSignedIn } from "@/lib/access";

export async function switchTenantAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("tenant_id"));
  if (!id.success) redirect("/dashboard/stores?error=invalid");
  const { supabase, user } = await requireSignedIn();
  if (!user) redirect("/login");
  const { data } = await supabase.from("tenants").select("id").eq("id", id.data).eq("owner_id", user.id).maybeSingle();
  if (!data) redirect("/dashboard/stores?error=not-found");
  (await cookies()).set("void_active_tenant", id.data, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  redirect("/dashboard");
}
