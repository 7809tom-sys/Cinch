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

## Scripts

| Command | Description |
| --- | --- |
| `npm run build` | Build both apps |
| `npm run lint` | Lint both apps |
| `npm run build:cinch` | Build Cinch only |
| `npm run build:detective-shopper` | Build Detective Shopper only |
