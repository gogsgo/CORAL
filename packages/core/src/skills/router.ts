/**
 * Skill routing.
 *
 * A skill is a named capability with a trigger and a handler. The router picks
 * the best-matching skill for a request using the same token overlap as memory
 * recall, so there is exactly one similarity notion in the codebase.
 *
 * Skills whose zones have gone weak (see `coral evolve`) are demoted, not
 * deleted: a demoted skill still routes, it just loses ties to a stronger one.
 * That is what "evolving" means here — the reef reweights, it doesn't forget.
 */
import type { Zone } from "../memory/types.js";
import { textSimilarity, tokenize } from "../memory/similarity.js";

export interface SkillContext {
  symbol?: string;
  observations?: unknown[];
  memoryHits?: number;
  [key: string]: unknown;
}

export interface Skill<TIn = SkillContext, TOut = unknown> {
  name: string;
  /** What this skill does, in one line. Shown by `coral status`. */
  description: string;
  /** Words and phrases that should route here. Scored, not matched exactly. */
  triggers: string[];
  /** Zones this skill belongs to; used to look up live performance. */
  tags?: string[];
  /** A skill below this strength is demoted (routing weight only). */
  run: (input: TIn) => Promise<TOut> | TOut;
  /** Optional: skills can declare they are unavailable (missing key, etc). */
  available?: () => boolean;
}

export interface RouteResult<TOut = unknown> {
  skill: Skill<SkillContext, TOut>;
  score: number;
  matched: string[];
  considered: { name: string; score: number }[];
}

export class SkillRouter {
  private readonly skills: Skill[] = [];
  private zones: Zone[] = [];

  register(...skills: Skill[]): this {
    for (const skill of skills) {
      this.skills.push(skill);
    }
    return this;
  }

  /** Feed live performance back in — called after every `evolve`. */
  syncZones(zones: Zone[]): this {
    this.zones = zones;
    return this;
  }

  list(): (Skill & { strength: number })[] {
    return this.skills.map((skill) => ({
      ...skill,
      strength: this.strengthOf(skill),
    }));
  }

  private strengthOf(skill: Skill): number {
    const tags = skill.tags ?? [];
    if (tags.length === 0) return 0.5;
    const relevant = this.zones.filter((z) => tags.includes(z.name));
    if (relevant.length === 0) return 0.5;
    const total = relevant.reduce((sum, z) => sum + z.strength, 0);
    return total / relevant.length;
  }

  score(skill: Skill, request: string): { score: number; matched: string[] } {
    const query = request.toLowerCase();
    let best = 0;
    const matched: string[] = [];

    for (const trigger of skill.triggers) {
      const t = trigger.toLowerCase();
      // Exact phrase hit is decisive; single-word overlap is a weaker signal.
      const phrase = query.includes(t) ? 1 : 0;
      const overlap = textSimilarity(query, t);
      const s = Math.max(phrase, overlap * 0.8);
      if (s > 0.15) matched.push(trigger);
      best = Math.max(best, s);
    }

    // Description contributes a little, so an unlisted synonym still routes.
    best = Math.max(best, textSimilarity(query, `${skill.name} ${skill.description}`) * 0.5);

    if (skill.available && !skill.available()) {
      return { score: 0, matched: [...matched, "(unavailable)"] };
    }

    const weighted = best * (0.6 + 0.8 * this.strengthOf(skill));
    return { score: Math.min(1, weighted), matched };
  }

  route<TOut = unknown>(request: string): RouteResult<TOut> | null {
    if (this.skills.length === 0) return null;
    const scored = this.skills.map((skill) => ({ skill, ...this.score(skill, request) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (!top || top.score < 0.05) return null;
    return {
      skill: top.skill as Skill<SkillContext, TOut>,
      score: top.score,
      matched: top.matched,
      considered: scored.slice(0, 5).map((s) => ({ name: s.skill.name, score: Number(s.score.toFixed(3)) })),
    };
  }

  /** Diagnostics for `coral status --skills`. */
  explain(request: string): { name: string; score: number; tokens: string[] }[] {
    const tokens = tokenize(request);
    return this.skills
      .map((skill) => ({ name: skill.name, score: Number(this.score(skill, request).score.toFixed(3)), tokens }))
      .sort((a, b) => b.score - a.score);
  }
}
