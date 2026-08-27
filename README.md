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
- Connect API: `https://cinchseed.com/v1/watch.js` — see below

Env: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `AUTH_SECRET`, `CINCH_MASTER_EMAILS` (or `CINCH_FREE_ADMIN_EMAILS`), optional `CINCH_LAUNCH_MODE=test|live`

### Connect API — link an existing website to its Seed

Any live website — built by Cinch or not — connects with one script tag.
Once connected, the Seed watches critical tools and pushes growth
adaptations onto the page in place; it never needs source access to the
site.

```html
<script src="https://cinchseed.com/v1/watch.js"
        data-seed="YOUR_SEED_ID"
        data-key="YOUR_CONNECT_KEY"
        data-platform="generic"
        async></script>
```

Get your Seed's id + key (and ready-made WordPress/Magento/Shopify
snippets) from the customer portal (`/portal/[id]`) or Admin → a Seed's
page. **Every request needs both the id and the key** — knowing the id
alone isn't enough to send fake data or read/apply another Seed's
adaptations. Regenerate the key any time from either place if it leaks;
old embeds stop authenticating immediately. Disabling the Connect API for
a Seed makes every endpoint below return `403` for it.

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/v1/watch.js` | `GET` | — (public script) | Serves the embed; reads `data-seed` / `data-key` / `data-platform` / `data-tools` |
| `/v1/health` | `POST` | `seed` + `key` in body | Heartbeat + critical-tool probe results |
| `/v1/improve` | `GET` | `seed` + `key` query params | Pull pending adaptations for this Seed |
| `/v1/improve` | `POST` | `seed` + `key` in body | Acknowledge adaptations the embed applied |
| `/v1/backup` | `POST` | `seed` + `key` in body | Queue a safety-backup / rebuild cue |

`POST /v1/health` body:

```json
{
  "seed": "…", "key": "…",
  "platform": "generic", "href": "https://example.com/", "ua": "…",
  "tools": [
    { "toolId": "kitchen-designer", "label": "Kitchen designer", "ok": true, "detail": "selector matched", "growthAxis": "functionality" }
  ]
}
```

`GET /v1/improve?seed=…&key=…` response:

```json
{
  "ok": true,
  "improvements": [
    { "id": "…", "moduleTitle": "Restore checkout", "growthAxis": "functionality", "kind": "note", "payload": "…" }
  ]
}
```

`kind` is one of `script` (injected into `<head>`), `html` (appended to
`<body>` inside a `[data-cinch-improve]` wrapper), `meta` (a
`<meta name="cinch-seed-improve">` tag), or `note` (surfaced to agents in
Admin — not auto-applied). Override the default critical-tool probes with
`data-tools='[{"id":"...","label":"...","selector":"...","growthAxis":"functionality"}]'`
on the script tag.

## LockGM

Live at **[cinchseed.com/lockgm](https://cinchseed.com/lockgm)** — Shadow GM draft simulator & scouting platform.

- `/lockgm` — landing
- `/lockgm/draft` — live draft sync + auto player removal
- `/lockgm/cap` — salary cap / trade desk
- `/lockgm/scouting` — HS→college pipeline + premium reports
- `/lockgm/pricing` — Shadow / War Room / Pipeline tiers

### Give LockGM its own domain

LockGM can also be served at the root of a domain you already own (e.g.
`lockgm.com/office` instead of `cinchseed.com/lockgm/office`) via
`src/proxy.ts`, which rewrites requests on that domain to the `/lockgm`
routes and redirects any `/lockgm/*` links back to the clean root-relative
URL.

1. **Admin → Domains → "LockGM's own domain"**: connect the domain, add the
   shown DNS record (A for an apex domain, CNAME for a subdomain) at your
   registrar, then **Check DNS now** until it shows verified.
2. Vercel → this project → Settings → Domains → add the domain.
3. Set `LOCKGM_DOMAIN=yourdomain.com` and redeploy.

`cinchseed.com/lockgm/*` keeps working unchanged regardless.

## Detective Shopper

- `/admin` — `IMPACT_API_KEY` + Impact/Awin links
- `/recipes` — Spoonacular pantry recipes (`SPOONACULAR_API_KEY`)
