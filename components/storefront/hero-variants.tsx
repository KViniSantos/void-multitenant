import Image from "next/image";
import type { PublicStorefront, StorefrontConfig } from "@/lib/database.types";
import { HeroCarousel } from "@/components/storefront-carousel";

export function StorefrontHero({ store, config, preview = false }: { store: PublicStorefront; config: StorefrontConfig; preview?: boolean }) {
  const hero = config.hero;
  if (!hero.enabled) return null;
  const image = hero.image_urls[0];
  const visual = hero.mode === "carousel" && hero.image_urls.length > 1
    ? <HeroCarousel images={hero.image_urls} title={hero.title} />
    : image ? <div className="sf-hero-image"><Image src={image} alt="" fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div>
      : <div className="sf-hero-art" aria-hidden="true"><span>{store.name.slice(0, 1)}</span><i /><i /></div>;
  const label = store.tenant_type === "food" ? "Cardápio" : store.tenant_type === "services" ? "Atendimento especializado" : "Seleção da loja";

  return <section className={"sf-hero sf-hero-" + hero.mode + " sf-hero-design-" + config.design.banner_variant + " sf-hero-" + store.tenant_type} id="inicio">
    <div className="sf-hero-copy">
      <span className="sf-eyebrow">{label}</span>
      <h1>{hero.title}</h1>
      <p>{hero.description}</p>
      <a className="sf-button sf-button-primary" href={preview ? "#preview" : "#catalogo"} onClick={preview ? (event) => event.preventDefault() : undefined}>{hero.cta_label}<span aria-hidden="true">→</span></a>
    </div>
    {visual}
  </section>;
}
