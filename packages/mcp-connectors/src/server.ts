/**
 * CORAL as an MCP server.
 *
 * This is the other direction of the same relationship: instead of CORAL
 * calling out to an agent, any agent host (Claude Code, Codex, Cursor, Gemini,
 * Grok) calls into CORAL and gets a reef-backed answer instead of a bare LLM
 * opinion.
 *
 * `coral_trade` is deliberately the only write tool, it defaults to a dry run,
 * and it always runs the risk manager. An MCP client cannot place an
 * unsanctioned order through this surface.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  CoralEngine,
  CoralMemory,
  RiskManager,
  SkillRouter,
  evolve,
  resolveConfig,
  type RunReport,
} from "@coral/core";
import {
  RobinhoodChain,
  allSkills,
  createSource,
  RobinhoodMcp,
  type MarketDataSource,
} from "@coral/skills";

export interface ServeOptions {
  /** Absolute path to the reef DB. Defaults to config.home/reef.db. */
  dbPath?: string;
  mode?: "paper" | "live";
}

export function buildCoralServer(opts: ServeOptions = {}): {
  server: McpServer;
  close: () => void;
} {
  const config = resolveConfig({ ...(opts.mode ? { mode: opts.mode } : {}), ...(opts.dbPath ? { dbPath: opts.dbPath } : {}) });
  const memory = new CoralMemory(config.dbPath);
  const chain = new RobinhoodChain(config.robinhood.chainRpc);
  const mcp = new RobinhoodMcp({ url: config.robinhood.mcpUrl, token: config.robinhood.mcpToken });
  const router = new SkillRouter().register(...allSkills({ mcp: () => mcp, chain }));
  const risk = new RiskManager(RiskManager.forMode(config.mode));
  const engine = new CoralEngine({ config, memory, router, risk });
  const source: MarketDataSource = createSource({
    mcpUrl: config.robinhood.mcpUrl,
    mcpToken: config.robinhood.mcpToken,
  });

  const server = new McpServer({ name: "coral", version: "0.1.0" }, { capabilities: { tools: {} } });

  const text = (value: unknown) => ({
    content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
  });

  const report = (r: RunReport) => ({
    runId: r.runId,
    mode: r.mode,
    reasoner: r.reasoner,
    observations: r.observations.map((o) => ({
      symbol: o.symbol,
      price: o.price,
      rsi14: Number(o.rsi14.toFixed(1)),
      momentum20: Number((o.momentum20 * 100).toFixed(2)),
      source: o.source,
    })),
    decisions: r.decisions,
    gates: r.verdicts,
    executions: r.executions,
    settled: r.settled,
    polyps: r.polyps.map((p) => ({ id: p.id, kind: p.kind, symbol: p.symbol, action: p.action, thesis: p.thesis })),
  });

  server.registerTool(
    "coral_status",
    {
      title: "CORAL reef status",
      description: "Reef health: polyp count, win rate, realised P&L, generation, strongest zones.",
      inputSchema: {},
    },
    async () => {
      const snap = memory.snapshot();
      return text({
        generation: snap.generation,
        polyps: snap.polyps,
        byKind: snap.byKind,
        wins: snap.wins,
        losses: snap.losses,
        pending: snap.pending,
        winRate: Number((snap.winRate * 100).toFixed(1)),
        realisedPnl: Number(snap.pnl.toFixed(2)),
        spawnedAt: snap.spawnedAt,
        mode: config.mode,
        reasoner: engine.reasoner,
        zones: snap.zones.slice(0, 8).map((zz) => ({
          name: zz.name,
          polyps: zz.polyps,
          strength: Number((zz.strength * 100).toFixed(0)),
        })),
      });
    },
  );

  server.registerTool(
    "coral_scan",
    {
      title: "Scan symbols without trading",
      description:
        "Observe symbols, recall matching polyps, reason, and gate — but place no orders. Returns decisions and the risk verdict for each.",
      inputSchema: {
        symbols: z.array(z.string()).min(1).max(10).describe("Tickers, e.g. ['AAPL','NVDA']"),
      },
    },
    async ({ symbols }) => {
      const r = await engine.scan(symbols, source);
      return text(report(r));
    },
  );

  server.registerTool(
    "coral_trade",
    {
      title: "Run one gated trading pass",
      description:
        "Full pass: observe → recall → reason → risk gate → settle → execute. Paper mode by default; live mode requires CORAL_MODE=live and limits.allowLive. Every decision becomes a polyp.",
      inputSchema: {
        symbols: z.array(z.string()).min(1).max(10),
        budgetUsd: z.number().positive().max(10_000).optional().describe("Total USD this pass may deploy"),
        maxOrders: z.number().int().min(0).max(10).optional().describe("Hard cap on orders per pass"),
        confirm: z
          .boolean()
          .optional()
          .describe("Must be true to place anything. Omitted = dry run that only reports."),
      },
    },
    async ({ symbols, budgetUsd, maxOrders, confirm }) => {
      if (!confirm) {
        const dry = await engine.scan(symbols, source);
        return text({
          dryRun: true,
          note: "No orders placed. Call again with confirm:true to execute through the risk gate.",
          preview: report(dry),
        });
      }
      const r = await engine.run({
        symbols,
        source,
        ...(budgetUsd !== undefined ? { budgetUsd } : {}),
        ...(maxOrders !== undefined ? { maxOrders } : {}),
      });
      return text(report(r));
    },
  );

  server.registerTool(
    "coral_reef",
    {
      title: "Read the reef",
      description: "Most recent polyps — what CORAL believed, when, and how each turned out.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional(),
        symbol: z.string().optional(),
      },
    },
    async ({ limit, symbol }) => {
      const rows = symbol
        ? memory.recall({ query: symbol, symbol, limit: limit ?? 10 })
        : memory.latest(limit ?? 10).map((p) => ({ polyp: p, score: 1, why: "recency" }));
      return text(
        rows.map((r2) => ({
          id: r2.polyp.id,
          at: r2.polyp.createdAt,
          kind: r2.polyp.kind,
          symbol: r2.polyp.symbol,
          action: r2.polyp.action,
          confidence: r2.polyp.confidence,
          outcome: r2.polyp.outcome,
          pnl: r2.polyp.pnl,
          thesis: r2.polyp.thesis,
          tags: r2.polyp.tags,
        })),
      );
    },
  );

  server.registerTool(
    "coral_history",
    {
      title: "Trade ledger",
      description: "Executed fills (paper or live) with symbol, side, qty, price, and status.",
      inputSchema: { limit: z.number().int().min(1).max(100).optional() },
    },
    async ({ limit }) => text(memory.ledger(limit ?? 20)),
  );

  server.registerTool(
    "coral_evolve",
    {
      title: "Advance a generation",
      description:
        "Re-weight the reef: promote zones that are working, demote zones that are not, retire zones that never worked. Writes a generation record.",
      inputSchema: { dryRun: z.boolean().optional() },
    },
    async ({ dryRun }) => {
      const result = evolve(memory, { ...(dryRun !== undefined ? { dryRun } : {}) });
      router.syncZones(memory.zones());
      return text({
        generation: result.generation,
        promoted: result.promoted,
        demoted: result.demoted,
        retired: result.retired,
        notes: result.notes,
        applied: !dryRun,
      });
    },
  );

  server.registerTool(
    "coral_chain",
    {
      title: "Robinhood Chain health",
      description: "chainId, head block, measured block rate for the Robinhood L2 (4663). Read-only.",
      inputSchema: {},
    },
    async () => text(await chain.info()),
  );

  server.registerTool(
    "coral_ask",
    {
      title: "Route a request to a skill",
      description:
        "Ask CORAL in natural language. The skill router picks the best capability (portfolio, quote, technical read, chain reads) and returns its result plus routing diagnostics.",
      inputSchema: {
        request: z.string().min(3),
        symbol: z.string().optional(),
      },
    },
    async ({ request, symbol }) => {
      const route = router.route(request);
      if (!route) {
        return text({
          routed: false,
          available: router.list().map((s) => s.name),
          hint: "No skill scored above threshold. Try naming a capability explicitly.",
        });
      }
      try {
        const result = await route.skill.run({ ...(symbol ? { symbol } : {}) });
        return text({
          skill: route.skill.name,
          score: Number(route.score.toFixed(3)),
          matched: route.matched,
          result,
        });
      } catch (err) {
        return text({
          skill: route.skill.name,
          error: (err as Error).message,
          hint: "If this touches Robinhood, set ROBINHOOD_MCP_TOKEN and re-run `coral connect`.",
        });
      }
    },
  );

  return {
    server,
    close: () => {
      void mcp.disconnect();
      memory.close();
    },
  };
}

/** Start the server on stdio — the transport every agent host understands. */
export async function serveCoral(opts: ServeOptions = {}): Promise<void> {
  const { server, close } = buildCoralServer(opts);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = () => {
    close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // stdout belongs to the protocol — say nothing on it.
  process.stderr.write("CORAL MCP server listening on stdio\n");
}
