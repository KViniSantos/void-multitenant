import Link from "next/link";
import type { CSSProperties } from "react";
import type { PublicProductDetail } from "@/lib/database.types";
import { CartAddButton, StoreCart } from "@/components/store-cart";
import { ProductCard } from "@/components/storefront";
import { CatalogPrice } from "@/components/product-prices";
import { ProductInformationTabs } from "@/components/product-information-tabs";
import { ProductGallery } from "@/components/storefront-carousel";
import { StorefrontHeader } from "@/components/storefront-header";
import { WhatsAppMark } from "@/components/storefront-icons";
import { formatAvailabilityLabel, serviceWhatsAppHref } from "@/lib/verticals";
import { StoreFooter } from "@/components/storefront/store-footer";

export function ProductDetail({ data, basePath }: { data: PublicProductDetail; basePath: string }) {
  const { store, product, related_products: relatedProducts } = data;
  const services = store.tenant_type === "services";
  const food = store.tenant_type === "food";
  const unavailable = product.availability === "sold_out" || product.stock_quantity === 0;
  const images = product.image_urls.length ? product.image_urls : product.image_url ? [product.image_url] : [];
  const brandStyle = { "--store-primary": store.primary_color, "--store-secondary": store.secondary_color } as CSSProperties;
  const message = services
    ? serviceWhatsAppHref(store.whatsapp_number ?? "", product.name, product.pricing_mode, product.price)
    : `Olá! Tenho interesse no ${food ? "item" : "produto"} ${product.name} da ${store.name}.`;
  return <main className={`storefront-v2 theme-${store.storefront_template} tenant-${store.tenant_type} sf-product-detail-page sf-font-${store.storefront_config.font_family}`} style={brandStyle}>
    <StorefrontHeader store={store} basePath={basePath} />
    <div className="sf-breadcrumb"><Link href={basePath}>Início</Link><span>/</span>{product.category_name ? <><Link href={`${basePath}#catalogo`}>{product.category_name}</Link><span>/</span></> : null}<span>{product.name}</span></div>
    <section className="sf-product-detail">
      <ProductGallery images={images} name={product.name} />
      <div className="sf-detail-copy"><span className="sf-eyebrow">{product.category_name ?? store.name}</span><h1>{product.name}</h1><div className="sf-detail-badges"><span>{formatAvailabilityLabel(store.tenant_type, product.availability)}</span>{store.tenant_type === "retail" && product.product_condition !== "new" ? <span>{product.product_condition === "used" ? "Seminovo" : "Recondicionado"}</span> : null}{store.tenant_type === "retail" && product.stock_quantity !== null ? <span>{product.stock_quantity > 0 ? `${product.stock_quantity} em estoque` : "Sem estoque"}</span> : null}</div><CatalogPrice tenantType={store.tenant_type} price={product.price} cardPrice={product.card_price} pricingMode={product.pricing_mode} />
        <ProductInformationTabs description={product.description} richDescription={product.rich_description} highlights={product.highlights} detailSections={product.detail_sections} attributes={product.attributes} />
        <div className="sf-detail-actions">{services ? store.whatsapp_number ? <a className={`sf-button sf-button-primary ${unavailable ? "is-disabled" : ""}`} href={unavailable ? undefined : message} aria-disabled={unavailable} target={unavailable ? undefined : "_blank"} rel={unavailable ? undefined : "noreferrer"}>{unavailable ? "Indisponível" : product.pricing_mode === "quote" ? "Solicitar orçamento" : "Agendar pelo WhatsApp"}<span>↗</span></a> : <a className="sf-button sf-button-primary" href={`${basePath}#contato`}>Ver contato da loja</a> : <CartAddButton productId={product.id} productName={product.name} attributes={product.attributes} template={store.storefront_template} disabled={unavailable} foodOrder={food}>{unavailable ? "Indisponível" : food ? "Adicionar ao pedido" : "Adicionar ao carrinho"}</CartAddButton>}{!services && store.whatsapp_number ? <a className="sf-button sf-button-secondary" href={`https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Perguntar pelo WhatsApp <span>↗</span></a> : null}</div><p className="sf-detail-note">{services ? "Consulte a loja pelo WhatsApp para confirmar horários e disponibilidade." : food ? "A loja confirmará disponibilidade, preparo e entrega pelo WhatsApp." : "Disponibilidade, condições de pagamento e entrega serão confirmadas pela loja no atendimento."}</p>
      </div>
    </section>
    <section className="sf-section sf-related-products" aria-labelledby="sf-related-title"><div className="sf-section-heading"><span className="sf-eyebrow">Continue explorando</span><h2 id="sf-related-title">{services ? "Serviços relacionados" : food ? "Mais opções do cardápio" : "Produtos relacionados"}</h2><p>Veja outras opções que podem combinar com a sua escolha.</p></div>{relatedProducts.length ? <div className="sf-product-grid" style={{ "--catalog-columns": Math.min(store.storefront_config.sections.catalog.columns, 4) } as CSSProperties}>{relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} store={store} product={relatedProduct} template={store.storefront_template} basePath={basePath} />)}</div> : <p className="sf-muted">Ainda não há outros itens disponíveis nesta loja.</p>}</section>
    <StoreFooter store={store} config={store.storefront_config} basePath={basePath} />
    {store.whatsapp_number ? <a className="sf-floating-whatsapp" href={`https://wa.me/${store.whatsapp_number}`} target="_blank" rel="noreferrer" aria-label="Fale com a loja pelo WhatsApp"><WhatsAppMark /></a> : null}
    {store.tenant_type === "retail" || store.tenant_type === "food" ? <StoreCart storeName={store.name} storeKey={store.id} whatsapp={store.whatsapp_number} products={[product, ...relatedProducts]} template={store.storefront_template} tenantType={store.tenant_type} /> : null}
  </main>;
}
