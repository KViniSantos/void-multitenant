"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { ActionMessage } from "@/components/action-message";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return <form className="form-stack login-form" action={action}>
    <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" placeholder="voce@sualoja.com.br" required /></label>
    <label className="field"><span>Senha</span><input name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required /></label>
    <ActionMessage state={state} />
    <button className="button button-dark form-submit" type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar na minha conta"}<span>↗</span></button>
  </form>;
}
