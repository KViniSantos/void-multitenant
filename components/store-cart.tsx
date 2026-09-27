"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { ProductAttribute, StorefrontProduct, StorefrontTemplate, TenantType } from "@/lib/database.types";
import { formatCurrency } from "@/lib/format";
import { foodOrderWhatsAppHref } from "@/lib/verticals";

const CART_EVENT = "void-store-cart-add";

type CartRequest = { productId: string; attributes: Record<string, string> };
type CartEntry = CartRequest & { quantity: number };
type CartLine = CartEntry & { key: string; product: StorefrontProduct };

function cartLineKey(productId: string, attributes: Record<string, string>) {
  return `${productId}:${JSON.stringify(Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b)))}`;
}

function addToCart(productId: string, attributes: Record<string, string>) {
  window.dispatchEvent(new CustomEvent<CartRequest>(CART_EVENT, { detail: { productId, attributes } }));
}

export function CartAddButton({ productId, productName, attributes = [], template, children = "Adicionar ao carrinho", disabled = false, foodOrder = false }: {
  productId: string;
  productName?: string;
  attributes?: ProductAttribute[];
  template: StorefrontTemplate;
  children?: React.ReactNode;
  disabled?: boolean;
  foodOrder?: boolean;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const add = () => {
    if (attributes.length) {
      setSelections(Object.fromEntries(attributes.map((attribute) => [attribute.name, ""])));
      setOptionsOpen(true);
      return;
    }
    addToCart(productId, {});
  };
  const allOptionsChosen = attributes.every((attribute) => Boolean(selections[attribute.name]));
  const confirmAdd = () => {
    if (!allOptionsChosen) return;
    addToCart(productId, selections);
    setOptionsOpen(false);
  };

  return <>
    <button className={`sf-button sf-button-primary theme-button-${template}`} type="button" disabled={disabled} onClick={add}>{children}<span aria-hidden="true">{disabled ? "×" : "+"}</span></button>
    {optionsOpen ? <div className="sf-cart-options-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOptionsOpen(false); }}><section className={`sf-cart-options-dialog sf-cart-options-${template}`} role="dialog" aria-modal="true" aria-labelledby="sf-cart-options-title"><header><div><span className="sf-eyebrow">PERSONALIZE O PEDIDO</span><h2 id="sf-cart-options-title">Escolha as opções</h2><p>{productName}</p></div><button type="button" className="sf-cart-close" onClick={() => setOptionsOpen(false)} aria-label="Fechar opções">×</button></header><div className="sf-cart-options-fields">{attributes.map((attribute, index) => <label className="field" key={`${attribute.name}-${index}`}><span>{attribute.name}</span><select required value={selections[attribute.name] ?? ""} onChange={(event) => setSelections((current) => ({ ...current, [attribute.name]: event.target.value }))} aria-label={`${productName ?? "Produto"}: ${attribute.name}`}><option value="">Selecione {attribute.name.toLocaleLowerCase("pt-BR")}</option>{attribute.values.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>)}</div><footer><button type="button" className="sf-button sf-button-secondary" onClick={() => setOptionsOpen(false)}>Cancelar</button><button type="button" className={`sf-button sf-button-primary theme-button-${template}`} disabled={!allOptionsChosen} onClick={confirmAdd}>{foodOrder ? "Adicionar ao pedido" : "Adicionar ao carrinho"}<span>+</span></button></footer></section></div> : null}
  </>;
}

export function StoreCart({ storeName, storeKey, whatsapp, products, template, tenantType }: { storeName: string; storeKey: string; whatsapp: string | null; products: StorefrontProduct[]; template: StorefrontTemplate; tenantType: Exclude<TenantType, "services"> }) {
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (event: Event) => {
      const request = (event as CustomEvent<CartRequest>).detail;
      if (!request || typeof request.productId !== "string") return;
      const attributes = request.attributes && typeof request.attributes === "object" ? request.attributes : {};
      const key = cartLineKey(request.productId, attributes);
      setCart((current) => ({
        ...current,
        [key]: { productId: request.productId, attributes, quantity: Math.min(99, (current[key]?.quantity ?? 0) + 1) },
      }));
      setOpen(true);
    };
    window.addEventListener(CART_EVENT, handler);
    return () => window.removeEventListener(CART_EVENT, handler);
  }, [storeKey]);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const items = useMemo<CartLine[]>(() => Object.entries(cart).flatMap(([key, entry]) => {
    const product = productsById.get(entry.productId);
    return product ? [{ ...entry, key, product }] : [];
  }), [cart, productsById]);
  const count = Object.values(cart).reduce((sum, entry) => sum + entry.quantity, 0);
  const totalPix = items.reduce((sum, item) => sum + (item.product.price ?? 0) * item.quantity, 0);
  const totalCard = items.reduce((sum, item) => sum + (item.product.card_price ?? item.product.price ?? 0) * item.quantity, 0);
  const update = (key: string, value: number) => setCart((current) => {
    const next = { ...current };
    if (value <= 0) delete next[key]; else next[key] = { ...current[key], quantity: Math.min(99, value) };
    return next;
  });
  const checkout = () => {
    if (!whatsapp || !items.length) return;
    if (tenantType === "food") {
      const href = foodOrderWhatsAppHref(whatsapp, storeName, items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        subtotal: (item.product.price ?? 0) * item.quantity,
        options: item.attributes,
      })), totalPix);
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    const detail = items.map((item, index) => {
      const options = Object.entries(item.attributes).map(([name, value]) => `${name}: ${value}`).join(", ");
      return `${index + 1}. ${item.product.name}\n   Quantidade: ${item.quantity}${options ? `\n   Opções: ${options}` : ""}\n   No cartão (em até 12x): ${formatCurrency((item.product.card_price ?? item.product.price ?? 0) * item.quantity)}\n   No Pix: ${formatCurrency((item.product.price ?? 0) * item.quantity)}`;
    });
    const message = `Olá! Tenho interesse nestes produtos da ${storeName}:\n\n${detail.join("\n\n")}\n\nTotal no cartão (em até 12x): ${formatCurrency(totalCard)}\nTotal no Pix: ${formatCurrency(totalPix)}\n\nGostaria de confirmar disponibilidade e entrega.`;
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  return <>
    <button className={`sf-cart-trigger sf-cart-${template} ${tenantType === "food" ? "sf-food-cart-trigger" : ""}`} type="button" onClick={() => setOpen(true)} aria-label={`Abrir ${tenantType === "food" ? "pedido" : "sacola"}, ${count} itens`}><span aria-hidden="true">▢</span><span>{tenantType === "food" ? "Pedido" : "Sacola"}</span><b>{count}</b></button>
    {open ? <div className="sf-cart-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className={`sf-cart-panel sf-cart-panel-${template}`} role="dialog" aria-modal="true" aria-labelledby="sf-cart-title"><header><div><span className="sf-eyebrow">SEU PEDIDO</span><h2 id="sf-cart-title">{tenantType === "food" ? "Pedido" : "Sacola"} <small>({count})</small></h2></div><div className="sf-cart-heading-actions">{items.length ? <button type="button" className="sf-cart-clear" onClick={() => setCart({})}>Esvaziar {tenantType === "food" ? "pedido" : "sacola"}</button> : null}<button type="button" className="sf-cart-close" onClick={() => setOpen(false)} aria-label="Fechar">×</button></div></header>
      {items.length ? <div className="sf-cart-items">{items.map((item) => {
        const optionLabel = Object.entries(item.attributes).map(([name, value]) => `${name}: ${value}`).join(", ");
        return <article className="sf-cart-item" key={item.key}><div className="sf-cart-image">{item.product.image_url ? <Image src={item.product.image_url} alt="" fill sizes="72px" /> : null}</div><div className="sf-cart-info"><strong>{item.product.name}</strong>{optionLabel ? <span className="sf-cart-selected-attributes">{optionLabel}</span> : null}{tenantType === "food" ? <span className="sf-cart-prices">{formatCurrency(item.product.price ?? 0)} cada</span> : <div className="sf-cart-prices"><span>No cartão · em até 12x: {formatCurrency(item.product.card_price ?? item.product.price ?? 0)}</span><span>No Pix: {formatCurrency(item.product.price ?? 0)}</span></div>}<div className="sf-quantity"><button type="button" onClick={() => update(item.key, item.quantity - 1)} aria-label={`Diminuir ${item.product.name}${optionLabel ? `, ${optionLabel}` : ""}`}>−</button><span>{item.quantity}</span><button type="button" onClick={() => update(item.key, item.quantity + 1)} aria-label={`Aumentar ${item.product.name}${optionLabel ? `, ${optionLabel}` : ""}`}>+</button></div></div><div className="sf-cart-item-totals">{tenantType === "food" ? <strong>{formatCurrency((item.product.price ?? 0) * item.quantity)}</strong> : <><span>Cartão: {formatCurrency((item.product.card_price ?? item.product.price ?? 0) * item.quantity)}</span><strong>Pix: {formatCurrency((item.product.price ?? 0) * item.quantity)}</strong></>}</div><button type="button" className="sf-cart-remove" onClick={() => update(item.key, 0)} aria-label={`Remover ${item.product.name}${optionLabel ? ` (${optionLabel})` : ""} do ${tenantType === "food" ? "pedido" : "sacola"}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 3v6m4-6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></button></article>;
      })}</div> : <div className="sf-cart-empty"><h3>{tenantType === "food" ? "Seu pedido está vazio" : "Sua sacola está vazia"}</h3><p>{tenantType === "food" ? "Adicione itens do cardápio e envie seu pedido para a loja pelo WhatsApp." : "Adicione produtos e envie o pedido para a loja pelo WhatsApp."}</p></div>}
      <footer className="sf-cart-summary">{tenantType === "food" ? <div><span>Total do pedido</span><strong>{formatCurrency(totalPix)}</strong></div> : <><div><span>Total no cartão · em até 12x</span><strong>{formatCurrency(totalCard)}</strong></div><div><span>Total no Pix</span><strong>{formatCurrency(totalPix)}</strong></div></>}<small>{tenantType === "food" ? "A loja confirmará o pedido e o prazo de preparo pelo WhatsApp." : "Entrega e disponibilidade serão confirmadas com a loja."}</small><button className="sf-button sf-button-primary sf-checkout-button" type="button" onClick={checkout} disabled={!items.length || !whatsapp}>{whatsapp ? tenantType === "food" ? "Enviar pedido pelo WhatsApp" : "Continuar pelo WhatsApp" : "WhatsApp não configurado"}<span>↗</span></button></footer></section></div> : null}
  </>;
}
