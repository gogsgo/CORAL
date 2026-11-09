/**
 * Indicators from a price series. Small, pure, testable — the maths that the
 * observation layer is allowed to trust.
 */
import type { Observation } from "@coral/core";

export function sma(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Wilder's RSI. Needs at least period+1 closes; returns 50 when starved. */
export function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const prev = values[i - 1];
    const cur = values[i];
    if (prev === undefined || cur === undefined) continue;
    const diff = cur - prev;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Fractional return over `period` closes. */
export function momentum(values: number[], period = 20): number {
  if (values.length < 2) return 0;
  const start = values[Math.max(0, values.length - 1 - period)];
  const end = values[values.length - 1];
  if (start === undefined || end === undefined || start === 0) return 0;
  return end / start - 1;
}

/** Annualisation-free stdev of percentage returns — a proxy, not a forecast. */
export function volatility(values: number[], period = 20): number {
  if (values.length < 3) return 0;
  const rets: number[] = [];
  const slice = values.slice(-Math.min(period + 1, values.length));
  for (let i = 1; i < slice.length; i++) {
    const prev = slice[i - 1];
    const cur = slice[i];
    if (prev === undefined || cur === undefined || prev === 0) continue;
    rets.push((cur - prev) / prev);
  }
  if (rets.length < 2) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance);
}

export interface Bar {
  /** ISO timestamp of the bar's close. */
  t: string;
  close: number;
  volume?: number;
}

/** Compose a series of bars into a typed Observation. */
export function observationFromBars(
  symbol: string,
  bars: Bar[],
  source: Observation["source"],
  now = new Date(),
): Observation {
  const closes = bars.map((b) => b.close).filter((n) => Number.isFinite(n) && n > 0);
  if (closes.length === 0) {
    throw new Error(`no usable closes for ${symbol} (got ${bars.length} bars)`);
  }
  const last = closes[closes.length - 1]!;
  const prev = closes.length > 1 ? closes[closes.length - 2]! : last;

  return {
    symbol: symbol.toUpperCase(),
    price: last,
    change24h: prev === 0 ? 0 : last / prev - 1,
    volume: bars.reduce((sum, b) => sum + (b.volume ?? 0), 0),
    rsi14: rsi(closes, 14),
    sma20: sma(closes, 20),
    momentum20: momentum(closes, 20),
    volatility: volatility(closes, 20),
    source,
    at: now.toISOString(),
  };
}
