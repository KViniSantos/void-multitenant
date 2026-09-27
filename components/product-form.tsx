"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import type { Category, Product } from "@/lib/database.types";
import { saveProductAction } from "@/app/actions/dashboard";
import { ActionMessage } from "@/components/action-message";
import { PriceField } from "@/components/masked-fields";

export function ProductForm({ product, categories }: { product?: Product | null; categories: Pick<Category, "id" | "name" | "active">[] }) {
  const [state, action, pending] = useActionState(saveProductAction, {});
  const startingImages = product?.image_urls?.length ? product.image_urls : product?.image_url ? [product.image_url] : [];
  const [imageUrls, setImageUrls] = useState(startingImages);
  const [selectedCount, setSelectedCount] = useState(0);
  const selectedImageSummary = useMemo(() => selectedCount ? `${selectedCount} foto${selectedCount === 1 ? "" : "s"} nova${selectedCount === 1 ? "" : "s"} selecionada${selectedCount === 1 ? "" : "s"}` : "", [selectedCount]);
  return <form action={action} className="panel editor-form product-form-v2" encType="multipart/form-data">
    {product ? <input type="hidden" name="id" value={product.id} /> : null}
    <input type="hidden" name="image_urls" value={JSON.stringify(imageUrls)} />
    <div className="form-section-heading"><span className="step-number">01</span><div><strong>Informações do produto</strong><p>Descreva o produto de um jeito claro para quem visita sua loja.</p></div></div>
    <label className="field"><span>Nome do produto</span><input name="name" required minLength={2} maxLength={100} defaultValue={product?.name ?? ""} placeholder="Ex.: Câmera mirrorless X-T50" /></label>
    <div className="form-row"><label className="field"><span>Preço</span><div className="price-input-wrap"><span>R$</span><PriceField defaultValue={product?.price ?? ""} /></div></label><label className="field"><span>Categoria</span><select name="category_id" defaultValue={product?.category_id ?? ""}><option value="">Sem categoria</option>{categories.filter((category) => category.active || category.id === product?.category_id).map((category) => <option value={category.id} key={category.id}>{category.name}{category.active ? "" : " · inativa"}</option>)}</select></label></div>
    <label className="field"><span>Descrição <small>opcional</small></span><textarea name="description" rows={4} maxLength={2000} defaultValue={product?.description ?? ""} placeholder="Materiais, detalhes e o que faz esse produto especial…" /></label>
    <label className="field"><span>Destaques do produto <small>um por linha, opcional</small></span><textarea name="highlights" rows={4} maxLength={1800} defaultValue={product?.highlights?.join("\n") ?? ""} placeholder={"Sensor de alta resolução\nEstabilização de imagem\nGarantia de 12 meses"} /></label>

    <div className="form-section-heading section-separator"><span className="step-number">02</span><div><strong>Fotos do produto</strong><p>A primeira foto fica na vitrine. As demais aparecem na galeria.</p></div></div>
    {imageUrls.length ? <div className="product-gallery-editor">{imageUrls.map((url, index) => <div className="product-image-editor" key={`${url}-${index}`}><Image src={url} alt={`Foto ${index + 1} do produto`} width={92} height={92} /><span>{index === 0 ? "Principal" : `Foto ${index + 1}`}</span><button type="button" onClick={() => setImageUrls((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label={`Remover foto ${index + 1}`}>×</button></div>)}</div> : <p className="form-footnote">Nenhuma foto adicionada. Você pode salvar sem imagens.</p>}
    <label className="field file-field"><span>Adicionar fotos</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => setSelectedCount(event.target.files?.length ?? 0)} /><small>{selectedImageSummary || "JPG, PNG, WebP ou AVIF · até 5 MB por foto · no máximo 8 fotos no total."}</small></label>

    <div className="form-section-heading section-separator"><span className="step-number">03</span><div><strong>Disponibilidade e destaque</strong><p>Mostre ao cliente se o item está disponível ou sob encomenda.</p></div></div>
    <div className="form-row"><label className="field"><span>Disponibilidade</span><select name="availability" defaultValue={product?.availability ?? "in_stock"}><option value="in_stock">Pronta entrega</option><option value="preorder">Sob encomenda</option><option value="sold_out">Indisponível</option></select></label><label className="field"><span>Condição</span><select name="product_condition" defaultValue={product?.product_condition ?? "new"}><option value="new">Novo</option><option value="used">Seminovo</option><option value="refurbished">Recondicionado</option></select></label></div>
    <label className="field stock-field"><span>Quantidade em estoque <small>opcional</small></span><input type="number" name="stock_quantity" min="0" max="1000000" step="1" defaultValue={product?.stock_quantity ?? ""} placeholder="Deixe vazio se não for controlar estoque" /></label>
    <label className="switch-field"><input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} /><span className="switch-indicator" /><span><strong>Produto em destaque</strong><small>Produtos destacados aparecem na seção de destaques da loja.</small></span></label>
    <label className="switch-field"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} /><span className="switch-indicator" /><span><strong>Mostrar na minha vitrine</strong><small>Produtos ocultos continuam salvos no painel.</small></span></label>
    <ActionMessage state={state} />
    <div className="form-actions"><Link href="/dashboard/products" className="button button-outline">Cancelar</Link><button className="button button-dark" type="submit" disabled={pending}>{pending ? "Salvando…" : product ? "Salvar alterações" : "Salvar produto"}<span>↗</span></button></div>
    {state.success ? <p className="form-footnote">{state.success} Você pode continuar editando ou <Link href="/dashboard/products">voltar aos produtos</Link>.</p> : null}
  </form>;
}
