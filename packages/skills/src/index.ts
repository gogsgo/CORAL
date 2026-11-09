/**
 * @coral/skills — everything CORAL can actually do, plus where data comes from.
 */
export { observationFromBars, momentum, rsi, sma, volatility } from "./indicators.js";
export type { Bar } from "./indicators.js";

export { RobinhoodMcp, normaliseBars, quotePrice } from "./robinhood-mcp.js";
export type { McpToolInfo, RobinhoodMcpOptions } from "./robinhood-mcp.js";

export { RobinhoodChain, decodeString, formatUnits } from "./robinhood-chain.js";
export type { ChainInfo } from "./robinhood-chain.js";

export { RobinhoodMcpSource, SyntheticSource, createSource } from "./market-data.js";
export type { SourceOptions } from "./market-data.js";
export type { MarketDataSource } from "@coral/core";

export { robinhoodMcpSkills } from "./robinhood-mcp.skills.js";
export { robinhoodChainSkills } from "./robinhood-chain.skills.js";
export { researchSkills } from "./research.skills.js";
export type { TechnicalRead } from "./research.skills.js";

import type { Skill } from "@coral/core";
import { robinhoodMcpSkills } from "./robinhood-mcp.skills.js";
import { robinhoodChainSkills } from "./robinhood-chain.skills.js";
import { researchSkills } from "./research.skills.js";
import type { RobinhoodMcp } from "./robinhood-mcp.js";
import type { RobinhoodChain } from "./robinhood-chain.js";

export interface AllSkillDeps {
  mcp: () => RobinhoodMcp;
  chain: RobinhoodChain;
}

/** The full skill library, wired once at boot. */
export function allSkills(deps: AllSkillDeps): Skill[] {
  return [
    ...robinhoodMcpSkills({ mcp: deps.mcp }),
    ...robinhoodChainSkills({ chain: deps.chain }),
    ...researchSkills({ mcp: deps.mcp }),
  ];
}
