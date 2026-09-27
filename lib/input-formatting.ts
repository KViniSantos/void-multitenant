export function formatWhatsAppPhone(value: string) {
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed.startsWith("+") ? "+" : "";

  if (trimmed.startsWith("+") && !digits.startsWith("55")) {
    return "+" + digits.slice(0, 15);
  }

  const hasBrazilPrefix = trimmed.startsWith("+55") || (digits.startsWith("55") && digits.length > 11);
  if (hasBrazilPrefix) digits = digits.slice(2);
  const local = digits.slice(0, 11);
  if (!local.length) return "+55 ";
  if (local.length <= 2) return "+55 (" + local;
  const area = local.slice(0, 2);
  const number = local.slice(2);
  if (number.length <= 4) return "+55 (" + area + ") " + number;
  if (local.length <= 10) return "+55 (" + area + ") " + number.slice(0, 4) + "-" + number.slice(4);
  return "+55 (" + area + ") " + number.slice(0, 5) + "-" + number.slice(5);
}

export function formatPriceInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  const amount = Number(digits || "0") / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parsePriceInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits) / 100;
}

export function formatCnpjInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
