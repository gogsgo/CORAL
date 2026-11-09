/**
 * Research skills — the reef's ability to ask "what changed out there".
 *
 * Source: Robinhood MCP market data (quotes + bars) plus a local technical
 * read. No scraped sentiment, no invented news: if CORAL says "the trend
 * turned", it means a priced series turned, and the series is in the artifacts.
 */
import type { Skill } from "@coral/core";
import { momentum, rsi, sma, volatility } from "./indicators.js";
import type { RobinhoodMcp } from "./robinhood-mcp.js";

export interface ResearchSkillDeps {
  mcp: () => RobinhoodMcp;
}

export interface TechnicalRead {
  symbol: string;
  closes: number;
  price: number;
  rsi14: number;
  sma20: number;
  momentum20: number;
  volatility: number;
  /** Plain-language regime label, from the numbers only. */
  regime: "trending-up" | "trending-down" | "oversold" | "overbought" | "ranging";
  /** One-sentence, falsifiable read. */
  read: string;
}

export function researchSkills(deps: ResearchSkillDeps): Skill[] {
  const technical: Skill = {
    name: "research.technical",
    description: "Compute a technical read (RSI, SMA, momentum, volatility) for a symbol from its bar history.",
    triggers: ["technical", "rsi", "momentum", "analyse", "analyze", "trend", "chart"],
    tags: ["research", "market-data"],
    available: () => deps.mcp().connected,
    run: async (ctx): Promise<TechnicalRead> => {
      const symbol = String(ctx.symbol ?? "").toUpperCase();
      if (!symbol) throw new Error("research.technical needs ctx.symbol");
      const mcp = deps.mcp();
      await mcp.connect();
      const bars = await mcp.bars(symbol);
      const closes = bars.map((b) => b.close).filter((n) => n > 0);
      if (closes.length < 2) throw new Error(`not enough bars for ${symbol} (${closes.length})`);
      const last = closes[closes.length - 1]!;
      const r = rsi(closes);
      const m = momentum(closes);
      const s = sma(closes, 20);
      const v = volatility(closes);

      let regime: TechnicalRead["regime"] = "ranging";
      if (r < 35) regime = "oversold";
      else if (r > 70) regime = "overbought";
      else if (m > 0.02 && last > s) regime = "trending-up";
      else if (m < -0.02 && last < s) regime = "trending-down";

      const read =
        regime === "oversold"
          ? `${symbol} is oversold (RSI ${r.toFixed(0)}) — a bounce is likely only if momentum turns positive; invalidated by a new low.`
          : regime === "overbought"
            ? `${symbol} is overbought (RSI ${r.toFixed(0)}) — chasing here has negative expectancy; invalidated by a clean break above the recent high.`
            : regime === "trending-up"
              ? `${symbol} is trending up (20d ${(m * 100).toFixed(1)}%, above SMA20) — invalidated by a close below ${s.toFixed(2)}.`
              : regime === "trending-down"
                ? `${symbol} is trending down (20d ${(m * 100).toFixed(1)}%, below SMA20) — invalidated by a reclaim of ${s.toFixed(2)}.`
                : `${symbol} is ranging (RSI ${r.toFixed(0)}, 20d ${(m * 100).toFixed(1)}%) — no edge; wait for a break.`;

      return {
        symbol,
        closes: closes.length,
        price: last,
        rsi14: r,
        sma20: s,
        momentum20: m,
        volatility: v,
        regime,
        read,
      };
    },
  };

  const compare: Skill = {
    name: "research.compare",
    description: "Rank a basket of symbols by momentum, so allocation decisions have a defensible order.",
    triggers: ["compare", "rank", "which is better", "best of", "screen"],
    tags: ["research"],
    available: () => deps.mcp().connected,
    run: async (ctx) => {
      const symbols = Array.isArray(ctx.symbols) ? ctx.symbols.map((s) => String(s).toUpperCase()) : [];
      if (symbols.length === 0) throw new Error("research.compare needs ctx.symbols");
      const mcp = deps.mcp();
      await mcp.connect();
      const rows = [];
      for (const symbol of symbols) {
        const bars = await mcp.bars(symbol);
        const closes = bars.map((b) => b.close).filter((n) => n > 0);
        if (closes.length < 2) continue;
        rows.push({
          symbol,
          price: closes[closes.length - 1]!,
          momentum20: momentum(closes),
          rsi14: rsi(closes),
          volatility: volatility(closes),
        });
      }
      return rows.sort((a, b) => b.momentum20 - a.momentum20);
    },
  };

  return [technical, compare];
}
