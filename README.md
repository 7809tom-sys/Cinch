# Cinch monorepo

| App | Path | Vercel Root Directory |
| --- | --- | --- |
| **Cinch Seed** (cinchseed.com) | repo root | *(leave empty / `.`)* |
| **Detective Shopper** | `apps/detective-shopper` | `apps/detective-shopper` |

## Local development

```bash
npm install
npm run dev                 # Cinch at http://localhost:3000
npm run dev:detective-shopper
```

## Deploy / fix 404 on cinchseed.com

Cinch now lives at the **repository root**, so the Vercel **cinch** project should deploy with default Root Directory (empty).

1. Vercel → **cinch** → Settings → Root Directory → **clear it** (blank) or `.`
2. Redeploy latest commit to Production
3. Domain `cinchseed.com` should serve this app once status is **Ready**

Detective Shopper still needs Root Directory = `apps/detective-shopper`.

## Cinch Seed

Primary domain: **[cinchseed.com](https://cinchseed.com)** / **[www.cinchseed.com](https://www.cinchseed.com)**

Installable Progressive Web App (Add to Home Screen / Install app) via
`/manifest.webmanifest` + service worker.

- `/login` — customer portal login (email + access code from your Seed order)
- `/portal` — your Seeds, work status, and links to live source
- `/portal/[id]/source` — real-time source tree while agents build
- `/browse` — drop a website, get a critique with time/cost estimate, purchase an improved Seed
- `/admin` — command center (Google master login required)
- `/admin/login` — Sign in with Google (allowlisted master emails)
- `/admin/test` — provider key tests + pre-launch Seed checklist
- Embed: `https://cinchseed.com/v1/watch.js`

Env: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `AUTH_SECRET`, `CINCH_MASTER_EMAILS` (or `CINCH_FREE_ADMIN_EMAILS`), optional `CINCH_LAUNCH_MODE=test|live`

## LockGM

Live at **[cinchseed.com/lockgm](https://cinchseed.com/lockgm)** — Shadow GM draft simulator & scouting platform.

- `/lockgm` — landing
- `/lockgm/draft` — live draft sync + auto player removal
- `/lockgm/cap` — salary cap / trade desk
- `/lockgm/scouting` — HS→college pipeline + premium reports
- `/lockgm/pricing` — Shadow / War Room / Pipeline tiers

## Detective Shopper

- `/admin` — `IMPACT_API_KEY` + Impact/Awin links
- `/recipes` — Spoonacular pantry recipes (`SPOONACULAR_API_KEY`)
