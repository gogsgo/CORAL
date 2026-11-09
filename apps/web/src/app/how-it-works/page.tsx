import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Footer, Nav } from "@/components/chrome";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The CORAL lifecycle: observe, recall, reason, gate, settle, calcify. What a polyp is, how recall scores it, and what evolving actually changes.",
};

const STAGES = [
  {
    id: "observe",
    title: "Observe",
    tag: "graph node",
    body: "Quotes and daily bars come from the Robinhood Trading MCP when a token exists. Without one, CORAL generates a deterministic synthetic series — seeded per symbol, so the same ticker produces the same tape on every run. An observation is labelled with its source and that label travels all the way into the polyp, so a decision made on synthetic data can never be mistaken for a real one.",
    code: `{ symbol: "NVDA", price: 182.44, change24h: 0.011,
  rsi14: 31.2, sma20: 179.8, momentum20: 0.043,
  volatility: 0.024, source: "robinhood-mcp" }`,
  },
  {
    id: "recall",
    title: "Recall",
    tag: "memory",
    body: "Before reasoning, CORAL asks its own past what resembles this. Recall is a weighted blend — token overlap between the thesis and the query, exponential recency decay (30-day half-life), outcome weight, symbol match, and shared tags. Losses are weighted as loudly as wins on purpose: the polyp that lost money is the most valuable row in the reef.",
    code: `score = 0.50·text + 0.22·recency + 0.18·outcome
      + 0.10·sameSymbol + 0.05·tags

# coral reef 'NVDA oversold' --why
# • 4e89b847  text 0.34, same symbol, loss → 1.00`,
  },
  {
    id: "reason",
    title: "Reason",
    tag: "model or heuristic",
    body: "With a key, one structured call per basket: the model sees reef state, every observation, and the recalled polyps verbatim, and must return a typed decision per symbol. Without a key — or if the call fails — a deterministic heuristic decides instead. It scores mean reversion, trend continuation, reef bias, overbought penalty, volatility penalty, and a scar penalty when recall contains two losses. Same pipeline downstream either way.",
    code: `if (rsi14 < 35 && momentum20 > 0)      score += 0.40
if (momentum20 > 0.015 && price > sma20) score += 0.30
if (bias < -0.2)                        score -= 0.25
if (lossesInRecall >= 2)                score -= 0.20  // scarred

action = score >= 0.25 ? "buy" : "hold"`,
  },
  {
    id: "gate",
    title: "Gate",
    tag: "deterministic",
    body: "The risk manager runs after the model has spoken and before anything touches a venue. It is not a prompt, so the model cannot argue with it. Every check returns a reason string: a rejection without a justification is useless to whoever reads the reef later. The gate can also scale an order down instead of refusing it, and records what it scaled from.",
    code: `confidence 0.68 ≥ minConfidence 0.55          ✓
notional 250 ≤ maxOrderUsd 250                ✓
deployed 300 + 250 ≤ maxDeployedUsd 2500      ✓
NVDA exposure 0 + 250 ≤ cap 625               ✓
consecutiveLosses 0 < 4                       ✓
→ allowed, notional $250.00`,
  },
  {
    id: "settle",
    title: "Settle",
    tag: "feedback",
    body: "Polyps older than an hour get judged by price. A buy polyp wins if the price moved up more than 1%, loses if it moved down more than 1%. A sell polyp is inverted. A hold polyp that correctly sat out a flat tape counts as a small win. This is the only place the reef learns from reality rather than from itself — which is why a minimum age exists: a decision cannot be graded the instant it is made.",
    code: `move = (price - entry) / entry
buy  → move >  0.01 ? "win" : move < -0.01 ? "loss" : "neutral"
sell → move < -0.01 ? "win" : move >  0.01 ? "loss" : "neutral"
hold → |move| < 0.01 ? "win" : "neutral"`,
  },
  {
    id: "calcify",
    title: "Calcify",
    tag: "memory write",
    body: "Every decision from the pass becomes a polyp — including the ones the gate refused, which are tagged `gated` and hold the rejection reason in their artifacts. A pass that ends with a settlement also writes a reflection polyp summarising the W/L. Nothing is dropped for being embarrassing. That is the whole point of a reef.",
    code: `{ kind: "trade", action: "buy", confidence: 0.68,
  thesis: "BUY · rsi 31 · mom 4.3% · 24h 1.1% · 6 polyps recalled",
  tags: ["mean-reversion","oversold","sanctioned"],
  outcome: "pending", pnl: 0,
  artifacts: { observation, recalled, gate, execution, runId } }`,
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden border-b border-shelf/40">
          <div className="glow-teal pointer-events-none absolute inset-x-0 -top-40 h-[440px] opacity-50" />
          <div className="relative mx-auto w-full max-w-5xl px-6 py-20">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-teal">how it works</p>
            <h1 className="mt-5 text-balance font-display text-[3rem] leading-[1.05] sm:text-[3.6rem]">
              One pass. Six stages. A colony at the end of it.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-[1rem] leading-relaxed text-mist">
              The whole engine is a LangGraph state graph compiled with a checkpointer, so every pass has a thread id
              you can resume and every stage emits a typed event. Nothing below is metaphorical — the code snippets are
              the actual logic, abbreviated.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <div className="relative space-y-16">
            <div className="absolute bottom-0 left-[11px] top-2 hidden w-px bg-shelf/60 sm:block" />
            {STAGES.map((s, i) => (
              <div key={s.id} className="relative grid gap-8 sm:grid-cols-[auto_1fr]">
                <div className="hidden sm:block">
                  <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-coral/40 bg-abyss">
                    <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[0.68rem] text-silt">0{i + 1}</span>
                    <h2 className="font-display text-[1.75rem] leading-tight text-foam">{s.title}</h2>
                    <span className="rounded-full border border-shelf px-2.5 py-0.5 font-mono text-[0.64rem] uppercase tracking-[0.12em] text-silt">
                      {s.tag}
                    </span>
                  </div>
                  <p className="mt-4 max-w-3xl text-pretty text-[0.9rem] leading-relaxed text-mist">{s.body}</p>
                  <div className="mt-5 overflow-hidden rounded-lg border border-shelf/80 bg-deep">
                    <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[0.73rem] leading-relaxed text-mist">
                      <code>{s.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-shelf/40 bg-deep/40">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <h2 className="font-display text-[2rem] leading-tight">What a polyp actually is</h2>
            <p className="mt-4 max-w-3xl text-pretty text-[0.9rem] leading-relaxed text-mist">
              One row in SQLite. Zod-validated on the way in, append-only in spirit: a polyp is never rewritten to look
              sharper in hindsight. Only <code className="rounded bg-shelf/60 px-1.5 py-0.5 font-mono text-[0.85em] text-coral">outcome</code>{" "}
              and <code className="rounded bg-shelf/60 px-1.5 py-0.5 font-mono text-[0.85em] text-coral">pnl</code> are
              filled in later, when the market has judged it.
            </p>

            <div className="mt-8 overflow-hidden rounded-xl border border-shelf/60">
              <table className="w-full text-left text-[0.84rem]">
                <thead className="bg-deep/80 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-silt">
                  <tr>
                    <th className="px-5 py-3 font-normal">field</th>
                    <th className="px-5 py-3 font-normal">why it is there</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-shelf/40">
                  {[
                    ["kind", "observation · decision · trade · reflection · skill. Only decisions and trades are scored."],
                    ["agent", "Which host made the call, so a Claude-shaped decision and a Codex-shaped one stay distinguishable."],
                    ["thesis", "The falsifiable sentence. Everything recall scores against lives here."],
                    ["confidence", "0..1, and a hard gate input. Dishonest confidence gets sized down or refused."],
                    ["outcome + pnl", "Filled in by `settle`. Never set at write time — that would be marking your own homework."],
                    ["tags", "The zones. `coral evolve` groups by tag and reweights each zone by its smoothed win rate."],
                    ["artifacts", "Frozen evidence: the observation, recall ids, the gate verdict, the execution. JSON, never re-derived."],
                  ].map(([field, why]) => (
                    <tr key={field} className="align-top">
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[0.76rem] text-coral">{field}</td>
                      <td className="px-5 py-3.5 text-mist">{why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-[2rem] leading-tight">What &ldquo;evolve&rdquo; changes</h2>
              <div className="mt-5 space-y-4 text-pretty text-[0.9rem] leading-relaxed text-mist">
                <p>
                  It reweights routing. Each zone (tag) gets a Laplace-smoothed win rate —{" "}
                  <code className="rounded bg-shelf/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foam">(wins+1)/(decided+2)</code>{" "}
                  — so three lucky wins don&apos;t read as a 100% edge. Zones above{" "}
                  <span className="text-foam">0.60</span> are promoted, below{" "}
                  <span className="text-foam">0.42</span> demoted, and a zone with five losses and zero wins is retired.
                </p>
                <p>
                  Demoted does not mean deleted. A demoted skill still routes; it just loses ties to a stronger one.
                  The reef reweights, it doesn&apos;t forget.
                </p>
                <p className="border-l-2 border-teal/50 pl-5 text-foam">
                  It is deliberately not self-modifying. There is no prompt that rewrites the prompt, no generated code
                  that gets promoted to production. A trading agent that can edit its own rules is a liability, not an
                  achievement.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-shelf/80 bg-deep">
                <div className="border-b border-shelf/60 px-4 py-2 font-mono text-[0.66rem] text-silt">coral evolve</div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.73rem] leading-relaxed text-mist">
                  <code>{`Evolution · generation 2
──────────────────────────────
  promoted   momentum, mean-reversion
  demoted    overbought-chase
  retired    —

Notes
  · promoted: momentum, mean-reversion — earning
    more weight in routing
  · demoted: overbought-chase — still routes,
    but loses ties

  ✓ generation 2: 2 promoted, 1 demoted, 0 retired
    across 5 judged zones (win rate 58.3%)`}</code>
                </pre>
              </div>
              <div className="overflow-hidden rounded-lg border border-shelf/80 bg-deep">
                <div className="border-b border-shelf/60 px-4 py-2 font-mono text-[0.66rem] text-silt">
                  the honest failure mode
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.73rem] leading-relaxed text-mist">
                  <code>{`$ coral evolve

Evolution · generation 2
  promoted   —
  demoted    —

Notes
  · not enough evidence yet: 3 zones, none with
    3+ polyps. Reef needs more decisions before
    it can be judged.

  dry run — nothing written.`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-shelf/60 bg-deep/50 p-6">
            <p className="text-pretty text-[0.9rem] text-mist">
              Next: what stops this from being a very eloquent way to lose money.
            </p>
            <Link href="/safety" className="group inline-flex items-center gap-2 text-[0.86rem] text-coral hover:text-foam">
              Safety &amp; risk
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
