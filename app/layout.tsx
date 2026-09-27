import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Lora, Montserrat, Playfair_Display, Roboto } from "next/font/google";
import "./globals.css";
import "./storefront-overrides.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", display: "swap", preload: false });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "Vitrine — sua loja, do seu jeito", template: "%s | Vitrine" },
  description: "Crie sua vitrine online e venda com uma conversa no WhatsApp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body className={[montserrat.variable, inter.variable, roboto.variable, lora.variable, playfair.variable].join(" ")}>{children}</body></html>;
}
