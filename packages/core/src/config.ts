/**
 * Runtime configuration for CORAL.
 *
 * Every value has a working default: a fresh clone with no .env still boots,
 * still reasons, and still grows polyps. Missing API keys degrade the brain
 * (heuristic reasoning instead of an LLM) — they never crash the reef.
 */
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

export type Mode = "paper" | "live";
export type LlmProvider = "anthropic" | "openai" | "google" | "xai" | "none";

export interface CoralConfig {
  /** Directory holding reef.db and any local artifacts. */
  home: string;
  /** Absolute path to the SQLite reef. */
  dbPath: string;
  mode: Mode;
  llm: LlmProvider;
  model: string;
  robinhood: {
    /** Robinhood Trading MCP (official, OAuth-hosted, streamable HTTP). */
    mcpUrl: string;
    /** Bearer token, only required for live reads and order placement. */
    mcpToken: string | null;
    /** Robinhood Chain RPC — an EVM L2, chainId 4663. */
    chainRpc: string;
    chainId: number;
  };
}

const DEFAULTS = {
  robinhoodMcp: "https://agent.robinhood.com/mcp/trading",
  chainRpc: "https://rpc.mainnet.chain.robinhood.com",
  chainId: 4663,
  model: {
    anthropic: "claude-sonnet-4-5",
    openai: "gpt-5.1",
    google: "gemini-2.5-pro",
    xai: "grok-4",
    none: "heuristic",
  } satisfies Record<LlmProvider, string>,
} as const;

/** Load .env from cwd if present. Node 22+ has this built in — no dotenv dep. */
export function loadEnv(cwd = process.cwd()): void {
  const file = join(cwd, ".env");
  if (!existsSync(file)) return;
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof loader === "function") loader.call(process, file);
}

function pickProvider(): LlmProvider {
  const declared = process.env.CORAL_LLM?.toLowerCase();
  if (declared === "none") return "none";
  if (declared === "anthropic" || declared === "openai" || declared === "google" || declared === "xai") {
    return declared;
  }
  // No declaration: infer from whichever key is present.
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return "google";
  if (process.env.XAI_API_KEY) return "xai";
  return "none";
}

export function resolveConfig(overrides: Partial<CoralConfig> = {}): CoralConfig {
  const home = resolve(overrides.home ?? process.env.CORAL_HOME ?? join(process.cwd(), ".coral"));
  const llm = overrides.llm ?? pickProvider();
  return {
    home,
    dbPath: overrides.dbPath ?? join(home, "reef.db"),
    mode: overrides.mode ?? (process.env.CORAL_MODE === "live" ? "live" : "paper"),
    llm,
    model: overrides.model ?? process.env.CORAL_MODEL ?? DEFAULTS.model[llm],
    robinhood: {
      mcpUrl: overrides.robinhood?.mcpUrl ?? process.env.ROBINHOOD_MCP_URL ?? DEFAULTS.robinhoodMcp,
      mcpToken: overrides.robinhood?.mcpToken ?? process.env.ROBINHOOD_MCP_TOKEN ?? null,
      chainRpc: overrides.robinhood?.chainRpc ?? process.env.ROBINHOOD_CHAIN_RPC ?? DEFAULTS.chainRpc,
      chainId: overrides.robinhood?.chainId ?? DEFAULTS.chainId,
    },
  };
}
