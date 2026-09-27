"use client";

import { useState } from "react";
import type { ProductAttribute, ProductDetailSection } from "@/lib/database.types";

type Tab = "description" | "additional";

export function ProductInformationTabs({
  description,
  highlights,
  detailSections,
  attributes,
}: {
  description: string;
  highlights: string[];
  detailSections: ProductDetailSection[];
  attributes: ProductAttribute[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const hasAdditionalInfo = detailSections.some((section) => section.items.length > 0) || attributes.length > 0;

  return <div className="sf-product-tabs">
    <div className="sf-product-tab-list" role="tablist" aria-label="Informações do produto">
      <button id="sf-product-tab-description" className="sf-product-tab" type="button" role="tab" aria-selected={activeTab === "description"} aria-controls="sf-product-panel-description" onClick={() => setActiveTab("description")}>Descrição</button>
      <button id="sf-product-tab-additional" className="sf-product-tab" type="button" role="tab" aria-selected={activeTab === "additional"} aria-controls="sf-product-panel-additional" onClick={() => setActiveTab("additional")}>Informação adicional</button>
    </div>
    {activeTab === "description" ? <section id="sf-product-panel-description" className="sf-product-tab-panel" role="tabpanel" aria-labelledby="sf-product-tab-description" tabIndex={0}>
      {description ? <p className="sf-detail-description">{description}</p> : <p className="sf-muted">A loja ainda não adicionou uma descrição.</p>}
      {highlights.length ? <div className="sf-product-highlights"><h2>Destaques do produto</h2><ul>{highlights.map((highlight, index) => <li key={`${index}-${highlight}`}>{highlight}</li>)}</ul></div> : null}
    </section> : <section id="sf-product-panel-additional" className="sf-product-tab-panel" role="tabpanel" aria-labelledby="sf-product-tab-additional" tabIndex={0}>
      {detailSections.map((section, sectionIndex) => section.items.length ? <section className="sf-product-info-section" key={`${sectionIndex}-${section.title}`}><h2>{section.title}</h2><dl>{section.items.map((item, itemIndex) => <div key={`${itemIndex}-${item.label}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section> : null)}
      {attributes.length ? <section className="sf-product-info-section"><h2>Opções disponíveis</h2><dl>{attributes.map((attribute) => <div key={attribute.name}><dt>{attribute.name}</dt><dd>{attribute.values.join(", ")}</dd></div>)}</dl></section> : null}
      {!hasAdditionalInfo ? <p className="sf-muted">A loja ainda não adicionou informações adicionais.</p> : null}
    </section>}
  </div>;
}
