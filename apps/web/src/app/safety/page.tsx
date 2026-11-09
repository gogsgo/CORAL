import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock, ShieldAlert, Siren } from "lucide-react";
import { Footer, Nav } from "@/components/chrome";

export const metadata: Metadata = {
  title: "Safety & risk",
  description:
    "CORAL's hard limits, what live mode actually requires, and the failure modes it is designed around. Paper by default, always.",
};

const LIMITS: [string, string, string][] = [
  ["maxOrderUsd", "250", "Absolute ceiling on a single order. Larger requests are scaled down, not rejected."],
  ["maxDeployedUsd", "2,500", "Total open cost basis. When the book is full, nothing new opens."],
  ["maxPositionPct", "0.25", "Per-symbol ceiling as a fraction of maxDeployedUsd — a fixed cap, not a moving one."],
  ["minConfidence", "0.55", "Below this, a buy is refused regardless of thesis quality."],
  ["maxConsecutiveLosses", "4", "Circuit breaker. Counts settled losses in a row, then stops new risk."],
  ["maxDailyLossUsd", "150", "Daily realised-loss cap. Hit it and the reef stops for the day."],
  ["symbolBlocklist", "[]", "Symbols CORAL may never touch, no matter how good the setup looks."],
  ["allowLive", "false", "The second switch. Live needs this AND CORAL_MODE=live. One alone does nothing."],
];

const THREATS = [
  {
    icon: Siren,
    title: "The model is wrong, confidently",
    body: "Assumed, not prevented. The gate does not care how persuasive the thesis is — sizing, concentration, and the loss streak are checked against numbers, not prose. A high-confidence call still gets refused if the book is full or the day is red.",
  },
  {
    icon: ShieldAlert,
    title: "Data is stale or synthetic",
    body: "Every observation carries its source, and the source is copied into the polyp's artifacts. A decision made on a synthetic tape is permanently labelled as such — it can teach the reef, but it can never be presented as a real trade.",
  },
  {
    icon: Lock,
    title: "An agent host tries to place an order directly",
    body: "Through CORAL's MCP surface, `coral_trade` is the only write tool, it defaults to a dry run, and it always runs the gate. The Robinhood `place-order` skill exists for completeness, but the engine is the only caller that has a sanctioned verdict to hand it.",
  },
];

const NON_NEGOTIABLES = [
  "Paper mode is the default in code, not in documentation.",
  "Live requires CORAL_MODE=live and limits.allowLive=true. Both.",
  "Fees are charged on every paper fill. Optimistic accounting is a lie with a compounding interest rate.",
  "A rejected decision still becomes a polyp, tagged `gated`, with the reason frozen in its artifacts.",
  "A polyp cannot be settled in the same hour it was made.",
  "No prompt text is ever treated as a safety control.",
];

export default function SafetyPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden border-b border-shelf/40">
          <div className="glow-coral pointer-events-none absolute inset-x-0 -top-32 h-[420px] opacity-40" />
          <div className="relative mx-auto w-full max-w-5xl px-6 py-20">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-amber">safety &amp; risk</p>
            <h1 className="mt-5 text-balance font-display text-[3rem] leading-[1.05] sm:text-[3.6rem]">
              The model is allowed to be optimistic. The gate is not.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-[1rem] leading-relaxed text-mist">
              CORAL is an agent that can place orders. That sentence should make you uncomfortable, and the design below
              is a response to that discomfort rather than a reassurance about it.
            </p>
            <div className="mt-8 rounded-lg border border-amber/30 bg-amber/[0.05] p-5">
              <p className="text-pretty text-[0.88rem] leading-relaxed text-mist">
                <span className="font-medium text-amber">Read this first.</span> CORAL is not investment advice, and it
                is not a money machine. Automated trading can lose money faster than manual trading, because it is
                faster. You are responsible for every order an agent places on your account, including the ones you did
                not watch.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="font-display text-[2rem] leading-tight">Hard limits</h2>
          <p className="mt-4 max-w-3xl text-pretty text-[0.9rem] leading-relaxed text-mist">
            These live in{" "}
            <code className="rounded bg-shelf/60 px-1.5 py-0.5 font-mono text-[0.85em] text-coral">
              packages/core/src/safety/risk-manager.ts
            </code>{" "}
            as a Zod-validated object, and every one of them is enforced in code that runs after the model has spoken.
            The defaults below are what ships. Changing them is a deliberate edit to a source file, not an environment
            variable you can fat-finger.
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-shelf/60">
            <table className="w-full text-left text-[0.84rem]">
              <thead className="bg-deep/80 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-silt">
                <tr>
                  <th className="px-5 py-3 font-normal">limit</th>
                  <th className="px-5 py-3 font-normal">default</th>
                  <th className="px-5 py-3 font-normal">enforced as</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-shelf/40">
                {LIMITS.map(([name, value, note]) => (
                  <tr key={name} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[0.76rem] text-foam">{name}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[0.76rem] text-coral">{value}</td>
                    <td className="px-5 py-3.5 text-mist">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-y border-shelf/40 bg-deep/40">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <h2 className="font-display text-[2rem] leading-tight">Three failure modes, taken seriously</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {THREATS.map((t) => (
                <div key={t.title} className="card-reef p-6">
                  <t.icon className="h-5 w-5 text-amber" strokeWidth={1.6} />
                  <h3 className="mt-4 font-display text-lg leading-snug text-foam">{t.title}</h3>
                  <p className="mt-3 text-pretty text-[0.84rem] leading-relaxed text-mist">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="font-display text-[2rem] leading-tight">Non-negotiables</h2>
              <p className="mt-4 text-[0.9rem] leading-relaxed text-mist">
                Six things that will not be traded away for a nicer demo.
              </p>
            </div>
            <ul className="space-y-3">
              {NON_NEGOTIABLES.map((n) => (
                <li key={n} className="flex gap-3 rounded-lg border border-shelf/50 bg-deep/50 px-4 py-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  <span className="text-pretty text-[0.86rem] leading-relaxed text-mist">{n}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16 grid gap-5 lg:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-shelf/80 bg-deep">
              <div className="border-b border-shelf/60 px-4 py-2 font-mono text-[0.66rem] text-silt">
                what a refusal looks like
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.73rem] leading-relaxed text-mist">
                <code>{`Rejected by the risk manager
  ✗ NVDA buy: confidence 0.48 < minConfidence 0.55
  ✗ TSLA buy: circuit breaker: 4 consecutive
              losses (limit 4)
  ✗ GME  buy: GME is blocklisted

# each one still became a polyp,
# tagged "gated", reason in artifacts`}</code>
              </pre>
            </div>
            <div className="overflow-hidden rounded-lg border border-shelf/80 bg-deep">
              <div className="border-b border-shelf/60 px-4 py-2 font-mono text-[0.66rem] text-silt">
                what going live takes
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.73rem] leading-relaxed text-mist">
                <code>{`# 1. environment
CORAL_MODE=live
ROBINHOOD_MCP_TOKEN=...

# 2. a source edit — on purpose
RiskManager.forMode("live")
  → limits.allowLive === true

# 3. a CLI confirmation
$ coral trade NVDA --yes
LIVE MODE · budget $200 · max 1 order

# one switch alone places nothing.`}</code>
              </pre>
            </div>
          </div>

          <div className="mt-16 rounded-xl border border-shelf/60 bg-deep/50 p-6">
            <h3 className="font-display text-lg text-foam">What CORAL cannot do, by construction</h3>
            <div className="mt-4 grid gap-3 text-[0.86rem] leading-relaxed text-mist sm:grid-cols-2">
              <p>· Sign or submit on-chain transactions. The chain client is read-only.</p>
              <p>· Move funds, withdraw, or touch any non-Agentic account.</p>
              <p>· Trade short, on margin, or with leverage — the heuristic has no such actions.</p>
              <p>· Rewrite its own limits, prompts, or risk rules.</p>
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-pretty text-[0.9rem] text-mist">
              If that reads like a system you can reason about, the install page takes four commands.
            </p>
            <Link href="/install" className="group inline-flex items-center gap-2 text-[0.86rem] text-coral hover:text-foam">
              Install CORAL
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
