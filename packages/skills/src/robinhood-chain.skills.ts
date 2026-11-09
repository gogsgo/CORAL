/**
 * Robinhood Chain skills — on-chain reads on the L2 (chainId 4663).
 *
 * Read-only by design. CORAL observes chain state; it does not sign. Settlement
 * on Robinhood Chain is a separate, deliberate step, not something a trading
 * loop should be able to trigger by accident.
 */
import type { Skill } from "@coral/core";
import { formatUnits, type RobinhoodChain } from "./robinhood-chain.js";

export interface ChainSkillDeps {
  chain: RobinhoodChain;
}

export function robinhoodChainSkills(deps: ChainSkillDeps): Skill[] {
  const health: Skill = {
    name: "chain.health",
    description: "Robinhood Chain liveness: chainId, head block, measured block rate.",
    triggers: ["chain health", "chain status", "is the chain up", "block number", "chain id"],
    tags: ["chain", "diagnostics"],
    run: async () => deps.chain.info(),
  };

  const balance: Skill = {
    name: "chain.balance",
    description: "Native ETH balance for an address on Robinhood Chain.",
    triggers: ["wallet balance", "eth balance", "how much eth", "address balance"],
    tags: ["chain"],
    run: async (ctx) => {
      const address = String(ctx.address ?? "");
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("chain.balance needs a valid ctx.address");
      const wei = await deps.chain.balanceOf(address);
      return { address, wei: wei.toString(), eth: formatUnits(wei, 18) };
    },
  };

  const token: Skill = {
    name: "chain.token",
    description: "ERC-20 metadata and balance (symbol, decimals, holder balance) on Robinhood Chain.",
    triggers: ["token balance", "erc20", "token info", "how many tokens"],
    tags: ["chain"],
    run: async (ctx) => {
      const tokenAddress = String(ctx.token ?? "");
      if (!/^0x[0-9a-fA-F]{40}$/.test(tokenAddress)) throw new Error("chain.token needs a valid ctx.token address");
      const [symbol, decimals] = await Promise.all([
        deps.chain.tokenSymbol(tokenAddress).catch(() => "UNKNOWN"),
        deps.chain.tokenDecimals(tokenAddress).catch(() => 18),
      ]);
      const holder = typeof ctx.address === "string" ? ctx.address : null;
      const raw = holder ? await deps.chain.tokenBalance(tokenAddress, holder) : null;
      return {
        token: tokenAddress,
        symbol,
        decimals,
        balance: raw === null ? null : formatUnits(raw, decimals),
      };
    },
  };

  const activity: Skill = {
    name: "chain.activity",
    description: "Count logs emitted by a contract over the last N blocks — a cheap liveness/usage signal.",
    triggers: ["contract activity", "onchain activity", "how busy", "logs", "events"],
    tags: ["chain"],
    run: async (ctx) => {
      const address = typeof ctx.address === "string" ? ctx.address : undefined;
      const window = Number(ctx.blocks ?? 5_000);
      const head = await deps.chain.blockNumber();
      const count = await deps.chain.logs({
        ...(address ? { address } : {}),
        fromBlock: Math.max(0, head - window),
        toBlock: head,
      });
      return { address: address ?? null, fromBlock: head - window, toBlock: head, events: count };
    },
  };

  return [health, balance, token, activity];
}
