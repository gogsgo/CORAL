import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jet",
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
      "A self-evolving AI agent that grows a reef of memory from every decision. Robinhood Trading MCP + Robinhood Chain. Paper trading by default.",
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
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
