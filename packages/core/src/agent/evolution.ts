/**
 * Evolution: the pass where the reef examines itself and reweights.
 *
 * Deliberately dumb and mechanical. It reads zones, compares each zone's
 * smoothed win rate against a threshold, and writes a generation record. No
 * model, no self-rewriting prompts — a self-modifying trading agent is a
 * liability, and "evolve" here means "the weights moved because the evidence
 * moved", which is both honest and auditable.
 */
import type { CoralMemory } from "../memory/coral-memory.js";
import type { Evolution } from "../memory/types.js";

export interface EvolveOptions {
  /** A zone below this smoothed strength is demoted. */
  demoteBelow?: number;
  /** A zone above this, with enough samples, is promoted. */
  promoteAbove?: number;
  /** Minimum polyps before a zone is judged at all. */
  minSamples?: number;
  dryRun?: boolean;
}

export interface EvolveResult {
  evolution: Evolution | null;
  generation: number;
  promoted: string[];
  demoted: string[];
  retired: string[];
  notes: string[];
}

export function evolve(memory: CoralMemory, opts: EvolveOptions = {}): EvolveResult {
  const demoteBelow = opts.demoteBelow ?? 0.42;
  const promoteAbove = opts.promoteAbove ?? 0.6;
  const minSamples = opts.minSamples ?? 3;

  const snapshot = memory.snapshot();
  const judged = snapshot.zones.filter((z) => z.polyps >= minSamples);
  const skipped = snapshot.zones.length - judged.length;

  const promoted = judged.filter((z) => z.strength >= promoteAbove).map((z) => z.name);
  const demoted = judged.filter((z) => z.strength < demoteBelow).map((z) => z.name);
  const retired = judged
    .filter((z) => z.losses >= 5 && z.wins === 0)
    .map((z) => z.name);

  const notes: string[] = [];
  if (judged.length === 0) {
    notes.push(
      `not enough evidence yet: ${snapshot.zones.length} zones, none with ${minSamples}+ polyps. Reef needs more decisions before it can be judged.`,
    );
  }
  if (skipped > 0) notes.push(`${skipped} zone(s) below the ${minSamples}-polyp evidence bar — left untouched`);
  if (retired.length) notes.push(`retired: ${retired.join(", ")} — losing every time it was tested`);
  if (promoted.length) notes.push(`promoted: ${promoted.join(", ")} — earning more weight in routing`);
  if (demoted.length) notes.push(`demoted: ${demoted.join(", ")} — still routes, but loses ties`);

  const generation = memory.generation + 1;
  const summary =
    judged.length === 0
      ? `generation ${generation}: no verdict — reef is still young (${snapshot.polyps} polyps)`
      : `generation ${generation}: ${promoted.length} promoted, ${demoted.length} demoted, ${retired.length} retired ` +
        `across ${judged.length} judged zones (win rate ${(snapshot.winRate * 100).toFixed(1)}%)`;

  if (opts.dryRun) {
    return { evolution: null, generation, promoted, demoted, retired, notes };
  }

  const evolution = memory.recordEvolution({
    ts: new Date().toISOString(),
    generation,
    summary,
    promoted,
    demoted,
    retired,
    notes,
  });

  return { evolution, generation, promoted, demoted, retired, notes };
}
