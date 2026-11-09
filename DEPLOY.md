# Deploying CORAL to Railway

`railway.json` at the repo root is the whole config. Two commands from a clean
checkout, and the build it requests is the build that was verified on a fresh
clone (see "What was verified" below).

## 1. What gets deployed

Only `apps/web`. The packages under `packages/` are local tools: `@coral/core`
writes a SQLite file on your machine, and `@coral/cli` is a terminal binary.
Neither has anything to serve, and neither is built in this pipeline.

That is also why the web app imports no workspace package: it reads the reef
file with Node's built-in `node:sqlite`, in read-only mode. One app, one
dependency tree, no native modules, no Rust toolchain.

## 2. Create the service

Railway needs the repo on GitHub first. It already is:
<https://github.com/gogsgo/CORAL>

```bash
railway login
railway init --name coral                    # new project
railway add --service coral -r gogsgo/CORAL --branch main
railway status                               # confirm repo + URL
```

Or from the dashboard: **New Project → Deploy from GitHub repo → gogsgo/CORAL**.
Railway reads `railway.json` and the rest is automatic.

## 3. What `railway.json` does

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @coral/web build"
  },
  "deploy": {
    "startCommand": "pnpm --filter @coral/web start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

`corepack enable` is what gives the builder the pnpm version pinned in
`package.json` (`packageManager: pnpm@10.33.0`). Without it the image may ship
a pnpm that misreads the lockfile.

`next start` reads `PORT` from the environment by itself and is bound to
`0.0.0.0` in the `start` script. Do not pass `-p $PORT`: Railway injects
`PORT`, and the flag is both redundant and hostile to shell expansion.

## 4. Environment variables

None are required. The site is static copy plus one read-only dashboard route,
and it defaults to paper mode. Optional, if you want the dashboard to read a
reef other than `./.coral`:

| Variable | Default | Meaning |
|---|---|---|
| `CORAL_HOME` | `../../.coral` | Directory holding `reef.db` |
| `CORAL_MODE` | `paper` | Only affects the mode label the dashboard shows |

On Railway there is no `reef.db`, so `/reef` renders its honest empty state and
tells you the three commands that fill it. That is the intended behaviour, not
a bug: the reef is local state that belongs to whoever ran the agent.

## 5. Redeploys

Once the GitHub source is connected, `git push` **is** the deploy. Nothing else
needed.

Do not also run `railway up`: it uploads the working directory rather than the
commit, and when a live GitHub connection exists the two deploys race and the
older one can win.

## What was verified

On a fresh clone of `gogsgo/CORAL`, not the working copy:

```
corepack enable && pnpm install --frozen-lockfile        → done in 17.4s
pnpm --filter @coral/web build                            → 7/7 routes
PORT=8123 pnpm --filter @coral/web start                  → listening on 0.0.0.0:8123
```

Every route answered 200 (`/`, `/install`, `/how-it-works`, `/safety`, `/reef`)
and the hero plate served as `image/webp`, 333,852 bytes, VP8-encoded 1600px.

Not verified: an actual Railway deployment. The CLI is authenticated but the
account's trial has expired, so project creation is refused with "Your trial
has expired. Please select a plan to continue using Railway." Activate a plan,
then run the two commands in section 2. The configuration itself needs no
change.

## Pitfalls

- `output: "standalone"` is deliberately **not** set. Its trace step copies
  symlinks, which fails on Windows without developer mode, and `next start`
  serves the built app from `.next` with nothing lost.
- The plates are pre-optimised WebP (1.2 MB total, down from 17 MB of PNG) and
  served as-is, so `images.unoptimized` is on. Re-enabling the Next image
  optimiser would re-encode them at request time for no benefit.
- `railway.json` is Config as Code, which Railway has marked deprecated in
  favour of `.railway/railway.ts` (existing files keep working until
  2026-12-01). It is kept because it is the format that was actually tested;
  migrate with `railway config migrate --apply` when you want the new shape.
