/**
 * @coral/core — the reef's biology.
 *
 * Compose it yourself:
 *   const config = resolveConfig();
 *   const memory = new CoralMemory(config.dbPath);
 *   const risk   = new RiskManager(RiskManager.forMode(config.mode));
 *   const engine = new CoralEngine({ config, memory, router: new SkillRouter(), risk });
 */
export { resolveConfig, loadEnv } from "./config.js";
export type { CoralConfig, LlmProvider, Mode } from "./config.js";

export { CoralMemory } from "./memory/coral-memory.js";
export type { RecallOptions } from "./memory/coral-memory.js";
export * from "./memory/types.js";
export { blend, recency, textSimilarity, tokenize } from "./memory/similarity.js";

export { RiskManager, DEFAULT_LIMITS, RiskLimits } from "./safety/risk-manager.js";
export type { RiskState, RiskVerdict, TradeRequest } from "./safety/risk-manager.js";

export { SkillRouter } from "./skills/router.js";
export type { RouteResult, Skill, SkillContext } from "./skills/router.js";

export { CoralEngine, CORAL_SYSTEM_PROMPT, heuristicDecide } from "./agent/engine.js";
export type { CoralEvent, EngineDeps, MarketDataSource, RunOptions, RunReport } from "./agent/engine.js";
export { brain } from "./agent/brain.js";
export type { Brain } from "./agent/brain.js";
export { evolve } from "./agent/evolution.js";
export type { EvolveOptions, EvolveResult } from "./agent/evolution.js";
