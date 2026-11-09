/**
 * Robinhood Chain client — raw JSON-RPC over fetch.
 *
 * Robinhood Chain is an Arbitrum-Orbit L2 (chainId 4663, ETH gas). CORAL only
 * needs four things from it, so it speaks JSON-RPC directly rather than pulling
 * a full EVM SDK: chain health, native balance, ERC-20 reads, and logs.
 *
 * ponytail: no viem/ethers. Add one when signing transactions is on the table;
 * reads never need it.
 */

export interface ChainInfo {
  chainId: number;
  blockNumber: number;
  /** Blocks per second, measured over a short window. */
  bps: number | null;
  rpc: string;
  ok: boolean;
}

export class RobinhoodChain {
  constructor(
    private readonly rpcUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async rpc<T>(method: string, params: unknown[] = []): Promise<T> {
    const res = await this.fetchImpl(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`${method}: HTTP ${res.status} from ${this.rpcUrl}`);
    const body = (await res.json()) as { result?: T; error?: { message: string; code: number } };
    if (body.error) throw new Error(`${method}: ${body.error.message} (${body.error.code})`);
    if (body.result === undefined) throw new Error(`${method}: empty result`);
    return body.result;
  }

  async chainId(): Promise<number> {
    return Number(await this.rpc<string>("eth_chainId"));
  }

  async blockNumber(): Promise<number> {
    return Number(await this.rpc<string>("eth_blockNumber"));
  }

  /** Health probe with a measured block rate. Never throws. */
  async info(): Promise<ChainInfo> {
    try {
      const [chainIdHex, firstHex] = await Promise.all([
        this.rpc<string>("eth_chainId"),
        this.rpc<string>("eth_blockNumber"),
      ]);
      await new Promise((r) => setTimeout(r, 2_000));
      const secondHex = await this.rpc<string>("eth_blockNumber");
      const first = Number(firstHex);
      const second = Number(secondHex);
      return {
        chainId: Number(chainIdHex),
        blockNumber: second,
        bps: second > first ? (second - first) / 2 : null,
        rpc: this.rpcUrl,
        ok: true,
      };
    } catch {
      return { chainId: 0, blockNumber: 0, bps: null, rpc: this.rpcUrl, ok: false };
    }
  }

  async balanceOf(address: string): Promise<bigint> {
    const hex = await this.rpc<string>("eth_getBalance", [address, "latest"]);
    return BigInt(hex);
  }

  // ── ERC-20 reads ────────────────────────────────────────────────────────
  private static readonly SEL = {
    symbol: "0x95d89b41",
    decimals: "0x313ce567",
    balanceOf: "0x70a08231",
  } as const;

  private async call(to: string, data: string): Promise<string> {
    return this.rpc<string>("eth_call", [{ to, data }, "latest"]);
  }

  async tokenSymbol(token: string): Promise<string> {
    const raw = await this.call(token, RobinhoodChain.SEL.symbol);
    return decodeString(raw);
  }

  async tokenDecimals(token: string): Promise<number> {
    const raw = await this.call(token, RobinhoodChain.SEL.decimals);
    return Number(BigInt(raw));
  }

  async tokenBalance(token: string, holder: string): Promise<bigint> {
    const padded = holder.toLowerCase().replace(/^0x/, "").padStart(64, "0");
    const raw = await this.call(token, `${RobinhoodChain.SEL.balanceOf}${padded}`);
    return BigInt(raw);
  }

  async logs(filter: { address?: string; fromBlock?: number; toBlock?: number; topic0?: string }): Promise<number> {
    const params: Record<string, unknown> = {
      fromBlock: `0x${(filter.fromBlock ?? 0).toString(16)}`,
      toBlock: `0x${(filter.toBlock ?? (await this.blockNumber())).toString(16)}`,
    };
    if (filter.address) params.address = filter.address;
    if (filter.topic0) params.topics = [filter.topic0];
    const result = await this.rpc<unknown[]>("eth_getLogs", [params]);
    return result.length;
  }
}

/** ABI-decode a string return value (offset + length + utf8 bytes). */
export function decodeString(hex: string): string {
  const clean = hex.replace(/^0x/, "");
  if (clean.length < 128) return hex;
  const lenHex = clean.slice(64, 128);
  const length = Number.parseInt(lenHex, 16);
  if (!Number.isFinite(length) || length === 0) return "";
  const data = clean.slice(128, 128 + length * 2);
  try {
    return Buffer.from(data, "hex").toString("utf8").replace(/\0+$/, "");
  } catch {
    return hex;
  }
}

/** Format a raw token amount with its decimals, without float drift. */
export function formatUnits(value: bigint, decimals: number, precision = 4): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, precision).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}
