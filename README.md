# Cinch monorepo

Two Vercel-ready Next.js sites in one GitHub repo:

| App | Path | Vercel root directory |
| --- | --- | --- |
| **Cinch** | `apps/cinch` | `apps/cinch` |
| **Detective Shopper** | `apps/detective-shopper` | `apps/detective-shopper` |

## Local development

```bash
npm install
npm run dev:cinch              # http://localhost:3000
npm run dev:detective-shopper  # http://localhost:3000
```

Run only one app at a time on the default port, or start the second with `npm run dev -w <app> -- -p 3001`.

## Deploy on Vercel

Your Vercel team already links this repo as a monorepo with projects **cinch** and **detective-shopper**. Set each project’s **Root Directory**:

1. [cinch](https://vercel.com/cinch-ai-builder/cinch) → `apps/cinch`
2. [detective-shopper](https://vercel.com/cinch-ai-builder/detective-shopper) → `apps/detective-shopper`

Framework preset: Next.js. Then redeploy.

If you have a **third** site, add it under `apps/<name>` and create another Vercel project with that root directory.

## Cinch Seed admin

`/admin` on Cinch is the Seed studio:
- Agent roster with API key status (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`)
- Create Seed projects and invite specialists
- Project manager assigns tasks by skill + cost
- Activity feed, module library, and embed snippet for site health/rebuild

## Detective Shopper admin

`/admin` on Detective Shopper lets you paste an affiliate API key. It is saved as `IMPACT_API_KEY` in a gitignored `.env.local` (see `apps/detective-shopper/.env.example`). On Vercel, set the same variable in the project’s Environment Variables. The page also links to Impact and Awin partner signup.

## Recipe generator

`/recipes` accepts scanned pantry items, calls Spoonacular (`findByIngredients` + recipe information), and shows matching recipes with ingredients and step-by-step instructions. Set `SPOONACULAR_API_KEY` in `.env.local` or Vercel.

## Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Build both apps |
| `npm run lint` | Lint both apps |
| `npm run build:cinch` | Build Cinch only |
| `npm run build:detective-shopper` | Build Detective Shopper only |
