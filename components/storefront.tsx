import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { PublicStorefront, StorefrontConfig, StorefrontProduct, StorefrontTemplate } from "@/lib/database.types";
import { productHref } from "@/lib/storefront-data";
import { CartAddButton, StoreCart } from "@/components/store-cart";
import { ProductPrices } from "@/components/product-prices";
import { HeroCarousel } from "@/components/storefront-carousel";
import { StorefrontHeader } from "@/components/storefront-header";
import { SocialIcon, WhatsAppMark } from "@/components/storefront-icons";

type FilterState = { page: number; categoryId: string | null; availability: string | null; totalPages: number };
type Props = { store: PublicStorefront; filters?: FilterState; basePath?: string };

const availabilityLabels = { in_stock: "Pronta entrega", preorder: "Sob encomenda", sold_out: "Indisponível" } as const;

function qs(filters: FilterState, overrides: Partial<FilterState> = {}) {
  const state = { ...filters, ...overrides };
  const query = new URLSearchParams();
  if (state.categoryId) query.set("categoria", state.categoryId);
  if (state.availability) query.set("disponibilidade", state.availability);
  if (state.page > 1) query.set("pagina", String(state.page));
  const value = query.toString();
  return value ? `?${value}` : "";
}

function storePath(basePath: string, hash = "") {
  const base = basePath;
  return base + hash;
}

function catalogHref(basePath: string, filters: FilterState) {
  return `${basePath}${qs(filters)}#catalogo`;
}

export function ProductCard({ store, product, template, basePath }: { store: Pick<PublicStorefront, "name" | "slug" | "domain">; product: StorefrontProduct; template: StorefrontTemplate; basePath: string }) {
  const href = productHref(store, product, basePath);
  return <article className="sf-product-card">
    <Link className="sf-product-image" href={href} aria-label={`Ver detalhes de ${product.name}`}>
      {product.image_url ? <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 90vw, (max-width: 1000px) 45vw, 25vw" /> : <span className="sf-image-placeholder">{store.name.slice(0, 1)}</span>}
      <span className="sf-product-badges">
        {product.product_condition !== "new" ? <span>{product.product_condition === "used" ? "Seminovo" : "Recondicionado"}</span> : null}
        <span>{availabilityLabels[product.availability]}</span>
        {product.featured ? <span className="sf-badge-featured">Destaque</span> : null}
      </span>
    </Link>
    <div className="sf-card-copy">
      <span className="sf-card-category">{product.category_name ?? "Produto"}</span>
      <Link href={href} className="sf-card-title"><h3>{product.name}</h3></Link>
      <ProductPrices pixPrice={product.price} cardPrice={product.card_price} />
      <div className="sf-card-actions"><Link className="sf-button sf-button-secondary" href={href}>Saiba mais</Link><CartAddButton productId={product.id} productName={product.name} attributes={product.attributes} template={template} disabled={product.availability === "sold_out" || product.stock_quantity === 0}>{product.availability === "sold_out" || product.stock_quantity === 0 ? "Indisponível" : "Adicionar ao carrinho"}</CartAddButton></div>
    </div>
  </article>;
}

function Hero({ store, config }: { store: PublicStorefront; config: StorefrontConfig }) {
  const hero = config.hero;
  if (!hero.enabled) return null;
  const image = hero.image_urls[0];
  const visual = hero.mode === "carousel" && hero.image_urls.length > 1
    ? <HeroCarousel images={hero.image_urls} title={hero.title} />
    : image ? <div className="sf-hero-image"> <Image src={image} alt="" fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div> : <div className="sf-hero-art" aria-hidden="true"><span>{store.name.slice(0, 1)}</span><i /><i /></div>;
  return <section className={`sf-hero sf-hero-${hero.mode}`} id="inicio">
    <div className="sf-hero-copy"><span className="sf-eyebrow">{store.name}</span><h1>{hero.title}</h1><p>{hero.description}</p><a className="sf-button sf-button-primary" href="#catalogo">{hero.cta_label}<span aria-hidden="true">→</span></a></div>
    {visual}
  </section>;
}

function QuickFilters({ store, config, filters, basePath }: { store: PublicStorefront; config: StorefrontConfig; filters: FilterState; basePath: string }) {
  const activeCategory = filters.categoryId;
  const activeAvailability = filters.availability;
  const base = { ...filters, page: 1 };
  return <div className="sf-filter-bar">
    <div className="sf-filter-group" aria-label="Filtrar por categoria">
      <Link className={!activeCategory ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, categoryId: null })}>Todas as categorias</Link>
      {config.navigation.show_category_filters ? store.categories.map((category) => <Link key={category.id} className={activeCategory === category.id ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, categoryId: category.id })}>{category.name}</Link>) : null}
    </div>
    <div className="sf-filter-group sf-availability-filters" aria-label="Filtrar por disponibilidade">
      <span className="sf-filter-label">Disponibilidade</span>
      <Link className={!activeAvailability ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, availability: null })}>Todas</Link>
      <Link className={activeAvailability === "in_stock" ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, availability: "in_stock" })}>Pronta entrega</Link>
      <Link className={activeAvailability === "preorder" ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, availability: "preorder" })}>Sob encomenda</Link>
      <Link className={activeAvailability === "sold_out" ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, availability: "sold_out" })}>Indisponível</Link>
    </div>
  </div>;
}

function Pagination({ filters, basePath }: { filters: FilterState; basePath: string }) {
  if (filters.totalPages <= 1) return null;
  return <nav className="sf-pagination" aria-label="Paginação do catálogo">
    {filters.page > 1 ? <Link className="sf-button sf-button-secondary" href={catalogHref(basePath, { ...filters, page: filters.page - 1 })}>← Anterior</Link> : <span />}
    <span>Página {filters.page} de {filters.totalPages}</span>
    {filters.page < filters.totalPages ? <Link className="sf-button sf-button-secondary" href={catalogHref(basePath, { ...filters, page: filters.page + 1 })}>Próxima →</Link> : <span />}
  </nav>;
}

function SectionContent({ id, store, config, filters, basePath }: { id: keyof StorefrontConfig["sections"]; store: PublicStorefront; config: StorefrontConfig; filters: FilterState; basePath: string }): ReactNode {
  const settings = config.sections[id];
  if (!settings.enabled) return null;
  if (id === "categories") return <section className="sf-section sf-categories-section" id="categorias"><div className="sf-section-heading"><span className="sf-eyebrow">Explore por assunto</span><h2>{settings.title}</h2></div><div className="sf-category-grid">{store.categories.map((category) => <Link key={category.id} href={catalogHref(basePath, { ...filters, page: 1, categoryId: category.id })}>{category.name}<span>→</span></Link>)}</div></section>;
  if (id === "featured") { const featured = config.sections.featured; return <section className={`sf-section sf-featured-section featured-${featured.layout}`} id="destaques"><div className="sf-section-heading"><span className="sf-eyebrow">Seleção da loja</span><h2>{featured.title}</h2></div>{store.featured_products.length ? <div className="sf-product-grid" style={{ "--catalog-columns": Math.min(config.sections.catalog.columns, 4) } as CSSProperties}>{store.featured_products.map((product) => <ProductCard key={product.id} store={store} product={product} template={store.storefront_template} basePath={basePath} />)}</div> : <p className="sf-muted">Os produtos em destaque aparecerão aqui.</p>}</section>; }
  if (id === "catalog") { const catalog = config.sections.catalog; return <section className="sf-section sf-catalog-section" id="catalogo"><div className="sf-section-heading"><span className="sf-eyebrow">Escolha com calma</span><h2>{catalog.title}</h2><p>{store.total_products} {store.total_products === 1 ? "produto" : "produtos"} para conhecer</p></div><QuickFilters store={store} config={config} filters={filters} basePath={basePath} />{store.products.length ? <div className="sf-product-grid" style={{ "--catalog-columns": catalog.columns } as CSSProperties}>{store.products.map((product) => <ProductCard key={product.id} store={store} product={product} template={store.storefront_template} basePath={basePath} />)}</div> : <div className="sf-empty"><h3>Nenhum produto encontrado</h3><p>Altere os filtros para ver outros itens.</p><Link href={storePath(basePath, "#catalogo")}>Limpar filtros</Link></div>}<Pagination filters={filters} basePath={basePath} /></section>; }
  if (id === "about") { const about = config.sections.about; return <section className="sf-section sf-about-section" id="sobre"><div><span className="sf-eyebrow">Nossa história</span><h2>{about.title}</h2><p>{about.text || `A ${store.name} seleciona produtos com cuidado para atender você.`}</p></div>{about.image_url ? <div className="sf-about-image"><Image src={about.image_url} alt="" fill sizes="(max-width: 760px) 100vw, 40vw" /></div> : null}</section>; }
  return <section className="sf-contact-section" id="contato"><div><span className="sf-eyebrow">Atendimento humano</span><h2>{settings.title}</h2><p>Fale com a equipe da {store.name} para tirar dúvidas e combinar seu pedido.</p></div>{store.whatsapp_number ? <a className="sf-button sf-button-primary" href={`https://wa.me/${store.whatsapp_number}`} target="_blank" rel="noreferrer">Conversar no WhatsApp <span>↗</span></a> : null}</section>;
}

function StoreFooter({ store, config, basePath }: { store: PublicStorefront; config: StorefrontConfig; basePath: string }) {
  const footer = config.footer;
  if (!footer.enabled) return null;
  const links = [
    { label: "Instagram" as const, url: footer.instagram },
    { label: "Facebook" as const, url: footer.facebook },
    { label: "TikTok" as const, url: footer.tiktok },
    { label: "YouTube" as const, url: footer.youtube },
  ].filter((item) => item.url);
  return <footer className="sf-footer" id="rodape">
    <div className="sf-footer-main">
      <div className="sf-footer-brand">{footer.show_logo ? <a className="sf-brand" href="#inicio">{store.logo_url ? <Image className="sf-logo" src={store.logo_url} alt="" width={150} height={56} /> : <span className="sf-logo-fallback">{store.name.slice(0, 1)}</span>}<strong>{store.name}</strong></a> : <strong>{store.name}</strong>}<p>Atendimento próximo para ajudar você a escolher.</p>{links.length ? <div className="sf-social-links">{links.map(({ label, url }) => <a key={label} href={url!} target="_blank" rel="noreferrer" aria-label={`Acesse ${store.name} no ${label}`}><SocialIcon network={label} /><span>{label}</span></a>)}</div> : null}{footer.cnpj ? <small>CNPJ {footer.cnpj}</small> : null}</div>
      {footer.show_categories ? <div className="sf-footer-column"><h3>Categorias</h3>{store.categories.slice(0, 8).map((category) => <a key={category.id} href={catalogHref(basePath, { page: 1, categoryId: category.id, availability: null, totalPages: 1 })}>{category.name}</a>)}</div> : null}
      {footer.show_contact ? <div className="sf-footer-column"><h3>Atendimento</h3>{footer.hours ? <p>{footer.hours}</p> : null}{store.whatsapp_number ? <a href={`https://wa.me/${store.whatsapp_number}`}>WhatsApp: +{store.whatsapp_number}</a> : null}{footer.email ? <a href={`mailto:${footer.email}`}>{footer.email}</a> : null}{footer.address ? <p>{footer.address}</p> : null}</div> : null}
    </div>
    <div className="sf-footer-bottom"><span>© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</span>{footer.show_platform_credit ? <span>Desenvolvido por <strong>VOID Startup</strong></span> : null}</div>
  </footer>;
}

export function Storefront({ store, filters, basePath = store.domain ? "/" : `/${store.slug}` }: Props) {
  const config = store.storefront_config;
  const active = filters ?? { page: 1, categoryId: null, availability: null, totalPages: 1 };
  const availableSections = config.section_order.length ? config.section_order : ["categories", "featured", "catalog", "about", "contact"] as const;
  const cartProducts = [...new Map([...store.featured_products, ...store.products].map((product) => [product.id, product])).values()];
  const brandStyle = { "--store-primary": store.primary_color, "--store-secondary": store.secondary_color, "--catalog-columns": config.sections.catalog.columns } as CSSProperties;
  const themeClass = `theme-${store.storefront_template}`;
  return <main className={`storefront-v2 ${themeClass} sf-font-${config.font_family}`} style={brandStyle}>
    <StorefrontHeader store={store} basePath={basePath} />
    <Hero store={store} config={config} />
    {availableSections.map((id) => <SectionContent key={id} id={id} store={store} config={config} filters={active} basePath={basePath} />)}
    <StoreFooter store={store} config={config} basePath={basePath} />
    {store.whatsapp_number ? <a className="sf-floating-whatsapp" href={`https://wa.me/${store.whatsapp_number}`} aria-label="Fale com a loja pelo WhatsApp" target="_blank" rel="noreferrer"><WhatsAppMark /></a> : null}
    <StoreCart storeName={store.name} storeKey={store.id} whatsapp={store.whatsapp_number} products={cartProducts} template={store.storefront_template} />
  </main>;
}
