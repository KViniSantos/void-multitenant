"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { StorefrontProduct, StorefrontTemplate } from "@/lib/database.types";
import { formatCurrency } from "@/lib/format";

const CART_EVENT = "void-store-cart-add";

export function CartAddButton({ productId, template, children = "Adicionar", disabled = false }: { productId: string; template: StorefrontTemplate; children?: React.ReactNode; disabled?: boolean }) {
  return <button className={`sf-button sf-button-primary theme-button-${template}`} type="button" disabled={disabled} onClick={() => window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: productId }))}>{children}<span aria-hidden="true">{disabled ? "×" : "+"}</span></button>;
}

export function StoreCart({ storeName, storeKey, whatsapp, products, template }: { storeName: string; storeKey: string; whatsapp: string | null; products: StorefrontProduct[]; template: StorefrontTemplate }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setQuantities((current) => ({ ...current, [id]: Math.min(99, (current[id] ?? 0) + 1) }));
      setOpen(true);
    };
    window.addEventListener(CART_EVENT, handler);
    return () => window.removeEventListener(CART_EVENT, handler);
  }, [storeKey]);
  const items = useMemo(() => products.filter((product) => (quantities[product.id] ?? 0) > 0), [products, quantities]);
  const count = Object.values(quantities).reduce((sum, value) => sum + value, 0);
  const total = items.reduce((sum, product) => sum + product.price * quantities[product.id], 0);
  const update = (id: string, value: number) => setQuantities((current) => {
    const next = { ...current };
    if (value <= 0) delete next[id]; else next[id] = Math.min(99, value);
    return next;
  });
  const checkout = () => {
    if (!whatsapp || !items.length) return;
    const detail = items.map((product, index) => `${index + 1}. ${product.name}\n   Quantidade: ${quantities[product.id]}\n   Valor: ${formatCurrency(product.price * quantities[product.id])}`);
    const message = `Olá! Tenho interesse nestes produtos da ${storeName}:\n\n${detail.join("\n\n")}\n\nTotal: ${formatCurrency(total)}\n\nGostaria de confirmar disponibilidade e entrega.`;
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  return <>
    <button className={`sf-cart-trigger sf-cart-${template}`} type="button" onClick={() => setOpen(true)} aria-label={`Abrir sacola, ${count} itens`}><span aria-hidden="true">▢</span><span>Sacola</span><b>{count}</b></button>
    {open ? <div className="sf-cart-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className={`sf-cart-panel sf-cart-panel-${template}`} role="dialog" aria-modal="true" aria-labelledby="sf-cart-title"><header><div><span className="sf-eyebrow">SEU PEDIDO</span><h2 id="sf-cart-title">Sacola <small>({count})</small></h2></div><div className="sf-cart-heading-actions">{items.length ? <button type="button" className="sf-cart-clear" onClick={() => setQuantities({})}>Esvaziar sacola</button> : null}<button type="button" className="sf-cart-close" onClick={() => setOpen(false)} aria-label="Fechar sacola">×</button></div></header>
      {items.length ? <div className="sf-cart-items">{items.map((product) => <article className="sf-cart-item" key={product.id}><div className="sf-cart-image">{product.image_url ? <Image src={product.image_url} alt="" fill sizes="72px" /> : null}</div><div className="sf-cart-info"><strong>{product.name}</strong><span>{formatCurrency(product.price)}</span><div className="sf-quantity"><button type="button" onClick={() => update(product.id, quantities[product.id] - 1)} aria-label={`Diminuir ${product.name}`}>−</button><span>{quantities[product.id]}</span><button type="button" onClick={() => update(product.id, quantities[product.id] + 1)} aria-label={`Aumentar ${product.name}`}>+</button></div></div><b>{formatCurrency(product.price * quantities[product.id])}</b><button type="button" className="sf-cart-remove" onClick={() => update(product.id, 0)} aria-label={`Remover ${product.name} da sacola`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 3v6m4-6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></button></article>)}</div> : <div className="sf-cart-empty"><h3>Sua sacola está vazia</h3><p>Adicione produtos e envie o pedido para a loja pelo WhatsApp.</p></div>}
      <footer className="sf-cart-summary"><div><span>Subtotal</span><strong>{formatCurrency(total)}</strong></div><small>Entrega e disponibilidade serão confirmadas com a loja.</small><button className="sf-button sf-button-primary sf-checkout-button" type="button" onClick={checkout} disabled={!items.length || !whatsapp}>{whatsapp ? "Continuar pelo WhatsApp" : "WhatsApp não configurado"}<span>↗</span></button></footer></section></div> : null}
  </>;
}
