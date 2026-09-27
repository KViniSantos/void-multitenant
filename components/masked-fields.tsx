"use client";

import { useState } from "react";
import { formatCnpjInput, formatPriceInput, formatWhatsAppPhone, parsePriceInput } from "@/lib/input-formatting";

export function WhatsAppField({ name = "whatsapp_number", defaultValue = "", required = false }: { name?: string; defaultValue?: string; required?: boolean }) {
  const [value, setValue] = useState(() => formatWhatsAppPhone(defaultValue));
  return <input name={name} type="tel" inputMode="tel" autoComplete="tel" required={required} value={value} onChange={(event) => setValue(formatWhatsAppPhone(event.target.value))} placeholder="+55 (11) 99999-9999" />;
}

export function PriceField({ name = "price", defaultValue = "" }: { name?: string; defaultValue?: string | number }) {
  const [value, setValue] = useState(() => defaultValue === "" ? "" : formatPriceInput(defaultValue));
  return <input name={name} type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => { const amount = parsePriceInput(value); if (amount !== null) setValue(formatPriceInput(amount)); }} placeholder="0,00" required />;
}

export function CnpjField({ name, defaultValue = "", onValueChange }: { name: string; defaultValue?: string; onValueChange?: (value: string) => void }) {
  const [value, setValue] = useState(() => formatCnpjInput(defaultValue));
  return <input name={name} inputMode="numeric" value={value} onChange={(event) => { const next = formatCnpjInput(event.target.value); setValue(next); onValueChange?.(next); }} placeholder="00.000.000/0000-00" />;
}
