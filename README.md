<div align="center">

```
   ██████╗ ██████╗ ██████╗  █████╗ ██╗
  ██╔════╝██╔═══██╗██╔══██╗██╔══██╗██║
  ██║     ██║   ██║██████╔╝███████║██║
  ██║     ██║   ██║██╔══██╗██╔══██║██║
  ╚██████╗╚██████╔╝██║  ██║██║  ██║███████╗
   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
```

**Cultivating On-chain Reasoning & Adaptive Learning**

*Growing intelligence, one decision at a time.*

A self-evolving trading agent that grows a reef of memory from every decision it makes.

[Quick start](#quick-start) · [How it works](#how-it-works) · [CLI](#the-cli) · [Safety](#safety-model) · [Agent hosts](#agent-hosts)

</div>

---

## The one-paragraph version

CORAL connects to the **Robinhood Trading MCP** and **Robinhood Chain**, makes a trading decision, and then *keeps the
evidence*. Every decision calcifies into a **polyp** — one immutable row holding the observation that produced it, the
thesis, the confidence, and later the outcome. Before each new decision, CORAL **recalls** the polyps that resemble the
current setup, so a pattern that lost money twice loses its voice. The accumulated colony *is* the strategy. There is no
prompt to rewrite every morning, and nothing learned is thrown away when a process exits.

It runs in **paper mode by default**, needs **no API key to start**, and refuses to touch real money until you flip two
separate switches.

```
$ coral trade NVDA,AAPL --budget 200

  ▸ observe · reading 2 symbol(s) from robinhood-mcp
  ▸ recall  · pulling polyps that match today's setup
  ▸ reason  · thinking with claude-sonnet-4-5
  ▸ gate    · hard limits, non-negotiable
  ▸ settle  · settling decisions the market has now judged

    fill buy NVDA $100.00 @ $182.44
    polyps grown 2 · deployed $100.00 / $2500
```

---

## Why this exists

Every agent forgets. A session ends, the reasoning evaporates, and tomorrow the same agent re-derives the same thesis
with the same confidence. You pay for the same inference twice and call it a strategy.

The usual fix — a five-page system prompt — is not memory. It is instructions, and instructions don't know that NVDA
gapped on you twice in March.

CORAL is a response to that specific failure. The memory is a database, the recall is scored, the outcomes are recorded,
and the risk limits are code rather than prose. What accumulates is not context — it is evidence.

---

## How it works

A single pass is a LangGraph state graph. Six stages, one thread id, typed events throughout.

| Stage | What actually happens |
|---|---|
| **observe** | Quotes and daily bars from the Robinhood MCP. No token → a deterministic synthetic series, clearly labelled `source: "synthetic"` all the way into the polyp. |
| **recall** | Polyps scored by `0.50·text + 0.22·recency + 0.18·outcome + 0.10·sameSymbol + 0.05·tags`. Losses weighted as loudly as wins. |
| **reason** | A model (one structured call per basket), or a deterministic heuristic when no key is set. Either way the output is Zod-validated and symbol-restricted. |
| **gate** | The risk manager. Deterministic, exhaustive, and unarguable. Every rejection carries a reason string. |
| **settle** | Polyps older than an hour get judged by realized price movement. A decision cannot be graded the instant it is made. |
| **calcify** | Every decision becomes a polyp — including refused ones, tagged `gated` with the reason frozen in `artifacts`. |

### A polyp

```jsonc
{
  "kind": "trade",
  "agent": "coral",
  "symbol": "NVDA",
  "action": "buy",
  "confidence": 0.68,
  "thesis": "BUY · rsi 31 · mom 4.3% · 24h 1.1% · 6 polyps recalled",
  "tags": ["mean-reversion", "oversold", "sanctioned"],
  "outcome": "pending",          // filled in by `settle`, never at write time
  "pnl": 0,
  "artifacts": {                 // frozen evidence, never re-derived
    "observation": { "price": 182.44, "rsi14": 31.2, "source": "robinhood-mcp" },
    "recalled": ["9f2a…", "41bc…"],
    "gate": { "allowed": true, "notional": 100 },
    "execution": { "status": "filled", "qty": 0.5482 }
  }
}
```

Polyps are append-only in spirit: a decision is never rewritten to look sharper in hindsight. Only `outcome` and `pnl`
are filled in later. That distinction is the whole reason the reef is worth something.

### Zones and generations

Tags group into **zones**. `coral evolve` computes a Laplace-smoothed win rate per zone — `(wins+1)/(decided+2)`, so
three lucky wins don't read as a 100% edge — and reweights:

- **≥ 0.60** → promoted, gains routing weight
- **< 0.42** → demoted, still routes but loses ties
- **5 losses, 0 wins** → retired

Every generation is written to the database with its promoted/demoted/retired lists, so the drift is auditable. Evolution
is deliberately **not** self-modifying: no prompt rewrites the prompt, no generated code is promoted to production. A
trading agent that can edit its own rules is a liability, not an achievement.

---

## Quick start

Requires **Node ≥ 22** and **pnpm 10**. No API key, no brokerage account, no card.

```bash
git clone https://github.com/gogsgo/EOTH.git coral
cd coral
pnpm install
pnpm coral init
```

Spawn a reef and take it for a walk:

```bash
pnpm coral scan NVDA,AAPL,SPY            # observe + reason + gate — places nothing
pnpm coral trade NVDA --budget 200       # one full gated paper pass
pnpm coral reef "NVDA oversold" --why    # see what it remembered, and why it matched
pnpm coral status --skills               # reef health + live skill strength
pnpm coral evolve                        # advance a generation
```

Add a brain whenever you want — CORAL falls back to the heuristic if the call fails, so a dead key never stops the reef:

```bash
# .env
CORAL_LLM=anthropic            # or openai | google | xai
CORAL_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-...
```

Run the dashboard (reads the same SQLite file, no API):

```bash
pnpm web        # http://localhost:3000
```

The web app deploys on its own; see [DEPLOY.md](./DEPLOY.md) for Railway.

---

## The CLI

| Command | What it does |
|---|---|
| `coral init` | Spawn a reef, write `.env` |
| `coral connect [host\|--all]` | Register the MCP server in every detected agent host |
| `coral status [--skills] [--json]` | Polyps, generation, limits, connectivity |
| `coral scan [symbols]` | Observe, reason, gate — no orders |
| `coral trade [symbols] --budget 200` | One full gated pass |
| `coral evolve [--dry-run]` | Advance a generation |
| `coral history` | Ledger + generation log |
| `coral reef [query] [--why]` | Recall polyps, with scoring breakdown |
| `coral serve` | Run CORAL as an MCP server on stdio |
| `coral agents` | Which hosts are detected on this machine |

All commands accept `--json` where it makes sense. Global `--mode paper|live` overrides the environment.

---

## Agent hosts

CORAL speaks MCP in both directions.

**Direction 1 — CORAL calls Robinhood.** `coral connect --all` writes the hosted MCP entry into every agent config it
finds, backing up each original first. Each host has its own shape, handled in one table:

| Host | Config | Shape |
|---|---|---|
| Claude Code | `~/.claude.json` | `mcpServers → {type, url}` |
| Claude Desktop | `claude_desktop_config.json` | `mcpServers → {type, url}` |
| Codex | `~/.codex/config.json` | `mcpServers → {type, url}` |
| Cursor | `~/.cursor/mcp.json` | `mcpServers → {type: "http", url}` |
| Gemini CLI | `~/.gemini/settings.json` | `mcpServers → {httpUrl}` |
| Grok | `~/.grok/mcp.json` | `mcpServers → {type, url}` |

```bash
coral connect --all                 # every detected host
coral connect gemini --dry-run      # print what would be written, touch nothing
coral connect cursor --token $TOK   # pre-authorize with a bearer token
```

Or let each host do it natively:

```bash
claude mcp add robinhood-trading --transport http https://agent.robinhood.com/mcp/trading
codex  mcp add robinhood-trading --url https://agent.robinhood.com/mcp/trading
gemini mcp add robinhood-trading https://agent.robinhood.com/mcp/trading -t http -s user
```

**Direction 2 — your agent calls CORAL.** `coral serve` exposes nine tools on stdio:

| Tool | Purpose |
|---|---|
| `coral_status` | Reef health: polyps, win rate, generation, zones |
| `coral_scan` | Decisions without orders |
| `coral_trade` | Full gated pass — **dry run unless `confirm: true`** |
| `coral_reef` | Recent polyps, or recall against a symbol |
| `coral_history` | Ledger |
| `coral_evolve` | Advance a generation |
| `coral_chain` | Robinhood Chain health (chainId 4663) |
| `coral_ask` | Natural language → routed skill, with diagnostics |

```bash
claude mcp add coral -- pnpm --filter @coral/cli exec tsx src/index.ts serve
```

`coral_trade` is the only write tool, it defaults to a dry run, and it always runs the risk manager. An MCP client cannot
place an unsanctioned order through this surface.

---

## Safety model

The model is allowed to be optimistic. The gate is not.

Every limit lives in `packages/core/src/safety/risk-manager.ts` as a Zod-validated object, and runs *after* the model
has spoken and *before* anything touches a venue.

| Limit | Default | Enforced as |
|---|---|---|
| `maxOrderUsd` | `250` | Single-order ceiling; larger requests scaled down, not rejected |
| `maxDeployedUsd` | `2,500` | Total open cost basis; full book opens nothing |
| `maxPositionPct` | `0.25` | Per-symbol cap vs `maxDeployedUsd` — a fixed ceiling, not a moving ratio |
| `minConfidence` | `0.55` | Below this, a buy is refused regardless of thesis |
| `maxConsecutiveLosses` | `4` | Circuit breaker on settled losses |
| `maxDailyLossUsd` | `150` | Daily realized-loss cap |
| `symbolBlocklist` | `[]` | Never traded, whatever the setup |
| `allowLive` | `false` | Second live switch — see below |

**Going live takes three deliberate acts:**

1. `CORAL_MODE=live` in the environment
2. `limits.allowLive === true` — a source edit, on purpose
3. `coral trade … --yes` at the CLI

One of them alone places nothing.

Non-negotiables, enforced in code:

- Paper mode is the default in code, not in documentation.
- Fees are charged on every paper fill. Optimistic accounting is a lie with a compounding interest rate.
- A refused decision still becomes a polyp, tagged `gated`, with the reason frozen.
- A polyp cannot be settled in the same hour it was made.
- No prompt text is ever treated as a safety control.

**What CORAL cannot do, by construction:** sign or submit on-chain transactions (the chain client is read-only), move
funds or touch non-Agentic accounts, trade short / on margin / with leverage, or rewrite its own limits.

> CORAL is not investment advice and it is not a money machine. Automated trading can lose money faster than manual
> trading because it is faster. You are responsible for every order an agent places on your account, including the ones
> you did not watch.

---

## Architecture

```
coral/
├── packages/
│   ├── core/                  the reef's biology
│   │   ├── config.ts          env → typed config, every value defaulted
│   │   ├── memory/
│   │   │   ├── types.ts       polyp, zone, ledger, decision schemas (Zod)
│   │   │   ├── similarity.ts  token overlap, recency decay, outcome weight
│   │   │   └── coral-memory.ts SQLite: polyps, ledger, evolutions, zones
│   │   ├── safety/
│   │   │   └── risk-manager.ts hard limits — the only thing that says no
│   │   ├── skills/
│   │   │   └── router.ts      trigger scoring, zone-weighted
│   │   └── agent/
│   │       ├── engine.ts      LangGraph: observe→recall→reason→gate→settle→calcify
│   │       ├── brain.ts       provider selection, degrades to null
│   │       └── evolution.ts   zone reweighting, generation records
│   ├── skills/                what CORAL can actually do
│   │   ├── robinhood-mcp.ts   hosted MCP client; discovers tools, never hard-codes them
│   │   ├── robinhood-chain.ts JSON-RPC reads on the L2 (chainId 4663)
│   │   ├── market-data.ts     real source, or a seeded synthetic tape
│   │   ├── indicators.ts      RSI, SMA, momentum, volatility — pure functions
│   │   └── *.skills.ts        router-visible capabilities
│   ├── mcp-connectors/        six host adapters + CORAL's own MCP server
│   └── cli/                   eleven commands, one runtime
├── apps/
│   └── web/                   Next.js 15 landing + docs + live reef dashboard
├── prompts/
│   └── system-prompt.md       the canonical reasoning prompt + tuning notes
└── turbo.json
```

**Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), pnpm workspace + Turborepo, official MCP SDK, Vercel AI SDK +
LangGraph, SQLite via `better-sqlite3`, Commander.js, Next.js 15 App Router + Tailwind v4, Zod, date-fns.

### Design decisions worth defending

**The dashboard does not import `@coral/core`.** It reads the same file with Node's built-in `node:sqlite` in read-only
mode. A native module dragged through a bundler resolves its binding relative to `.next/` and breaks at runtime — and a
marketing page should never be able to fail because a native binary is missing.

**The MCP client discovers tools, it does not assume them.** Robinhood ships new tools without notice. `RobinhoodMcp`
calls `listTools()` once, then resolves each capability (quote, bars, account, review, place) by scoring the live list.
A hard-coded tool name is a scheduled breakage.

**The heuristic is not a mock.** With no key, `scan` and `trade` run the full pipeline against a deterministic strategy —
mean reversion, trend continuation, reef bias, overbought penalty, scar penalty. Same gates, same polyps, same
settlement. It exists so the first run needs no signup, not so the demo looks nice.

**Settlement has a minimum age.** Without one, every polyp settles as a meaningless `0.00` "win" in the pass that created
it, and the win rate becomes fiction. An hour is arbitrary, honest, and enforced.

---

## Verification

```bash
pnpm typecheck                    # all five packages, strict
pnpm --filter @coral/core check   # 20 assertions, no framework
pnpm --filter @coral/web build    # Next.js production build
```

The check suite covers the logic that would quietly lie if it broke: similarity ranking, recency decay, risk gating
(confidence floor, hold exemption, scaling, circuit breaker, blocklist, live lock, fee accounting), router selection and
refusal, heuristic behaviour including the scar penalty, evolution thresholds, an end-to-end engine pass with settlement,
and the per-run order cap.

---

## Roadmap

- [ ] `sqlite-vec` recall for theses beyond token overlap
- [ ] Robinhood Chain settlement — a deliberate signing path, not a trading-loop side effect
- [ ] Cohort runs: several reefs with different limit sets, compared on a shared ledger
- [ ] `coral replay <polyp-id>` — re-run reasoning against a frozen artifact set
- [ ] Publishing `@coral/cli` so `npx` replaces the clone step

---

## Licence

MIT. See [LICENSE](./LICENSE).

Not affiliated with Robinhood Markets.

<div align="center">
<br />
<sub><em>Growing intelligence, one decision at a time.</em></sub>
</div>
