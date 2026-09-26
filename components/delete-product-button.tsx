"use client";

import { useActionState } from "react";
import { deleteProductAction } from "@/app/actions/dashboard";
import { ActionMessage } from "@/components/action-message";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(deleteProductAction, {});
  return <div className="delete-control"><form action={action} onSubmit={(event) => { if (!window.confirm(`Excluir “${name}”?`)) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><button className="button-icon-danger" aria-label={`Excluir ${name}`} disabled={pending}>×</button></form>{state.error ? <ActionMessage state={state} /> : null}</div>;
}
