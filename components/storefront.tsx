import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { PublicStorefront, StorefrontConfig } from "@/lib/database.types";
import { StoreCart } from "@/components/store-cart";
import { StorefrontHeader } from "@/components/storefront-header";
import { WhatsAppMark } from "@/components/storefront-icons";
import { shouldShowGallery } from "@/lib/storefront-config";
import { ProductCard } from "@/components/storefront/product-card-variants";
import { StorefrontHero } from "@/components/storefront/hero-variants";
import { CategoryCollection } from "@/components/storefront/category-variants";
import { StoreFooter } from "@/components/storefront/store-footer";
import { RichTextContent } from "@/components/rich-text-content";

export { ProductCard } from "@/components/storefront/product-card-variants";

type FilterState = { page: number; categoryId: string | null; availability: string | null; totalPages: number };
type Props = { store: PublicStorefront; filters?: FilterState; basePath?: string; preview?: boolean };

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

function QuickFilters({ store, config, filters, basePath, preview = false }: { store: PublicStorefront; config: StorefrontConfig; filters: FilterState; basePath: string; preview?: boolean }) {
  const activeCategory = filters.categoryId;
  const activeAvailability = filters.availability;
  const base = { ...filters, page: 1 };
  const availabilityText = store.tenant_type === "food"
    ? { label: "Disponibilidade", all: "Todas", inStock: "Disponível", preorder: "Sob encomenda", unavailable: "Indisponível" }
    : store.tenant_type === "services"
      ? { label: "Agendamento", all: "Todos", inStock: "Agendamento", preorder: "Sob consulta", unavailable: "Indisponível" }
      : { label: "Disponibilidade", all: "Todas", inStock: "Pronta entrega", preorder: "Sob encomenda", unavailable: "Indisponível" };
  return <div className="sf-filter-bar">
    <div className="sf-filter-group" aria-label="Filtrar por categoria">
      <Link className={!activeCategory ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, categoryId: null })} onClick={preview ? (event) => event.preventDefault() : undefined}>Todas as categorias</Link>
      {config.navigation.show_category_filters ? store.categories.map((category) => <Link key={category.id} className={activeCategory === category.id ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, categoryId: category.id })} onClick={preview ? (event) => event.preventDefault() : undefined}>{category.name}</Link>) : null}
    </div>
    <div className="sf-filter-group sf-availability-filters" aria-label={`Filtrar por ${availabilityText.label.toLocaleLowerCase("pt-BR")}`}>
      <span className="sf-filter-label">{availabilityText.label}</span>
      <Link className={!activeAvailability ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, availability: null })} onClick={preview ? (event) => event.preventDefault() : undefined}>{availabilityText.all}</Link>
      <Link className={activeAvailability === "in_stock" ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, availability: "in_stock" })} onClick={preview ? (event) => event.preventDefault() : undefined}>{availabilityText.inStock}</Link>
      <Link className={activeAvailability === "preorder" ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, availability: "preorder" })} onClick={preview ? (event) => event.preventDefault() : undefined}>{availabilityText.preorder}</Link>
      <Link className={activeAvailability === "sold_out" ? "sf-chip is-active" : "sf-chip"} href={catalogHref(basePath, { ...base, availability: "sold_out" })} onClick={preview ? (event) => event.preventDefault() : undefined}>{availabilityText.unavailable}</Link>
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

function SectionContent({ id, store, config, filters, basePath, preview = false }: { id: keyof StorefrontConfig["sections"]; store: PublicStorefront; config: StorefrontConfig; filters: FilterState; basePath: string; preview?: boolean }): ReactNode {
  const settings = config.sections[id];
  if (id === "gallery") {
    const gallery = config.sections.gallery;
    if (!shouldShowGallery(store.tenant_type, gallery)) return null;
    return <section className="sf-section sf-gallery-section" id="galeria"><div className="sf-section-heading"><span className="sf-eyebrow">Conheça nosso espaço</span><h2>{gallery.title}</h2></div><div className="sf-gallery-grid">{gallery.image_urls.map((imageUrl, index) => <div className="sf-gallery-item" key={imageUrl}><Image src={imageUrl} alt={`Imagem ${index + 1} da galeria ${gallery.title} de ${store.name}`} fill sizes="(max-width: 680px) 50vw, (max-width: 1000px) 33vw, (max-width: 1320px) 25vw, 292px" /></div>)}</div></section>;
  }
  if (!settings.enabled) return null;
  if (id === "categories") return <section className="sf-section sf-categories-section" id="categorias"><div className="sf-section-heading"><span className="sf-eyebrow">{store.tenant_type === "food" ? "Encontre seu favorito" : store.tenant_type === "services" ? "Áreas de atendimento" : "Explore por assunto"}</span><h2>{settings.title}</h2></div><CategoryCollection store={store} filters={filters} basePath={basePath} preview={preview} /></section>;
  if (id === "featured") { const featured = config.sections.featured; return <section className={`sf-section sf-featured-section featured-${featured.layout}`} id="destaques"><div className="sf-section-heading"><span className="sf-eyebrow">Seleção da loja</span><h2>{featured.title}</h2></div>{store.featured_products.length ? <div className="sf-product-grid" style={{ "--catalog-columns": Math.min(config.sections.catalog.columns, 4) } as CSSProperties}>{store.featured_products.map((product) => <ProductCard key={product.id} store={store} product={product} template={store.storefront_template} basePath={basePath} preview={preview} />)}</div> : <p className="sf-muted">Os produtos em destaque aparecerão aqui.</p>}</section>; }
  if (id === "catalog") { const catalog = config.sections.catalog; const noun = store.tenant_type === "food" ? "item do cardápio" : store.tenant_type === "services" ? "serviço" : "produto"; return <section className="sf-section sf-catalog-section" id="catalogo"><div className="sf-section-heading"><span className="sf-eyebrow">{store.tenant_type === "food" ? "Feitos para abrir o apetite" : store.tenant_type === "services" ? "Como podemos ajudar?" : "Escolha com calma"}</span><h2>{catalog.title}</h2><p>{store.total_products} {store.total_products === 1 ? noun : `${noun}s`} para conhecer</p></div><QuickFilters store={store} config={config} filters={filters} basePath={basePath} preview={preview} />{store.products.length ? <div className={`sf-product-grid ${store.tenant_type === "food" ? "sf-food-grid" : ""} ${store.tenant_type === "services" ? "sf-service-grid" : ""}`} style={{ "--catalog-columns": catalog.columns } as CSSProperties}>{store.products.map((product) => <ProductCard key={product.id} store={store} product={product} template={store.storefront_template} basePath={basePath} preview={preview} />)}</div> : <div className="sf-empty"><h3>{store.tenant_type === "food" ? "Nenhum item encontrado" : store.tenant_type === "services" ? "Nenhum serviço encontrado" : "Nenhum produto encontrado"}</h3><p>Altere os filtros para ver outros itens.</p><Link href={storePath(basePath, "#catalogo")} onClick={preview ? (event) => event.preventDefault() : undefined}>Limpar filtros</Link></div>}{!preview ? <Pagination filters={filters} basePath={basePath} /> : null}</section>; }
  if (id === "about") { const about = config.sections.about; const fallback = store.tenant_type === "food" ? `A ${store.name} prepara cada pedido com carinho e ingredientes selecionados.` : store.tenant_type === "services" ? `A equipe da ${store.name} está pronta para ajudar com atendimento especializado.` : `A ${store.name} seleciona produtos com cuidado para atender você.`; return <section className="sf-section sf-about-section" id="sobre"><div><span className="sf-eyebrow">{store.tenant_type === "food" ? "Nossa cozinha" : store.tenant_type === "services" ? "Sobre nosso trabalho" : "Nossa história"}</span><h2>{about.title}</h2>{about.rich_text ? <RichTextContent document={about.rich_text} className="sf-rich-content sf-rich-text-view" /> : <p>{about.text || fallback}</p>}</div>{about.image_url ? <div className="sf-about-image"><Image src={about.image_url} alt="" fill sizes="(max-width: 760px) 100vw, 40vw" /></div> : null}</section>; }
  return <section className="sf-contact-section" id="contato"><div><span className="sf-eyebrow">Atendimento humano</span><h2>{settings.title}</h2><p>Fale com a equipe da {store.name} para tirar dúvidas e combinar seu pedido.</p></div>{store.whatsapp_number ? <a className="sf-button sf-button-primary" href={preview ? "#preview" : `https://wa.me/${store.whatsapp_number}`} onClick={preview ? (event) => event.preventDefault() : undefined} target={preview ? undefined : "_blank"} rel={preview ? undefined : "noreferrer"}>Conversar no WhatsApp <span>↗</span></a> : null}</section>;
}

export function Storefront({ store, filters, basePath = store.domain ? "/" : `/${store.slug}`, preview = false }: Props) {
  const config = store.storefront_config;
  const active = filters ?? { page: 1, categoryId: null, availability: null, totalPages: 1 };
  const availableSections = config.section_order.length ? config.section_order : ["categories", "featured", "catalog", "about", "contact"] as const;
  const cartProducts = [...new Map([...store.featured_products, ...store.products].map((product) => [product.id, product])).values()];
  const brandStyle = { "--store-primary": store.primary_color, "--store-secondary": store.secondary_color, "--catalog-columns": config.sections.catalog.columns } as CSSProperties;
  const themeClass = `theme-${store.storefront_template}`;
  return <main className={`storefront-v2 ${themeClass} tenant-${store.tenant_type} sf-font-${config.font_family}`} style={brandStyle}>
    <StorefrontHeader store={store} basePath={basePath} preview={preview} />
    <StorefrontHero store={store} config={config} preview={preview} />
    {availableSections.map((id) => <SectionContent key={id} id={id} store={store} config={config} filters={active} basePath={basePath} preview={preview} />)}
    <StoreFooter store={store} config={config} basePath={basePath} preview={preview} />
    {!preview && store.whatsapp_number ? <a className="sf-floating-whatsapp" href={`https://wa.me/${store.whatsapp_number}`} aria-label="Fale com a loja pelo WhatsApp" target="_blank" rel="noreferrer"><WhatsAppMark /></a> : null}
    {!preview && store.tenant_type !== "services" ? <StoreCart storeName={store.name} storeKey={store.id} whatsapp={store.whatsapp_number} products={cartProducts} template={store.storefront_template} tenantType={store.tenant_type} /> : null}
  </main>;
}
