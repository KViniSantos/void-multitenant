"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import type { Category, Product } from "@/lib/database.types";
import { saveProductAction } from "@/app/actions/dashboard";
import { ActionMessage } from "@/components/action-message";

export function ProductForm({ product, categories }: { product?: Product | null; categories: Pick<Category, "id" | "name" | "active">[] }) {
  const [state, action, pending] = useActionState(saveProductAction, {});
  return <form action={action} className="panel editor-form" encType="multipart/form-data">
    {product ? <input type="hidden" name="id" value={product.id} /> : null}
    <div className="form-section-heading"><span className="step-number">01</span><div><strong>Informações do produto</strong><p>Conte o que torna essa escolha especial.</p></div></div>
    <label className="field"><span>Nome do produto</span><input name="name" required minLength={2} maxLength={100} defaultValue={product?.name ?? ""} placeholder="Ex.: Bolsa de couro artesanal" /></label>
    <div className="form-row"><label className="field"><span>Preço</span><div className="price-input-wrap"><span>R$</span><input name="price" type="number" min="0" max="999999999" step="0.01" required defaultValue={product?.price ?? ""} placeholder="0,00" /></div></label><label className="field"><span>Categoria</span><select name="category_id" defaultValue={product?.category_id ?? ""}><option value="">Sem categoria</option>{categories.filter((category) => category.active || category.id === product?.category_id).map((category) => <option value={category.id} key={category.id}>{category.name}{category.active ? "" : " · inativa"}</option>)}</select></label></div>
    <label className="field"><span>Descrição <small>opcional</small></span><textarea name="description" rows={4} maxLength={2000} defaultValue={product?.description ?? ""} placeholder="Materiais, detalhes e o que faz esse produto único…" /></label>
    <div className="form-section-heading section-separator"><span className="step-number">02</span><div><strong>Imagem e visibilidade</strong><p>JPG, PNG, WebP ou AVIF · até 5 MB.</p></div></div>
    {product?.image_url ? <div className="current-image"><Image src={product.image_url} alt="Imagem atual do produto" width={62} height={62} unoptimized /><span>Imagem atual. Envie uma nova para substituir.</span></div> : null}
    <label className="field file-field"><span>Foto do produto</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><small>Uma boa foto ajuda o cliente a imaginar o produto.</small></label>
    <label className="switch-field"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} /><span className="switch-indicator" /><span><strong>Mostrar na minha vitrine</strong><small>Produtos ocultos continuam salvos no painel.</small></span></label>
    <ActionMessage state={state} />
    <div className="form-actions"><Link href="/dashboard/products" className="button button-outline">Cancelar</Link><button className="button button-dark" type="submit" disabled={pending}>{pending ? "Salvando…" : product ? "Salvar alterações" : "Salvar produto"}<span>↗</span></button></div>
    {state.success ? <p className="form-footnote">{state.success} Você pode continuar editando ou <Link href="/dashboard/products">voltar aos produtos</Link>.</p> : null}
  </form>;
}
