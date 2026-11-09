/**
 * Smoke checks for the reef. No test framework — `assert` and a tiny runner.
 * Run with `pnpm --filter @coral/core check`.
 *
 * Covers exactly the logic that would quietly lie if it broke: similarity
 * scoring, risk gating, memory round-trips, evolution thresholds, and a full
 * engine pass on synthetic data.
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { CoralMemory } from "../memory/coral-memory.js";
import { recency, textSimilarity } from "../memory/similarity.js";
import { DEFAULT_LIMITS, RiskManager } from "../safety/risk-manager.js";
import { SkillRouter, type Skill } from "../skills/router.js";
import { CoralEngine, heuristicDecide, type MarketDataSource } from "../agent/engine.js";
import { evolve } from "../agent/evolution.js";
import { resolveConfig } from "../config.js";
import type { Observation } from "../memory/types.js";

const results: { name: string; ok: boolean; error?: string }[] = [];

function test(name: string, fn: () => void | Promise<unknown>): void {
  try {
    const out = fn();
    if (out instanceof Promise) {
      pending.push(
        out.then(
          () => {
            results.push({ name, ok: true });
          },
          (e: Error) => {
            results.push({ name, ok: false, error: e.message });
          },
        ),
      );
      return;
    }
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, error: (err as Error).message });
  }
}
const pending: Promise<void>[] = [];

const home = mkdtempSync(join(tmpdir(), "coral-smoke-"));
const dbPath = join(home, "reef.db");

// ── similarity ────────────────────────────────────────────────────────────
test("textSimilarity ranks related theses above unrelated", () => {
  const related = textSimilarity("AAPL oversold bounce rsi", "AAPL oversold rsi bounce setup");
  const unrelated = textSimilarity("AAPL oversold bounce rsi", "treasury yields curve inversion");
  assert.ok(related > unrelated, `${related} should exceed ${unrelated}`);
  assert.equal(textSimilarity("", "anything"), 0);
});

test("recency decays with half-life", () => {
  const now = new Date("2026-01-31T00:00:00Z");
  const fresh = recency("2026-01-31T00:00:00Z", now);
  const old = recency("2025-12-02T00:00:00Z", now); // 60 days ≈ 2 half-lives
  assert.ok(Math.abs(fresh - 1) < 1e-9);
  assert.ok(old > 0.2 && old < 0.3, `60d should be ~0.25, got ${old}`);
});

// ── memory ────────────────────────────────────────────────────────────────
test("memory grows, recalls, and resolves a polyp", () => {
  const mem = new CoralMemory(dbPath);
  const polyp = mem.grow({
    kind: "decision",
    agent: "coral",
    symbol: "AAPL",
    thesis: "AAPL oversold rsi 28 with momentum turning up",
    action: "buy",
    confidence: 0.7,
    tags: ["mean-reversion", "oversold"],
    artifacts: { price: 180 },
  });
  assert.ok(polyp.id.length > 10);
  const hits = mem.recall({ query: "AAPL oversold rsi", symbol: "AAPL", limit: 3 });
  assert.equal(hits.length, 1);
  assert.ok(hits[0]!.score > 0);

  const resolved = mem.resolve(polyp.id, "win", 12.5);
  assert.equal(resolved.outcome, "win");
  assert.equal(mem.snapshot().wins, 1);
  mem.close();
});

test("snapshot counts win rate over settled polyps only", () => {
  const mem = new CoralMemory(dbPath);
  mem.grow({ kind: "decision", agent: "coral", symbol: "MSFT", thesis: "pending one", action: "buy", confidence: 0.6 });
  const snap = mem.snapshot();
  assert.equal(snap.wins, 1, "one prior win from previous test");
  assert.equal(snap.winRate, 1, "pending polyps must not dilute the win rate");
  assert.ok(snap.pending >= 1);
  mem.close();
});

// ── risk ──────────────────────────────────────────────────────────────────
test("risk rejects low confidence", () => {
  const rm = new RiskManager(RiskManager.forMode("paper"));
  const verdict = rm.review(
    { decision: { symbol: "AAPL", action: "buy", confidence: 0.3, thesis: "meh", tags: [], recalled: [] }, price: 100, requestedNotional: 100 },
    { mode: "paper", deployedUsd: 0, symbolExposureUsd: 0, consecutiveLosses: 0, dailyPnl: 0 },
  );
  assert.equal(verdict.allowed, false);
  assert.match(verdict.reasons.join(" "), /confidence/);
});

test("risk allows hold with zero size even when confidence is low", () => {
  const rm = new RiskManager(RiskManager.forMode("paper"));
  const verdict = rm.review(
    { decision: { symbol: "AAPL", action: "hold", confidence: 0.1, thesis: "wait", tags: [], recalled: [] }, price: 100, requestedNotional: 100 },
    { mode: "paper", deployedUsd: 0, symbolExposureUsd: 0, consecutiveLosses: 0, dailyPnl: 0 },
  );
  assert.equal(verdict.allowed, true);
  assert.equal(verdict.notional, 0);
});

test("risk scales an oversized order down instead of rejecting it", () => {
  const rm = new RiskManager(RiskManager.forMode("paper"));
  const verdict = rm.review(
    { decision: { symbol: "NVDA", action: "buy", confidence: 0.9, thesis: "strong", tags: [], recalled: [] }, price: 100, requestedNotional: 5_000 },
    { mode: "paper", deployedUsd: 0, symbolExposureUsd: 0, consecutiveLosses: 0, dailyPnl: 0 },
  );
  assert.equal(verdict.allowed, true);
  assert.equal(verdict.notional, DEFAULT_LIMITS.maxOrderUsd);
  assert.equal(verdict.scaledFrom, 5_000);
});

test("circuit breaker trips after consecutive losses", () => {
  const rm = new RiskManager(RiskManager.forMode("paper"));
  const verdict = rm.review(
    { decision: { symbol: "AAPL", action: "buy", confidence: 0.9, thesis: "x", tags: [], recalled: [] }, price: 100, requestedNotional: 50 },
    { mode: "paper", deployedUsd: 0, symbolExposureUsd: 0, consecutiveLosses: 4, dailyPnl: 0 },
  );
  assert.equal(verdict.allowed, false);
  assert.match(verdict.reasons.join(" "), /circuit breaker/);
});

test("blocklisted symbol is always refused", () => {
  const rm = new RiskManager({ ...RiskManager.forMode("paper"), symbolBlocklist: ["GME"] });
  const verdict = rm.review(
    { decision: { symbol: "GME", action: "buy", confidence: 0.99, thesis: "yolo", tags: [], recalled: [] }, price: 20, requestedNotional: 50 },
    { mode: "paper", deployedUsd: 0, symbolExposureUsd: 0, consecutiveLosses: 0, dailyPnl: 0 },
  );
  assert.equal(verdict.allowed, false);
  assert.match(verdict.reasons.join(" "), /blocklisted/);
});

test("live mode is blocked when allowLive is false", () => {
  const rm = new RiskManager({ ...RiskManager.forMode("paper"), allowLive: false });
  const verdict = rm.review(
    { decision: { symbol: "AAPL", action: "buy", confidence: 0.9, thesis: "x", tags: [], recalled: [] }, price: 100, requestedNotional: 50 },
    { mode: "live", deployedUsd: 0, symbolExposureUsd: 0, consecutiveLosses: 0, dailyPnl: 0 },
  );
  assert.equal(verdict.allowed, false);
  assert.match(verdict.reasons.join(" "), /allowLive/);
});

test("fees are charged on paper fills", () => {
  const rm = new RiskManager(RiskManager.forMode("paper"));
  const { fees, qty } = rm.fill(100, 50);
  assert.ok(Math.abs(fees - 0.2) < 1e-9);
  assert.ok(Math.abs(qty - 99.8 / 50) < 1e-9);
});

// ── router ────────────────────────────────────────────────────────────────
test("router picks the skill whose triggers match the request", () => {
  const router = new SkillRouter();
  const skills: Skill[] = [
    { name: "chain.health", description: "chain liveness", triggers: ["chain health", "block number"], run: () => "health" },
    { name: "robinhood.quote", description: "live quote", triggers: ["quote", "last price"], run: () => "quote" },
  ];
  router.register(...skills);
  const route = router.route("what is the last price");
  assert.ok(route, "expected a route");
  assert.equal(route.skill.name, "robinhood.quote");
});

test("router returns null rather than guessing", () => {
  const router = new SkillRouter().register({ name: "x", description: "y", triggers: ["zzz"], run: () => 1 });
  assert.equal(router.route("completely unrelated phrase about weather"), null);
});

// ── heuristic ─────────────────────────────────────────────────────────────
function observation(over: Partial<Observation> = {}): Observation {
  return {
    symbol: "AAPL",
    price: 100,
    change24h: 0.01,
    volume: 1e6,
    rsi14: 50,
    sma20: 100,
    momentum20: 0,
    volatility: 0.02,
    source: "synthetic",
    at: new Date().toISOString(),
    ...over,
  };
}

test("heuristic buys an oversold turn with clean memory", () => {
  const d = heuristicDecide(observation({ rsi14: 28, momentum20: 0.03 }), { bias: 0, hits: [], holding: false });
  assert.equal(d.action, "buy");
  assert.ok(d.confidence > 0.5);
  assert.ok(d.tags.includes("oversold"));
});

test("heuristic refuses an overbought chase", () => {
  const d = heuristicDecide(observation({ rsi14: 78, momentum20: 0.05 }), { bias: 0, hits: [], holding: false });
  assert.notEqual(d.action, "buy");
});

test("heuristic is scarred by prior losses on the symbol", () => {
  const scarred = heuristicDecide(observation({ rsi14: 30, momentum20: 0.02 }), {
    bias: -0.4,
    hits: [
      { polyp: { id: "a", kind: "trade", agent: "coral", symbol: "AAPL", thesis: "lost", action: "buy", confidence: 0.7, outcome: "loss", pnl: -8, tags: [], artifacts: {}, createdAt: new Date().toISOString() }, score: 0.9, why: "x" },
      { polyp: { id: "b", kind: "trade", agent: "coral", symbol: "AAPL", thesis: "lost again", action: "buy", confidence: 0.7, outcome: "loss", pnl: -9, tags: [], artifacts: {}, createdAt: new Date().toISOString() }, score: 0.8, why: "x" },
    ],
    holding: false,
  });
  assert.notEqual(scarred.action, "buy", "two losses on the same pattern must suppress a repeat");
  assert.ok(scarred.tags.includes("scarred"));
});

// ── evolution ─────────────────────────────────────────────────────────────
test("evolve refuses to judge a young reef and says so", () => {
  const mem = new CoralMemory(join(home, "young.db"));
  mem.grow({ kind: "decision", agent: "coral", symbol: "X", thesis: "one sample", action: "buy", confidence: 0.6, tags: ["thin"] });
  const result = evolve(mem, { minSamples: 3 });
  assert.equal(result.promoted.length, 0);
  assert.ok(result.notes.some((n) => n.includes("not enough evidence")));
  mem.close();
});

test("evolve promotes a strong zone and retires a zone that never won", () => {
  const mem = new CoralMemory(join(home, "evo.db"));
  for (let i = 0; i < 4; i++) {
    const p = mem.grow({ kind: "decision", agent: "coral", symbol: "WIN", thesis: `win ${i}`, action: "buy", confidence: 0.7, tags: ["good-zone"] });
    mem.resolve(p.id, "win", 5);
  }
  for (let i = 0; i < 5; i++) {
    const p = mem.grow({ kind: "decision", agent: "coral", symbol: "LOSE", thesis: `loss ${i}`, action: "buy", confidence: 0.7, tags: ["bad-zone"] });
    mem.resolve(p.id, "loss", -5);
  }
  const result = evolve(mem, { minSamples: 3 });
  assert.ok(result.promoted.includes("good-zone"), `promoted: ${result.promoted.join(",")}`);
  assert.ok(result.demoted.includes("bad-zone"), `demoted: ${result.demoted.join(",")}`);
  assert.ok(result.retired.includes("bad-zone"), `retired: ${result.retired.join(",")}`);
  assert.equal(mem.generation, 2);
  mem.close();
});

// ── engine end-to-end ─────────────────────────────────────────────────────
class StubSource implements MarketDataSource {
  readonly name = "stub";
  constructor(private readonly price = 100) {}
  async observe(symbols: string[]): Promise<Observation[]> {
    return symbols.map((symbol) => observation({ symbol, rsi14: 30, momentum20: 0.04, price: this.price }));
  }
  async quote(): Promise<number | null> {
    return this.price;
  }
}

test("engine writes polyps, fills paper orders, and settles prior polyps", async () => {
  const mem = new CoralMemory(join(home, "engine.db"));
  const config = resolveConfig({ home, dbPath: join(home, "engine.db"), mode: "paper", llm: "none" });
  const router = new SkillRouter();
  const risk = new RiskManager(RiskManager.forMode("paper"));
  const engine = new CoralEngine({ config, memory: mem, router, risk });

  const report = await engine.run({ symbols: ["AAPL"], source: new StubSource(100), budgetUsd: 100, maxOrders: 1 });
  assert.equal(report.mode, "paper");
  assert.equal(report.reasoner, "heuristic");
  assert.equal(report.decisions.length, 1);
  assert.equal(report.decisions[0]!.action, "buy", "oversold + momentum must fire");
  assert.ok(report.executions.some((e) => e.status === "filled"), "expected a paper fill");
  assert.ok(report.polyps.length >= 1, "every decision must calcify");

  const ledger = mem.ledger(5);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0]!.status, "filled");
  assert.ok(mem.deployedCapital() > 0);

  // Age the polyps past the settlement floor — in production that hour passes
  // on its own; here we move the clock so the settle path is actually exercised.
  mem.db.prepare("UPDATE polyps SET created_at = ?").run(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

  // Second pass at a higher price: the first polyp must settle as a win.
  const engine2 = new CoralEngine({ config, memory: mem, router, risk });
  const report2 = await engine2.run({ symbols: ["AAPL"], source: new StubSource(140), budgetUsd: 100, maxOrders: 0 });
  assert.ok(report2.settled.length >= 1, "prior polyp should settle");
  assert.ok(report2.settled.some((s) => s.outcome === "win"), `outcomes: ${JSON.stringify(report2.settled)}`);
  mem.close();
});

test("engine never exceeds the order cap", async () => {
  const mem = new CoralMemory(join(home, "cap.db"));
  const config = resolveConfig({ home, dbPath: join(home, "cap.db"), mode: "paper", llm: "none" });
  const engine = new CoralEngine({
    config,
    memory: mem,
    router: new SkillRouter(),
    risk: new RiskManager(RiskManager.forMode("paper")),
  });
  const report = await engine.run({ symbols: ["AAA", "BBB", "CCC"], source: new StubSource(50), budgetUsd: 500, maxOrders: 2 });
  const fills = report.executions.filter((e) => e.status === "filled");
  assert.equal(fills.length, 2, `expected exactly 2 fills, got ${fills.length}`);
  mem.close();
});

test("a hold polyp settles neutral, never as a free win", async () => {
  const mem = new CoralMemory(join(home, "hold.db"));
  const config = resolveConfig({ home, dbPath: join(home, "hold.db"), mode: "paper", llm: "none" });

  // Flat tape: a hold has nothing to realise, so it must not be scored a win.
  class FlatSource implements MarketDataSource {
    readonly name = "flat";
    async observe(symbols: string[]): Promise<Observation[]> {
      return symbols.map((symbol) => observation({ symbol, rsi14: 50, momentum20: 0, price: 100 }));
    }
    async quote(): Promise<number | null> {
      return 100;
    }
  }

  const engine = new CoralEngine({
    config,
    memory: mem,
    router: new SkillRouter(),
    risk: new RiskManager(RiskManager.forMode("paper")),
  });
  const first = await engine.run({ symbols: ["FLAT"], source: new FlatSource(), maxOrders: 0 });
  assert.equal(first.decisions[0]!.action, "hold", "flat tape must not trigger a buy");

  mem.db.prepare("UPDATE polyps SET created_at = ?").run(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

  const engine2 = new CoralEngine({
    config,
    memory: mem,
    router: new SkillRouter(),
    risk: new RiskManager(RiskManager.forMode("paper")),
  });
  const second = await engine2.run({ symbols: ["FLAT"], source: new FlatSource(), maxOrders: 0 });
  assert.ok(second.settled.length >= 1, "the hold should settle");
  assert.ok(
    second.settled.every((s) => s.outcome === "neutral"),
    `holds must settle neutral, got ${JSON.stringify(second.settled)}`,
  );
  assert.equal(mem.snapshot().wins, 0, "a win rate built on holds should not exist");
  mem.close();
});

// ── report ────────────────────────────────────────────────────────────────
await Promise.all(pending);

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : `\n    ${r.error}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);

// SQLite keeps the WAL mapping open on Windows; flush before unlinking.
for (const db of ["reef.db", "young.db", "evo.db", "engine.db", "cap.db", "hold.db"]) {
  try {
    const { default: Database } = await import("better-sqlite3");
    const d = new Database(join(home, db));
    d.pragma("wal_checkpoint(TRUNCATE)");
    d.close();
  } catch {
    // file may not exist — nothing to flush
  }
}
try {
  rmSync(home, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
} catch {
  // Windows may still hold the handle; the OS temp dir is pruned anyway.
}

if (failed.length > 0) process.exit(1);
