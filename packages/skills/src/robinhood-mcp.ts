/**
 * Robinhood Trading MCP client.
 *
 * The hosted runtime at agent.robinhood.com is the source of truth for tool
 * names and schemas, and Robinhood ships new tools without notice. So this
 * client never hard-codes a tool name it can discover instead: it calls
 * `listTools()` once, then resolves each logical capability (quote, bars,
 * account, review, place) by scoring the live tool list.
 *
 * That is also why nothing here guesses at schemas — arguments are passed
 * through to the hosted tool, and a shape mismatch surfaces as a real error
 * instead of being silently swallowed.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Observation } from "@coral/core";
import { observationFromBars, type Bar } from "./indicators.js";

export interface McpToolInfo {
  name: string;
  description: string;
}

export interface RobinhoodMcpOptions {
  url: string;
  token: string | null;
  /** Per-call timeout. The hosted server can be slow on cold starts. */
  timeoutMs?: number;
}

export class RobinhoodMcp {
  private client: Client | null = null;
  private tools: McpToolInfo[] = [];

  constructor(private readonly opts: RobinhoodMcpOptions) {}

  get connected(): boolean {
    return this.client !== null;
  }

  get endpoint(): string {
    return this.opts.url;
  }

  /** Connect and discover. Idempotent. */
  async connect(): Promise<void> {
    if (this.client) return;
    const headers: Record<string, string> = {};
    if (this.opts.token) headers.Authorization = `Bearer ${this.opts.token}`;

    const transport = new StreamableHTTPClientTransport(new URL(this.opts.url), {
      requestInit: { headers },
    });
    const client = new Client({ name: "coral", version: "0.1.0" }, { capabilities: {} });
    await client.connect(transport);
    this.client = client;
    this.tools = await this.discover();
  }

  async disconnect(): Promise<void> {
    await this.client?.close();
    this.client = null;
    this.tools = [];
  }

  private async discover(): Promise<McpToolInfo[]> {
    if (!this.client) return [];
    const res = await this.client.listTools();
    return res.tools.map((t) => ({ name: t.name, description: t.description ?? "" }));
  }

  listTools(): McpToolInfo[] {
    return this.tools;
  }

  /**
   * Resolve a capability to a live tool name.
   * `hints` are ordered: the first hint that matches any tool wins, so
   * "historical bars" beats a fuzzy "history" hit on an orders tool.
   */
  resolve(hints: string[]): string | null {
    const names = this.tools.map((t) => t.name);
    for (const hint of hints) {
      const exact = names.find((n) => n === hint);
      if (exact) return exact;
      const contains = names.find((n) => n.toLowerCase().includes(hint.toLowerCase()));
      if (contains) return contains;
    }
    // Last resort: token overlap across name + description.
    const tokens = hints.join(" ").toLowerCase().split(/\s+/).filter(Boolean);
    let best: { name: string; score: number } | null = null;
    for (const tool of this.tools) {
      const hay = `${tool.name} ${tool.description}`.toLowerCase();
      const score = tokens.filter((t) => hay.includes(t)).length / Math.max(1, tokens.length);
      if (!best || score > best.score) best = { name: tool.name, score };
    }
    return best && best.score >= 0.5 ? best.name : null;
  }

  /** Call a capability. Throws with the server's own message on failure. */
  async call(hints: string[], args: Record<string, unknown>): Promise<unknown> {
    if (!this.client) throw new Error("RobinhoodMcp not connected — call connect() first");
    const tool = this.resolve(hints);
    if (!tool) {
      throw new Error(
        `Robinhood MCP exposes no tool matching [${hints.join(", ")}]. Available: ${
          this.tools.map((t) => t.name).join(", ") || "(none)"
        }`,
      );
    }
    const res = await this.client.callTool({ name: tool, arguments: args });
    const content = (res as { content?: { type: string; text?: string }[] }).content ?? [];
    const texts = content.filter((c) => c.type === "text").map((c) => c.text ?? "");
    const joined = texts.join("\n");
    try {
      return JSON.parse(joined) as unknown;
    } catch {
      return joined;
    }
  }

  // ── capability wrappers ─────────────────────────────────────────────────

  async accounts(): Promise<unknown> {
    return this.call(["get_accounts", "accounts"], {});
  }

  async portfolio(): Promise<unknown> {
    return this.call(["get_portfolio", "portfolio"], {});
  }

  async positions(): Promise<unknown> {
    return this.call(["get_equity_positions", "positions"], {});
  }

  async quotes(symbols: string[]): Promise<unknown> {
    return this.call(["get_equity_quotes", "quotes"], { symbols });
  }

  /**
   * Historical bars via the hosted market-data tool. Shape varies by version,
   * so the normaliser accepts the three shapes seen in the wild instead of
   * pinning one and breaking on upgrade.
   */
  async bars(symbol: string, interval = "day", span = "month"): Promise<Bar[]> {
    const raw = await this.call(["get_equity_historicals", "historical_bars", "historicals", "bars", "market_data"], {
      symbol,
      symbols: [symbol],
      interval,
      span,
      bounds: "regular",
    });
    return normaliseBars(raw);
  }

  async reviewOrder(order: Record<string, unknown>): Promise<unknown> {
    return this.call(["review_equity_order", "review_order"], order);
  }

  async placeOrder(order: Record<string, unknown>): Promise<unknown> {
    return this.call(["place_equity_order", "place_order"], order);
  }

  async tradability(symbol: string): Promise<unknown> {
    return this.call(["get_equity_tradability", "tradability"], { symbol });
  }
}

/** Accepts {data:[...]}, {bars:[...]}, {results:[{symbol, bars:[...]}]}, or [...]. */
export function normaliseBars(raw: unknown): Bar[] {
  const pick = (v: unknown): unknown[] => {
    if (Array.isArray(v)) return v;
    if (!v || typeof v !== "object") return [];
    const o = v as Record<string, unknown>;
    for (const key of ["bars", "data", "historicals", "results", "candles"]) {
      const candidate = o[key];
      if (Array.isArray(candidate)) return candidate;
      if (candidate && typeof candidate === "object") {
        const nested = pick(candidate);
        if (nested.length) return nested;
      }
    }
    return [];
  };

  return pick(raw)
    .map((item): Bar | null => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const close = Number(o.close ?? o.c ?? o.Close ?? o.price);
      const t = String(o.t ?? o.begin_at ?? o.timestamp ?? o.time ?? o.date ?? "");
      if (!Number.isFinite(close) || close <= 0) return null;
      const volume = Number(o.volume ?? o.v ?? 0);
      return { t: t || new Date().toISOString(), close, volume: Number.isFinite(volume) ? volume : 0 };
    })
    .filter((b): b is Bar => b !== null);
}

export function quotePrice(raw: unknown, symbol: string): number | null {
  const walk = (v: unknown): number | null => {
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = walk(item);
        if (found !== null) return found;
      }
      return null;
    }
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const sym = String(o.symbol ?? o.ticker ?? "");
    if (sym && sym.toUpperCase() !== symbol.toUpperCase()) {
      // Not our symbol at this level — keep walking into nested collections.
      for (const key of ["data", "results", "quotes", "quote"]) if (key in o) return walk(o[key]);
      return null;
    }
    for (const key of ["last_trade_price", "last_price", "price", "mark_price", "close"]) {
      const n = Number(o[key]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    for (const key of ["quote", "last_trade", "data", "results", "quotes"]) if (key in o) return walk(o[key]);
    return null;
  };
  return walk(raw);
}
