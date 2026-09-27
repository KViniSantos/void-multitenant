import { formatCurrency } from "@/lib/format";
import { formatCatalogPrice } from "@/lib/verticals";
import type { PricingMode, TenantType } from "@/lib/database.types";

export function ProductPrices({ pixPrice, cardPrice, variant = "card" }: {
  pixPrice: number;
  cardPrice: number;
  variant?: "card" | "detail";
}) {
  return <div className={`sf-product-prices sf-product-prices-${variant}`} aria-label="Preços e condições de pagamento">
    <div className="sf-price-option sf-price-card"><span>No cartão · em até 12x</span><strong>{formatCurrency(cardPrice)}</strong></div>
    <div className="sf-price-option sf-price-pix"><span>No Pix</span><strong>{formatCurrency(pixPrice)}</strong></div>
  </div>;
}

export function CatalogPrice({ tenantType, price, cardPrice, pricingMode }: {
  tenantType: TenantType;
  price: number | null;
  cardPrice: number | null;
  pricingMode: PricingMode;
}) {
  if (tenantType === "retail" && price !== null && cardPrice !== null) {
    return <ProductPrices pixPrice={price} cardPrice={cardPrice} />;
  }
  if (tenantType === "food") {
    return <div className="sf-catalog-price sf-food-price"><span>Preço</span><strong>{price === null ? "Consultar" : formatCurrency(price)}</strong></div>;
  }
  return <div className="sf-catalog-price sf-service-price"><span>{pricingMode === "quote" ? "Valor do serviço" : "Investimento"}</span><strong>{formatCatalogPrice(pricingMode, price)}</strong></div>;
}
