import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Vitrine — sua loja, do seu jeito", template: "%s | Vitrine" },
  description: "Crie sua vitrine online e venda com uma conversa no WhatsApp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body className={montserrat.variable}>{children}</body></html>;
}
