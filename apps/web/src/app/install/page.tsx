import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "@/components/chrome";
import { DiagonalArrow, MonogramSeal } from "@/components/engraving";

export const metadata: Metadata = {
  title: "Installation",
  description: "Install CORAL in four commands. Paper mode by default, no API key required for the first run.",
};

const STEPS = [
  {
    n: "01",
    title: "Clone and install",
    body: "pnpm workspace, Turborepo. Node 22 or newer, because the engine uses the built-in env loader and AbortSignal.timeout.",
    code: `git clone https://github.com/gogsgo/EOTH.git coral
cd coral
pnpm install`,
  },
  {
    n: "02",
    title: "Spawn the reef",
    body: "Writes .coral/reef.db and a .env template in the directory you ran it from. Nothing is created outside it.",
    code: `pnpm coral init
# reef spawned at .coral/reef.db
# generation 1 · 0 polyps`,
  },
  {
    n: "03",
    title: "Take a pass, no key needed",
    body: "Without a model key CORAL uses a deterministic heuristic reasoner. Same pipeline, same risk gate, same polyps. It is a real strategy, not a mock.",
    code: `pnpm coral trade NVDA,AAPL --budget 200

# observe · reading 2 symbol(s) from synthetic
# recall  · pulling polyps that match today's setup
# reason  · no model key, deterministic reasoning
# gate    · hard limits, non-negotiable
# fill buy NVDA $100.00 @ $182.44`,
  },
  {
    n: "04",
    title: "Give it a model",
    body: "Four providers. CORAL falls back to the heuristic if the call fails, so a dead key never stops the reef.",
    code: `# .env
CORAL_LLM=anthropic
CORAL_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-...

# or openai | google | xai`,
  },
];

const HOSTS = [
  {
    host: "Claude Code",
    how: "claude mcp add robinhood-trading --transport http https://agent.robinhood.com/mcp/trading",
    after: "Then run /mcp and authenticate.",
  },
  {
    host: "Codex CLI",
    how: "codex mcp add robinhood-trading --url https://agent.robinhood.com/mcp/trading",
    after: "Then /mcp to sign in.",
  },
  {
    host: "Cursor",
    how: "Settings → Cursor Settings → Tools & MCPs → Connect",
    after: "Paste the MCP URL. OAuth is handled by Cursor.",
  },
  {
    host: "Gemini CLI",
    how: "gemini mcp add robinhood-trading https://agent.robinhood.com/mcp/trading -t http -s user",
    after: "Server aliases must not contain underscores.",
  },
  {
    host: "Grok",
    how: "+ → Add connector → Custom → paste the MCP URL",
    after: "The OAuth prompt appears when the connector connects.",
  },
];

const COMMANDS: [string, string][] = [
  ["coral init", "spawn a reef, write .env"],
  ["coral connect --all", "register the MCP in every detected agent host"],
  ["coral status", "polyps, generation, limits, connectivity"],
  ["coral status --skills", "what CORAL can do, and how strong each skill is right now"],
  ["coral scan NVDA", "observe, reason, gate, place nothing"],
  ["coral trade NVDA --budget 200", "one full gated pass"],
  ["coral evolve", "advance a generation"],
  ["coral history", "ledger and generation log"],
  ["coral reef 'NVDA oversold'", "recall, with --why for the scoring breakdown"],
  ["coral serve", "run CORAL as an MCP server on stdio"],
  ["coral agents", "which hosts are detected on this machine"],
];

export default function InstallPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-rule">
          <div className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10 sm:py-20">
            <div className="flex items-center gap-4">
              <MonogramSeal variant="cobalt" className="h-9 w-9" />
              <p className="font-mono-code text-[10px] uppercase tracking-[0.18em] text-cobalt">Installation</p>
            </div>
            <h1 className="mt-6 max-w-[860px] font-serif-display text-[36px] font-normal uppercase leading-[0.94] tracking-[-0.015em] text-ink sm:text-[54px] md:text-[62px]">
              Four commands
              <br />
              to a living reef
            </h1>
            <p className="mt-6 max-w-[520px] font-serif-editorial text-[15px] italic leading-[1.4] text-ink/80">
              The first run needs nothing but Node and pnpm. No brokerage account, no API key, no card. CORAL starts
              in paper mode and stays there until you change one variable.
            </p>
            <div className="mt-8 flex flex-wrap gap-2 font-mono-code text-[10px] text-ink-soft">
              {["Node ≥ 22", "pnpm 10", "SQLite bundled", "Windows · macOS · Linux"].map((t) => (
                <span key={t} className="border border-rule px-3 py-1">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10">
          <div className="space-y-12">
            {STEPS.map((s) => (
              <div key={s.n} className="grid gap-8 border-t border-rule pt-10 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <span className="font-mono-code text-[10.5px] text-cobalt">{s.n}</span>
                  <h2 className="mt-3 font-serif-display text-[26px] font-normal uppercase leading-[1] tracking-[-0.01em] text-ink">
                    {s.title}
                  </h2>
                  <p className="mt-3 max-w-[360px] font-sans-clean text-[12px] font-medium leading-[1.4] text-ink sm:text-[12.5px]">
                    {s.body}
                  </p>
                </div>
                <div className="overflow-hidden border border-rule-cobalt bg-[#F8F9FE]">
                  <div className="border-b border-rule-cobalt px-4 py-2 font-mono-code text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                    shell
                  </div>
                  <pre className="overflow-x-auto px-4 py-4 font-mono-code text-[11.5px] leading-[1.7] text-ink">
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
              Wire it into your agent
            </h2>
            <p className="mt-5 max-w-[520px] font-sans-clean text-[11.5px] font-medium leading-[1.4] text-ink">
              coral connect --all writes every config on this machine and backs up each original first. Or let each
              host add it natively; the commands below are the ones their own docs give.
            </p>

            <div className="mt-8 overflow-x-auto border border-rule-cobalt bg-white">
              <table className="w-full text-left">
                <thead className="border-b border-rule-cobalt font-mono-code text-[9.5px] uppercase tracking-[0.12em] text-ink-soft">
                  <tr>
                    <th className="px-5 py-3 font-normal">host</th>
                    <th className="px-5 py-3 font-normal">how</th>
                    <th className="hidden px-5 py-3 font-normal sm:table-cell">after</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {HOSTS.map((h) => (
                    <tr key={h.host} className="align-top">
                      <td className="whitespace-nowrap px-5 py-4 font-serif-display text-[17px] uppercase text-ink">
                        {h.host}
                      </td>
                      <td className="px-5 py-4 font-mono-code text-[10.5px] leading-relaxed text-ink">{h.how}</td>
                      <td className="hidden px-5 py-4 font-sans-clean text-[11px] leading-relaxed text-ink-soft sm:table-cell">
                        {h.after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 overflow-hidden border border-rule-cobalt bg-white">
              <div className="border-b border-rule-cobalt px-4 py-2 font-mono-code text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
                CORAL as a server
              </div>
              <pre className="overflow-x-auto px-4 py-4 font-mono-code text-[11.5px] leading-[1.7] text-ink">
                <code>{`# Claude Code
claude mcp add coral -- pnpm --filter @coral/cli exec tsx src/index.ts serve

# any host that takes a command
{ "command": "npx", "args": ["-y", "tsx", "packages/cli/src/index.ts", "serve"] }

# then, from the agent:
> coral_status    reef health
> coral_scan      decisions without orders
> coral_trade     gated pass (dry run unless confirm:true)
> coral_ask       route a natural-language request to a skill`}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1220px] px-6 py-16 sm:px-10">
          <h2 className="font-serif-editorial text-[22px] font-normal tracking-[-0.01em] text-cobalt sm:text-[26px]">
            The whole CLI
          </h2>
          <p className="mt-4 font-sans-clean text-[11.5px] font-medium text-ink">
            Eleven surfaces, no hidden modes.
          </p>

          <div className="mt-6 border-t border-rule">
            {COMMANDS.map(([cmd, desc]) => (
              <div key={cmd} className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[auto_1fr] sm:gap-8">
                <code className="font-mono-code text-[11px] text-cobalt">{cmd}</code>
                <span className="font-sans-clean text-[11.5px] leading-relaxed text-ink/85">{desc}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 border border-cobalt bg-cobalt px-6 py-8 text-white">
            <h3 className="font-serif-display text-[24px] font-normal uppercase leading-[1] tracking-[-0.01em]">
              Before you go live
            </h3>
            <p className="mt-4 max-w-[620px] font-sans-clean text-[11.5px] font-medium leading-[1.5] text-white/90">
              Live trading needs an Agentic account at Robinhood, a token for the hosted MCP, and two separate
              switches: CORAL_MODE=live in the environment, and limits.allowLive set in code. One of them alone
              places nothing. That is deliberate.
            </p>
            <Link
              href="/safety"
              className="mt-6 inline-flex items-center gap-2 border border-white/50 px-6 py-2 font-sans-clean text-[10px] font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-cobalt"
            >
              Read the safety model
              <DiagonalArrow className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
