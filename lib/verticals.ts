import type { PricingMode, ProductAvailability, TenantType } from "@/lib/database.types";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const labels: Record<TenantType, {
  items: string;
  itemSingular: string;
  itemPlural: string;
  createItem: string;
  emptyItem: string;
}> = {
  retail: {
    items: "Produtos",
    itemSingular: "produto",
    itemPlural: "produtos",
    createItem: "Adicionar produto",
    emptyItem: "produto",
  },
  food: {
    items: "Cardápio",
    itemSingular: "item do cardápio",
    itemPlural: "itens do cardápio",
    createItem: "Adicionar item ao cardápio",
    emptyItem: "item do cardápio",
  },
  services: {
    items: "Serviços",
    itemSingular: "serviço",
    itemPlural: "serviços",
    createItem: "Adicionar serviço",
    emptyItem: "serviço",
  },
};

export function getVerticalLabels(tenantType: TenantType) {
  return labels[tenantType];
}

export function formatCatalogPrice(pricingMode: PricingMode, price: number | null) {
  if (pricingMode === "quote" || price === null) return "Consultar";
  const amount = currency.format(price);
  return pricingMode === "starting_at" ? `A partir de ${amount}` : amount;
}

export function formatAvailabilityLabel(tenantType: TenantType, availability: ProductAvailability) {
  const labels: Record<TenantType, Record<ProductAvailability, string>> = {
    retail: { in_stock: "Pronta entrega", preorder: "Sob encomenda", sold_out: "Indisponível" },
    food: { in_stock: "Disponível", preorder: "Sob encomenda", sold_out: "Indisponível" },
    services: { in_stock: "Agendamento", preorder: "Sob consulta", sold_out: "Indisponível" },
  };
  return labels[tenantType][availability];
}

export type FoodOrderLine = {
  name: string;
  quantity: number;
  subtotal: number;
  options?: Record<string, string>;
};

export function buildFoodOrderMessage(storeName: string, items: FoodOrderLine[], total: number) {
  const details = items.map((item, index) => {
    const options = Object.entries(item.options ?? {}).map(([name, value]) => `${name}: ${value}`).join(", ");
    return `${index + 1}. ${item.name}\n   Quantidade: ${item.quantity}${options ? `\n   Opções: ${options}` : ""}\n   Subtotal: ${currency.format(item.subtotal)}`;
  });

  return `Olá! Gostaria de fazer um pedido na ${storeName}:\n\n${details.join("\n\n")}\n\nTotal: ${currency.format(total)}\n\nPor favor, confirme disponibilidade e prazo.`;
}

export function buildServiceInquiryMessage(serviceName: string, pricingMode: PricingMode, price: number | null) {
  if (pricingMode === "quote" || price === null) {
    return `Olá! Tenho interesse no serviço ${serviceName}. Gostaria de saber mais informações e o valor.`;
  }
  if (pricingMode === "starting_at") {
    return `Olá! Tenho interesse no serviço ${serviceName}, a partir de ${currency.format(price)}. Gostaria de saber os horários disponíveis.`;
  }
  return `Olá! Tenho interesse no serviço ${serviceName}, no valor de ${currency.format(price)}. Gostaria de saber os horários disponíveis.`;
}

export function serviceWhatsAppHref(whatsappNumber: string, serviceName: string, pricingMode: PricingMode, price: number | null) {
  const number = whatsappNumber.replace(/\D/g, "");
  const message = buildServiceInquiryMessage(serviceName, pricingMode, price);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function foodOrderWhatsAppHref(whatsappNumber: string, storeName: string, items: FoodOrderLine[], total: number) {
  const number = whatsappNumber.replace(/\D/g, "");
  const message = buildFoodOrderMessage(storeName, items, total);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
