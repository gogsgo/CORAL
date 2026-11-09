/**
 * The engine: observe → recall → reason → gate → settle → calcify.
 *
 * Built as a LangGraph StateGraph so every pass is a traceable object, and so
 * you can swap one node (a better reasoner, a different venue) without
 * touching the rest. The graph is compiled with a checkpointer, which means a
 * run has a thread id you can resume — the reef remembers what it was doing.
 *
 * Two rules this file enforces and nothing else can override:
 *   1. Nothing reaches a venue without passing RiskManager.review().
 *   2. Every decision becomes a polyp before the run returns, even a rejected
 *      one. Especially a rejected one.
 */
import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { generateObject } from "ai";
import { formatDistanceToNow } from "date-fns";
import { randomUUID } from "node:crypto";

import type { CoralConfig } from "../config.js";
import { brain, type Brain } from "./brain.js";
import { RiskManager, type RiskState, type RiskVerdict } from "../safety/risk-manager.js";
import type { SkillRouter } from "../skills/router.js";
import type { CoralMemory } from "../memory/coral-memory.js";
import {
  DecisionBatchSchema,
  type Action,
  type Decision,
  type Execution,
  type LedgerEntry,
  type Observation,
  type Polyp,
  type ScoredPolyp,
} from "../memory/types.js";

// ── market data ───────────────────────────────────────────────────────────

export interface MarketDataSource {
  readonly name: string;
  /** Fetch observations for the given symbols. Must not invent prices silently. */
  observe(symbols: string[]): Promise<Observation[]>;
  /** Last price for settling open polyps. */
  quote(symbol: string): Promise<number | null>;
}

// ── graph state ───────────────────────────────────────────────────────────

const CoralState = Annotation.Root({
  runId: Annotation<string>({ reducer: (_a, b) => b, default: () => randomUUID() }),
  symbols: Annotation<string[]>({ reducer: (_a, b) => b, default: () => [] }),
  observations: Annotation<Observation[]>({ reducer: (_a, b) => b, default: () => [] }),
  recalled: Annotation<Record<string, ScoredPolyp[]>>({ reducer: (_a, b) => b, default: () => ({}) }),
  decisions: Annotation<Decision[]>({ reducer: (_a, b) => b, default: () => [] }),
  verdicts: Annotation<RiskVerdict[]>({ reducer: (_a, b) => b, default: () => [] }),
  executions: Annotation<Execution[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  settled: Annotation<{ polypId: string; outcome: string; pnl: number }[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  polyps: Annotation<Polyp[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  notes: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  phase: Annotation<string>({ reducer: (_a, b) => b, default: () => "idle" }),
});

export type CoralStateType = typeof CoralState.State;

export interface RunOptions {
  symbols: string[];
  /** Total USD the run may deploy across all orders. */
  budgetUsd?: number;
  /** Hard cap on orders placed in one run. */
  maxOrders?: number;
  /** 4–12 hours; the agent sizes positions against this. */
  horizonHint?: string;
  source?: MarketDataSource;
  onEvent?: (event: CoralEvent) => void;
}

export type CoralEvent =
  | { type: "phase"; phase: string; note?: string }
  | { type: "observation"; observation: Observation }
  | { type: "recall"; symbol: string; hits: number; top: string | null }
  | { type: "decision"; decision: Decision }
  | { type: "gate"; symbol: string; allowed: boolean; reasons: string[] }
  | { type: "execution"; execution: Execution }
  | { type: "settled"; symbol: string; outcome: string; pnl: number }
  | { type: "done"; runId: string };

export interface RunReport {
  runId: string;
  mode: "paper" | "live";
  reasoner: "llm" | "heuristic";
  observations: Observation[];
  decisions: Decision[];
  verdicts: RiskVerdict[];
  executions: Execution[];
  settled: { polypId: string; outcome: string; pnl: number }[];
  polyps: Polyp[];
  notes: string[];
  startedAt: string;
  finishedAt: string;
}

// ── heuristic reasoner ────────────────────────────────────────────────────

/**
 * Deterministic, explainable, and honestly profitable-ish on trending names.
 * Used when no model key is configured — it is the fallback, not a fake.
 */
export function heuristicDecide(
  obs: Observation,
  memory: { bias: number; hits: ScoredPolyp[]; holding: boolean },
): Decision {
  const tags: string[] = ["heuristic"];
  let score = 0;

  // Mean reversion: oversold and already turning.
  if (obs.rsi14 < 35 && obs.momentum20 > 0) {
    score += 0.4;
    tags.push("mean-reversion", "oversold");
  }
  // Trend continuation: the 20-day trend is up and price is above its average.
  // A single negative day does not invalidate a 20-day trend.
  if (obs.momentum20 > 0.015 && obs.price > obs.sma20) {
    score += 0.3;
    tags.push("momentum");
  }
  // Conviction from realised history on this symbol.
  if (memory.bias > 0.2) {
    score += 0.15;
    tags.push("reef-favoured");
  }
  if (memory.bias < -0.2) {
    score -= 0.25;
    tags.push("reef-burned");
  }
  // Overbought: take profit, don't chase.
  if (obs.rsi14 > 70) {
    score -= 0.3;
    tags.push("overbought");
  }
  // Volatility penalty — wide ranges punish tight stops.
  if (obs.volatility > 0.08) {
    score -= 0.15;
    tags.push("high-vol");
  }
  // Losses in recall outweigh everything else. This is the reef's memory
  // doing actual work rather than decorating a prompt.
  const losses = memory.hits.filter((h) => h.polyp.outcome === "loss").length;
  if (losses >= 2) {
    score -= 0.2;
    tags.push("scarred");
  }

  let action: Action = "hold";
  if (score >= 0.25) action = "buy";
  else if (memory.holding && (score < -0.1 || obs.rsi14 > 72)) action = "sell";
  else if (score < -0.35) action = "skip";

  const confidence = Math.min(0.95, Math.max(0.05, 0.5 + score * 0.6));
  const parts = [
    action.toUpperCase(),
    `rsi ${obs.rsi14.toFixed(0)}`,
    `mom ${(obs.momentum20 * 100).toFixed(1)}%`,
    `24h ${(obs.change24h * 100).toFixed(1)}%`,
    memory.hits.length ? `${memory.hits.length} polyps recalled` : "empty recall",
  ];

  return {
    symbol: obs.symbol,
    action,
    confidence,
    thesis: parts.join(" · "),
    tags,
    recalled: memory.hits.map((h) => h.polyp.id),
  };
}

// ── engine ────────────────────────────────────────────────────────────────

export interface EngineDeps {
  config: CoralConfig;
  memory: CoralMemory;
  router: SkillRouter;
  risk: RiskManager;
}

export class CoralEngine {
  private readonly brain: Brain | null;
  private readonly graph;

  constructor(private readonly deps: EngineDeps) {
    this.brain = brain(deps.config.llm, deps.config.model);
    this.graph = this.buildGraph();
  }

  get reasoner(): "llm" | "heuristic" {
    return this.brain ? "llm" : "heuristic";
  }

  private buildGraph() {
    const self = this;
    return new StateGraph(CoralState)
      .addNode("observe", async (s: CoralStateType) => {
        const source = this.currentSource;
        if (!source) throw new Error("no market data source configured");
        self.emit({ type: "phase", phase: "observe", note: `reading ${s.symbols.length} symbol(s) from ${source.name}` });
        const observations = await source.observe(s.symbols);
        for (const obs of observations) self.emit({ type: "observation", observation: obs });
        self.currentObservations = observations;
        return { observations, phase: "observe" };
      })
      .addNode("recall", async (s: CoralStateType) => {
        self.emit({ type: "phase", phase: "recall", note: "pulling polyps that match today's setup" });
        const recalled: Record<string, ScoredPolyp[]> = {};
        const stats = self.deps.memory.stats();
        for (const obs of s.observations) {
          const hits = self.deps.memory.recall({
            query: `${obs.symbol} rsi ${obs.rsi14.toFixed(0)} momentum ${(obs.momentum20 * 100).toFixed(1)}`,
            symbol: obs.symbol,
            tags: ["momentum", "mean-reversion"],
            limit: 6,
          });
          recalled[obs.symbol] = hits;
          self.emit({
            type: "recall",
            symbol: obs.symbol,
            hits: hits.length,
            top: hits[0] ? `[${hits[0].polyp.outcome}] ${hits[0].polyp.thesis.slice(0, 60)}` : null,
          });
        }
        self.currentStats = stats;
        return { recalled, phase: "recall" };
      })
      .addNode("reason", async (s: CoralStateType) => {
        self.emit({
          type: "phase",
          phase: "reason",
          note: self.brain ? `thinking with ${self.deps.config.model}` : "no model key — deterministic reasoning",
        });
        const decisions = await self.reason(s);
        for (const d of decisions) self.emit({ type: "decision", decision: d });
        return { decisions, phase: "reason" };
      })
      .addNode("gate", async (s: CoralStateType) => {
        self.emit({ type: "phase", phase: "gate", note: "hard limits, non-negotiable" });
        const verdicts: RiskVerdict[] = [];
        const budget = self.currentBudget;
        const perOrder = Math.min(
          self.deps.risk.limits.maxOrderUsd,
          Math.max(25, budget / Math.max(1, s.decisions.filter((d) => d.action === "buy").length)),
        );
        for (const decision of s.decisions) {
          const obs = s.observations.find((o) => o.symbol === decision.symbol);
          if (!obs) {
            verdicts.push({ allowed: false, reasons: [`no observation for ${decision.symbol}`], notional: 0 });
            continue;
          }
          const verdict = self.deps.risk.review(
            { decision, price: obs.price, requestedNotional: perOrder },
            self.riskState(decision.symbol),
          );
          verdicts.push(verdict);
          self.emit({ type: "gate", symbol: decision.symbol, allowed: verdict.allowed, reasons: verdict.reasons });
        }
        return { verdicts, phase: "gate" };
      })
      .addNode("settle", async (s: CoralStateType) => {
        self.emit({ type: "phase", phase: "settle", note: "settling decisions that the market has now judged" });
        const settled = await self.settle(s);
        return { settled, phase: "settle" };
      })
      .addNode("execute", async (s: CoralStateType) => {
        self.emit({ type: "phase", phase: "execute", note: self.deps.config.mode === "paper" ? "paper fills" : "live orders" });
        const { executions, polyps } = await self.execute(s);
        return { executions, polyps, phase: "execute" };
      })
      .addNode("calcify", async (s: CoralStateType) => {
        const polyps = self.calcify(s);
        return { polyps, phase: "done" };
      })
      .addEdge(START, "observe")
      .addEdge("observe", "recall")
      .addEdge("recall", "reason")
      .addEdge("reason", "gate")
      .addEdge("gate", "settle")
      .addEdge("settle", "execute")
      .addEdge("execute", "calcify")
      .addEdge("calcify", END)
      .compile({ checkpointer: new MemorySaver() });
  }

  // ── run-scoped context (single-threaded CLI/graph, no concurrency here) ──
  private currentSource: MarketDataSource | null = null;
  private currentObservations: Observation[] = [];
  private currentStats = { bias: new Map<string, number>(), sampleSize: 0, winRate: 0 };
  private currentBudget = 250;
  private currentMaxOrders = 3;
  private currentOrders = 0;
  private currentRunId = "";
  private emitter: ((e: CoralEvent) => void) | null = null;

  private emit(event: CoralEvent): void {
    this.emitter?.(event);
  }

  private riskState(symbol: string): RiskState {
    const positions = this.deps.memory.openPositions();
    const symbolPosition = positions.find((p) => p.symbol === symbol);
    const memory = this.deps.memory;
    const today = new Date().toISOString().slice(0, 10);
    const daily = memory.db
      .prepare<[string], { pnl: number }>(
        "SELECT COALESCE(SUM(pnl),0) AS pnl FROM polyps WHERE outcome != 'pending' AND substr(created_at,1,10) = ?",
      )
      .get(today);

    const recent = memory
      .db.prepare<[], { outcome: string }>(
        "SELECT outcome FROM polyps WHERE outcome IN ('win','loss') AND kind IN ('decision','trade') ORDER BY created_at DESC LIMIT 10",
      )
      .all();

    let streak = 0;
    for (const r of recent) {
      if (r.outcome === "loss") streak++;
      else break;
    }

    return {
      mode: this.deps.config.mode,
      deployedUsd: memory.deployedCapital(),
      symbolExposureUsd: Math.max(0, symbolPosition?.cost ?? 0),
      consecutiveLosses: streak,
      dailyPnl: daily?.pnl ?? 0,
    };
  }

  /**
   * Reasoning. With a model: one structured call for the whole basket, with
   * recalled polyps in the prompt. Without: the heuristic, per observation.
   */
  private async reason(s: CoralStateType): Promise<Decision[]> {
    if (!this.brain || s.observations.length === 0) {
      return s.observations.map((obs) =>
        heuristicDecide(obs, {
          bias: this.currentStats.bias.get(obs.symbol) ?? 0,
          hits: s.recalled[obs.symbol] ?? [],
          holding: this.deps.memory.openPositions().some((p) => p.symbol === obs.symbol),
        }),
      );
    }

    const prompt = buildReasoningPrompt(s, this.deps.memory, this.deps.config);
    try {
      const { object } = await generateObject({
        model: this.brain.model,
        schema: DecisionBatchSchema,
        system: CORAL_SYSTEM_PROMPT,
        prompt,
        temperature: 0.3,
      });
      // Guard the model's output: it may only speak about symbols it was given.
      const allowed = new Set(s.observations.map((o) => o.symbol));
      return object.decisions
        .filter((d) => allowed.has(d.symbol))
        .map((d) => ({
          ...d,
          recalled: (s.recalled[d.symbol] ?? []).map((h) => h.polyp.id),
        }));
    } catch (err) {
      this.emit({
        type: "phase",
        phase: "reason",
        note: `model call failed (${(err as Error).message.slice(0, 120)}) — falling back to heuristic`,
      });
      return s.observations.map((obs) =>
        heuristicDecide(obs, {
          bias: this.currentStats.bias.get(obs.symbol) ?? 0,
          hits: s.recalled[obs.symbol] ?? [],
          holding: this.deps.memory.openPositions().some((p) => p.symbol === obs.symbol),
        }),
      );
    }
  }

  /**
   * Settle polyps from previous runs. A decision polyp is settled by price
   * movement since it was made; a trade polyp by its realized P&L.
   */
  private async settle(s: CoralStateType): Promise<{ polypId: string; outcome: string; pnl: number }[]> {
    const pending = this.deps.memory.unsettled(40);
    if (pending.length === 0) return [];
    const out: { polypId: string; outcome: string; pnl: number }[] = [];
    const quoteCache = new Map<string, number>();
    // A decision cannot be judged the minute it is made. Without a minimum age,
    // every same-run polyp settles as a meaningless 0.00 "win" and inflates the
    // win rate into fiction.
    const minAgeMs = 60 * 60 * 1000;
    const now = Date.now();

    for (const polyp of pending) {
      if (!polyp.symbol) continue;
      if (now - new Date(polyp.createdAt).getTime() < minAgeMs) continue;
      let price = quoteCache.get(polyp.symbol);
      if (price === undefined) {
        const q = await this.currentSource?.quote(polyp.symbol);
        if (q === null || q === undefined) continue;
        price = q;
        quoteCache.set(polyp.symbol, q);
      }
      const entry = Number((polyp.artifacts as { price?: number }).price ?? 0);
      if (!entry) continue;

      const move = (price - entry) / entry;
      // Reference-unit P&L: $100 of exposure. The real money is on the ledger —
      // this number exists so recall can rank polyps against each other.
      const pnl = move * 100;
      const decidedAction = polyp.action;

      let outcome: "win" | "loss" | "neutral";
      if (decidedAction === "buy") outcome = move > 0.01 ? "win" : move < -0.01 ? "loss" : "neutral";
      else if (decidedAction === "sell") outcome = move < -0.01 ? "win" : move > 0.01 ? "loss" : "neutral";
      else {
        // A hold has no position, so it realises nothing. Counting "price barely
        // moved" as a win is how a reef ends up advertising a 100% win rate on
        // $0.00 of profit — a metric that is arithmetically true and completely
        // meaningless. Sitting out is neutral, always.
        outcome = "neutral";
      }

      const settledPnl = decidedAction === "buy" || decidedAction === "sell" ? Number(pnl.toFixed(2)) : 0;
      this.deps.memory.resolve(polyp.id, outcome, settledPnl);
      out.push({ polypId: polyp.id, outcome, pnl: settledPnl });
      this.emit({ type: "settled", symbol: polyp.symbol, outcome, pnl: settledPnl });
    }
    return out;
  }

  /** Execute sanctioned decisions. Paper fills here; live hands to the venue. */
  private async execute(s: CoralStateType): Promise<{ executions: Execution[]; polyps: Polyp[] }> {
    const executions: Execution[] = [];
    const polyps: Polyp[] = [];
    const bySymbol = new Map(s.observations.map((o) => [o.symbol, o]));

    for (let i = 0; i < s.decisions.length; i++) {
      const decision = s.decisions[i]!;
      const verdict = s.verdicts[i] ?? { allowed: false, reasons: ["no verdict"], notional: 0 };
      const obs = bySymbol.get(decision.symbol);
      if (!obs) continue;

      if (decision.action === "hold" || decision.action === "skip") {
        executions.push({
          symbol: decision.symbol,
          action: decision.action,
          allowed: verdict.allowed,
          reasons: verdict.reasons,
          notional: 0,
          qty: 0,
          price: obs.price,
          polypId: null,
          status: "dry-run",
        });
        continue;
      }

      if (!verdict.allowed || verdict.notional <= 0) {
        executions.push({
          symbol: decision.symbol,
          action: decision.action,
          allowed: false,
          reasons: verdict.reasons,
          notional: 0,
          qty: 0,
          price: obs.price,
          polypId: null,
          status: "rejected",
        });
        this.emit({
          type: "execution",
          execution: executions[executions.length - 1]!,
        });
        continue;
      }

      if (this.currentOrders >= this.currentMaxOrders) {
        executions.push({
          symbol: decision.symbol,
          action: decision.action,
          allowed: true,
          reasons: [`run order cap reached (${this.currentMaxOrders})`],
          notional: 0,
          qty: 0,
          price: obs.price,
          polypId: null,
          status: "rejected",
        });
        continue;
      }

      const notional = verdict.notional;
      const { qty, fees } = this.deps.risk.fill(notional, obs.price);
      this.currentOrders++;

      const entry: LedgerEntry = {
        id: randomUUID(),
        ts: new Date().toISOString(),
        mode: this.deps.config.mode,
        symbol: decision.symbol,
        side: decision.action,
        qty,
        price: obs.price,
        notional,
        polypId: null,
        status: this.deps.config.mode === "live" ? "pending" : "filled",
        venue: this.deps.config.mode === "live" ? "robinhood-mcp" : "paper",
      };

      const execution: Execution = {
        symbol: decision.symbol,
        action: decision.action,
        allowed: true,
        reasons: verdict.scaledFrom
          ? [`scaled ${verdict.scaledFrom} → ${notional} by risk limits`, `fees $${fees.toFixed(2)}`]
          : [`fees $${fees.toFixed(2)}`],
        notional,
        qty,
        price: obs.price,
        polypId: null,
        status: entry.status,
      };

      if (this.deps.config.mode === "live") {
        this.emit({
          type: "phase",
          phase: "execute",
          note: `live order queued for ${decision.symbol} — hand off to Robinhood MCP`,
        });
      }
      this.deps.memory.record(entry);
      executions.push(execution);
      this.emit({ type: "execution", execution });
    }

    return { executions, polyps };
  }

  /** Turn this run into polyps. One per decision, plus a reflection. */
  private calcify(s: CoralStateType): Polyp[] {
    const grown: Polyp[] = [];
    const bySymbol = new Map(s.observations.map((o) => [o.symbol, o]));

    for (let i = 0; i < s.decisions.length; i++) {
      const decision = s.decisions[i]!;
      const verdict = s.verdicts[i];
      const obs = bySymbol.get(decision.symbol);
      const execution = s.executions.find(
        (e) => e.symbol === decision.symbol && (e.status === "filled" || e.status === "pending"),
      );

      const obsNow = bySymbol.get(decision.symbol);
      const regime = (obsNow?.rsi14 ?? 50) < 35 ? "oversold" : (obsNow?.rsi14 ?? 50) > 70 ? "overbought" : "mid-range";

      const polyp = this.deps.memory.grow({
        kind: execution ? "trade" : "decision",
        agent: "coral",
        symbol: decision.symbol,
        thesis: decision.thesis,
        action: decision.action,
        confidence: decision.confidence,
        outcome: "pending",
        pnl: 0,
        tags: [...new Set([...decision.tags, regime, verdict?.allowed ? "sanctioned" : "gated"])],
        artifacts: {
          price: obs?.price ?? null,
          observation: obs ?? null,
          recalled: decision.recalled,
          gate: verdict ?? null,
          execution: execution ?? null,
          runId: s.runId,
          reasoner: this.reasoner,
          generation: this.deps.memory.generation,
        },
      });
      grown.push(polyp);
    }

    if (s.settled.length > 0) {
      const wins = s.settled.filter((x) => x.outcome === "win").length;
      const losses = s.settled.filter((x) => x.outcome === "loss").length;
      grown.push(
        this.deps.memory.grow({
          kind: "reflection",
          agent: "coral",
          symbol: null,
          thesis: `settled ${s.settled.length} polyps: ${wins}W / ${losses}L. ${
            losses > wins ? "Pattern is not holding — tighten, do not widen." : "Reef is holding. Stay the course."
          }`,
          action: "hold",
          confidence: 0.6,
          outcome: losses > wins ? "loss" : wins > 0 ? "win" : "neutral",
          pnl: Number(s.settled.reduce((sum, x) => sum + x.pnl, 0).toFixed(2)),
          tags: ["reflection", "settlement"],
          artifacts: { runId: s.runId, settled: s.settled },
        }),
      );
    }

    return grown;
  }

  /** Public entry point: one full pass of the reef. */
  async run(opts: RunOptions): Promise<RunReport> {
    if (opts.symbols.length === 0) throw new Error("run() needs at least one symbol");
    this.currentSource = opts.source ?? null;
    this.currentBudget = opts.budgetUsd ?? this.deps.risk.limits.maxOrderUsd;
    this.currentMaxOrders = opts.maxOrders ?? 3;
    this.currentOrders = 0;
    this.emitter = opts.onEvent ?? null;

    if (!this.currentSource) {
      throw new Error("run() needs a MarketDataSource — pass `source` (see @coral/skills)");
    }

    const startedAt = new Date().toISOString();
    // Refuse to trade a reef whose skills have gone cold: sync zones first.
    this.deps.router.syncZones(this.deps.memory.zones());

    const threadId = randomUUID();
    this.currentRunId = threadId;
    const final = (await this.graph.invoke(
      { symbols: opts.symbols.map((s) => s.toUpperCase()), runId: threadId },
      { configurable: { thread_id: threadId } },
    )) as CoralStateType;

    this.emit({ type: "done", runId: final.runId });

    return {
      runId: final.runId,
      mode: this.deps.config.mode,
      reasoner: this.reasoner,
      observations: final.observations,
      decisions: final.decisions,
      verdicts: final.verdicts,
      executions: final.executions,
      settled: final.settled,
      polyps: final.polyps,
      notes: final.notes,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }

  /** Single-symbol convenience used by `coral scan` and the web dashboard. */
  async scan(symbols: string[], source: MarketDataSource, onEvent?: (e: CoralEvent) => void): Promise<RunReport> {
    return this.run({ symbols, source, maxOrders: 0, ...(onEvent ? { onEvent } : {}) });
  }
}

// ── prompt construction ───────────────────────────────────────────────────

export const CORAL_SYSTEM_PROMPT = `You are CORAL — Cultivating On-chain Reasoning & Adaptive Learning.
You are not a chatbot that happens to know about markets. You are a colony:
every decision you make grows a polyp, and the colony's shape is the accumulated
evidence of what has and has not worked.

Operating principles, in priority order:
1. Capital preservation outranks opportunity. A skipped trade costs nothing.
2. Your recalled polyps are evidence, not decoration. A losing pattern on the
   same symbol in the same regime should visibly change your answer.
3. Confidence must be honest. If the setup is ambiguous, say 0.4 and choose hold.
4. Every thesis must be falsifiable in one sentence: what price move, by when,
   proves you wrong.
5. Never invent numbers. Use only the observations given to you.

You are in PAPER mode unless told otherwise. Nothing you output executes
directly — a deterministic risk manager reviews every call after you speak.`;

function buildReasoningPrompt(s: CoralStateType, memory: CoralMemory, config: CoralConfig): string {
  const snapshot = memory.snapshot();
  const positions = memory.openPositions();
  const lines: string[] = [];

  lines.push(`# Reef state (generation ${snapshot.generation})`);
  lines.push(
    `polyps ${snapshot.polyps} · settled ${snapshot.wins}W/${snapshot.losses}L · win rate ${
      snapshot.winRate === 0 ? "n/a" : (snapshot.winRate * 100).toFixed(1) + "%"
    } · realised $${snapshot.pnl.toFixed(2)}`,
  );
  lines.push(`spawned ${formatDistanceToNow(new Date(snapshot.spawnedAt), { addSuffix: true })}`);
  const strong = snapshot.zones.filter((z) => z.polyps >= 3).slice(0, 6);
  if (strong.length) {
    lines.push(`strongest zones: ${strong.map((z) => `${z.name}(${z.polyps}, ${(z.strength * 100).toFixed(0)}%)`).join(", ")}`);
  }
  if (positions.length) {
    lines.push(`open positions: ${positions.map((p) => `${p.symbol} ${p.qty.toFixed(4)} @ $${(p.cost / p.qty).toFixed(2)}`).join(", ")}`);
  } else {
    lines.push("open positions: none");
  }

  lines.push("", "# Observations");
  for (const o of s.observations) {
    lines.push(
      `- ${o.symbol}: price ${o.price}, 24h ${(o.change24h * 100).toFixed(2)}%, rsi14 ${o.rsi14.toFixed(1)}, ` +
        `sma20 ${o.sma20.toFixed(2)}, momentum20 ${(o.momentum20 * 100).toFixed(2)}%, vol ${(o.volatility * 100).toFixed(2)}% (${o.source})`,
    );
  }

  lines.push("", "# Recalled polyps (your own history)");
  for (const [symbol, hits] of Object.entries(s.recalled)) {
    if (!hits.length) {
      lines.push(`- ${symbol}: no prior polyps — this is genuinely new ground.`);
      continue;
    }
    lines.push(`- ${symbol}:`);
    for (const hit of hits.slice(0, 5)) {
      lines.push(
        `  · [${hit.polyp.outcome}, pnl $${hit.polyp.pnl.toFixed(2)}] ${hit.polyp.action.toUpperCase()} @ ${hit.polyp.createdAt.slice(0, 10)} — ${hit.polyp.thesis}`,
      );
    }
  }

  lines.push(
    "",
    `# Task`,
    `Mode: ${config.mode}. Budget for this pass: $${s.observations.length ? Math.min(s.observations.length * 50, 250) : 0}.`,
    `Decide, per symbol, one of buy | sell | hold | skip, with confidence 0..1.`,
    `Hold means "watch, no action". Skip means "I considered it and actively declined".`,
    `Return one decision per observation, no extras.`,
  );

  return lines.join("\n");
}
