import Link from "next/link";
import { CobaltBanner, Footer, Header } from "@/components/chrome";
import { DiagonalArrow, DownArrow, MonogramSeal } from "@/components/engraving";

/** What the ticker says. Each item is a real capability, not a slogan. */
const TICKER = [
  "Robinhood Trading MCP",
  "Robinhood Chain · 4663",
  "Polyp memory · SQLite",
  "LangGraph six-stage pass",
  "Paper by default",
  "Deterministic risk gate",
  "Eight MCP tools served",
  "Claude Code · Codex · Cursor · Gemini · Grok",
  "CorAL evolve · generations",
];

/** Real counts, checked against the repo. No invented percentages. */
const COUNTS = [
  { value: "10", label: "CLI commands" },
  { value: "8", label: "MCP tools served" },
  { value: "5", label: "agent hosts" },
  { value: "$0", label: "to run in paper" },
];

const PASS = [
  { stage: "observe", body: "Quotes and daily bars from the Robinhood MCP. No token, and the reef reads a deterministic synthetic tape instead, labelled as such." },
  { stage: "recall", body: "Polyps scored by text overlap, recency, outcome, and symbol. A pattern that lost twice loses its voice." },
  { stage: "reason", body: "A model call, or a deterministic heuristic when no key is set. Both produce the same typed decision." },
  { stage: "gate", body: "Order size, concentration, deployment, confidence, loss streak, daily cap. Code, not a prompt." },
  { stage: "settle", body: "Polyps older than an hour get judged by realized price movement." },
  { stage: "calcify", body: "Every decision becomes a polyp, including the refused ones, with the reason frozen in its artifacts." },
];

const MECHANISM = [
  {
    title: "Every decision calcifies",
    body: "A decision is not a log line. It becomes a polyp holding the observation, the thesis, the confidence it was made at, and later the outcome. The colony those polyps build is the strategy.",
  },
  {
    title: "Recall, not retrieval",
    body: "Before reasoning, CORAL pulls the polyps that resemble today's setup. Two losses on the same pattern are not a footnote in a prompt, they suppress the trade.",
  },
  {
    title: "Generations, not versions",
    body: "coral evolve reweights the reef. Zones that work gain routing weight, zones that never worked are retired, and each generation is written down so the drift stays auditable.",
  },
  {
    title: "Limits in code, not prompts",
    body: "A deterministic risk manager runs after the model speaks and before anything touches a venue. Order caps, concentration caps, circuit breakers: enforced, not requested.",
  },
];

const HOSTS = ["Claude Code", "Codex", "Cursor", "Gemini", "Grok"];

export default function Home() {
  return (
    <>
      <Header />

      {/* ── hero: the supplied copperplate frame with the lockup inside it ── */}
      <section className="relative w-full overflow-hidden bg-white">
        <div className="relative mx-auto max-w-[1440px]">
          <div className="relative w-full overflow-hidden">
            <img
              src="/engravings/hero-reef-engraving.webp"
              alt="Classical cobalt copperplate engraving of a coral reef framed by Grecian columns, with staghorn coral, sea fans, and a drifting jellyfish"
              className="cobalt-engraving h-[540px] w-full scale-[1.035] object-cover object-center sm:h-[680px] md:h-[820px] lg:h-[920px]"
            />

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="pointer-events-auto flex max-w-[820px] flex-col items-center rounded-xs bg-white/85 px-4 py-3 sm:bg-transparent">
                <div className="mb-5 animate-gentle-drift sm:mb-7">
                  <MonogramSeal variant="cobalt" className="h-10 w-10 sm:h-12 sm:w-12" />
                </div>

                <p className="font-mono-code text-[10.5px] uppercase tracking-[0.18em] text-cobalt">
                  Cultivating On-chain Reasoning &amp; Adaptive Learning
                </p>

                <h1 className="mt-2.5 font-serif-display text-[34px] font-normal uppercase leading-[0.91] tracking-[-0.02em] text-cobalt sm:mt-3 sm:text-[56px] md:text-[68px] lg:text-[76px]">
                  An agent that
                  <br />
                  grows, instead
                  <br />
                  of resetting
                </h1>

                <p className="mt-3 max-w-[460px] font-serif-editorial text-[13.5px] italic text-cobalt/90 sm:mt-4 sm:text-[15.5px]">
                  Every call becomes a polyp of memory. The reef is the strategy.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6">
                  <Link
                    href="/install"
                    className="bg-cobalt px-7 py-2 font-sans-clean text-[10.5px] font-medium uppercase tracking-[0.1em] text-white transition-colors hover:bg-cobalt-deep"
                  >
                    Spawn a reef
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="border border-cobalt/45 px-7 py-2 font-sans-clean text-[10.5px] font-medium uppercase tracking-[0.1em] text-cobalt transition-colors hover:bg-cobalt hover:text-white"
                  >
                    See the pass
                  </Link>
                </div>

                <a
                  href="#how"
                  aria-label="Scroll to how CORAL works"
                  className="mt-4 inline-flex h-8 w-8 items-center justify-center text-cobalt transition-transform duration-300 hover:translate-y-1 sm:mt-6"
                >
                  <DownArrow />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ticker ── */}
      <div className="w-full overflow-hidden border-y border-rule-cobalt bg-white py-2.5">
        <div className="animate-coral-marquee">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span
              key={i}
              className="mx-6 inline-flex items-center gap-2.5 font-sans-clean text-[11.5px] font-medium tracking-[-0.01em] text-cobalt"
            >
              <DiagonalArrow className="h-3.5 w-3.5" />
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── the problem, with the polyp etching ── */}
      <section id="how" className="w-full bg-white pt-16 sm:pt-24">
        <div className="mx-auto max-w-[1220px] px-6 sm:px-10">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-8">
            <div className="flex justify-center md:col-span-6 md:justify-end md:pr-6">
              <div className="relative w-full max-w-[460px] overflow-hidden">
                <img
                  src="/engravings/polyp-satellite-etching.webp"
                  alt="Technical copperplate engraving of a crystalline polyp node, the unit CORAL writes to memory"
                  className="cobalt-engraving h-[250px] w-full object-cover object-top sm:h-[300px]"
                />
              </div>
            </div>

            <div className="flex justify-start md:col-span-6 md:pl-6">
              <div className="max-w-[330px] space-y-3.5 font-sans-clean text-[12px] font-medium leading-[1.34] tracking-[-0.015em] text-ink sm:text-[12.5px]">
                <p>
                  Every agent forgets. A session ends, the reasoning evaporates, and tomorrow the same agent
                  re-derives the same thesis with the same confidence. You pay for the same inference twice.
                </p>
                <p>
                  The usual fix is a longer prompt. A five-page system prompt is not memory, it is instructions,
                  and instructions do not know that NVDA gapped on you twice in March.
                </p>
                <p>
                  CORAL keeps the evidence. The memory is a database, the recall is scored, the outcomes are
                  recorded, and the risk limits are code rather than prose.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 max-w-[820px] sm:mt-28">
            <h2 className="font-sans-clean text-[22px] font-medium leading-[1.16] tracking-[-0.025em] text-ink sm:text-[28px] md:text-[32px]">
              One pass is a six-stage state graph: observe, recall, reason, gate, settle, calcify. Each stage
              emits a typed event, and the whole run is a thread you can resume.
            </h2>
            <p className="mt-3.5 font-sans-clean text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-soft">
              The pass, in the order the engine runs it
            </p>
          </div>

          <div className="mt-6 max-w-[900px] border-t border-rule">
            {PASS.map((s, i) => (
              <div key={s.stage} className="grid gap-2 border-b border-rule py-4 sm:grid-cols-[auto_1fr] sm:gap-6">
                <span className="font-mono-code text-[10.5px] uppercase tracking-wider text-cobalt">
                  0{i + 1} · {s.stage}
                </span>
                <p className="max-w-[620px] font-sans-clean text-[12px] leading-relaxed text-ink/85">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 w-full overflow-hidden">
          <div className="mx-auto max-w-[1440px]">
            <img
              src="/engravings/mid-panorama-reef.webp"
              alt="Panoramic copperplate engraving of two submerged coral reef islands with Grecian columns and celestial armillary spheres"
              className="cobalt-engraving h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── mechanism as monumental editorial rows ── */}
      <section className="mx-auto max-w-[1280px] px-6 pb-8 pt-16 sm:px-10 sm:pt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6">
          <h2 className="font-serif-editorial text-[20px] font-normal tracking-[-0.01em] text-cobalt sm:text-[23px]">
            What makes it a colony
          </h2>
          <p className="font-sans-clean text-[10.5px] font-medium text-ink-muted">
            four mechanisms, no decoration
          </p>
        </div>

        <div className="border-t border-rule">
          {MECHANISM.map((m, i) => (
            <div key={m.title} className="grid grid-cols-1 items-start gap-4 border-b border-rule py-6 sm:grid-cols-12 sm:py-7">
              <div className="sm:col-span-9 sm:pr-4">
                <h3 className="font-serif-display text-[30px] font-normal uppercase leading-[0.95] tracking-[-0.015em] text-ink sm:text-[42px] lg:text-[50px]">
                  {m.title}
                </h3>
                <p className="mt-1.5 max-w-[640px] font-sans-clean text-[12px] font-medium leading-[1.4] tracking-[-0.01em] text-ink sm:text-[13px]">
                  {m.body}
                </p>
              </div>
              <div className="sm:col-span-3 sm:pt-1">
                <span className="bg-cobalt px-1.5 py-[2px] font-sans-clean text-[9.5px] font-medium leading-tight text-white">
                  MECHANISM
                </span>
                <span className="ml-[2px] bg-cobalt-tint px-1.5 py-[2px] font-sans-clean text-[9.5px] font-medium leading-tight text-cobalt">
                  {String(i + 1).padStart(2, "0")} / 04
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── counts: real, checked ── */}
      <section className="mx-auto max-w-[1280px] px-6 py-12 sm:px-10">
        <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
          {COUNTS.map((c) => (
            <div key={c.label} className="bg-white px-5 py-7">
              <p className="font-serif-display text-[34px] font-normal leading-none text-cobalt">{c.value}</p>
              <p className="mt-2 font-sans-clean text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-soft">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── the cobalt constitutional banner ── */}
      <section className="mx-auto max-w-[1280px] px-6 py-12 sm:px-10 sm:py-16">
        <CobaltBanner
          heading={
            <>
              The model is allowed
              <br />
              to be optimistic.
              <br />
              The gate is not.
            </>
          }
          cta="Inspect the limits"
          href="/safety"
        />
      </section>

      {/* ── hosts ── */}
      <section className="mx-auto max-w-[1280px] px-6 pb-16 sm:px-10 sm:pb-24">
        <h2 className="font-serif-editorial text-[20px] font-normal tracking-[-0.01em] text-cobalt sm:text-[23px]">
          One command wires CORAL into the agent you already run
        </h2>
        <p className="mt-5 max-w-[340px] font-sans-clean text-[11.5px] font-medium leading-[1.36] tracking-[-0.01em] text-ink">
          CORAL speaks MCP in both directions. It calls the Robinhood Trading MCP for market data and orders, and
          it serves itself as an MCP server so your agent can ask it things. The config writer backs up every
          original file before it touches one.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-5">
          {HOSTS.map((h) => (
            <div key={h} className="flex items-center justify-center bg-white px-3 py-8">
              <span className="font-serif-display text-[15px] uppercase tracking-[0.02em] text-ink">{h}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 border border-rule-cobalt bg-[#F8F9FE] p-5">
          <p className="font-mono-code text-[11px] text-cobalt">coral connect --all</p>
          <p className="mt-2 max-w-[620px] font-sans-clean text-[11.5px] leading-relaxed text-ink/85">
            Writes the hosted MCP entry into every agent config it finds on this machine, and backs up each
            original first. Each host has its own shape, including Gemini wanting httpUrl instead of url.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/install"
            className="inline-flex items-center gap-2 bg-cobalt px-7 py-2.5 font-sans-clean text-[10px] font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-cobalt-deep"
          >
            Install CORAL
            <DiagonalArrow className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/how-it-works"
            className="border border-rule-cobalt px-7 py-2.5 font-sans-clean text-[10px] font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:border-cobalt hover:bg-cobalt hover:text-white"
          >
            Read the mechanism
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
