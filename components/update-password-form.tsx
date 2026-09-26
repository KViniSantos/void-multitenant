"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/app/actions/auth";
import { ActionMessage } from "@/components/action-message";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, {});
  return <form className="form-stack" action={action}>
    <label className="field"><span>Nova senha</span><input name="password" type="password" minLength={10} autoComplete="new-password" required /></label>
    <label className="field"><span>Confirme a senha</span><input name="confirmation" type="password" minLength={10} autoComplete="new-password" required /></label>
    <ActionMessage state={state} />
    <button className="button button-dark form-submit" type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar e entrar"}<span>↗</span></button>
  </form>;
}
