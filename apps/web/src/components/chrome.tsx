import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden className="shrink-0">
        <path
          d="M16 3v7M16 10c0 3-4 3-4 6s4 3 4 6-4 3-4 6M16 10c0 3 4 3 4 6s-4 3-4 6 4 3 4 6"
          stroke="var(--color-coral)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="16" cy="3" r="1.9" fill="var(--color-teal)" />
        <circle cx="6" cy="12" r="1.4" fill="var(--color-coral)" opacity="0.7" />
        <circle cx="26" cy="12" r="1.4" fill="var(--color-coral)" opacity="0.7" />
        <circle cx="5" cy="24" r="1.1" fill="var(--color-teal)" opacity="0.55" />
        <circle cx="27" cy="24" r="1.1" fill="var(--color-teal)" opacity="0.55" />
      </svg>
      {showWordmark && (
        <span className="font-display text-[1.35rem] leading-none tracking-[0.16em] text-foam">CORAL</span>
      )}
    </span>
  );
}

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/install", label: "Install" },
  { href: "/safety", label: "Safety" },
  { href: "/reef", label: "Live reef" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-shelf/60 bg-abyss/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="CORAL home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[0.82rem] tracking-wide text-mist transition-colors hover:text-foam"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <Link
          href="/install"
          className="rounded-full border border-coral/40 bg-coral/10 px-4 py-1.5 text-[0.78rem] font-medium tracking-wide text-coral transition-colors hover:bg-coral/20"
        >
          Spawn a reef
        </Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-shelf/60 bg-deep">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-pretty text-[0.86rem] leading-relaxed text-silt">
            CORAL — Cultivating On-chain Reasoning &amp; Adaptive Learning. A self-evolving trading agent that grows a
            reef of memory from every decision it makes.
          </p>
          <p className="mt-4 font-display text-lg italic text-mist">Growing intelligence, one decision at a time.</p>
        </div>
        <div>
          <h4 className="text-[0.7rem] uppercase tracking-[0.18em] text-silt">Product</h4>
          <ul className="mt-4 space-y-2.5 text-[0.86rem] text-mist">
            <li><Link href="/how-it-works" className="hover:text-foam">How it works</Link></li>
            <li><Link href="/install" className="hover:text-foam">Installation</Link></li>
            <li><Link href="/safety" className="hover:text-foam">Safety &amp; risk</Link></li>
            <li><Link href="/reef" className="hover:text-foam">Live reef</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[0.7rem] uppercase tracking-[0.18em] text-silt">Sources</h4>
          <ul className="mt-4 space-y-2.5 text-[0.86rem] text-mist">
            <li>
              <a href="https://agent.robinhood.com/mcp/trading" className="hover:text-foam" rel="noreferrer" target="_blank">
                Robinhood Trading MCP
              </a>
            </li>
            <li>
              <a href="https://docs.robinhood.com/chain/connecting" className="hover:text-foam" rel="noreferrer" target="_blank">
                Robinhood Chain docs
              </a>
            </li>
            <li>
              <a href="https://github.com/gogsgo/EOTH" className="hover:text-foam" rel="noreferrer" target="_blank">
                Source on GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-shelf/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-[0.74rem] text-silt sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CORAL. MIT licensed.</p>
          <p className="text-pretty">
            Not investment advice. CORAL defaults to paper trading. Markets can and will take your money.
          </p>
        </div>
      </div>
    </footer>
  );
}
