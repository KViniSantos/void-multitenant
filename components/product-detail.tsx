import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { PublicProductDetail } from "@/lib/database.types";
import { formatCurrency } from "@/lib/format";
import { CartAddButton, StoreCart } from "@/components/store-cart";
import { ProductGallery } from "@/components/storefront-carousel";
import { StorefrontHeader } from "@/components/storefront-header";
import { SocialIcon, WhatsAppMark } from "@/components/storefront-icons";

const availability = { in_stock: "Pronta entrega", preorder: "Sob encomenda", sold_out: "Indisponível" } as const;

export function ProductDetail({ data, basePath }: { data: PublicProductDetail; basePath: string }) {
  const { store, product } = data;
  const images = product.image_urls.length ? product.image_urls : product.image_url ? [product.image_url] : [];
  const brandStyle = { "--store-primary": store.primary_color, "--store-secondary": store.secondary_color } as CSSProperties;
  const message = `Olá! Tenho interesse no produto ${product.name} da ${store.name}.`;
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
      <div className="sf-detail-copy"><span className="sf-eyebrow">{product.category_name ?? store.name}</span><h1>{product.name}</h1><div className="sf-detail-badges"><span>{availability[product.availability]}</span>{product.product_condition !== "new" ? <span>{product.product_condition === "used" ? "Seminovo" : "Recondicionado"}</span> : null}{product.stock_quantity !== null ? <span>{product.stock_quantity > 0 ? `${product.stock_quantity} em estoque` : "Sem estoque"}</span> : null}</div><strong className="sf-detail-price">{formatCurrency(product.price)}</strong>{product.description ? <p className="sf-detail-description">{product.description}</p> : null}
        {product.highlights.length ? <div className="sf-product-highlights"><h2>Destaques do produto</h2><ul>{product.highlights.map((highlight, index) => <li key={`${index}-${highlight}`}>{highlight}</li>)}</ul></div> : null}
        {product.detail_sections.map((section, sectionIndex) => section.items.length ? <section className="sf-product-info-section" key={`${sectionIndex}-${section.title}`}><h2>{section.title}</h2><dl>{section.items.map((item, itemIndex) => <div key={`${itemIndex}-${item.label}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section> : null)}
        <div className="sf-detail-actions"><CartAddButton productId={product.id} template={store.storefront_template} disabled={product.availability === "sold_out" || product.stock_quantity === 0}>{product.availability === "sold_out" || product.stock_quantity === 0 ? "Produto indisponível" : "Adicionar à sacola"}</CartAddButton>{store.whatsapp_number ? <a className="sf-button sf-button-secondary" href={`https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Perguntar pelo WhatsApp <span>↗</span></a> : null}</div><p className="sf-detail-note">Preço e disponibilidade serão confirmados pela loja no atendimento.</p>
      </div>
    </section>
    {footer.enabled ? <footer className="sf-footer" id="rodape"><div className="sf-footer-main"><div className="sf-footer-brand">{footer.show_logo && store.logo_url ? <Image className="sf-logo" src={store.logo_url} alt={`${store.name} logo`} width={150} height={56} /> : null}<strong>{store.name}</strong><p>Atendimento próximo para ajudar você a escolher.</p>{socialLinks.length ? <div className="sf-social-links">{socialLinks.map(({ label, url }) => <a key={label} href={url!} target="_blank" rel="noreferrer" aria-label={`Acesse ${store.name} no ${label}`}><SocialIcon network={label} /><span>{label}</span></a>)}</div> : null}{footer.cnpj ? <small>CNPJ {footer.cnpj}</small> : null}</div>{footer.show_categories ? <div className="sf-footer-column"><h3>Links úteis</h3><Link href={`${basePath}#catalogo`}>Produtos</Link>{product.category_name ? <Link href={`${basePath}#catalogo`}>{product.category_name}</Link> : null}<Link href={`${basePath}#contato`}>Contato</Link></div> : null}{footer.show_contact ? <div className="sf-footer-column"><h3>Atendimento</h3>{footer.hours ? <p>{footer.hours}</p> : null}{store.whatsapp_number ? <a href={`https://wa.me/${store.whatsapp_number}`}>WhatsApp: +{store.whatsapp_number}</a> : null}{footer.email ? <a href={`mailto:${footer.email}`}>{footer.email}</a> : null}{footer.address ? <p>{footer.address}</p> : null}</div> : null}</div><div className="sf-footer-bottom"><span>© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</span>{footer.show_platform_credit ? <span>Desenvolvido por <strong>VOID Startup</strong></span> : null}</div></footer> : null}
    {store.whatsapp_number ? <a className="sf-floating-whatsapp" href={`https://wa.me/${store.whatsapp_number}`} target="_blank" rel="noreferrer" aria-label="Fale com a loja pelo WhatsApp"><WhatsAppMark /></a> : null}
    <StoreCart storeName={store.name} storeKey={store.id} whatsapp={store.whatsapp_number} products={[product]} template={store.storefront_template} />
  </main>;
}
