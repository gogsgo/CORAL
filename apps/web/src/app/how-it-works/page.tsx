import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "@/components/chrome";
import { DiagonalArrow, MonogramSeal } from "@/components/engraving";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The CORAL pass: observe, recall, reason, gate, settle, calcify. What a polyp is, how recall scores it, and what evolving actually changes.",
};

const STAGES = [
  {
    stage: "Observe",
    body: "Quotes and daily bars come from the Robinhood Trading MCP when a token exists. Without one, CORAL generates a deterministic synthetic series seeded per symbol, so the same ticker produces the same tape on every run. An observation is labelled with its source and that label travels into the polyp, so a decision made on synthetic data can never be mistaken for a real one.",
    code: `{ symbol: "NVDA", price: 182.44, change24h: 0.011,
  rsi14: 31.2, sma20: 179.8, momentum20: 0.043,
  volatility: 0.024, source: "robinhood-mcp" }`,
  },
  {
    stage: "Recall",
    body: "Before reasoning, CORAL asks its own past what resembles this. Recall is a weighted blend of token overlap, exponential recency decay on a thirty-day half-life, outcome weight, symbol match, and shared tags. Losses are weighted as loudly as wins on purpose: the polyp that lost money is the most valuable row in the reef.",
    code: `score = 0.50·text + 0.22·recency + 0.18·outcome
      + 0.10·sameSymbol + 0.05·tags

# coral reef 'NVDA oversold' --why
# 4e89b847  text 0.34, same symbol, loss → 1.00`,
  },
  {
    stage: "Reason",
    body: "With a key, one structured call per basket. The model sees reef state, every observation, and the recalled polyps verbatim, and returns a typed decision per symbol. Without a key, or if the call fails, a deterministic heuristic decides instead. It scores mean reversion, trend continuation, reef bias, an overbought penalty, a volatility penalty, and a scar penalty when recall contains two losses. The pipeline downstream is identical.",
    code: `if (rsi14 < 35 && momentum20 > 0)       score += 0.40
if (momentum20 > 0.015 && price > sma20) score += 0.30
if (bias < -0.2)                         score -= 0.25
if (lossesInRecall >= 2)                 score -= 0.20  // scarred

action = score >= 0.25 ? "buy" : "hold"`,
  },
  {
    stage: "Gate",
    body: "The risk manager runs after the model has spoken and before anything touches a venue. It is not a prompt, so the model cannot argue with it. Every check returns a reason string, because a rejection without a justification is useless to whoever reads the reef later. The gate can scale an order down instead of refusing it, and it records what it scaled from.",
    code: `confidence 0.68 ≥ minConfidence 0.55          ok
notional 250 ≤ maxOrderUsd 250                ok
deployed 300 + 250 ≤ maxDeployedUsd 2500      ok
NVDA exposure 0 + 250 ≤ cap 625               ok
consecutiveLosses 0 < 4                       ok
→ allowed, notional $250.00`,
  },
  {
    stage: "Settle",
    body: "Polyps older than an hour get judged by price. A buy polyp wins if price moved up more than one percent and loses below minus one. A sell polyp is inverted. A hold has no position, so it realises nothing and settles neutral. That last rule matters: counting a flat tape as a win is how a reef ends up advertising a hundred percent on zero profit.",
    code: `move = (price - entry) / entry
buy  → move >  0.01 ? "win" : move < -0.01 ? "loss" : "neutral"
sell → move < -0.01 ? "win" : move >  0.01 ? "loss" : "neutral"
hold → "neutral"          // no position, no result`,
  },
  {
    stage: "Calcify",
    body: "Every decision from the pass becomes a polyp, including the ones the gate refused. Those are tagged gated and hold the rejection reason in their artifacts. A pass that settled older polyps also writes a reflection. Nothing is dropped for being embarrassing, which is the whole point of a reef.",
    code: `{ kind: "trade", action: "buy", confidence: 0.68,
  thesis: "BUY · rsi 31 · mom 4.3% · 24h 1.1% · 6 polyps recalled",
  tags: ["mean-reversion", "oversold", "sanctioned"],
  outcome: "pending", pnl: 0,
  artifacts: { observation, recalled, gate, execution, runId } }`,
  },
];

const FIELDS: [string, string][] = [
  ["kind", "observation, decision, trade, reflection, or skill. Only decisions and trades are scored."],
  ["agent", "which host made the call, so a Claude-shaped decision and a Codex-shaped one stay distinguishable."],
  ["thesis", "the falsifiable sentence. Everything recall scores against lives here."],
  ["confidence", "zero to one, and a hard gate input. Dishonest confidence gets sized down or refused."],
  ["outcome, pnl", "filled in by settle. Never set at write time, because that would be marking your own homework."],
  ["tags", "the zones. coral evolve groups by tag and reweights each zone by its smoothed win rate."],
  ["artifacts", "frozen evidence: the observation, recall ids, the gate verdict, the execution. JSON, never re-derived."],
];

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main>
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10 sm:py-20">
            <div className="flex items-center gap-4">
              <MonogramSeal variant="cobalt" className="h-9 w-9" />
              <p className="font-mono-code text-[10px] uppercase tracking-[0.18em] text-cobalt">How it works</p>
            </div>
            <h1 className="mt-6 max-w-[900px] font-serif-display text-[36px] font-normal uppercase leading-[0.94] tracking-[-0.015em] text-ink sm:text-[54px] md:text-[62px]">
              One pass,
              <br />
              six stages,
              <br />
              a colony at the end
            </h1>
            <p className="mt-6 max-w-[540px] font-serif-editorial text-[15px] italic leading-[1.4] text-ink/80">
              The engine is a LangGraph state graph compiled with a checkpointer, so every pass has a thread id you
              can resume and every stage emits a typed event. The snippets below are the actual logic, abbreviated.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10">
          <div className="space-y-12">
            {STAGES.map((s, i) => (
              <div key={s.stage} className="grid gap-8 border-t border-rule pt-10 lg:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <span className="font-mono-code text-[10.5px] text-cobalt">0{i + 1}</span>
                  <h2 className="mt-2 font-serif-display text-[35px] font-normal uppercase leading-[0.95] tracking-[-0.015em] text-ink sm:text-[44px]">
                    {s.stage}
                  </h2>
                  <p className="mt-4 max-w-[440px] font-sans-clean text-[12px] font-medium leading-[1.45] text-ink sm:text-[12.5px]">
                    {s.body}
                  </p>
                </div>
                <div className="overflow-hidden border border-rule-cobalt bg-[#F8F9FE]">
                  <pre className="overflow-x-auto px-4 py-4 font-mono-code text-[11px] leading-[1.75] text-ink">
                    <code>{s.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-rule bg-[#F8F9FE]">
          <div className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10">
            <h2 className="font-serif-editorial text-[22px] font-normal tracking-[-0.01em] text-cobalt sm:text-[26px]">
              What a polyp actually is
            </h2>
            <p className="mt-5 max-w-[560px] font-sans-clean text-[11.5px] font-medium leading-[1.45] text-ink">
              One row in SQLite, Zod-validated on the way in and append-only in spirit. A polyp is never rewritten
              to look sharper in hindsight. Only outcome and pnl are filled in later, when the market has judged it.
            </p>

            <div className="mt-8 border border-rule-cobalt bg-white">
              {FIELDS.map(([field, why]) => (
                <div key={field} className="grid gap-1 border-b border-rule px-5 py-3.5 last:border-0 sm:grid-cols-[auto_1fr] sm:gap-6">
                  <code className="font-mono-code text-[11px] text-cobalt">{field}</code>
                  <span className="font-sans-clean text-[11.5px] leading-relaxed text-ink/85">{why}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-serif-editorial text-[22px] font-normal tracking-[-0.01em] text-cobalt sm:text-[26px]">
                What evolving changes
              </h2>
              <div className="mt-5 space-y-4 font-sans-clean text-[12px] font-medium leading-[1.5] text-ink">
                <p>
                  It reweights routing. Each zone gets a Laplace-smoothed win rate, (wins+1)/(decided+2), so three
                  lucky wins do not read as a hundred percent edge. Zones above 0.60 are promoted, below 0.42
                  demoted, and a zone with five losses and no wins is retired.
                </p>
                <p>
                  Demoted does not mean deleted. A demoted skill still routes, it just loses ties to a stronger one.
                  The reef reweights, it does not forget.
                </p>
                <p className="border-l-2 border-cobalt pl-4">
                  It is deliberately not self-modifying. No prompt rewrites the prompt, no generated code gets
                  promoted to production. A trading agent that can edit its own rules is a liability.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden border border-rule-cobalt bg-[#F8F9FE]">
                <div className="border-b border-rule-cobalt px-4 py-2 font-mono-code text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                  coral evolve
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono-code text-[11px] leading-[1.7] text-ink">
                  <code>{`Evolution · generation 2
  promoted   momentum, mean-reversion
  demoted    overbought-chase
  retired    -

Notes
  · promoted: momentum, mean-reversion
  · demoted: overbought-chase, still routes
    but loses ties`}</code>
                </pre>
              </div>

              <div className="overflow-hidden border border-rule-cobalt bg-white">
                <div className="border-b border-rule-cobalt px-4 py-2 font-mono-code text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                  the honest failure
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono-code text-[11px] leading-[1.7] text-ink">
                  <code>{`$ coral evolve

Evolution · generation 2
  promoted   -
  demoted    -

Notes
  · not enough evidence yet: 3 zones, none
    with 3+ polyps. Reef needs more decisions
    before it can be judged.`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-8">
            <p className="max-w-[520px] font-serif-editorial text-[17px] italic leading-[1.35] text-ink/80">
              Next: what stops this from being a very eloquent way to lose money.
            </p>
            <Link
              href="/safety"
              className="inline-flex items-center gap-2 border border-rule-cobalt px-6 py-2.5 font-sans-clean text-[10px] font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:border-cobalt hover:bg-cobalt hover:text-white"
            >
              Safety and risk
              <DiagonalArrow className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
