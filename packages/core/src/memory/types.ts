/**
 * The vocabulary of the reef.
 *
 * A polyp is one decision CORAL made, with the evidence it made it on. Polyps
 * calcify into zones; zones harden into skills. Nothing here is decorative —
 * every field is something the router or the risk manager actually reads.
 */
import { z } from "zod";

export const AgentId = z.enum(["coral", "claude-code", "codex", "cursor", "gemini", "grok"]);
export type AgentId = z.infer<typeof AgentId>;

export const PolypKind = z.enum(["observation", "decision", "trade", "reflection", "skill"]);
export type PolypKind = z.infer<typeof PolypKind>;

export const Action = z.enum(["buy", "sell", "hold", "skip"]);
export type Action = z.infer<typeof Action>;

export const Outcome = z.enum(["pending", "win", "loss", "neutral"]);
export type Outcome = z.infer<typeof Outcome>;

export const Polyp = z.object({
  id: z.string(),
  kind: PolypKind,
  agent: AgentId,
  symbol: z.string().nullable(),
  thesis: z.string(),
  action: Action,
  /** 0..1 — how sure CORAL was. Used by the risk manager as a hard gate. */
  confidence: z.number().min(0).max(1),
  outcome: Outcome,
  /** Realized P&L in USD attributable to this polyp, once resolved. */
  pnl: z.number(),
  tags: z.array(z.string()),
  /** Frozen evidence: quotes, indicators, recalled ids. Never mutated. */
  artifacts: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});
export type Polyp = z.infer<typeof Polyp>;

export const NewPolyp = Polyp.omit({ id: true, createdAt: true }).partial({
  outcome: true,
  pnl: true,
  symbol: true,
  tags: true,
  artifacts: true,
});
export type NewPolyp = z.infer<typeof NewPolyp>;

export interface ScoredPolyp {
  polyp: Polyp;
  /** 0..1 blended relevance. See similarity.ts for the exact blend. */
  score: number;
  /** Human-readable reason this polyp matched, shown in `coral reef --why`. */
  why: string;
}

export interface Zone {
  name: string;
  polyps: number;
  wins: number;
  losses: number;
  /** 0..1 = is this zone actually working? Drives prompt weighting. */
  strength: number;
  lastSeen: string | null;
}

export type Venue = "paper" | "robinhood-mcp";

export interface LedgerEntry {
  id: string;
  ts: string;
  mode: "paper" | "live";
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  notional: number;
  polypId: string | null;
  status: "filled" | "rejected" | "pending" | "dry-run";
  venue: Venue;
}

export interface ReefSnapshot {
  polyps: number;
  byKind: Record<PolypKind, number>;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  pnl: number;
  generation: number;
  spawnedAt: string;
  lastActivity: string | null;
  zones: Zone[];
}

export interface Evolution {
  id: string;
  ts: string;
  generation: number;
  summary: string;
  promoted: string[];
  demoted: string[];
  retired: string[];
  notes: string[];
}

export const Observation = z.object({
  symbol: z.string(),
  price: z.number(),
  change24h: z.number(),
  volume: z.number(),
  rsi14: z.number(),
  sma20: z.number(),
  momentum20: z.number(),
  volatility: z.number(),
  source: z.enum(["robinhood-mcp", "synthetic"]),
  at: z.string(),
});
export type Observation = z.infer<typeof Observation>;

export interface Decision {
  symbol: string;
  action: Action;
  confidence: number;
  thesis: string;
  tags: string[];
  /** Which polyps informed this call — the audit trail. */
  recalled: string[];
}

export const DecisionSchema = z.object({
  symbol: z.string(),
  action: Action,
  confidence: z.number().min(0).max(1),
  thesis: z.string().min(4),
  tags: z.array(z.string()).default([]),
});

export const DecisionBatchSchema = z.object({
  decisions: z.array(DecisionSchema),
  reasoning: z.string().default(""),
});
export type DecisionBatch = z.infer<typeof DecisionBatchSchema>;

export interface Execution {
  symbol: string;
  action: Action;
  allowed: boolean;
  reasons: string[];
  notional: number;
  qty: number;
  price: number;
  polypId: string | null;
  status: LedgerEntry["status"];
}

export interface ReefStats {
  /** Weighted historical edge per symbol, learned from resolved polyps. */
  bias: Map<string, number>;
  sampleSize: number;
  winRate: number;
}
