import Link from "next/link";
import { ArrowRight, Compass, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { Footer, Nav, Logo } from "@/components/chrome";
import { PolypField } from "@/components/polyp-field";

const PILLARS = [
  {
    icon: Sparkles,
    title: "Every decision calcifies",
    body: "A decision is not a log line. It becomes a polyp holding the evidence, the confidence, and — later — the outcome. The reef is the record of what CORAL actually believed.",
  },
  {
    icon: Compass,
    title: "Recall, not retrieval",
    body: "Before reasoning, CORAL pulls the polyps that resemble today's setup. Two losses on the same pattern are not a footnote in a prompt; they suppress the trade.",
  },
  {
    icon: GitBranch,
    title: "Generations, not versions",
    body: "`coral evolve` re-weights the reef: zones that work gain routing weight, zones that never worked are retired. Every generation is written down, so the drift is auditable.",
  },
  {
    icon: ShieldCheck,
    title: "Limits in code, not prompts",
    body: "A deterministic risk manager runs after the model speaks and before anything touches a venue. Order caps, concentration caps, circuit breakers — enforced, not requested.",
  },
];

const STATS = [
  { value: "8", label: "CLI verbs" },
  { value: "9", label: "MCP tools served" },
  { value: "5", label: "agent hosts" },
  { value: "$0", label: "to run in paper mode" },
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* ── hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="glow-coral pointer-events-none absolute inset-x-0 -top-40 h-[560px] opacity-70" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-shelf) 1px, transparent 1px), linear-gradient(to bottom, var(--color-shelf) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent)",
          }}
        />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pb-32 lg:pt-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/5 px-3 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" style={{ animation: "pulse-soft 3s ease-in-out infinite" }} />
              Paper mode by default
            </div>

            <h1 className="mt-7 text-balance font-display text-[3.1rem] leading-[1.02] tracking-[-0.02em] sm:text-[4rem] lg:text-[4.4rem]">
              An agent that <span className="italic text-coral">grows</span>,
              <br />
              instead of resetting.
            </h1>

            <p className="mt-7 max-w-xl text-pretty text-[1.02rem] leading-relaxed text-mist">
              CORAL is a self-evolving trading agent. It connects to the Robinhood Trading MCP and Robinhood Chain,
              makes a call, and then <span className="text-foam">keeps the evidence</span> — as a polyp. The colony
              those polyps build <em className="not-italic text-foam">is</em> the strategy. Not a prompt you rewrite
              every morning.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/install"
                className="group inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-[0.86rem] font-medium text-abyss transition hover:bg-crimson"
              >
                Spawn a reef
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-shelf px-6 py-3 text-[0.86rem] text-mist transition hover:border-mist hover:text-foam"
              >
                See the lifecycle
              </Link>
            </div>

            <div className="mt-10 overflow-hidden rounded-lg border border-shelf/80 bg-deep/80">
              <div className="flex items-center gap-2 border-b border-shelf/60 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-coral/60" />
                <span className="h-2 w-2 rounded-full bg-amber/50" />
                <span className="h-2 w-2 rounded-full bg-teal/50" />
                <span className="ml-2 font-mono text-[0.68rem] text-silt">terminal</span>
              </div>
              <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.76rem] leading-relaxed text-mist">
                <code>{`$ pnpm coral init
✓ reef spawned at .coral/reef.db
✓ generation 1 · 0 polyps

$ pnpm coral trade NVDA,AAPL --budget 200
  ▸ observe · reading 2 symbol(s)
  ▸ recall  · pulling polyps that match today's setup
  ▸ reason  · thinking with claude-sonnet-4-5
  ▸ gate    · hard limits, non-negotiable
  fill buy NVDA $100.00 @ $182.44
  polyps grown 2 · deployed $100.00 / $2500`}</code>
              </pre>
            </div>
          </div>

          <div className="relative">
            <div className="glow-teal pointer-events-none absolute inset-0 scale-110 opacity-80" />
            <div className="card-reef relative aspect-[64/50] overflow-hidden p-3">
              <PolypField count={52} />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-silt">colony</p>
                  <p className="font-display text-lg text-foam">generation 7</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-silt">polyps</p>
                  <p className="font-display text-lg text-coral">1,284</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[0.66rem] text-silt">
              each point is one decision — coral = held up, teal = not yet judged
            </p>
          </div>
        </div>

        <div className="rule-fade" />
      </section>

      {/* ── stats strip ──────────────────────────────────────────────── */}
      <section className="border-b border-shelf/40 bg-deep/60">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px px-6 py-10 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-2 text-center sm:text-left">
              <p className="font-display text-3xl text-foam">{s.value}</p>
              <p className="mt-1 text-[0.74rem] uppercase tracking-[0.14em] text-silt">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── thesis ───────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-coral">the problem</p>
            <h2 className="mt-5 text-balance font-display text-[2.4rem] leading-[1.1]">
              Every agent forgets.
              <br />
              <span className="text-silt">That is the whole bug.</span>
            </h2>
          </div>
          <div className="space-y-5 text-pretty text-[0.95rem] leading-relaxed text-mist">
            <p>
              A chat session ends and the reasoning evaporates. Next morning the agent re-derives the same thesis,
              makes the same mistake, and is just as confident about it. Nothing accumulates. You are paying for the
              same inference twice and calling it a strategy.
            </p>
            <p>
              Worse: the usual fix is a longer prompt. A five-page system prompt full of rules is not memory — it is
              instructions, and instructions don&apos;t know that NVDA gapped on you twice in March.
            </p>
            <p className="border-l-2 border-coral/50 pl-5 text-foam">
              CORAL keeps the evidence. Every decision becomes a polyp with the observation that produced it, the
              confidence it was made at, and — once the market has spoken — the outcome. Recall weights outcomes; a
              scarred pattern loses. That is not a feature bolted on. It is what makes the thing alive.
            </p>
          </div>
        </div>
      </section>

      {/* ── pillars ──────────────────────────────────────────────────── */}
      <section className="border-y border-shelf/40 bg-deep/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-teal">the mechanism</p>
            <h2 className="mt-5 text-balance font-display text-[2.4rem] leading-[1.1]">
              Four things that make it a colony, not a cron job.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <div key={p.title} className="card-reef card-reef-hover p-7">
                <p.icon className="h-5 w-5 text-coral" strokeWidth={1.6} />
                <h3 className="mt-5 font-display text-xl text-foam">{p.title}</h3>
                <p className="mt-3 text-pretty text-[0.88rem] leading-relaxed text-mist">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── lifecycle ────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-coral">one pass</p>
            <h2 className="mt-5 text-balance font-display text-[2.4rem] leading-[1.1]">
              Observe → recall → reason → gate → settle → calcify.
            </h2>
          </div>
          <Link href="/how-it-works" className="group inline-flex items-center gap-2 text-[0.84rem] text-mist hover:text-foam">
            Full lifecycle
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-shelf/60 bg-shelf/40 md:grid-cols-3 lg:grid-cols-6">
          {[
            ["observe", "Quotes and bars from the Robinhood MCP. Never invented."],
            ["recall", "Polyps scored by text, recency, and outcome."],
            ["reason", "A model, or a deterministic heuristic with no key."],
            ["gate", "Risk manager. Deterministic. Final."],
            ["settle", "Old polyps get their verdict from price."],
            ["calcify", "This pass becomes polyps. Always."],
          ].map(([name, body], i) => (
            <div key={name} className="bg-abyss/80 p-5">
              <span className="font-mono text-[0.66rem] text-silt">0{i + 1}</span>
              <p className="mt-2 font-mono text-[0.82rem] text-coral">{name}</p>
              <p className="mt-2 text-[0.78rem] leading-relaxed text-mist">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── hosts ────────────────────────────────────────────────────── */}
      <section className="border-t border-shelf/40 bg-deep/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="text-center">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-silt">bring your own agent</p>
            <h2 className="mt-4 text-balance font-display text-[2rem] leading-tight">
              One command wires CORAL into the agent you already run.
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-shelf/60 bg-shelf/30 sm:grid-cols-5">
            {["Claude Code", "Codex", "Cursor", "Gemini", "Grok"].map((name) => (
              <div key={name} className="flex items-center justify-center bg-abyss/70 px-4 py-8">
                <span className="font-display text-lg tracking-wide text-mist">{name}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center font-mono text-[0.74rem] text-silt">
            coral connect --all &nbsp;·&nbsp; writes the MCP entry, backs up the original config
          </p>
        </div>
      </section>

      {/* ── cta ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-shelf/40">
        <div className="glow-coral pointer-events-none absolute inset-x-0 bottom-0 h-[380px] rotate-180 opacity-60" />
        <div className="relative mx-auto w-full max-w-3xl px-6 py-28 text-center">
          <Logo />
          <h2 className="mt-8 text-balance font-display text-[2.6rem] leading-[1.08]">
            Start in paper. Stay until the reef earns it.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[0.95rem] leading-relaxed text-mist">
            No account, no card, no key required to run your first pass. CORAL ships a deterministic reasoner so the
            reef can grow offline — and refuses to touch real money until you say so twice.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/install"
              className="group inline-flex items-center gap-2 rounded-full bg-coral px-7 py-3.5 text-[0.88rem] font-medium text-abyss transition hover:bg-crimson"
            >
              Install CORAL
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/safety"
              className="inline-flex items-center gap-2 rounded-full border border-shelf px-7 py-3.5 text-[0.88rem] text-mist transition hover:border-mist hover:text-foam"
            >
              Read the safety model
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
