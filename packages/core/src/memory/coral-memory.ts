/**
 * The reef.
 *
 * Everything CORAL learns lives here as a polyp: one row per decision, with
 * the evidence that produced it frozen alongside. Polyps are append-only in
 * spirit — a polyp is never rewritten to look smarter in hindsight; its
 * `outcome` and `pnl` fields are filled in later, which is the whole point.
 *
 * SQLite (better-sqlite3): synchronous, zero-daemon, one file the user owns.
 * The reef is local state — commit the code, never the reef.
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import {
  NewPolyp,
  type Evolution,
  type LedgerEntry,
  type Observation,
  type Outcome,
  type Polyp,
  type PolypKind,
  type ReefSnapshot,
  type ReefStats,
  type ScoredPolyp,
  type Zone,
} from "./types.js";
import { blend } from "./similarity.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS polyps (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,
  agent      TEXT NOT NULL,
  symbol     TEXT,
  thesis     TEXT NOT NULL,
  action     TEXT NOT NULL,
  confidence REAL NOT NULL,
  outcome    TEXT NOT NULL DEFAULT 'pending',
  pnl        REAL NOT NULL DEFAULT 0,
  tags       TEXT NOT NULL DEFAULT '[]',
  artifacts  TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS polyps_symbol  ON polyps(symbol);
CREATE INDEX IF NOT EXISTS polyps_created ON polyps(created_at DESC);
CREATE INDEX IF NOT EXISTS polyps_outcome ON polyps(outcome);

CREATE TABLE IF NOT EXISTS ledger (
  id        TEXT PRIMARY KEY,
  ts        TEXT NOT NULL,
  mode      TEXT NOT NULL,
  symbol    TEXT NOT NULL,
  side      TEXT NOT NULL,
  qty       REAL NOT NULL,
  price     REAL NOT NULL,
  notional  REAL NOT NULL,
  polyp_id  TEXT,
  status    TEXT NOT NULL,
  venue     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_ts ON ledger(ts DESC);

CREATE TABLE IF NOT EXISTS evolutions (
  id         TEXT PRIMARY KEY,
  ts         TEXT NOT NULL,
  generation INTEGER NOT NULL,
  summary    TEXT NOT NULL,
  promoted   TEXT NOT NULL DEFAULT '[]',
  demoted    TEXT NOT NULL DEFAULT '[]',
  retired    TEXT NOT NULL DEFAULT '[]',
  notes      TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const PolypRow = z.object({
  id: z.string(),
  kind: z.string(),
  agent: z.string(),
  symbol: z.string().nullable(),
  thesis: z.string(),
  action: z.string(),
  confidence: z.number(),
  outcome: z.string(),
  pnl: z.number(),
  tags: z.string(),
  artifacts: z.string(),
  created_at: z.string(),
});
type PolypRow = z.infer<typeof PolypRow>;

function rowToPolyp(row: PolypRow): Polyp {
  return {
    id: row.id,
    kind: row.kind as PolypKind,
    agent: row.agent as Polyp["agent"],
    symbol: row.symbol,
    thesis: row.thesis,
    action: row.action as Polyp["action"],
    confidence: row.confidence,
    outcome: row.outcome as Outcome,
    pnl: row.pnl,
    tags: JSON.parse(row.tags) as string[],
    artifacts: JSON.parse(row.artifacts) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

export interface RecallOptions {
  query: string;
  symbol?: string | null;
  tags?: string[];
  limit?: number;
  /** Restrict to polyps that already resolved — used for stats-driven prompts. */
  resolvedOnly?: boolean;
}

export class CoralMemory {
  readonly db: Database.Database;
  readonly path: string;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.path = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SCHEMA);
    if (!this.getMeta("spawnedAt")) {
      this.setMeta("spawnedAt", new Date().toISOString());
      this.setMeta("generation", "1");
    }
  }

  close(): void {
    this.db.close();
  }

  // ── meta ────────────────────────────────────────────────────────────────
  getMeta(key: string): string | null {
    const row = this.db.prepare<[string], { value: string }>("SELECT value FROM meta WHERE key = ?").get(key);
    return row?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, value);
  }

  get generation(): number {
    return Number(this.getMeta("generation") ?? 1);
  }

  // ── polyps ──────────────────────────────────────────────────────────────
  grow(input: NewPolyp): Polyp {
    const parsed = NewPolyp.parse(input);
    const polyp: Polyp = {
      id: randomUUID(),
      kind: parsed.kind,
      agent: parsed.agent,
      symbol: parsed.symbol ?? null,
      thesis: parsed.thesis,
      action: parsed.action,
      confidence: parsed.confidence,
      outcome: parsed.outcome ?? "pending",
      pnl: parsed.pnl ?? 0,
      tags: parsed.tags ?? [],
      artifacts: parsed.artifacts ?? {},
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `INSERT INTO polyps (id, kind, agent, symbol, thesis, action, confidence, outcome, pnl, tags, artifacts, created_at)
         VALUES (@id, @kind, @agent, @symbol, @thesis, @action, @confidence, @outcome, @pnl, @tags, @artifacts, @createdAt)`,
      )
      .run({
        ...polyp,
        tags: JSON.stringify(polyp.tags),
        artifacts: JSON.stringify(polyp.artifacts),
      });
    return polyp;
  }

  get(id: string): Polyp | null {
    const row = this.db.prepare<[string], PolypRow>("SELECT * FROM polyps WHERE id = ?").get(id);
    return row ? rowToPolyp(row) : null;
  }

  latest(limit = 20): Polyp[] {
    const rows = this.db
      .prepare<[number], PolypRow>("SELECT * FROM polyps ORDER BY created_at DESC LIMIT ?")
      .all(limit);
    return rows.map(rowToPolyp);
  }

  /** Recall — the act that makes this a reef and not a log file. */
  recall(opts: RecallOptions): ScoredPolyp[] {
    const limit = opts.limit ?? 8;
    // ponytail: fetch a bounded candidate window, score in JS. Pushing the
    // blend into SQL would mean reimplementing similarity as SQL functions.
    const candidates = this.db
      .prepare<[number], PolypRow>(
        `SELECT * FROM polyps
         ${opts.resolvedOnly ? "WHERE outcome != 'pending'" : ""}
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(Math.max(limit * 25, 200))
      .map(rowToPolyp);

    const now = new Date();
    const scored = candidates.map((polyp) => {
      const { score, why } = blend(
        {
          query: opts.query,
          thesis: polyp.thesis,
          symbol: polyp.symbol,
          tags: polyp.tags,
          outcome: polyp.outcome,
          createdAt: polyp.createdAt,
          querySymbol: opts.symbol ?? null,
          queryTags: opts.tags ?? [],
        },
        now,
      );
      return { polyp, score, why };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Fill in what actually happened. This is how the reef learns. */
  resolve(id: string, outcome: Outcome, pnl = 0): Polyp {
    const existing = this.get(id);
    if (!existing) throw new Error(`no polyp ${id} in the reef`);
    this.db.prepare("UPDATE polyps SET outcome = ?, pnl = ? WHERE id = ?").run(outcome, pnl, id);
    return { ...existing, outcome, pnl };
  }

  /** Polyps awaiting a verdict — what `coral evolve` settles. */
  unsettled(limit = 50): Polyp[] {
    const rows = this.db
      .prepare<[number], PolypRow>(
        "SELECT * FROM polyps WHERE outcome = 'pending' AND kind IN ('decision','trade') ORDER BY created_at ASC LIMIT ?",
      )
      .all(limit);
    return rows.map(rowToPolyp);
  }

  // ── ledger ──────────────────────────────────────────────────────────────
  record(entry: LedgerEntry): void {
    this.db
      .prepare(
        `INSERT INTO ledger (id, ts, mode, symbol, side, qty, price, notional, polyp_id, status, venue)
         VALUES (@id, @ts, @mode, @symbol, @side, @qty, @price, @notional, @polypId, @status, @venue)`,
      )
      .run(entry);
  }

  ledger(limit = 20): LedgerEntry[] {
    return this.db
      .prepare<[number], Record<string, unknown>>("SELECT * FROM ledger ORDER BY ts DESC LIMIT ?")
      .all(limit)
      .map((r) => ({
        id: String(r.id),
        ts: String(r.ts),
        mode: r.mode as "paper" | "live",
        symbol: String(r.symbol),
        side: r.side as "buy" | "sell",
        qty: Number(r.qty),
        price: Number(r.price),
        notional: Number(r.notional),
        polypId: r.polyp_id === null ? null : String(r.polyp_id),
        status: r.status as LedgerEntry["status"],
        venue: r.venue as LedgerEntry["venue"],
      }));
  }

  openPositions(): { symbol: string; qty: number; cost: number }[] {
    const rows = this.db
      .prepare<[], { symbol: string; qty: number; cost: number }>(
        `SELECT symbol,
                SUM(CASE side WHEN 'buy' THEN qty ELSE -qty END) AS qty,
                SUM(CASE side WHEN 'buy' THEN notional ELSE -notional END) AS cost
         FROM ledger WHERE mode = 'paper' AND status = 'filled'
         GROUP BY symbol HAVING qty > 0`,
      )
      .all();
    return rows;
  }

  /** Capital deployed in paper mode (sum of open cost basis). */
  deployedCapital(): number {
    return this.openPositions().reduce((sum, p) => sum + Math.max(0, p.cost), 0);
  }

  // ── evolution ───────────────────────────────────────────────────────────
  recordEvolution(evo: Omit<Evolution, "id">): Evolution {
    const full: Evolution = { ...evo, id: randomUUID() };
    this.db
      .prepare(
        `INSERT INTO evolutions (id, ts, generation, summary, promoted, demoted, retired, notes)
         VALUES (@id, @ts, @generation, @summary, @promoted, @demoted, @retired, @notes)`,
      )
      .run({
        ...full,
        promoted: JSON.stringify(full.promoted),
        demoted: JSON.stringify(full.demoted),
        retired: JSON.stringify(full.retired),
        notes: JSON.stringify(full.notes),
      });
    this.setMeta("generation", String(full.generation));
    return full;
  }

  evolutions(limit = 10): Evolution[] {
    return this.db
      .prepare<[number], Record<string, unknown>>("SELECT * FROM evolutions ORDER BY generation DESC LIMIT ?")
      .all(limit)
      .map((r) => ({
        id: String(r.id),
        ts: String(r.ts),
        generation: Number(r.generation),
        summary: String(r.summary),
        promoted: JSON.parse(String(r.promoted)) as string[],
        demoted: JSON.parse(String(r.demoted)) as string[],
        retired: JSON.parse(String(r.retired)) as string[],
        notes: JSON.parse(String(r.notes)) as string[],
      }));
  }

  // ── aggregate views ─────────────────────────────────────────────────────
  /** Per-tag performance: the unit the router and `evolve` operate on. */
  zones(): Zone[] {
    const rows = this.db
      .prepare<[], { tags: string; outcome: string; created_at: string }>(
        "SELECT tags, outcome, created_at FROM polyps WHERE kind IN ('decision','trade','reflection')",
      )
      .all();

    const acc = new Map<string, Zone>();
    for (const row of rows) {
      const tags = JSON.parse(row.tags) as string[];
      for (const tag of tags) {
        const zone = acc.get(tag) ?? { name: tag, polyps: 0, wins: 0, losses: 0, strength: 0, lastSeen: null };
        zone.polyps++;
        if (row.outcome === "win") zone.wins++;
        if (row.outcome === "loss") zone.losses++;
        if (!zone.lastSeen || row.created_at > zone.lastSeen) zone.lastSeen = row.created_at;
        acc.set(tag, zone);
      }
    }

    for (const zone of acc.values()) {
      const decided = zone.wins + zone.losses;
      // Laplace-smoothed win rate: 3 samples shouldn't read as 100% strength.
      zone.strength = decided === 0 ? 0.5 : (zone.wins + 1) / (decided + 2);
    }

    return [...acc.values()].sort((a, b) => b.polyps - a.polyps);
  }

  snapshot(): ReefSnapshot {
    const counts = this.db
      .prepare<[], { kind: string; outcome: string; n: number; pnl: number }>(
        "SELECT kind, outcome, COUNT(*) AS n, COALESCE(SUM(pnl),0) AS pnl FROM polyps GROUP BY kind, outcome",
      )
      .all();

    const byKind: Record<PolypKind, number> = { observation: 0, decision: 0, trade: 0, reflection: 0, skill: 0 };
    let wins = 0;
    let losses = 0;
    let pending = 0;
    let pnl = 0;
    let polyps = 0;

    for (const row of counts) {
      byKind[row.kind as PolypKind] = (byKind[row.kind as PolypKind] ?? 0) + row.n;
      polyps += row.n;
      pnl += row.pnl;
      if (row.outcome === "win") wins += row.n;
      if (row.outcome === "loss") losses += row.n;
      if (row.outcome === "pending") pending += row.n;
    }

    const last = this.db
      .prepare<[], { created_at: string }>("SELECT created_at FROM polyps ORDER BY created_at DESC LIMIT 1")
      .get();

    const decided = wins + losses;
    return {
      polyps,
      byKind,
      wins,
      losses,
      pending,
      winRate: decided === 0 ? 0 : wins / decided,
      pnl,
      generation: this.generation,
      spawnedAt: this.getMeta("spawnedAt") ?? new Date().toISOString(),
      lastActivity: last?.created_at ?? null,
      zones: this.zones(),
    };
  }

  stats(): ReefStats {
    const bias = new Map<string, number>();
    const rows = this.db
      .prepare<[], { symbol: string; outcome: string; pnl: number }>(
        "SELECT symbol, outcome, pnl FROM polyps WHERE symbol IS NOT NULL AND outcome IN ('win','loss','neutral')",
      )
      .all();
    let wins = 0;
    for (const row of rows) {
      if (row.outcome === "win") wins++;
      const prior = bias.get(row.symbol) ?? 0;
      const signal = row.outcome === "win" ? 1 : row.outcome === "loss" ? -1 : 0;
      bias.set(row.symbol, prior * 0.8 + signal * 0.2);
    }
    return {
      bias,
      sampleSize: rows.length,
      winRate: rows.length === 0 ? 0 : wins / rows.length,
    };
  }

  /** Record an observation as a polyp. Cheap, high-volume, low-weight. */
  observe(obs: Observation, tags: string[] = []): Polyp {
    return this.grow({
      kind: "observation",
      agent: "coral",
      symbol: obs.symbol,
      thesis: `${obs.symbol} @ ${obs.price.toFixed(2)} · 24h ${(obs.change24h * 100).toFixed(2)}% · rsi ${obs.rsi14.toFixed(1)} · vol ${(obs.volatility * 100).toFixed(2)}%`,
      action: "hold",
      confidence: 0.5,
      outcome: "neutral",
      pnl: 0,
      tags: ["observation", ...tags],
      artifacts: { ...obs },
    });
  }
}
