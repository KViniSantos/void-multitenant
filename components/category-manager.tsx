"use client";

import { useActionState } from "react";
import type { Category } from "@/lib/database.types";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/dashboard";
import { ActionMessage } from "@/components/action-message";

export function NewCategoryForm() {
  const [state, action, pending] = useActionState(saveCategoryAction, {});
  return <form action={action} className="new-category-form"><label className="field"><span>Nome da categoria</span><input name="name" required minLength={2} maxLength={60} placeholder="Ex.: Novidades" /></label><label className="switch-field compact-switch"><input name="active" type="checkbox" defaultChecked /><span className="switch-indicator" /><span><strong>Ativa</strong></span></label><button className="button button-dark" disabled={pending}>{pending ? "Salvando…" : "Criar categoria"}<span>↗</span></button><ActionMessage state={state} /></form>;
}

export function CategoryRow({ category }: { category: Category }) {
  const [saveState, saveAction, saving] = useActionState(saveCategoryAction, {});
  const [deleteState, deleteAction, deleting] = useActionState(deleteCategoryAction, {});
  return <article className="category-row">
    <div className="category-row-icon">◫</div>
    <form action={saveAction} className="category-edit-form"><input type="hidden" name="id" value={category.id} /><label className="field"><span className="visually-hidden">Nome da categoria</span><input name="name" defaultValue={category.name} required minLength={2} maxLength={60} /></label><label className="switch-field compact-switch"><input name="active" type="checkbox" defaultChecked={category.active} /><span className="switch-indicator" /><span><strong>{category.active ? "Ativa" : "Oculta"}</strong></span></label><button className="button button-small button-outline" disabled={saving}>{saving ? "Salvando" : "Salvar"}</button></form>
    <form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Excluir “${category.name}”? Os produtos serão mantidos.`)) event.preventDefault(); }}><input type="hidden" name="id" value={category.id} /><button className="button-icon-danger" aria-label={`Excluir ${category.name}`} disabled={deleting}>×</button></form>
    {saveState.error || saveState.success ? <ActionMessage state={saveState} /> : null}{deleteState.error ? <ActionMessage state={deleteState} /> : null}
  </article>;
}
