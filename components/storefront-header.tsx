import Image from "next/image";
import Link from "next/link";
import type { StorefrontBrand } from "@/lib/database.types";
import { shouldShowGallery } from "@/lib/storefront-config";

export function StorefrontHeader({ store, basePath, preview = false }: { store: StorefrontBrand; basePath: string; preview?: boolean }) {
  const { navigation, sections } = store.storefront_config;
  const catalogLabel = store.tenant_type === "food" ? "Cardápio" : store.tenant_type === "services" ? "Serviços" : "Produtos";
  const links = [
    ...(navigation.show_home_link ? [{ id: "home", label: "Início", anchor: "#inicio" }] : []),
    ...(navigation.show_category_links && sections.categories.enabled ? [{ id: "categories", label: store.tenant_type === "retail" ? "Categorias" : catalogLabel, anchor: store.tenant_type === "retail" ? "#categorias" : "#catalogo" }] : []),
    ...(navigation.show_featured_link && sections.featured.enabled ? [{ id: "featured", label: store.tenant_type === "services" ? "Em destaque" : "Destaques", anchor: "#destaques" }] : []),
    ...(navigation.show_about_link && sections.about.enabled ? [{ id: "about", label: "Sobre", anchor: "#sobre" }] : []),
    ...(navigation.show_gallery_link && shouldShowGallery(store.tenant_type, sections.gallery) ? [{ id: "gallery", label: "Galeria", anchor: "#galeria" }] : []),
    ...(navigation.show_contact_link && sections.contact.enabled ? [{ id: "contact", label: "Contato", anchor: "#contato" }] : []),
  ];
  return <header className={`sf-header sf-header-${store.storefront_config.design.header_variant} sf-header-${store.tenant_type}`}>
    <Link className="sf-brand" href={`${basePath}#inicio`} onClick={preview ? (event) => event.preventDefault() : undefined} aria-label={`Início: ${store.name}`}>
      {store.logo_url ? <Image className="sf-logo" src={store.logo_url} alt="" width={150} height={56} /> : <span className="sf-logo-fallback">{store.name.slice(0, 1)}</span>}
      <strong>{store.name}</strong>
    </Link>
    <nav className="sf-nav" aria-label="Navegação principal">{links.map((link) => <Link key={link.id} href={`${basePath}${link.anchor}`} onClick={preview ? (event) => event.preventDefault() : undefined}>{link.label}</Link>)}</nav>
    {navigation.show_whatsapp_cta ? <a className="sf-header-contact" href={preview ? "#preview" : store.whatsapp_number ? `https://wa.me/${store.whatsapp_number}` : `${basePath}#contato`} onClick={preview ? (event) => event.preventDefault() : undefined} target={!preview && store.whatsapp_number ? "_blank" : undefined} rel={!preview && store.whatsapp_number ? "noreferrer" : undefined}>{store.tenant_type === "food" ? "Fazer pedido" : store.tenant_type === "services" ? "Solicitar atendimento" : "Atendimento"} <span aria-hidden="true">↗</span></a> : null}
  </header>;
}
