import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const supabase = await createSupabaseServerClient();

  if (tokenHash && type) {
    const allowedTypes = ["invite", "signup", "recovery", "email"] as const;
    if ((allowedTypes as readonly string[]).includes(type)) {
      await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as (typeof allowedTypes)[number] });
    }
  } else if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNext, request.url));
}
