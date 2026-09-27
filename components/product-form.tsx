"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import type { Category, Product, ProductAttribute, ProductDetailSection } from "@/lib/database.types";
import { saveProductAction } from "@/app/actions/dashboard";
import { ActionMessage } from "@/components/action-message";
import { PriceField } from "@/components/masked-fields";
import { uploadTenantImages } from "@/lib/browser-assets";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ActionState } from "@/lib/actions";

export function ProductForm({ tenantId, product, categories }: { tenantId: string; product?: Product | null; categories: Pick<Category, "id" | "name" | "active">[] }) {
  const [uploadStatus, setUploadStatus] = useState("");
  const [state, action, pending] = useActionState(async (previous: ActionState, formData: FormData): Promise<ActionState> => {
    let uploadedPaths: string[] = [];
    try {
      const urls = JSON.parse(String(formData.get("image_urls") ?? "[]")) as unknown;
      if (!Array.isArray(urls) || !urls.every((url) => typeof url === "string") || urls.length > 8) {
        return { error: "A lista de fotos do produto está inválida." };
      }
      const rawSections = JSON.parse(String(formData.get("detail_sections") ?? "[]")) as unknown;
      if (!Array.isArray(rawSections)) return { error: "As seções adicionais estão inválidas." };
      const cleanSections = (rawSections as ProductDetailSection[]).map((section) => ({
        title: section.title.trim(),
        items: section.items.filter((item) => item.label.trim() && item.value.trim()).map((item) => ({ label: item.label.trim(), value: item.value.trim() })),
      })).filter((section) => section.title && section.items.length);
      formData.set("detail_sections", JSON.stringify(cleanSections));
      const rawAttributes = JSON.parse(String(formData.get("attributes") ?? "[]")) as unknown;
      if (!Array.isArray(rawAttributes)) return { error: "Os atributos do produto estão inválidos." };
      const cleanAttributes = rawAttributes.map((attribute) => {
        if (!attribute || typeof attribute !== "object") return { name: "", values: [] as string[] };
        const value = attribute as { name?: unknown; values?: unknown };
        return {
          name: typeof value.name === "string" ? value.name.trim() : "",
          values: Array.isArray(value.values) ? value.values.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [],
        };
      }).filter((attribute) => attribute.name);
      formData.set("attributes", JSON.stringify(cleanAttributes));
      const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
      if (files.length > 8 - urls.length) return { error: `Mantenha no máximo 8 fotos. Você já tem ${urls.length}.` };
      if (files.length) {
        setUploadStatus(`Enviando ${files.length} foto${files.length === 1 ? "" : "s"} ao Supabase…`);
        const uploaded = await uploadTenantImages(createSupabaseBrowserClient(), files, tenantId, "products", 8 - urls.length);
        if (uploaded.error) return { error: uploaded.error };
        uploadedPaths = uploaded.paths;
        formData.set("image_urls", JSON.stringify([...urls, ...uploaded.urls]));
      }
      formData.delete("images");
      const result = await saveProductAction(previous, formData);
      if (result.error && uploadedPaths.length) {
        await createSupabaseBrowserClient().storage.from("store-assets").remove(uploadedPaths);
      }
      return result;
    } catch (error) {
      if (uploadedPaths.length) await createSupabaseBrowserClient().storage.from("store-assets").remove(uploadedPaths);
      return { error: error instanceof Error ? error.message : "Não foi possível enviar as fotos. Tente novamente." };
    } finally {
      setUploadStatus("");
    }
  }, {});
  const startingImages = product?.image_urls?.length ? product.image_urls : product?.image_url ? [product.image_url] : [];
  const [imageUrls, setImageUrls] = useState(startingImages);
  const [detailSections, setDetailSections] = useState<ProductDetailSection[]>(product?.detail_sections ?? []);
  const [attributes, setAttributes] = useState<ProductAttribute[]>(product?.attributes ?? []);
  const [selectedCount, setSelectedCount] = useState(0);
  const selectedImageSummary = useMemo(() => selectedCount ? `${selectedCount} foto${selectedCount === 1 ? "" : "s"} nova${selectedCount === 1 ? "" : "s"} selecionada${selectedCount === 1 ? "" : "s"}` : "", [selectedCount]);
  const updateDetailSection = (index: number, update: (section: ProductDetailSection) => ProductDetailSection) => setDetailSections((current) => current.map((section, currentIndex) => currentIndex === index ? update(section) : section));
  const updateAttribute = (index: number, update: (attribute: ProductAttribute) => ProductAttribute) => setAttributes((current) => current.map((attribute, currentIndex) => currentIndex === index ? update(attribute) : attribute));
  return <form action={action} className="panel editor-form product-form-v2" encType="multipart/form-data">
    {product ? <input type="hidden" name="id" value={product.id} /> : null}
    <input type="hidden" name="image_urls" value={JSON.stringify(imageUrls)} />
    <input type="hidden" name="attributes" value={JSON.stringify(attributes)} />
    <div className="form-section-heading"><span className="step-number">01</span><div><strong>Informações do produto</strong><p>Descreva o produto de um jeito claro para quem visita sua loja.</p></div></div>
    <label className="field"><span>Nome do produto</span><input name="name" required minLength={2} maxLength={100} defaultValue={product?.name ?? ""} placeholder="Ex.: Câmera mirrorless X-T50" /></label>
    <div className="form-row"><label className="field"><span>Preço no Pix</span><div className="price-input-wrap"><span>R$</span><PriceField name="price" defaultValue={product?.price ?? ""} /></div></label><label className="field"><span>Preço no cartão <small>em até 12x</small></span><div className="price-input-wrap"><span>R$</span><PriceField name="card_price" defaultValue={product?.card_price ?? product?.price ?? ""} /></div></label></div>
    <label className="field"><span>Categoria</span><select name="category_id" defaultValue={product?.category_id ?? ""}><option value="">Sem categoria</option>{categories.filter((category) => category.active || category.id === product?.category_id).map((category) => <option value={category.id} key={category.id}>{category.name}{category.active ? "" : " · inativa"}</option>)}</select></label>
    <label className="field"><span>Descrição <small>opcional</small></span><textarea name="description" rows={4} maxLength={2000} defaultValue={product?.description ?? ""} placeholder="Materiais, detalhes e o que faz esse produto especial…" /></label>
    <label className="field"><span>Destaques do produto <small>até 20 itens, um por linha</small></span><textarea name="highlights" rows={4} maxLength={4000} defaultValue={product?.highlights?.join("\n") ?? ""} placeholder={"Sensor de alta resolução\nEstabilização de imagem\nGarantia de 12 meses"} /></label>

    <div className="form-section-heading section-separator"><span className="step-number">02</span><div><strong>Informações adicionais</strong><p>Crie seções e campos adequados ao tipo de produto, como medidas, material, compatibilidade ou composição.</p></div></div>
    <input type="hidden" name="detail_sections" value={JSON.stringify(detailSections)} />
    <div className="product-detail-sections-editor">{detailSections.map((section, sectionIndex) => <fieldset className="product-detail-section-editor" key={`detail-${sectionIndex}`}>
      <legend>Seção {sectionIndex + 1}</legend>
      <div className="product-detail-section-heading"><label className="field"><span>Título da seção</span><input value={section.title} maxLength={80} placeholder="Ex.: Especificações" onChange={(event) => updateDetailSection(sectionIndex, (current) => ({ ...current, title: event.target.value }))} /></label><button type="button" className="button button-outline button-danger-text" onClick={() => setDetailSections((current) => current.filter((_, index) => index !== sectionIndex))}>Remover seção</button></div>
      {section.items.map((item, itemIndex) => <div className="product-detail-spec-row" key={`detail-${sectionIndex}-${itemIndex}`}><label className="field"><span>Informação</span><input value={item.label} maxLength={60} placeholder="Ex.: Material" onChange={(event) => updateDetailSection(sectionIndex, (current) => ({ ...current, items: current.items.map((entry, index) => index === itemIndex ? { ...entry, label: event.target.value } : entry) }))} /></label><label className="field"><span>Valor</span><input value={item.value} maxLength={240} placeholder="Ex.: Alumínio" onChange={(event) => updateDetailSection(sectionIndex, (current) => ({ ...current, items: current.items.map((entry, index) => index === itemIndex ? { ...entry, value: event.target.value } : entry) }))} /></label><button type="button" className="button button-outline button-danger-text" aria-label={`Remover informação ${itemIndex + 1}`} onClick={() => updateDetailSection(sectionIndex, (current) => ({ ...current, items: current.items.filter((_, index) => index !== itemIndex) }))}>Remover</button></div>)}
      <button type="button" className="button button-outline" disabled={section.items.length >= 12} onClick={() => updateDetailSection(sectionIndex, (current) => ({ ...current, items: [...current.items, { label: "", value: "" }] }))}>+ Adicionar informação</button>
    </fieldset>)}</div>
    <button type="button" className="button button-outline product-add-detail-section" disabled={detailSections.length >= 6} onClick={() => setDetailSections((current) => [...current, { title: "Informações adicionais", items: [{ label: "", value: "" }] }])}>+ Adicionar seção</button>

    <div className="form-section-heading section-separator"><span className="step-number">03</span><div><strong>Opções do produto</strong><p>Defina atributos que o cliente precisa escolher, como cor ou tamanho. Informe uma opção por linha.</p></div></div>
    <div className="product-attributes-editor">{attributes.map((attribute, index) => <fieldset className="product-attribute-editor" key={`attribute-${index}`}><legend>Atributo {index + 1}</legend><div className="product-attribute-fields"><label className="field"><span>Nome do atributo</span><input value={attribute.name} maxLength={40} placeholder="Ex.: Cor" onChange={(event) => updateAttribute(index, (current) => ({ ...current, name: event.target.value }))} /></label><label className="field"><span>Opções disponíveis <small>uma por linha, até 20</small></span><textarea rows={4} maxLength={1800} value={attribute.values.join("\n")} placeholder={"Azul\nPreto\nBranco"} onChange={(event) => updateAttribute(index, (current) => ({ ...current, values: event.target.value.split(/\r?\n/).slice(0, 20) }))} /></label></div><button type="button" className="button button-outline button-danger-text" onClick={() => setAttributes((current) => current.filter((_, currentIndex) => currentIndex !== index))}>Remover atributo</button></fieldset>)}</div>
    <button type="button" className="button button-outline product-add-detail-section" disabled={attributes.length >= 8} onClick={() => setAttributes((current) => [...current, { name: "", values: [""] }])}>+ Adicionar atributo</button>

    <div className="form-section-heading section-separator"><span className="step-number">04</span><div><strong>Fotos do produto</strong><p>A primeira foto fica na vitrine. As demais aparecem na galeria detalhada.</p></div></div>
    {imageUrls.length ? <div className="product-gallery-editor">{imageUrls.map((url, index) => <div className="product-image-editor" key={`${url}-${index}`}><Image src={url} alt={`Foto ${index + 1} do produto`} width={92} height={92} /><span>{index === 0 ? "Principal" : `Foto ${index + 1}`}</span><button type="button" onClick={() => setImageUrls((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label={`Remover foto ${index + 1}`}>×</button></div>)}</div> : <p className="form-footnote">Nenhuma foto adicionada. Você pode salvar sem imagens.</p>}
    <label className="field file-field"><span>Adicionar fotos</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => setSelectedCount(event.target.files?.length ?? 0)} /><small>{selectedImageSummary || "JPG, PNG, WebP ou AVIF · até 5 MB por foto · no máximo 8 fotos no total."} As fotos são enviadas diretamente para o armazenamento da loja.</small></label>

    <div className="form-section-heading section-separator"><span className="step-number">05</span><div><strong>Disponibilidade e destaque</strong><p>Mostre ao cliente se o item está disponível ou sob encomenda.</p></div></div>
    <div className="form-row"><label className="field"><span>Disponibilidade</span><select name="availability" defaultValue={product?.availability ?? "in_stock"}><option value="in_stock">Pronta entrega</option><option value="preorder">Sob encomenda</option><option value="sold_out">Indisponível</option></select></label><label className="field"><span>Condição</span><select name="product_condition" defaultValue={product?.product_condition ?? "new"}><option value="new">Novo</option><option value="used">Seminovo</option><option value="refurbished">Recondicionado</option></select></label></div>
    <label className="field stock-field"><span>Quantidade em estoque <small>opcional</small></span><input type="number" name="stock_quantity" min="0" max="1000000" step="1" defaultValue={product?.stock_quantity ?? ""} placeholder="Deixe vazio se não for controlar estoque" /></label>
    <label className="switch-field"><input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} /><span className="switch-indicator" /><span><strong>Produto em destaque</strong><small>Produtos destacados aparecem na seção de destaques da loja.</small></span></label>
    <label className="switch-field"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} /><span className="switch-indicator" /><span><strong>Mostrar na minha vitrine</strong><small>Produtos ocultos continuam salvos no painel.</small></span></label>
    {uploadStatus ? <p className="form-footnote" role="status">{uploadStatus}</p> : null}
    <ActionMessage state={state} />
    <div className="form-actions"><Link href="/dashboard/products" className="button button-outline">Cancelar</Link><button className="button button-dark" type="submit" disabled={pending}>{pending ? uploadStatus || "Salvando…" : product ? "Salvar alterações" : "Salvar produto"}<span>↗</span></button></div>
    {state.success ? <p className="form-footnote">{state.success} Você pode continuar editando ou <Link href="/dashboard/products">voltar aos produtos</Link>.</p> : null}
  </form>;
}
