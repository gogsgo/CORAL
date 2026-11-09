/**
 * @coral/mcp-connectors
 *
 *   import { HOSTS, applyToHost, resolveHost } from "@coral/mcp-connectors";
 *   applyToHost(resolveHost("claude-code"), "robinhood-trading", { url: MCP_URL });
 */
export {
  HOSTS,
  applyToHost,
  detect,
  entryFor,
  removeFromHost,
  resolveHost,
} from "./connectors.js";
export type { ApplyResult, HostAdapter, HostId, McpServerSpec } from "./connectors.js";
export { buildCoralServer, serveCoral } from "./server.js";
export type { ServeOptions } from "./server.js";

/** The canonical Robinhood endpoints, in one place so nothing drifts. */
export const ROBINHOOD = {
  tradingMcp: "https://agent.robinhood.com/mcp/trading",
  chainMainnet: "https://rpc.mainnet.chain.robinhood.com",
  chainTestnet: "https://rpc.testnet.chain.robinhood.com",
  chainId: 4663,
  chainIdTestnet: 46630,
  explorer: "https://robinhoodchain.blockscout.com",
} as const;
