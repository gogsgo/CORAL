/**
 * Connecting CORAL to the agent hosts the user already runs.
 *
 * Every host speaks MCP but stores config differently: a JSON file here, a
 * `mcpServers` block there, `httpUrl` instead of `url` for one of them. Those
 * differences are facts about the hosts, so they live in one table instead of
 * being rediscovered in five code paths.
 *
 * Two directions, both supported:
 *   1. CORAL registers the Robinhood Trading MCP in your host  (`coral connect`)
 *   2. Your host registers CORAL's own MCP server               (`coral connect --self`)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export type HostId = "claude-code" | "claude-desktop" | "codex" | "cursor" | "gemini" | "grok";

export interface McpServerSpec {
  /** Remote streamable-HTTP endpoint. */
  url: string;
  /** Optional bearer token. */
  token?: string | null;
  headers?: Record<string, string>;
}

export interface HostAdapter {
  id: HostId;
  label: string;
  /** Absolute path to the config file this adapter writes. */
  configPath(): string;
  /** Shape version this host expects. */
  style: "mcpServers" | "servers" | "cursor";
  /** Does this host support streamable HTTP? (all do; kept explicit for clarity) */
  supportsHttp: boolean;
  /** Extra notes surfaced by `coral connect --dry-run`. */
  note?: string;
  /** Restart hint printed after a successful write. */
  restartHint?: string;
}

const home = homedir();

export const HOSTS: HostAdapter[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    configPath: () => join(home, ".claude.json"),
    style: "mcpServers",
    supportsHttp: true,
    note: "Claude Code also supports `claude mcp add --transport http <name> <url>`; this adapter writes ~/.claude.json directly so it works headless.",
    restartHint: "Restart the Claude Code session, then run /mcp to authenticate.",
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    configPath: () =>
      process.platform === "win32"
        ? join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "Claude", "claude_desktop_config.json")
        : process.platform === "darwin"
          ? join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
          : join(home, ".config", "Claude", "claude_desktop_config.json"),
    style: "mcpServers",
    supportsHttp: true,
    restartHint: "Quit Claude Desktop completely (tray icon too) and reopen it.",
  },
  {
    id: "codex",
    label: "Codex",
    configPath: () => join(home, ".codex", "config.json"),
    style: "mcpServers",
    supportsHttp: true,
    restartHint: "Restart Codex, then run /mcp to authenticate the server.",
  },
  {
    id: "cursor",
    label: "Cursor",
    configPath: () => join(home, ".cursor", "mcp.json"),
    style: "cursor",
    supportsHttp: true,
    note: "Cursor stores servers under `mcpServers` with an explicit `type: 'http'`.",
    restartHint: "Reload the Cursor window (Cmd/Ctrl+Shift+P → Developer: Reload Window).",
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    configPath: () => join(home, ".gemini", "settings.json"),
    style: "mcpServers",
    supportsHttp: true,
    note: "Gemini wants `httpUrl` for streamable HTTP, and server aliases must not contain underscores.",
    restartHint: "Restart the Gemini CLI session; /mcp lists the server.",
  },
  {
    id: "grok",
    label: "Grok",
    configPath: () => join(home, ".grok", "mcp.json"),
    style: "mcpServers",
    supportsHttp: true,
    note: "Grok adds remote connectors through the UI (+ → Add connector → Custom). This file mirrors that config so `coral connect` stays scriptable.",
    restartHint: "Reconnect the connector in Grok, or restart the session.",
  },
];

export function resolveHost(id: string): HostAdapter {
  const host = HOSTS.find((h) => h.id === id || h.label.toLowerCase().replace(/\s+/g, "-") === id);
  if (!host) {
    throw new Error(`unknown host "${id}". Known: ${HOSTS.map((h) => h.id).join(", ")}`);
  }
  return host;
}

/** Build the per-host entry object for one server. */
export function entryFor(host: HostAdapter, name: string, spec: McpServerSpec): Record<string, unknown> {
  const headers = { ...(spec.headers ?? {}) };
  if (spec.token) headers.Authorization = `Bearer ${spec.token}`;

  switch (host.id) {
    case "cursor":
      return { type: "http", url: spec.url, ...(Object.keys(headers).length ? { headers } : {}) };
    case "gemini":
      return { httpUrl: spec.url, ...(Object.keys(headers).length ? { headers } : {}) };
    case "grok":
      return { type: "http", url: spec.url, ...(Object.keys(headers).length ? { headers } : {}) };
    default:
      return { type: "http", url: spec.url, ...(Object.keys(headers).length ? { headers } : {}) };
  }
}

export interface ApplyResult {
  host: HostId;
  path: string;
  changed: boolean;
  /** Set when the file was left untouched because the entry already matched. */
  reason?: string;
  backup?: string;
  dryRun?: boolean;
  content?: unknown;
}

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`${path} is not valid JSON (${(err as Error).message}) — refusing to clobber it`);
  }
}

function writeJson(path: string, data: unknown, backupDir?: string): string | undefined {
  mkdirSync(dirname(path), { recursive: true });
  let backup: string | undefined;
  if (existsSync(path) && backupDir) {
    backup = join(backupDir, `${path.split(/[\\/]/).slice(-2).join("-")}.${Date.now()}.bak`);
    mkdirSync(backupDir, { recursive: true });
    copyFileSync(path, backup);
  }
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return backup;
}

/** Write one MCP server entry into a host's config. */
export function applyToHost(
  host: HostAdapter,
  name: string,
  spec: McpServerSpec,
  opts: { dryRun?: boolean; backupDir?: string } = {},
): ApplyResult {
  const path = host.configPath();
  const config = readJson(path);
  const entry = entryFor(host, name, spec);

  const key = host.style === "servers" ? "servers" : "mcpServers";
  const bucket = (config[key] as Record<string, unknown> | undefined) ?? {};
  const existing = bucket[name];

  if (existing && JSON.stringify(existing) === JSON.stringify(entry)) {
    return { host: host.id, path, changed: false, reason: "already configured identically" };
  }

  const next = { ...config, [key]: { ...bucket, [name]: entry } };

  if (opts.dryRun) {
    return { host: host.id, path, changed: true, dryRun: true, content: next };
  }

  const backup = writeJson(path, next, opts.backupDir);
  const result: ApplyResult = { host: host.id, path, changed: true };
  if (backup) result.backup = backup;
  return result;
}

/** Remove a server entry, leaving everything else intact. */
export function removeFromHost(host: HostAdapter, name: string): ApplyResult {
  const path = host.configPath();
  const config = readJson(path);
  const key = host.style === "servers" ? "servers" : "mcpServers";
  const bucket = (config[key] as Record<string, unknown> | undefined) ?? {};
  if (!(name in bucket)) return { host: host.id, path, changed: false, reason: "not present" };
  const copy = { ...bucket };
  delete copy[name];
  writeJson(path, { ...config, [key]: copy });
  return { host: host.id, path, changed: true };
}

/** Which hosts on this machine already have a given server configured. */
export function detect(servers: string[] = []): { host: HostAdapter; path: string; exists: boolean; has: string[] }[] {
  return HOSTS.map((host) => {
    const path = host.configPath();
    const exists = existsSync(path);
    let has: string[] = [];
    if (exists) {
      try {
        const config = readJson(path);
        const bucket = (config.mcpServers ?? config.servers ?? {}) as Record<string, unknown>;
        has = Object.keys(bucket).filter((k) => servers.length === 0 || servers.includes(k));
      } catch {
        has = [];
      }
    }
    return { host, path, exists, has };
  });
}
