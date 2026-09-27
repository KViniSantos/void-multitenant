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

function formatPriceAmount(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPriceInput(value: string | number) {
  if (typeof value === "number") return formatPriceAmount(value);
  return formatPriceAmount(parsePriceInput(value) ?? 0);
}

export function parsePriceInput(value: string) {
  const input = value.trim();
  const numeric = input.replace(/[^\d.,]/g, "");
  if (!numeric || !/\d/.test(numeric)) return null;

  const lastDot = numeric.lastIndexOf(".");
  const lastComma = numeric.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimalIndex = Math.max(lastDot, lastComma);
    const whole = numeric.slice(0, decimalIndex).replace(/[^\d]/g, "") || "0";
    const fraction = numeric.slice(decimalIndex + 1).replace(/[^\d]/g, "");
    if (fraction.length > 2) return null;
    return Number(`${whole}.${fraction.padEnd(2, "0")}`);
  }

  if (lastDot >= 0 || lastComma >= 0) {
    const separator = lastDot >= 0 ? "." : ",";
    const groups = numeric.split(separator);
    const fraction = groups[groups.length - 1] ?? "";
    const whole = groups.slice(0, -1).join("") || "0";
    if (groups.length > 2) {
      if (groups.slice(1).every((group) => group.length === 3)) return Number(groups.join(""));
      if (fraction.length > 2) return null;
      return Number(`${whole}.${fraction.padEnd(2, "0")}`);
    }
    if (fraction.length === 3 && whole.length <= 3) return Number(`${whole}${fraction}`);
    if (fraction.length > 2) return null;
    return Number(`${whole}.${fraction.padEnd(2, "0")}`);
  }

  // Keep the existing digit-only keypad convention: digits represent cents.
  return Number(numeric) / 100;
}

export function formatCnpjInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
