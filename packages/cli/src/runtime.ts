/**
 * Boot: resolve config, open the reef, wire skills, build the engine.
 * One factory so every command sees exactly the same object graph.
 */
import {
  CoralEngine,
  CoralMemory,
  RiskManager,
  SkillRouter,
  type CoralConfig,
  resolveConfig,
} from "@coral/core";
import { RobinhoodChain, RobinhoodMcp, allSkills, createSource, type MarketDataSource } from "@coral/skills";

export interface Runtime {
  config: CoralConfig;
  memory: CoralMemory;
  router: SkillRouter;
  risk: RiskManager;
  engine: CoralEngine;
  source: MarketDataSource;
  mcp: RobinhoodMcp;
  chain: RobinhoodChain;
  close: () => void;
}

export function boot(overrides: Partial<CoralConfig> = {}): Runtime {
  const config = resolveConfig(overrides);
  const memory = new CoralMemory(config.dbPath);
  const chain = new RobinhoodChain(config.robinhood.chainRpc);
  const mcp = new RobinhoodMcp({ url: config.robinhood.mcpUrl, token: config.robinhood.mcpToken });
  const router = new SkillRouter().register(...allSkills({ mcp: () => mcp, chain }));
  router.syncZones(memory.zones());

  const risk = new RiskManager(RiskManager.forMode(config.mode));
  const engine = new CoralEngine({ config, memory, router, risk });
  const source = createSource({ mcpUrl: config.robinhood.mcpUrl, mcpToken: config.robinhood.mcpToken });

  return {
    config,
    memory,
    router,
    risk,
    engine,
    source,
    mcp,
    chain,
    close: () => {
      memory.close();
    },
  };
}

/** Parse "AAPL,NVDA" or ["AAPL","NVDA"] into a clean, upper-cased list. */
export function parseSymbols(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : input.split(",");
  return [...new Set(list.map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z0-9.\-]{1,10}$/.test(s)))];
}
