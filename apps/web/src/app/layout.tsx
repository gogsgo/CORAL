import type { Metadata } from "next";
import { Cormorant_Garamond, EB_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import { CobaltFilterDefs } from "@/components/engraving";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://coral.grotto.dev"),
  title: {
    default: "CORAL — Growing intelligence, one decision at a time",
    template: "%s · CORAL",
  },
  description:
    "CORAL is a self-evolving trading agent. Every decision calcifies into a polyp of memory, and the reef it grows is the strategy. Connects to the Robinhood Trading MCP and Robinhood Chain. Paper by default.",
  keywords: [
    "CORAL",
    "self-evolving agent",
    "agentic trading",
    "Robinhood MCP",
    "Robinhood Chain",
    "AI trading agent",
    "MCP server",
    "LangGraph",
  ],
  authors: [{ name: "CORAL" }],
  openGraph: {
    title: "CORAL — Growing intelligence, one decision at a time",
    description:
      "A self-evolving AI agent that grows a reef of memory from every decision. Robinhood Trading MCP and Robinhood Chain. Paper trading by default.",
    type: "website",
    siteName: "CORAL",
  },
  twitter: {
    card: "summary_large_image",
    title: "CORAL",
    description: "Growing intelligence, one decision at a time.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} ${ebGaramond.variable} ${jetbrains.variable}`}
    >
      <body className="bg-white text-ink antialiased">
        <CobaltFilterDefs />
        {children}
      </body>
    </html>
  );
}
