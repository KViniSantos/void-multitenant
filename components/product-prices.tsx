import { formatCurrency } from "@/lib/format";

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
