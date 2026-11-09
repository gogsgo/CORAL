/**
 * Relevance scoring for recall. Pure functions, no DB, no clock injection
 * beyond an explicit `now` — which is what makes it testable.
 *
 * ponytail: token-overlap similarity, not embeddings. O(n) over a filtered
 * window of a few hundred polyps; swap for sqlite-vec when the window stops
 * fitting in memory.
 */

const STOPWORDS = new Set(
  ("the a an and or of to in on for with is are was were be been it its this that " +
    "as at by from into over under again more most some such no nor not only own " +
    "same so than too very can will just should now i you he she they we my our " +
    "buy sell hold enter exit position long short").split(" "),
);

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    out.push(raw);
  }
  return out;
}

/**
 * Cosine-ish overlap: intersection over the geometric mean of set sizes, so a
 * long thesis doesn't outrank a short precise one just by having more words.
 */
export function textSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.sqrt(ta.size * tb.size);
}

/** Exponential decay, half-life in days. Fresh polyps vote louder. */
export function recency(createdAt: string, now: Date, halfLifeDays = 30): number {
  const ageMs = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  const ageDays = ageMs / 86_400_000;
  return Math.exp((-Math.LN2 * ageDays) / halfLifeDays);
}

/**
 * Losses stay loud on purpose. A polyp that lost money is the single most
 * valuable thing in the reef, so it is never down-weighted into silence.
 */
export function outcomeWeight(outcome: string): number {
  switch (outcome) {
    case "win":
      return 1;
    case "loss":
      return 1;
    case "neutral":
      return 0.5;
    default:
      return 0.6; // pending — judged but not yet tested
  }
}

export interface BlendInput {
  query: string;
  thesis: string;
  symbol: string | null;
  tags: string[];
  outcome: string;
  createdAt: string;
  querySymbol?: string | null;
  queryTags?: string[];
}

export function blend(input: BlendInput, now: Date): { score: number; why: string } {
  const text = textSimilarity(input.query, input.thesis);
  const fresh = recency(input.createdAt, now);
  const truth = outcomeWeight(input.outcome);
  const symbolHit = input.querySymbol && input.symbol === input.querySymbol ? 1 : 0;
  const tagHits = (input.queryTags ?? []).filter((t) => input.tags.includes(t)).length;

  const score = Math.min(1, 0.5 * text + 0.22 * fresh + 0.18 * truth + 0.1 * symbolHit + 0.05 * Math.min(tagHits, 2));

  const bits: string[] = [];
  if (text > 0.05) bits.push(`text ${text.toFixed(2)}`);
  if (symbolHit) bits.push("same symbol");
  if (tagHits) bits.push(`${tagHits} shared tag(s)`);
  bits.push(`${input.outcome} → ${truth.toFixed(2)}`);
  if (fresh < 0.3) bits.push(`stale ${(1 - fresh).toFixed(2)}`);

  return { score, why: bits.join(", ") };
}
