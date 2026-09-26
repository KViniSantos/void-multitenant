"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Configure as variáveis do Supabase para liberar o acesso." };
  }

  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Confira seus dados." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) return { error: "E-mail ou senha inválidos." };
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updatePasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  const schema = z.object({
    password: z.string().min(10, "Use uma senha com pelo menos 10 caracteres."),
    confirmation: z.string(),
  }).refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "As senhas não coincidem.",
  });
  const result = schema.safeParse({ password, confirmation });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Confira sua senha." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "O convite expirou. Peça um novo acesso ao administrador." };

  const { error } = await supabase.auth.updateUser({ password: result.data.password });
  if (error) return { error: "Não foi possível salvar a senha. Tente novamente." };
  redirect("/dashboard");
}
