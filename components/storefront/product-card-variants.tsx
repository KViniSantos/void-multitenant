import Image from "next/image";
import Link from "next/link";
import type { PublicStorefront, StorefrontProduct, StorefrontTemplate } from "@/lib/database.types";
import { CartAddButton } from "@/components/store-cart";
import { CatalogPrice } from "@/components/product-prices";
import { formatAvailabilityLabel, serviceWhatsAppHref } from "@/lib/verticals";
import { productHref } from "@/lib/storefront-links";

type StoreLink = Pick<PublicStorefront, "name" | "slug" | "domain" | "tenant_type" | "whatsapp_number" | "storefront_config">;

export function ProductCard({
  store, product, template, basePath, preview = false,
}: {
  store: StoreLink;
  product: StorefrontProduct;
  template: StorefrontTemplate;
  basePath: string;
  preview?: boolean;
}) {
  const services = store.tenant_type === "services";
  const food = store.tenant_type === "food";
  const href = preview ? "#preview" : productHref(store, product, basePath);
  const unavailable = product.availability === "sold_out" || product.stock_quantity === 0;
  const serviceHref = store.whatsapp_number ? serviceWhatsAppHref(store.whatsapp_number, product.name, product.pricing_mode, product.price) : href;
  const serviceCta = product.pricing_mode === "quote" ? "Solicitar orçamento" : "Agendar pelo WhatsApp";
  const cardClass = "sf-product-card sf-card-variant-" + store.storefront_config.design.card_variant + " sf-card-" + store.tenant_type;
  const image = product.image_url
    ? <Image src={product.image_url} alt="" fill sizes="(max-width: 640px) 90vw, (max-width: 1000px) 45vw, 25vw" />
    : <span className="sf-image-placeholder">{store.name.slice(0, 1)}</span>;
  const imageLink = <Link className="sf-product-image" href={href} aria-label={"Ver detalhes de " + product.name} onClick={preview ? (event) => event.preventDefault() : undefined}>
    {image}
    <span className="sf-product-badges">
      {store.tenant_type === "retail" && product.product_condition !== "new" ? <span>{product.product_condition === "used" ? "Seminovo" : "Recondicionado"}</span> : null}
      <span>{formatAvailabilityLabel(store.tenant_type, product.availability)}</span>
      {product.featured ? <span className="sf-badge-featured">Destaque</span> : null}
    </span>
  </Link>;

  const title = <Link href={href} className="sf-card-title" onClick={preview ? (event) => event.preventDefault() : undefined}><h3>{product.name}</h3></Link>;
  const summary = product.description ? <p className="sf-card-description">{product.description}</p> : null;
  const actions = services
    ? preview
      ? <span className="sf-button sf-button-primary sf-preview-cta">{unavailable ? "Indisponível" : serviceCta}</span>
      : <><Link className="sf-button sf-button-secondary" href={href}>Detalhes</Link><a className={"sf-button sf-button-primary" + (unavailable ? " is-disabled" : "")} href={unavailable ? undefined : serviceHref} target={store.whatsapp_number && !unavailable ? "_blank" : undefined} rel={store.whatsapp_number && !unavailable ? "noreferrer" : undefined} aria-disabled={unavailable}>{unavailable ? "Indisponível" : serviceCta}</a></>
    : preview
      ? <span className="sf-button sf-button-primary sf-preview-cta">{unavailable ? "Indisponível" : food ? "Adicionar ao pedido" : "Adicionar ao carrinho"}</span>
      : <CartAddButton productId={product.id} productName={product.name} attributes={product.attributes} template={template} disabled={unavailable} foodOrder={food}>{unavailable ? "Indisponível" : food ? "Adicionar ao pedido" : "Adicionar ao carrinho"}</CartAddButton>;

  if (food) return <article className={cardClass + " sf-food-card"}>
    {imageLink}
    <div className="sf-card-copy">
      <span className="sf-card-category">{product.category_name ?? "Cardápio"}</span>
      {title}{summary}
      <CatalogPrice tenantType={store.tenant_type} price={product.price} cardPrice={product.card_price} pricingMode={product.pricing_mode} />
      <div className="sf-card-actions">{actions}</div>
    </div>
  </article>;

  if (services) return <article className={cardClass + " sf-service-card"}>
    <div className="sf-service-card-visual">{product.image_url ? imageLink : <span aria-hidden="true">✦</span>}</div>
    <div className="sf-card-copy">
      <span className="sf-card-category">{product.category_name ?? "Serviço"}</span>
      {title}{summary}
      <span className="sf-service-availability">{formatAvailabilityLabel(store.tenant_type, product.availability)}</span>
      <CatalogPrice tenantType={store.tenant_type} price={product.price} cardPrice={product.card_price} pricingMode={product.pricing_mode} />
      <div className="sf-card-actions">{actions}</div>
    </div>
  </article>;

  return <article className={cardClass}>
    {imageLink}
    <div className="sf-card-copy">
      <span className="sf-card-category">{product.category_name ?? "Produto"}</span>
      {title}{summary}
      <CatalogPrice tenantType={store.tenant_type} price={product.price} cardPrice={product.card_price} pricingMode={product.pricing_mode} />
      <div className="sf-card-actions">{actions}</div>
    </div>
  </article>;
}
