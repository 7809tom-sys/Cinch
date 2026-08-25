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

- `/login` — customer portal login (email + access code from your Seed order)
- `/portal` — your Seeds, work status, and links to live source
- `/portal/[id]/source` — real-time source tree while agents build
- `/browse` — drop a website, get a critique with time/cost estimate, purchase an improved Seed
- `/admin` — command center: accounts, pricing, purchases, Seeds, library, domains, agents, settings
- `/admin/test` — provider key tests + pre-launch Seed checklist
- Embed: `https://cinchseed.com/v1/watch.js`

Env: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, optional `CINCH_LAUNCH_MODE=test|live`

## Detective Shopper

- `/admin` — `IMPACT_API_KEY` + Impact/Awin links
- `/recipes` — Spoonacular pantry recipes (`SPOONACULAR_API_KEY`)
