/**
 * Hard limits. Not suggestions, not prompt text — code that runs after the
 * model has spoken and before anything touches a venue.
 *
 * The model is allowed to be optimistic. This file is not. Every check returns
 * a reason string; a rejection with no reason is unfalsifiable and useless to
 * whoever reads the reef at 3am.
 */
import { z } from "zod";
import type { Decision } from "../memory/types.js";

export const RiskLimits = z.object({
  /** Absolute cap on a single order, USD. */
  maxOrderUsd: z.number().positive(),
  /** Cap on total capital deployed (open cost basis), USD. */
  maxDeployedUsd: z.number().positive(),
  /** Fraction of deployed capital allowed in one symbol. */
  maxPositionPct: z.number().min(0.01).max(1),
  /** Refuse anything below this model confidence. */
  minConfidence: z.number().min(0).max(1),
  /** Circuit breaker: stop trading after this many consecutive losses. */
  maxConsecutiveLosses: z.number().int().positive(),
  /** Circuit breaker: stop trading after this daily drawdown, USD. */
  maxDailyLossUsd: z.number().positive(),
  /** Symbols CORAL may never touch, regardless of signal. */
  symbolBlocklist: z.array(z.string()),
  /** Fraction of order notional lost to slippage+fees assumed in paper fills. */
  feeRate: z.number().min(0).max(0.1),
  /** Live trading needs this to be true AND mode === 'live'. */
  allowLive: z.boolean(),
});
export type RiskLimits = z.infer<typeof RiskLimits>;

export const DEFAULT_LIMITS: RiskLimits = {
  maxOrderUsd: 250,
  maxDeployedUsd: 2_500,
  maxPositionPct: 0.25,
  minConfidence: 0.55,
  maxConsecutiveLosses: 4,
  maxDailyLossUsd: 150,
  symbolBlocklist: [],
  feeRate: 0.002,
  allowLive: false,
};

export interface RiskState {
  mode: "paper" | "live";
  deployedUsd: number;
  /** Notional already in this symbol. */
  symbolExposureUsd: number;
  consecutiveLosses: number;
  dailyPnl: number;
}

export interface RiskVerdict {
  allowed: boolean;
  reasons: string[];
  /** Order size the manager is willing to sanction, after caps. */
  notional: number;
  /** Set when the manager scaled a too-large request down instead of rejecting. */
  scaledFrom?: number;
}

export interface TradeRequest {
  decision: Decision;
  price: number;
  /** What CORAL wanted to spend. */
  requestedNotional: number;
}

export class RiskManager {
  constructor(
    public limits: RiskLimits = DEFAULT_LIMITS,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.limits = RiskLimits.parse(limits);
  }

  private breachedCombos(symbol: string): string[] {
    const reasons: string[] = [];
    const block = new Set(this.limits.symbolBlocklist.map((s) => s.toUpperCase()));
    if (block.has(symbol.toUpperCase())) reasons.push(`${symbol} is blocklisted`);
    return reasons;
  }

  /** Full gate. Runs on every decision, buy or sell. */
  review(req: TradeRequest, state: RiskState): RiskVerdict {
    const reasons: string[] = [];
    const { decision } = req;
    const symbol = decision.symbol.toUpperCase();

    reasons.push(...this.breachedCombos(symbol));

    // Live is opt-in twice: mode AND the explicit flag.
    if (state.mode === "live" && !this.limits.allowLive) {
      reasons.push("live mode requested but limits.allowLive is false");
    }

    // Holds and skips are always permitted — refusing to trade is always safe.
    if (decision.action === "hold" || decision.action === "skip") {
      return { allowed: reasons.length === 0, reasons, notional: 0 };
    }

    if (decision.confidence < this.limits.minConfidence) {
      reasons.push(
        `confidence ${decision.confidence.toFixed(2)} < minConfidence ${this.limits.minConfidence.toFixed(2)}`,
      );
    }

    if (state.consecutiveLosses >= this.limits.maxConsecutiveLosses) {
      reasons.push(
        `circuit breaker: ${state.consecutiveLosses} consecutive losses (limit ${this.limits.maxConsecutiveLosses})`,
      );
    }

    if (state.dailyPnl <= -this.limits.maxDailyLossUsd) {
      reasons.push(`daily loss ${state.dailyPnl.toFixed(2)} hit cap -${this.limits.maxDailyLossUsd.toFixed(2)}`);
    }

    if (!Number.isFinite(req.price) || req.price <= 0) {
      reasons.push(`invalid price ${req.price}`);
    }

    let notional = req.requestedNotional;
    let scaledFrom: number | undefined;

    if (notional <= 0) {
      reasons.push(`invalid notional ${notional}`);
    } else if (notional > this.limits.maxOrderUsd) {
      scaledFrom = notional;
      notional = this.limits.maxOrderUsd;
    }

    const room = this.limits.maxDeployedUsd - state.deployedUsd;
    if (room <= 1) {
      reasons.push(`no capital room: deployed ${state.deployedUsd.toFixed(2)} / ${this.limits.maxDeployedUsd.toFixed(2)}`);
    } else if (notional > room) {
      scaledFrom ??= notional;
      notional = room;
    }

    // Concentration is capped against a fixed ceiling — maxPositionPct of the
    // *allowed* book, not the current one. Measured against current deployment,
    // the very first order is always 100% of the book and never passes.
    const symbolCap = this.limits.maxPositionPct * this.limits.maxDeployedUsd;
    if (decision.action === "buy" && notional > 0 && state.symbolExposureUsd + notional > symbolCap) {
      const headroom = symbolCap - state.symbolExposureUsd;
      if (headroom < 1) {
        reasons.push(
          `${symbol} at its cap: $${state.symbolExposureUsd.toFixed(2)} / $${symbolCap.toFixed(2)} ` +
            `(${(100 * this.limits.maxPositionPct).toFixed(0)}% of $${this.limits.maxDeployedUsd})`,
        );
      } else {
        scaledFrom ??= notional;
        notional = Math.min(notional, headroom);
      }
    }

    if (notional < 1 && reasons.length === 0) {
      reasons.push(`order notional ${notional.toFixed(2)} below $1 minimum`);
    }

    const verdict: RiskVerdict = {
      allowed: reasons.length === 0,
      reasons,
      notional: reasons.length === 0 ? Number(notional.toFixed(2)) : 0,
    };
    if (scaledFrom !== undefined) verdict.scaledFrom = Number(scaledFrom.toFixed(2));
    return verdict;
  }

  /** Paper-fill accounting: fees are paid, not ignored. */
  fill(notional: number, price: number): { qty: number; fees: number; netNotional: number } {
    const fees = notional * this.limits.feeRate;
    const netNotional = notional - fees;
    return { qty: netNotional / price, fees, netNotional };
  }

  /** Realized P&L of closing `qty` at `price` against `cost` basis. */
  pnl(qty: number, entry: number, exit: number): number {
    const gross = (exit - entry) * qty;
    const fees = (entry + exit) * qty * this.limits.feeRate;
    return gross - fees;
  }

  static forMode(mode: "paper" | "live", overrides: Partial<RiskLimits> = {}): RiskLimits {
    return RiskLimits.parse({
      ...DEFAULT_LIMITS,
      allowLive: mode === "live",
      ...overrides,
    });
  }
}
