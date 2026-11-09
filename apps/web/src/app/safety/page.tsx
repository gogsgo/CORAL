import type { Metadata } from "next";
import Link from "next/link";
import { CobaltBanner, Footer, Header } from "@/components/chrome";
import { DiagonalArrow, MonogramSeal } from "@/components/engraving";

export const metadata: Metadata = {
  title: "Safety & risk",
  description:
    "CORAL's hard limits, what live mode actually requires, and the failure modes the design is built around. Paper by default, always.",
};

const LIMITS: [string, string, string][] = [
  ["maxOrderUsd", "250", "Ceiling on one order. Larger requests are scaled down, not rejected."],
  ["maxDeployedUsd", "2,500", "Total open cost basis. When the book is full, nothing new opens."],
  ["maxPositionPct", "0.25", "Per-symbol ceiling measured against maxDeployedUsd, so the cap is fixed rather than moving with the book."],
  ["minConfidence", "0.55", "Below this, a buy is refused however good the thesis reads."],
  ["maxConsecutiveLosses", "4", "Circuit breaker on settled losses. Then no new risk."],
  ["maxDailyLossUsd", "150", "Daily realised-loss cap. Hit it and the reef stops for the day."],
  ["symbolBlocklist", "[]", "Symbols CORAL may never touch, whatever the setup looks like."],
  ["allowLive", "false", "The second live switch. Needs this and CORAL_MODE=live. One alone does nothing."],
];

const THREATS = [
  {
    title: "The model is wrong, confidently",
    body: "Assumed, not prevented. The gate does not care how persuasive a thesis is. Sizing, concentration, and the loss streak are checked against numbers, so a high-confidence call still gets refused when the book is full or the day is red.",
  },
  {
    title: "Data is stale, or synthetic",
    body: "Every observation carries its source, and the source is copied into the polyp's artifacts. A decision made on a synthetic tape stays labelled as such. It can teach the reef, but it can never be presented as a real trade.",
  },
  {
    title: "An agent host tries to place an order directly",
    body: "Through CORAL's own MCP surface, coral_trade is the only write tool, it defaults to a dry run, and it always runs the gate. The Robinhood place-order skill exists for completeness, but the engine is the only caller holding a sanctioned verdict.",
  },
];

const NON_NEGOTIABLES = [
  "Paper mode is the default in code, not in documentation.",
  "Live requires CORAL_MODE=live and limits.allowLive=true. Both.",
  "Fees are charged on every paper fill, because optimistic accounting is a lie with a compounding interest rate.",
  "A refused decision still becomes a polyp, tagged gated, with the reason frozen in its artifacts.",
  "A polyp cannot be settled in the same hour it was made.",
  "No prompt text is ever treated as a safety control.",
];

export default function SafetyPage() {
  return (
    <>
      <Header />
      <main>
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10 sm:py-20">
            <div className="flex items-center gap-4">
              <MonogramSeal variant="cobalt" className="h-9 w-9" />
              <p className="font-mono-code text-[10px] uppercase tracking-[0.18em] text-cobalt">Safety &amp; risk</p>
            </div>
            <h1 className="mt-6 max-w-[900px] font-serif-display text-[36px] font-normal uppercase leading-[0.94] tracking-[-0.015em] text-ink sm:text-[54px] md:text-[62px]">
              The model may be
              <br />
              optimistic.
              <br />
              The gate may not
            </h1>
            <p className="mt-6 max-w-[520px] font-serif-editorial text-[15px] italic leading-[1.4] text-ink/80">
              CORAL is an agent that can place orders. That sentence should make you uncomfortable, and the design
              below is a response to that discomfort rather than a reassurance about it.
            </p>

            <div className="mt-8 max-w-[640px] border border-cobalt bg-[#F8F9FE] px-5 py-4">
              <p className="font-sans-clean text-[11.5px] font-medium leading-[1.5] text-ink">
                <span className="font-mono-code text-[10px] uppercase tracking-[0.1em] text-cobalt">
                  Read this first.
                </span>{" "}
                CORAL is not investment advice and it is not a money machine. Automated trading can lose money
                faster than manual trading, because it is faster. You are responsible for every order an agent
                places on your account, including the ones you did not watch.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10">
          <h2 className="font-serif-editorial text-[22px] font-normal tracking-[-0.01em] text-cobalt sm:text-[26px]">
            Hard limits
          </h2>
          <p className="mt-5 max-w-[560px] font-sans-clean text-[11.5px] font-medium leading-[1.45] text-ink">
            These live in packages/core/src/safety/risk-manager.ts as a Zod-validated object, and every one of them
            is enforced in code that runs after the model has spoken. The defaults below are what ships. Changing
            them is a deliberate edit to a source file, not an environment variable you can fat-finger.
          </p>

          <div className="mt-8 overflow-x-auto border border-rule">
            <table className="w-full text-left">
              <thead className="border-b border-rule font-mono-code text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-normal">limit</th>
                  <th className="px-5 py-3 font-normal">default</th>
                  <th className="px-5 py-3 font-normal">enforced as</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {LIMITS.map(([name, value, note]) => (
                  <tr key={name} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono-code text-[11px] text-ink">{name}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono-code text-[11px] text-cobalt">{value}</td>
                    <td className="px-5 py-3.5 font-sans-clean text-[11.5px] leading-relaxed text-ink/85">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-y border-rule bg-[#F8F9FE]">
          <div className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10">
            <h2 className="font-serif-editorial text-[22px] font-normal tracking-[-0.01em] text-cobalt sm:text-[26px]">
              Three failure modes, taken seriously
            </h2>
            <div className="mt-8 grid gap-px border border-rule-cobalt bg-rule-cobalt sm:grid-cols-3">
              {THREATS.map((t) => (
                <div key={t.title} className="bg-white p-6">
                  <h3 className="font-serif-display text-[19px] font-normal uppercase leading-[1.05] tracking-[-0.01em] text-ink">
                    {t.title}
                  </h3>
                  <p className="mt-3 font-sans-clean text-[11.5px] font-medium leading-[1.5] text-ink/85">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2 className="font-serif-editorial text-[22px] font-normal tracking-[-0.01em] text-cobalt sm:text-[26px]">
                Non-negotiables
              </h2>
              <p className="mt-4 font-sans-clean text-[11.5px] font-medium leading-[1.45] text-ink">
                Six things that will not be traded away for a nicer demo.
              </p>
            </div>
            <ul className="border-t border-rule">
              {NON_NEGOTIABLES.map((n) => (
                <li key={n} className="flex gap-4 border-b border-rule py-3.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-cobalt" aria-hidden />
                  <span className="font-sans-clean text-[11.5px] font-medium leading-[1.5] text-ink">{n}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <div className="overflow-hidden border border-rule-cobalt bg-[#F8F9FE]">
              <div className="border-b border-rule-cobalt px-4 py-2 font-mono-code text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                what a refusal looks like
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono-code text-[11px] leading-[1.7] text-ink">
                <code>{`Rejected by the risk manager
  NVDA buy: confidence 0.48 < minConfidence 0.55
  TSLA buy: circuit breaker, 4 consecutive
            losses (limit 4)
  GME  buy: GME is blocklisted

# each one still became a polyp, tagged
# "gated", reason in artifacts`}</code>
              </pre>
            </div>
            <div className="overflow-hidden border border-rule-cobalt bg-white">
              <div className="border-b border-rule-cobalt px-4 py-2 font-mono-code text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                what going live takes
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono-code text-[11px] leading-[1.7] text-ink">
                <code>{`# 1. environment
CORAL_MODE=live
ROBINHOOD_MCP_TOKEN=...

# 2. a source edit, on purpose
RiskManager.forMode("live")
  → limits.allowLive === true

# 3. a CLI confirmation
$ coral trade NVDA --yes
LIVE MODE · budget $200 · max 1 order

# one switch alone places nothing.`}</code>
              </pre>
            </div>
          </div>

          <div className="mt-14 border border-rule px-6 py-6">
            <h3 className="font-serif-editorial text-[19px] font-normal text-ink">What CORAL cannot do, by construction</h3>
            <div className="mt-4 grid gap-2.5 font-sans-clean text-[11.5px] font-medium leading-[1.5] text-ink/85 sm:grid-cols-2">
              <p>Sign or submit on-chain transactions. The chain client is read-only.</p>
              <p>Move funds, withdraw, or touch any non-Agentic account.</p>
              <p>Trade short, on margin, or with leverage. The action set has no such verbs.</p>
              <p>Rewrite its own limits, prompts, or risk rules.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-6 pb-8 sm:px-10">
          <CobaltBanner
            heading={
              <>
                Six switches
                <br />
                stand between
                <br />
                a prompt and your money
              </>
            }
            cta="Install in paper mode"
            href="/install"
          />
        </section>

        <section className="mx-auto max-w-[1220px] px-6 py-12 sm:px-10">
          <Link
            href="/how-it-works"
            className="editorial-row inline-flex items-center gap-2 font-serif-editorial text-[19px] font-normal text-cobalt hover:underline sm:text-[23px]"
          >
            How the pass produces these numbers
            <DiagonalArrow className="h-4 w-4 text-cobalt" />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
