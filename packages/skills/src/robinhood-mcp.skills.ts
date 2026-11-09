/**
 * Robinhood Trading MCP skills.
 *
 * Each skill is a thin, typed wrapper over one capability, with triggers that
 * the router can score. They never touch the risk manager — they *read*, or
 * they hand an order to the venue after the engine has already gated it.
 */
import type { Skill } from "@coral/core";
import type { RobinhoodMcp } from "./robinhood-mcp.js";
import { quotePrice } from "./robinhood-mcp.js";

export interface RobinhoodSkillDeps {
  /** Lazily resolves the client so `coral status` works before connecting. */
  mcp: () => RobinhoodMcp;
}

export function robinhoodMcpSkills(deps: RobinhoodSkillDeps): Skill[] {
  const client = () => deps.mcp();

  const portfolio: Skill = {
    name: "robinhood.portfolio",
    description: "Read Robinhood Agentic account: balances, buying power, positions.",
    triggers: ["portfolio", "positions", "buying power", "holdings", "account", "balance"],
    tags: ["portfolio"],
    available: () => client().connected,
    run: async () => {
      const mcp = client();
      await mcp.connect();
      const [accounts, positions] = await Promise.all([mcp.accounts(), mcp.positions()]);
      return { accounts, positions };
    },
  };

  const quote: Skill = {
    name: "robinhood.quote",
    description: "Fetch a live equity quote from the Robinhood MCP.",
    triggers: ["quote", "price", "ticker", "last price", "how much is"],
    tags: ["market-data"],
    available: () => client().connected,
    run: async (ctx) => {
      const symbol = String(ctx.symbol ?? "").toUpperCase();
      if (!symbol) throw new Error("robinhood.quote needs ctx.symbol");
      const mcp = client();
      await mcp.connect();
      const raw = await mcp.quotes([symbol]);
      const price = quotePrice(raw, symbol);
      if (price === null) throw new Error(`no price in MCP response for ${symbol}`);
      return { symbol, price };
    },
  };

  const tradability: Skill = {
    name: "robinhood.tradability",
    description: "Check whether a symbol is tradable in the Agentic account.",
    triggers: ["tradable", "can i trade", "restricted", "tradability"],
    tags: ["compliance"],
    available: () => client().connected,
    run: async (ctx) => {
      const symbol = String(ctx.symbol ?? "").toUpperCase();
      if (!symbol) throw new Error("robinhood.tradability needs ctx.symbol");
      const mcp = client();
      await mcp.connect();
      return mcp.tradability(symbol);
    },
  };

  const review: Skill = {
    name: "robinhood.review-order",
    description: "Preview an order (no side effects) before placement.",
    triggers: ["review order", "preview order", "simulate order"],
    tags: ["execution"],
    available: () => client().connected,
    run: async (ctx) => {
      const mcp = client();
      await mcp.connect();
      const order = ctx.order;
      if (!order || typeof order !== "object") throw new Error("robinhood.review-order needs ctx.order");
      return mcp.reviewOrder(order as Record<string, unknown>);
    },
  };

  const place: Skill = {
    name: "robinhood.place-order",
    description: "Place a gated order in the Agentic account. Never call directly — go through the engine.",
    triggers: ["place order", "execute order", "submit order"],
    tags: ["execution"],
    available: () => client().connected,
    run: async (ctx) => {
      const mcp = client();
      await mcp.connect();
      const order = ctx.order;
      if (!order || typeof order !== "object") throw new Error("robinhood.place-order needs ctx.order");
      return mcp.placeOrder(order as Record<string, unknown>);
    },
  };

  const discovery: Skill = {
    name: "robinhood.discover-tools",
    description: "List the tools the hosted MCP currently exposes (it changes without notice).",
    triggers: ["what tools", "list tools", "capabilities", "mcp tools"],
    tags: ["diagnostics"],
    available: () => client().connected,
    run: async () => {
      const mcp = client();
      await mcp.connect();
      return mcp.listTools();
    },
  };

  return [portfolio, quote, tradability, review, place, discovery];
}
