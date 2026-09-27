import Image from "next/image";
import type { MouseEvent } from "react";
import type { PublicStorefront, StorefrontBrand, StorefrontConfig } from "@/lib/database.types";
import { SocialIcon } from "@/components/storefront-icons";

type FooterStore = StorefrontBrand & { categories?: PublicStorefront["categories"] };

export function StoreFooter({ store, config, basePath = store.domain ? "/" : "/" + store.slug, preview = false }: { store: FooterStore; config: StorefrontConfig; basePath?: string; preview?: boolean }) {
  const footer = config.footer;
  if (!footer.enabled) return null;
  const links = [
    { label: "Instagram" as const, url: footer.instagram },
    { label: "Facebook" as const, url: footer.facebook },
    { label: "TikTok" as const, url: footer.tiktok },
    { label: "YouTube" as const, url: footer.youtube },
  ].filter((item) => item.url);
  const preventPreviewNavigation = preview ? (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault() : undefined;
  return <footer className={"sf-footer sf-footer-" + store.tenant_type + " sf-footer-variant-" + config.design.footer_variant} id="rodape">
    <div className="sf-footer-main">
      <div className="sf-footer-brand">{footer.show_logo ? <a className="sf-brand" href={basePath + "#inicio"} onClick={preventPreviewNavigation}>{store.logo_url ? <Image className="sf-logo" src={store.logo_url} alt="" width={150} height={56} /> : <span className="sf-logo-fallback">{store.name.slice(0, 1)}</span>}<strong>{store.name}</strong></a> : <strong>{store.name}</strong>}<p>Atendimento próximo para ajudar você a escolher.</p>{links.length ? <div className="sf-social-links">{links.map(({ label, url }) => <a key={label} href={preview ? "#preview" : url!} onClick={preventPreviewNavigation} target={preview ? undefined : "_blank"} rel={preview ? undefined : "noreferrer"} aria-label={"Acesse " + store.name + " no " + label}><SocialIcon network={label} /><span>{label}</span></a>)}</div> : null}{footer.cnpj ? <small>CNPJ {footer.cnpj}</small> : null}</div>
      {footer.show_categories ? <div className="sf-footer-column"><h3>{store.categories?.length ? "Categorias" : "Links úteis"}</h3>{store.categories?.length ? store.categories.slice(0, 8).map((category) => <a key={category.id} href={basePath + "#categorias"} onClick={preventPreviewNavigation}>{category.name}</a>) : <><a href={basePath + "#catalogo"} onClick={preventPreviewNavigation}>{store.tenant_type === "food" ? "Cardápio" : store.tenant_type === "services" ? "Serviços" : "Produtos"}</a><a href={basePath + "#contato"} onClick={preventPreviewNavigation}>Contato</a></>}</div> : null}
      {footer.show_contact ? <div className="sf-footer-column"><h3>Atendimento</h3>{footer.hours ? <p>{footer.hours}</p> : null}{store.whatsapp_number ? <a href={preview ? "#preview" : "https://wa.me/" + store.whatsapp_number} onClick={preventPreviewNavigation}>WhatsApp: +{store.whatsapp_number}</a> : null}{footer.email ? <a href={preview ? "#preview" : "mailto:" + footer.email} onClick={preventPreviewNavigation}>{footer.email}</a> : null}{footer.address ? <p>{footer.address}</p> : null}</div> : null}
    </div>
    <div className="sf-footer-bottom"><span>© {new Date().getFullYear()} {store.name}. Todos os direitos reservados.</span>{footer.show_platform_credit ? <span>Desenvolvido por <strong>VOID Startup</strong></span> : null}</div>
  </footer>;
}
