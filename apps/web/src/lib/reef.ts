import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Read the local reef for the dashboard.
 *
 * Deliberately does NOT import @coral/core. That dragged better-sqlite3's
 * native binding through the bundler, which resolves it relative to .next/ and
 * breaks at runtime. The dashboard only reads, so it opens the same file with
 * Node's built-in SQLite in read-only mode: no native dependency, no second copy
 * of the truth, and a schema mismatch fails loudly instead of silently.
 */

export interface ReefPolyp {
  id: string;
  kind: string;
  symbol: string | null;
  action: string;
  confidence: number;
  outcome: string;
  pnl: number;
  thesis: string;
  tags: string[];
  createdAt: string;
}

export interface ReefLedger {
  id: string;
  ts: string;
  mode: string;
  symbol: string;
  side: string;
  qty: number;
  price: number;
  notional: number;
  status: string;
}

export interface ReefGeneration {
  id: string;
  ts: string;
  generation: number;
  summary: string;
}

export interface ReefZone {
  name: string;
  polyps: number;
  wins: number;
  losses: number;
  strength: number;
}

export interface ReefData {
  available: boolean;
  dbPath: string;
  mode: "paper" | "live";
  generation: number;
  spawnedAt: string | null;
  counts: { polyps: number; wins: number; losses: number; pending: number };
  winRate: number;
  realised: number;
  deployed: number;
  polyps: ReefPolyp[];
  ledger: ReefLedger[];
  generations: ReefGeneration[];
  zones: ReefZone[];
  error?: string;
}

export async function readReef(): Promise<ReefData> {
  const home = resolve(process.env.CORAL_HOME ?? join(process.cwd(), "..", "..", ".coral"));
  const dbPath = join(home, "reef.db");

  const empty: ReefData = {
    available: false,
    dbPath,
    mode: process.env.CORAL_MODE === "live" ? "live" : "paper",
    generation: 1,
    spawnedAt: null,
    counts: { polyps: 0, wins: 0, losses: 0, pending: 0 },
    winRate: 0,
    realised: 0,
    deployed: 0,
    polyps: [],
    ledger: [],
    generations: [],
    zones: [],
  };

  if (!existsSync(dbPath)) return empty;

  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });

    const counts = db
      .prepare(
        `SELECT COUNT(*) AS n,
                COALESCE(SUM(outcome = 'win'), 0)     AS wins,
                COALESCE(SUM(outcome = 'loss'), 0)    AS losses,
                COALESCE(SUM(outcome = 'pending'), 0) AS pending,
                COALESCE(SUM(pnl), 0)                 AS pnl
         FROM polyps`,
      )
      .get() as { n: number; wins: number; losses: number; pending: number; pnl: number };

    const meta = db.prepare("SELECT key, value FROM meta").all() as { key: string; value: string }[];
    const metaMap = new Map(meta.map((m) => [m.key, m.value]));

    const pol = db.prepare("SELECT * FROM polyps ORDER BY created_at DESC LIMIT 24").all() as Record<string, unknown>[];
    const led = db.prepare("SELECT * FROM ledger ORDER BY ts DESC LIMIT 12").all() as Record<string, unknown>[];
    const gens = db.prepare("SELECT * FROM evolutions ORDER BY generation DESC LIMIT 4").all() as Record<string, unknown>[];

    const tagRows = db
      .prepare("SELECT tags, outcome FROM polyps WHERE kind IN ('decision','trade','reflection')")
      .all() as { tags: string; outcome: string }[];

    const zones = new Map<string, ReefZone>();
    for (const row of tagRows) {
      let tags: string[] = [];
      try {
        tags = JSON.parse(row.tags) as string[];
      } catch {
        continue;
      }
      for (const tag of tags) {
        const zone = zones.get(tag) ?? { name: tag, polyps: 0, wins: 0, losses: 0, strength: 0 };
        zone.polyps++;
        if (row.outcome === "win") zone.wins++;
        if (row.outcome === "loss") zone.losses++;
        zones.set(tag, zone);
      }
    }
    for (const z of zones.values()) {
      const decided = z.wins + z.losses;
      z.strength = decided === 0 ? 0.5 : (z.wins + 1) / (decided + 2);
    }

    const deployedRow = db
      .prepare(
        `SELECT COALESCE(SUM(cost), 0) AS deployed FROM (
           SELECT symbol, SUM(CASE side WHEN 'buy' THEN notional ELSE -notional END) AS cost
           FROM ledger WHERE mode = 'paper' AND status = 'filled' GROUP BY symbol
         ) WHERE cost > 0`,
      )
      .get() as { deployed: number } | undefined;

    const decided = counts.wins + counts.losses;

    return {
      ...empty,
      available: true,
      generation: Number(metaMap.get("generation") ?? 1),
      spawnedAt: metaMap.get("spawnedAt") ?? null,
      counts: { polyps: counts.n, wins: counts.wins, losses: counts.losses, pending: counts.pending },
      winRate: decided === 0 ? 0 : counts.wins / decided,
      realised: counts.pnl,
      deployed: deployedRow?.deployed ?? 0,
      polyps: pol.map((r) => ({
        id: String(r.id),
        kind: String(r.kind),
        symbol: r.symbol === null ? null : String(r.symbol),
        action: String(r.action),
        confidence: Number(r.confidence),
        outcome: String(r.outcome),
        pnl: Number(r.pnl),
        thesis: String(r.thesis),
        tags: JSON.parse(String(r.tags ?? "[]")) as string[],
        createdAt: String(r.created_at),
      })),
      ledger: led.map((r) => ({
        id: String(r.id),
        ts: String(r.ts),
        mode: String(r.mode),
        symbol: String(r.symbol),
        side: String(r.side),
        qty: Number(r.qty),
        price: Number(r.price),
        notional: Number(r.notional),
        status: String(r.status),
      })),
      generations: gens.map((r) => ({
        id: String(r.id),
        ts: String(r.ts),
        generation: Number(r.generation),
        summary: String(r.summary),
      })),
      zones: [...zones.values()].sort((a, b) => b.polyps - a.polyps).slice(0, 8),
    };
  } catch (err) {
    return { ...empty, error: (err as Error).message };
  } finally {
    db?.close();
  }
}
