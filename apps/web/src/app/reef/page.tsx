import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Terminal } from "lucide-react";
import { Footer, Nav } from "@/components/chrome";
import { readReef } from "@/lib/reef";

export const metadata: Metadata = {
  title: "Live reef",
  description: "A read-only window onto the reef on this machine: polyps, ledger, generations, zones.",
};

export const dynamic = "force-dynamic";

const OUTCOME_COLOR: Record<string, string> = {
  win: "text-teal",
  loss: "text-crimson",
  neutral: "text-silt",
  pending: "text-mist",
};

export default async function ReefPage() {
  const reef = await readReef();

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-6 py-16">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-teal">live reef</p>
        <h1 className="mt-4 font-display text-[2.8rem] leading-tight">This machine&apos;s colony.</h1>
        <p className="mt-4 max-w-2xl text-pretty text-[0.94rem] leading-relaxed text-mist">
          Read straight out of the SQLite file the CLI writes — no API, no second copy of the truth, no invented
          numbers on this page.
        </p>

        {!reef.available ? (
          <div className="mt-12 rounded-xl border border-shelf/60 bg-deep/60 p-8">
            <Terminal className="h-5 w-5 text-silt" strokeWidth={1.6} />
            <h2 className="mt-4 font-display text-xl text-foam">No reef here yet.</h2>
            <p className="mt-3 max-w-xl text-pretty text-[0.88rem] leading-relaxed text-mist">
              {reef.error
                ? `A reef exists at ${reef.dbPath} but could not be read: ${reef.error}`
                : `Nothing at ${reef.dbPath}. Spawn one, run a pass, reload this page.`}
            </p>
            <pre className="mt-5 overflow-x-auto rounded-lg border border-shelf/80 bg-abyss px-4 py-3 font-mono text-[0.76rem] leading-relaxed text-mist">
              <code>{`pnpm coral init
pnpm coral trade NVDA,AAPL --budget 200
pnpm web            # then reload`}</code>
            </pre>
          </div>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-shelf/60 bg-shelf/40 sm:grid-cols-4">
              {[
                ["generation", String(reef.generation)],
                ["polyps", String(reef.counts.polyps)],
                ["win rate", reef.counts.wins + reef.counts.losses > 0 ? `${(reef.winRate * 100).toFixed(1)}%` : "—"],
                ["realised", `${reef.realised >= 0 ? "" : "-"}$${Math.abs(reef.realised).toFixed(2)}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-abyss/80 px-5 py-6">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-silt">{label}</p>
                  <p className="mt-2 font-display text-2xl text-foam">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5 font-mono text-[0.7rem] text-silt">
              <span className={reef.mode === "live" ? "text-crimson" : "text-teal"}>{reef.mode.toUpperCase()}</span>
              <span>·</span>
              <span>deployed ${reef.deployed.toFixed(2)}</span>
              <span>·</span>
              <span>
                {reef.counts.wins}W / {reef.counts.losses}L · {reef.counts.pending} pending
              </span>
              <span>·</span>
              <span>
                spawned {reef.spawnedAt ? formatDistanceToNow(new Date(reef.spawnedAt), { addSuffix: true }) : "—"}
              </span>
            </div>

            {reef.zones.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-xl text-foam">Zones</h2>
                <p className="mt-2 text-[0.82rem] text-silt">
                  Strength is a Laplace-smoothed win rate — three lucky wins should not read as a 100% edge.
                </p>
                <div className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {reef.zones.map((z) => {
                    const decided = z.wins + z.losses;
                    return (
                      <div key={z.name} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate font-mono text-[0.74rem] text-mist">{z.name}</span>
                        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-shelf/70">
                          <span
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              z.strength >= 0.6 ? "bg-teal" : z.strength < 0.42 ? "bg-crimson" : "bg-mist/60"
                            }`}
                            style={{ width: `${Math.round(z.strength * 100)}%` }}
                          />
                        </span>
                        <span className="w-24 shrink-0 text-right font-mono text-[0.68rem] text-silt">
                          {decided === 0 ? "untested" : `${(z.strength * 100).toFixed(0)}% · ${z.polyps}p`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="mt-12">
              <h2 className="font-display text-xl text-foam">Recent polyps</h2>
              <div className="mt-4 overflow-x-auto rounded-xl border border-shelf/60">
                <table className="w-full text-left text-[0.82rem]">
                  <thead className="bg-deep/80 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-silt">
                    <tr>
                      <th className="px-4 py-3 font-normal">when</th>
                      <th className="px-4 py-3 font-normal">kind</th>
                      <th className="px-4 py-3 font-normal">symbol</th>
                      <th className="px-4 py-3 font-normal">act</th>
                      <th className="hidden px-4 py-3 font-normal sm:table-cell">conf</th>
                      <th className="px-4 py-3 font-normal">outcome</th>
                      <th className="hidden px-4 py-3 font-normal md:table-cell">thesis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-shelf/40">
                    {reef.polyps.map((p) => (
                      <tr key={p.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-3 text-silt">
                          {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3 font-mono text-[0.72rem] text-mist">{p.kind}</td>
                        <td className="px-4 py-3 font-mono text-[0.76rem] text-foam">{p.symbol ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-[0.72rem] uppercase text-mist">{p.action}</td>
                        <td className="hidden px-4 py-3 font-mono text-[0.72rem] text-silt sm:table-cell">
                          {p.confidence.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 font-mono text-[0.72rem] ${OUTCOME_COLOR[p.outcome] ?? "text-mist"}`}>
                          {p.outcome}
                        </td>
                        <td className="hidden max-w-[24rem] px-4 py-3 text-mist md:table-cell">
                          <span className="line-clamp-2">{p.thesis}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {reef.ledger.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-xl text-foam">Ledger</h2>
                <div className="mt-4 overflow-x-auto rounded-xl border border-shelf/60">
                  <table className="w-full text-left text-[0.82rem]">
                    <thead className="bg-deep/80 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-silt">
                      <tr>
                        <th className="px-4 py-3 font-normal">when</th>
                        <th className="px-4 py-3 font-normal">symbol</th>
                        <th className="px-4 py-3 font-normal">side</th>
                        <th className="px-4 py-3 font-normal">notional</th>
                        <th className="hidden px-4 py-3 font-normal sm:table-cell">qty</th>
                        <th className="px-4 py-3 font-normal">price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-shelf/40">
                      {reef.ledger.map((l) => (
                        <tr key={l.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-silt">
                            {formatDistanceToNow(new Date(l.ts), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3 font-mono text-[0.76rem] text-foam">{l.symbol}</td>
                          <td className="px-4 py-3 font-mono text-[0.72rem] uppercase text-mist">{l.side}</td>
                          <td className="px-4 py-3 font-mono text-[0.72rem] text-mist">${l.notional.toFixed(2)}</td>
                          <td className="hidden px-4 py-3 font-mono text-[0.72rem] text-silt sm:table-cell">
                            {l.qty.toFixed(4)}
                          </td>
                          <td className="px-4 py-3 font-mono text-[0.72rem] text-mist">${l.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {reef.generations.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-xl text-foam">Generations</h2>
                <ul className="mt-4 space-y-3">
                  {reef.generations.map((g) => (
                    <li key={g.id} className="rounded-lg border border-shelf/60 bg-deep/50 px-5 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-[0.72rem] text-teal">gen {g.generation}</span>
                        <span className="font-mono text-[0.68rem] text-silt">
                          {formatDistanceToNow(new Date(g.ts), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-2 text-pretty text-[0.86rem] text-mist">{g.summary}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="mt-12 text-[0.78rem] text-silt">
              Reload after any <code className="font-mono text-coral">coral</code> command to watch the reef move.{" "}
              <Link
                href="/how-it-works"
                className="text-mist underline decoration-shelf underline-offset-4 hover:text-foam"
              >
                How these rows are produced
              </Link>
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
