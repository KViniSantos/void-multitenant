"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import type { PublicStorefront, StorefrontProduct } from "@/lib/database.types";
import { formatCurrency } from "@/lib/format";

type StorefrontProps = { store: PublicStorefront };

export function Storefront({ store }: StorefrontProps) {
  const [category, setCategory] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);

  const visibleProducts = useMemo(
    () => category === "all" ? store.products : store.products.filter((product) => product.category_id === category),
    [category, store.products],
  );
  const cartProducts = useMemo(
    () => store.products.filter((product) => (cart[product.id] ?? 0) > 0),
    [cart, store.products],
  );
  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = cartProducts.reduce((sum, product) => sum + product.price * cart[product.id], 0);
  const brandStyle = {
    "--store-primary": store.primary_color,
    "--store-secondary": store.secondary_color,
  } as CSSProperties;

  function setQuantity(product: StorefrontProduct, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[product.id];
      else next[product.id] = Math.min(99, quantity);
      return next;
    });
  }

  function checkout() {
    if (!store.whatsapp_number || cartProducts.length === 0) return;
    const lines = cartProducts.map((product, index) => {
      const quantity = cart[product.id];
      const subtotal = product.price * quantity;
      return `${index + 1}. ${product.name}\n   Quantidade: ${quantity}\n   Valor: ${formatCurrency(subtotal)}`;
    });
    const message = `Olá! Tenho interesse nos seguintes produtos:\n\n${lines.join("\n\n")}\n\nTotal: ${formatCurrency(total)}\n\nGostaria de mais informações.`;
    window.open(`https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="storefront" style={brandStyle}>
      <header className="store-header">
        <a className="store-brand" href="#inicio" aria-label={store.name}>
          {store.logo_url ? <Image className="store-logo" src={store.logo_url} alt="" width={52} height={52} unoptimized /> : <span className="store-logo-fallback">{store.name.slice(0, 1).toUpperCase()}</span>}
          <span className="store-brand-name">{store.name}</span>
        </a>
        <div className="store-header-actions">
          <span className="store-note">Atendimento próximo, compra fácil</span>
          <button className="cart-open-button" onClick={() => setCartOpen(true)} aria-label={`Abrir sacola. ${itemCount} itens`}>
            <span className="cart-icon">▢</span><span>Sacola</span><span className="cart-count">{itemCount}</span>
          </button>
        </div>
      </header>

      <section className="store-hero" id="inicio">
        <div className="store-hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> SUA PRÓXIMA DESCOBERTA</span>
          <h1>Escolhas feitas<br />com <em>intenção.</em></h1>
          <p>Encontre o que combina com você. Gostou? A gente conversa pelo WhatsApp.</p>
          <a className="button button-lime" href="#catalogo">Explorar produtos <span>↓</span></a>
        </div>
        <div className="hero-decoration" aria-hidden="true">
          <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
          <div className="hero-stamp"><span>CURADORIA</span><b>◌</b><span>FEITA PRA VOCÊ</span></div>
          <div className="hero-small-tag">novas<br />descobertas</div>
        </div>
        <div className="hero-index"><span>01</span> / 03</div>
      </section>

      <section className="store-catalog" id="catalogo">
        <div className="catalog-heading">
          <div><span className="eyebrow eyebrow-dark">A VITRINE</span><h2>Peças que <em>encantam.</em></h2></div>
          <p>Escolha com calma.<br />Estamos aqui para ajudar.</p>
        </div>
        <div className="category-tabs" aria-label="Filtrar por categoria">
          <button className={category === "all" ? "category-tab selected" : "category-tab"} onClick={() => setCategory("all")}>Tudo <span>{store.products.length}</span></button>
          {store.categories.map((item) => <button key={item.id} className={category === item.id ? "category-tab selected" : "category-tab"} onClick={() => setCategory(item.id)}>{item.name}</button>)}
        </div>
        {visibleProducts.length ? <div className="product-grid">
          {visibleProducts.map((product, index) => (
            <article className="store-product-card" key={product.id}>
              <div className={`product-image-frame product-art-${index % 4}`}>
                {product.image_url ? <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw" unoptimized /> : <div className="image-placeholder"><span>{store.name.slice(0, 1)}</span><small>IMAGEM DO PRODUTO</small></div>}
                <span className="product-number">{String(index + 1).padStart(2, "0")}</span>
                <button className="product-add" onClick={() => setQuantity(product, (cart[product.id] ?? 0) + 1)} aria-label={`Adicionar ${product.name} à sacola`}>+</button>
              </div>
              <div className="product-card-meta"><span>{product.category_name ?? "SELEÇÃO"}</span>{cart[product.id] ? <b>{cart[product.id]} na sacola</b> : null}</div>
              <div className="product-card-title"><h3>{product.name}</h3><span>{formatCurrency(product.price)}</span></div>
              {product.description ? <p className="product-description">{product.description}</p> : <p className="product-description">Uma escolha especial para o seu dia a dia.</p>}
            </article>
          ))}
        </div> : <div className="store-empty"><span>◌</span><h3>{store.products.length ? "Ainda não há itens nesta categoria." : "Estamos preparando novidades."}</h3><p>Volte em breve para descobrir a seleção da loja.</p></div>}
      </section>

      <footer className="store-footer"><a className="store-brand" href="#inicio"><span className="store-logo-fallback">{store.name.slice(0, 1).toUpperCase()}</span><span className="store-brand-name">{store.name}</span></a><span>Uma boa compra começa com uma boa conversa.</span><a href="#catalogo">Voltar ao catálogo ↑</a></footer>

      {cartOpen ? <div className="cart-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
        <section className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <div className="cart-panel-head"><div><span className="eyebrow eyebrow-dark">SUA SELEÇÃO</span><h2 id="cart-title">Sua sacola <span>({itemCount})</span></h2></div><button className="icon-close" onClick={() => setCartOpen(false)} aria-label="Fechar sacola">×</button></div>
          {cartProducts.length ? <div className="cart-items">{cartProducts.map((product) => <article className="cart-line" key={product.id}>
            <div className="cart-line-image">{product.image_url ? <Image src={product.image_url} alt="" fill sizes="80px" unoptimized /> : <span>{store.name.slice(0, 1)}</span>}</div>
            <div className="cart-line-info"><h3>{product.name}</h3><span>{formatCurrency(product.price)}</span><div className="quantity-control"><button onClick={() => setQuantity(product, cart[product.id] - 1)} aria-label={`Diminuir quantidade de ${product.name}`}>−</button><span>{cart[product.id]}</span><button onClick={() => setQuantity(product, cart[product.id] + 1)} aria-label={`Aumentar quantidade de ${product.name}`}>+</button></div></div>
            <strong>{formatCurrency(product.price * cart[product.id])}</strong>
          </article>)}</div> : <div className="cart-empty"><span>▢</span><h3>A sacola está esperando.</h3><p>Adicione seus favoritos e a gente continua pelo WhatsApp.</p><button className="button button-outline" onClick={() => setCartOpen(false)}>Ver produtos</button></div>}
          <div className="cart-summary"><div><span>Subtotal</span><strong>{formatCurrency(total)}</strong></div><small>Entrega e detalhes combinados direto com a loja.</small><button className="button button-dark checkout-button" onClick={checkout} disabled={!cartProducts.length || !store.whatsapp_number}>{store.whatsapp_number ? "Finalizar pelo WhatsApp" : "WhatsApp não configurado"}<span>↗</span></button>{store.whatsapp_number ? <p>Você vai conversar diretamente com {store.name}.</p> : null}</div>
        </section>
      </div> : null}
    </main>
  );
}
