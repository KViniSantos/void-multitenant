import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vitrine — sua loja, do seu jeito", template: "%s | Vitrine" },
  description: "Crie sua vitrine online e venda com uma conversa no WhatsApp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
