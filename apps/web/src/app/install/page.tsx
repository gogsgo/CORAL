import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Footer, Nav } from "@/components/chrome";

export const metadata: Metadata = {
  title: "Installation",
  description:
    "Install CORAL in four commands. Paper mode by default, no API key required for the first run.",
};

const STEPS = [
  {
    n: "01",
    title: "Clone and install",
    body: "pnpm workspace, Turborepo. Node 22+ because the engine uses the built-in env loader and AbortSignal.timeout.",
    code: `git clone https://github.com/gogsgo/EOTH.git coral
cd coral
pnpm install`,
  },
  {
    n: "02",
    title: "Spawn the reef",
    body: "Writes .coral/reef.db and a .env template. Nothing is created outside the directory you run it in.",
    code: `pnpm coral init
# ✓ reef spawned at .coral/reef.db
# ✓ generation 1 · 0 polyps`,
  },
  {
    n: "03",
    title: "Run a pass — no key needed",
    body: "Without a model key CORAL uses a deterministic heuristic reasoner. Same pipeline, same risk gates, same polyps. It is a real strategy, not a mock.",
    code: `pnpm coral trade NVDA,AAPL --budget 200

# ▸ observe · reading 2 symbol(s) from synthetic
# ▸ recall  · pulling polyps that match today's setup
# ▸ reason  · no model key — deterministic reasoning
# ▸ gate    · hard limits, non-negotiable
# fill buy NVDA $100.00 @ $182.44`,
  },
  {
    n: "04",
    title: "Give it a brain",
    body: "Any one of four providers. CORAL picks the model from CORAL_LLM and falls back to the heuristic if the call fails — a dead key never stops the reef.",
    code: `# .env
CORAL_LLM=anthropic
CORAL_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-...

# or openai | google | xai`,
  },
];

const HOST_CMDS = [
  {
    host: "Claude Code",
    cmd: "claude mcp add robinhood-trading --transport http https://agent.robinhood.com/mcp/trading",
    note: "Then run /mcp and authenticate.",
  },
  {
    host: "Codex CLI",
    cmd: "codex mcp add robinhood-trading --url https://agent.robinhood.com/mcp/trading",
    note: "Then /mcp to sign in.",
  },
  {
    host: "Cursor",
    cmd: "Settings → Cursor Settings → Tools & MCPs → Connect",
    note: "Paste the MCP URL; OAuth is handled by Cursor.",
  },
  {
    host: "Gemini CLI",
    cmd: "gemini mcp add robinhood-trading https://agent.robinhood.com/mcp/trading -t http -s user",
    note: "Server aliases must not contain underscores.",
  },
  {
    host: "Grok",
    cmd: "+ → Add connector → Custom → paste the MCP URL",
    note: "OAuth prompt appears when the connector connects.",
  },
];

const COMMANDS: [string, string][] = [
  ["coral init", "spawn a reef, write .env"],
  ["coral connect --all", "register the MCP in every detected agent host"],
  ["coral status", "polyps, generation, limits, connectivity"],
  ["coral status --skills", "what CORAL can do, and how strong each skill is right now"],
  ["coral scan NVDA", "observe, reason, gate — place nothing"],
  ["coral trade NVDA --budget 200", "one full gated pass"],
  ["coral evolve", "advance a generation"],
  ["coral history", "ledger + generation log"],
  ["coral reef 'NVDA oversold'", "recall with --why for the scoring breakdown"],
  ["coral serve", "run CORAL as an MCP server on stdio"],
  ["coral agents", "which hosts are detected on this machine"],
];

export default function InstallPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="relative overflow-hidden border-b border-shelf/40">
          <div className="glow-coral pointer-events-none absolute inset-x-0 -top-32 h-[420px] opacity-50" />
          <div className="relative mx-auto w-full max-w-5xl px-6 py-20">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-coral">installation</p>
            <h1 className="mt-5 text-balance font-display text-[3rem] leading-[1.05] sm:text-[3.6rem]">
              Four commands to a living reef.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-[1rem] leading-relaxed text-mist">
              The first run needs nothing but Node 22 and pnpm. No brokerage account, no API key, no card. CORAL starts
              in paper mode and stays there until you change one variable — twice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 font-mono text-[0.72rem]">
              {["Node ≥ 22", "pnpm 10", "SQLite (bundled)", "Windows · macOS · Linux"].map((t) => (
                <span key={t} className="rounded-full border border-shelf px-3 py-1 text-silt">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <div className="space-y-14">
            {STEPS.map((s) => (
              <div key={s.n} className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <span className="font-mono text-[0.7rem] text-coral">{s.n}</span>
                  <h2 className="mt-3 font-display text-2xl text-foam">{s.title}</h2>
                  <p className="mt-3 text-pretty text-[0.88rem] leading-relaxed text-mist">{s.body}</p>
                </div>
                <div className="overflow-hidden rounded-lg border border-shelf/80 bg-deep">
                  <div className="border-b border-shelf/60 px-4 py-2 font-mono text-[0.66rem] text-silt">shell</div>
                  <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.76rem] leading-relaxed text-mist">
                    <code>{s.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-shelf/40 bg-deep/40">
          <div className="mx-auto w-full max-w-5xl px-6 py-20">
            <h2 className="font-display text-[2rem] leading-tight">Wire it into your agent</h2>
            <p className="mt-4 max-w-2xl text-pretty text-[0.9rem] leading-relaxed text-mist">
              Two directions, both real. CORAL calls the Robinhood Trading MCP for market data and orders, and it
              exposes itself as an MCP server so your agent can ask it things. Run{" "}
              <code className="rounded bg-shelf/60 px-1.5 py-0.5 font-mono text-[0.8em] text-coral">coral connect --all</code>{" "}
              to write every config on this machine — each original is backed up first.
            </p>

            <div className="mt-10 overflow-hidden rounded-xl border border-shelf/60">
              <table className="w-full text-left text-[0.84rem]">
                <thead className="bg-deep/80 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-silt">
                  <tr>
                    <th className="px-5 py-3 font-normal">host</th>
                    <th className="px-5 py-3 font-normal">how</th>
                    <th className="hidden px-5 py-3 font-normal sm:table-cell">after</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-shelf/40">
                  {HOST_CMDS.map((h) => (
                    <tr key={h.host} className="align-top">
                      <td className="whitespace-nowrap px-5 py-4 font-display text-[1.02rem] text-foam">{h.host}</td>
                      <td className="px-5 py-4 font-mono text-[0.74rem] text-mist">{h.cmd}</td>
                      <td className="hidden px-5 py-4 text-[0.78rem] text-silt sm:table-cell">{h.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 overflow-hidden rounded-lg border border-shelf/80 bg-deep">
              <div className="border-b border-shelf/60 px-4 py-2 font-mono text-[0.66rem] text-silt">
                CORAL as a server
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono text-[0.76rem] leading-relaxed text-mist">
                <code>{`# Claude Code
claude mcp add coral -- pnpm --filter @coral/cli exec tsx src/index.ts serve

# any host that takes a command
{ "command": "npx", "args": ["-y", "@coral/cli", "serve"] }

# then, from the agent:
> coral_status          reef health
> coral_scan            decisions without orders
> coral_trade           gated pass (dry run unless confirm:true)
> coral_ask             route a natural-language request to a skill`}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="font-display text-[2rem] leading-tight">The whole CLI</h2>
          <p className="mt-4 text-[0.9rem] text-mist">Eleven surfaces, no hidden modes.</p>
          <div className="mt-8 overflow-hidden rounded-xl border border-shelf/60">
            <table className="w-full text-left text-[0.84rem]">
              <tbody className="divide-y divide-shelf/40">
                {COMMANDS.map(([cmd, desc]) => (
                  <tr key={cmd}>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-[0.76rem] text-coral">{cmd}</td>
                    <td className="px-5 py-3 text-mist">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12 rounded-xl border border-amber/25 bg-amber/[0.04] p-6">
            <h3 className="font-display text-lg text-amber">Before you go live</h3>
            <p className="mt-3 text-pretty text-[0.86rem] leading-relaxed text-mist">
              Live trading needs an Agentic account at Robinhood, a token for the hosted MCP, and two separate
              switches: <code className="rounded bg-shelf/60 px-1.5 py-0.5 font-mono text-[0.8em] text-foam">CORAL_MODE=live</code>{" "}
              in the environment <em className="not-italic text-foam">and</em>{" "}
              <code className="rounded bg-shelf/60 px-1.5 py-0.5 font-mono text-[0.8em] text-foam">limits.allowLive</code>{" "}
              set in code. One of them alone does nothing. That is deliberate.
            </p>
            <Link href="/safety" className="mt-4 inline-flex items-center gap-2 text-[0.84rem] text-amber hover:text-foam">
              Read the full safety model
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
