import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { PublicProductDetail } from "@/lib/database.types";
import { CartAddButton, StoreCart } from "@/components/store-cart";
import { ProductCard } from "@/components/storefront";
import { CatalogPrice } from "@/components/product-prices";
import { ProductInformationTabs } from "@/components/product-information-tabs";
import { ProductGallery } from "@/components/storefront-carousel";
import { StorefrontHeader } from "@/components/storefront-header";
import { SocialIcon, WhatsAppMark } from "@/components/storefront-icons";
import { formatAvailabilityLabel, serviceWhatsAppHref } from "@/lib/verticals";

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
  const footer = store.storefront_config.footer;
  const socialLinks = [
    { label: "Instagram" as const, url: footer.instagram },
    { label: "Facebook" as const, url: footer.facebook },
    { label: "TikTok" as const, url: footer.tiktok },
    { label: "YouTube" as const, url: footer.youtube },
  ].filter((item) => item.url);
  return <main className={`storefront-v2 theme-${store.storefront_template} sf-product-detail-page sf-font-${store.storefront_config.font_family}`} style={brandStyle}>
    <StorefrontHeader store={store} basePath={basePath} />
    <div className="sf-breadcrumb"><Link href={basePath}>Início</Link><span>/</span>{product.category_name ? <><Link href={`${basePath}#catalogo`}>{product.category_name}</Link><span>/</span></> : null}<span>{product.name}</span></div>
    <section className="sf-product-detail">
      <ProductGallery images={images} name={product.name} />
      <div className="sf-detail-copy"><span className="sf-eyebrow">{product.category_name ?? store.name}</span><h1>{product.name}</h1><div className="sf-detail-badges"><span>{formatAvailabilityLabel(store.tenant_type, product.availability)}</span>{store.tenant_type === "retail" && product.product_condition !== "new" ? <span>{product.product_condition === "used" ? "Seminovo" : "Recondicionado"}</span> : null}{store.tenant_type === "retail" && product.stock_quantity !== null ? <span>{product.stock_quantity > 0 ? `${product.stock_quantity} em estoque` : "Sem estoque"}</span> : null}</div><CatalogPrice tenantType={store.tenant_type} price={product.price} cardPrice={product.card_price} pricingMode={product.pricing_mode} />
        <ProductInformationTabs description={product.description} highlights={product.highlights} detailSections={product.detail_sections} attributes={product.attributes} />
        <div className="sf-detail-actions">{services ? store.whatsapp_number ? <a className={`sf-button sf-button-primary ${unavailable ? "is-disabled" : ""}`} href={unavailable ? undefined : message} aria-disabled={unavailable} target={unavailable ? undefined : "_blank"} rel={unavailable ? undefined : "noreferrer"}>{unavailable ? "Indisponível" : product.pricing_mode === "quote" ? "Solicitar orçamento" : "Agendar pelo WhatsApp"}<span>↗</span></a> : <a className="sf-button sf-button-primary" href={`${basePath}#contato`}>Ver contato da loja</a> : <CartAddButton productId={product.id} productName={product.name} attributes={product.attributes} template={store.storefront_template} disabled={unavailable} foodOrder={food}>{unavailable ? "Indisponível" : food ? "Adicionar ao pedido" : "Adicionar ao carrinho"}</CartAddButton>}{!services && store.whatsapp_number ? <a className="sf-button sf-button-secondary" href={`https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Perguntar pelo WhatsApp <span>↗</span></a> : null}</div><p className="sf-detail-note">{services ? "Consulte a loja pelo WhatsApp para confirmar horários e disponibilidade." : food ? "A loja confirmará disponibilidade, preparo e entrega pelo WhatsApp." : "Disponibilidade, condições de pagamento e entrega serão confirmadas pela loja no atendimento."}</p>
      </div>
    </section>
    <section className="sf-section sf-related-products" aria-labelledby="sf-related-title"><div className="sf-section-heading"><span className="sf-eyebrow">Continue explorando</span><h2 id="sf-related-title">{services ? "Serviços relacionados" : food ? "Mais opções do cardápio" : "Produtos relacionados"}</h2><p>Veja outras opções que podem combinar com a sua escolha.</p></div>{relatedProducts.length ? <div className="sf-product-grid" style={{ "--catalog-columns": Math.min(store.storefront_config.sections.catalog.columns, 4) } as CSSProperties}>{relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} store={store} product={relatedProduct} template={store.storefront_template} basePath={basePath} />)}</div> : <p className="sf-muted">Ainda não há outros itens disponíveis nesta loja.</p>}</section>
    {footer.enabled ? <footer className="sf-footer" id="rodape"><div className="sf-footer-main"><div className="sf-footer-brand">{footer.show_logo && store.logo_url ? <Image className="sf-logo" src={store.logo_url} alt={`${store.name} logo`} width={150} height={56} /> : null}<strong>{store.name}</strong><p>Atendimento próximo para ajudar você a escolher.</p>{socialLinks.length ? <div className="sf-social-links">{socialLinks.map(({ label, url }) => <a key={label} href={url!} target="_blank" rel="noreferrer" aria-label={`Acesse ${store.name} no ${label}`}><SocialIcon network={label} /><span>{label}</span></a>)}</div> : null}{footer.cnpj ? <small>CNPJ {footer.cnpj}</small> : null}</div>{footer.show_categories ? <div className="sf-footer-column"><h3>Links úteis</h3><Link href={`${basePath}#catalogo`}>Produtos</Link>{product.category_name ? <Link href={`${basePath}#catalogo`}>{product.category_name}</Link> : null}<Link href={`${basePath}#contato`}>Contato</Link></div> : null}{footer.show_contact ? <div className="sf-footer-column"><h3>Atendimento</h3>{footer.hours ? <p>{footer.hours}</p> : null}{store.whatsapp_number ? <a href={`https://wa.me/${store.whatsapp_number}`}>WhatsApp: +{store.whatsapp_number}</a> : null}{footer.email ? <a href={`mailto:${footer.email}`}>{footer.email}</a> : null}{footer.address ? <p>{footer.address}</p> : null}</div> : null}</div><div className="sf-footer-bottom"><span>© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</span>{footer.show_platform_credit ? <span>Desenvolvido por <strong>VOID Startup</strong></span> : null}</div></footer> : null}
    {store.whatsapp_number ? <a className="sf-floating-whatsapp" href={`https://wa.me/${store.whatsapp_number}`} target="_blank" rel="noreferrer" aria-label="Fale com a loja pelo WhatsApp"><WhatsAppMark /></a> : null}
    {store.tenant_type === "retail" || store.tenant_type === "food" ? <StoreCart storeName={store.name} storeKey={store.id} whatsapp={store.whatsapp_number} products={[product, ...relatedProducts]} template={store.storefront_template} tenantType={store.tenant_type} /> : null}
  </main>;
}
