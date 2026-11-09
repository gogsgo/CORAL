/**
 * Terminal output. No colours-via-chalk dependency: ANSI is a stdlib-level
 * concern and `process.stdout.isTTY` is the whole feature.
 */

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);

export const c = {
  dim: wrap("2"),
  bold: wrap("1"),
  crimson: wrap("38;5;203"),
  teal: wrap("38;5;44"),
  amber: wrap("38;5;214"),
  green: wrap("38;5;35"),
  red: wrap("38;5;167"),
  blue: wrap("38;5;75"),
};

export const REEF_BANNER = `
   ██████╗ ██████╗ ██████╗  █████╗ ██╗
  ██╔════╝██╔═══██╗██╔══██╗██╔══██╗██║
  ██║     ██║   ██║██████╔╝███████║██║
  ██║     ██║   ██║██╔══██╗██╔══██║██║
  ╚██████╗╚██████╔╝██║  ██║██║  ██║███████╗
   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝`;

export function banner(): void {
  console.log(c.crimson(REEF_BANNER));
  console.log(c.dim("  Cultivating On-chain Reasoning & Adaptive Learning"));
  console.log(c.dim("  Growing intelligence, one decision at a time.\n"));
}

export function heading(text: string): void {
  console.log(`\n${c.bold(text)}`);
  console.log(c.dim("─".repeat(Math.min(64, text.length + 8))));
}

export function keyValue(pairs: [string, string | number][]): void {
  const width = Math.max(...pairs.map(([k]) => k.length));
  for (const [k, v] of pairs) {
    console.log(`  ${c.dim(k.padEnd(width))}  ${v}`);
  }
}

export function table(headers: string[], rows: (string | number)[][]): void {
  if (rows.length === 0) {
    console.log(c.dim("  (empty)"));
    return;
  }
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)),
  );
  console.log("  " + headers.map((h, i) => c.dim(h.padEnd(widths[i]!))).join("  "));
  for (const row of rows) {
    console.log("  " + row.map((cell, i) => String(cell ?? "").padEnd(widths[i]!)).join("  "));
  }
}

export function note(label: string, message: string): void {
  console.log(`${c.teal(label)} ${message}`);
}

export function warn(message: string): void {
  console.log(`${c.amber("!")} ${message}`);
}

export function fail(message: string): void {
  console.error(`${c.red("✗")} ${message}`);
}

export function ok(message: string): void {
  console.log(`${c.green("✓")} ${message}`);
}

export function riskBar(used: number, cap: number, width = 24): string {
  const ratio = cap <= 0 ? 0 : Math.min(1, Math.max(0, used / cap));
  const filled = Math.round(ratio * width);
  const colour = ratio > 0.85 ? c.red : ratio > 0.6 ? c.amber : c.green;
  return colour("█".repeat(filled)) + c.dim("░".repeat(width - filled)) + ` ${(ratio * 100).toFixed(0)}%`;
}
