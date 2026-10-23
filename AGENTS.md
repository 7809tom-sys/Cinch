<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Two Next.js 16 apps share this repo. Node 22 is enough (`next` engines ask for `>=20.9.0`). `@zxing/library` warns that it prefers Node 24; barcode scanning still runs in the browser on Node 22.

- Install both lockfiles: `npm ci` at the repo root, then `npm ci --prefix apps/detective-shopper`.
- Cinch Seed: `npm run dev -- --port 3000` → http://localhost:3000. Liveness is `GET /v1/health`.
- Detective Shopper: `npm run dev --prefix apps/detective-shopper -- --port 3001`. Its default port is also 3000, so it must not share Cinch’s port. `next.config.ts` allows `127.0.0.1` so dev assets and server actions work when the browser uses that host.
- Without Redis env vars, both apps persist under gitignored `.data/`. Keys in `.env.example` are optional for pages, master login, creating a Seed, and the free UPCitemdb trial lookup. AI generation and paid feeds need those keys.
- Test-mode master login uses the password documented in `.env.example` for `7809tom@gmail.com` when `CINCH_LAUNCH_MODE` is not `live`.
- `npx tsc --noEmit` passes in both apps. Detective Shopper `npm run lint` passes. Root `npm run lint` currently reports existing hook and `module`-assignment errors; that is the app, not a failed install.
- Representative checks: `npm run assert:conductor-routing` and `npm run assert:lockgm-brand` (they use `npx tsx`).
