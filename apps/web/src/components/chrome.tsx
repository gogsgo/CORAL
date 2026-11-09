import Link from "next/link";
import { CoralCorners, DiagonalArrow, MonogramSeal, StackedWordmark } from "./engraving";

/** Every destination here exists. Dead nav is a broken promise. */
const LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/reef", label: "The Reef" },
  { href: "/safety", label: "Safety" },
  { href: "/install", label: "Installation" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-rule bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-2.5 sm:px-7">
        <nav aria-label="Primary" className="hidden items-center gap-5 font-sans-clean text-[11px] font-medium text-ink md:flex lg:gap-6">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-cobalt">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 font-sans-clean text-[10.5px] font-medium text-ink md:hidden">
          <Link href="/reef" className="hover:text-cobalt">
            The Reef
          </Link>
          <Link href="/install" className="hover:text-cobalt">
            Install
          </Link>
        </div>

        <div className="md:absolute md:left-1/2 md:-translate-x-1/2">
          <StackedWordmark variant="ink" />
        </div>

        <Link
          href="/install"
          className="rounded-full border border-rule-cobalt px-4 py-1 font-sans-clean text-[10.5px] font-medium tracking-[0.01em] text-ink transition-colors hover:border-cobalt hover:bg-cobalt hover:text-white"
        >
          Spawn a reef
        </Link>
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/reef", label: "The Reef" },
  { href: "/safety", label: "Safety" },
  { href: "/install", label: "Installation" },
];

export function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-cobalt text-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.14]">
        <img
          src="/engravings/footer-horizon-reef.webp"
          alt=""
          aria-hidden
          className="h-full w-full object-cover object-bottom invert"
        />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-6 pb-10 pt-14 sm:px-10 sm:pt-20">
        <div className="flex justify-center">
          <MonogramSeal variant="white" className="h-11 w-11" />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 border-t border-white/25 pt-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <StackedWordmark variant="white" size="lg" asLink={false} />
            <p className="mt-5 max-w-[300px] font-serif-editorial text-[13.5px] italic leading-[1.35] text-white/85">
              Growing intelligence, one decision at a time.
            </p>
            <p className="mt-4 font-sans-clean text-[9.5px] leading-[1.5] text-white/70">
              CORAL Protocol · Cultivating On-chain Reasoning &amp; Adaptive Learning
              <br />© {new Date().getFullYear()} · MIT licensed
            </p>
          </div>

          <nav aria-label="Footer" className="md:col-span-4 md:pl-10">
            <ul className="space-y-1.5 font-sans-clean text-[10px] font-medium text-white/90">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="font-sans-clean text-[10px] font-medium text-white/90">Sources</p>
            <ul className="mt-3 space-y-1.5 font-sans-clean text-[10px] text-white/80">
              <li>
                <a
                  href="https://agent.robinhood.com/mcp/trading"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  Robinhood Trading MCP
                  <DiagonalArrow className="h-2.5 w-2.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://docs.robinhood.com/chain/connecting"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  Robinhood Chain docs
                  <DiagonalArrow className="h-2.5 w-2.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/gogsgo/EOTH"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  Source on GitHub
                  <DiagonalArrow className="h-2.5 w-2.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-white/25 pt-5 font-sans-clean text-[9.5px] leading-[1.5] text-white/70">
          Not investment advice and not affiliated with Robinhood Markets. CORAL defaults to paper trading. Automated
          trading can lose money faster than manual trading because it is faster, and you are responsible for every
          order an agent places on your account.
        </p>
      </div>
    </footer>
  );
}

/** Cobalt banner card, reused by the landing page and the safety page. */
export function CobaltBanner({
  heading,
  cta,
  href,
}: {
  heading: ReactNodeish;
  cta: string;
  href: string;
}) {
  return (
    <div className="relative overflow-hidden bg-cobalt px-6 py-20 text-center text-white sm:py-28 md:py-36">
      <CoralCorners position="top-left" className="pointer-events-none absolute -left-2 -top-2 w-40 opacity-95 sm:w-56 md:w-64" />
      <CoralCorners position="bottom-right" className="pointer-events-none absolute -bottom-2 -right-2 w-40 opacity-95 sm:w-56 md:w-64" />

      <div className="relative z-10 flex justify-center">
        <MonogramSeal variant="white" className="h-10 w-10 sm:h-12 sm:w-12" />
      </div>

      <h2 className="relative z-10 mx-auto mt-14 max-w-[820px] font-serif-display text-[32px] font-normal uppercase leading-[0.94] tracking-[-0.015em] sm:mt-20 sm:text-[50px] md:text-[60px]">
        {heading}
      </h2>

      <div className="relative z-10 mt-14 flex justify-center sm:mt-20">
        <Link
          href={href}
          className="border border-white/50 px-10 py-2.5 font-sans-clean text-[10px] font-medium uppercase tracking-[0.12em] text-white transition-colors hover:border-white hover:bg-white hover:text-cobalt"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

type ReactNodeish = React.ReactNode;
