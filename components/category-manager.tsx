"use client";

import { useActionState, useState } from "react";
import type { Category } from "@/lib/database.types";
import { deleteCategoryAction, saveCategoryAction, toggleCategoryAction } from "@/app/actions/dashboard";
import { ActionMessage } from "@/components/action-message";

export function NewCategoryForm() {
  const [state, action, pending] = useActionState(saveCategoryAction, {});
  return <form action={action} className="new-category-form"><label className="field"><span>Nome da categoria</span><input name="name" required minLength={2} maxLength={60} placeholder="Ex.: Novidades" /></label><label className="switch-field compact-switch"><input name="active" type="checkbox" defaultChecked /><span className="switch-indicator" /><span><strong>Ativa</strong></span></label><button className="button button-dark" disabled={pending}>{pending ? "Salvando…" : "Criar categoria"}<span>↗</span></button><ActionMessage state={state} /></form>;
}

export function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [saveState, saveAction, saving] = useActionState(saveCategoryAction, {});
  const [deleteState, deleteAction, deleting] = useActionState(deleteCategoryAction, {});
  return <article className="category-row">
    <div className="category-row-icon">◫</div>
    {editing ? <form action={saveAction} className="category-edit-form"><input type="hidden" name="id" value={category.id} /><label className="field"><span className="visually-hidden">Nome da categoria</span><input name="name" defaultValue={category.name} required minLength={2} maxLength={60} /></label><label className="switch-field compact-switch"><input name="active" type="checkbox" defaultChecked={category.active} /><span className="switch-indicator" /><span><strong>Visível no catálogo</strong></span></label><button className="button button-small button-dark" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button><button className="button button-small button-outline" type="button" onClick={() => setEditing(false)}>Cancelar</button></form> : <><div className="category-row-main"><strong>{category.name}</strong><small>{category.active ? "Visível na loja" : "Oculta dos clientes"}</small></div><div className="category-row-actions"><span className={category.active ? "status-pill status-active" : "status-pill status-draft"}>{category.active ? "Ativa" : "Oculta"}</span><button className="button-small button-outline" type="button" onClick={() => setEditing(true)}>Editar</button><form action={toggleCategoryAction}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="active" value={String(category.active)} /><button className="button-small button-outline" type="submit">{category.active ? "Desativar" : "Ativar"}</button></form><form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Excluir a categoria “${category.name}”? Os produtos serão mantidos sem categoria.`)) event.preventDefault(); }}><input type="hidden" name="id" value={category.id} /><button className="button-small button-danger-text" type="submit" disabled={deleting}>{deleting ? "Excluindo…" : "Excluir"}</button></form></div></>}
    {saveState.error || saveState.success ? <ActionMessage state={saveState} /> : null}{deleteState.error ? <ActionMessage state={deleteState} /> : null}
  </article>;
}
