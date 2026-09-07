# LockedGM brand vs technical paths

**User-facing product name:** **LockedGM** (not Strat-O-Matic; not bare “LockGM”).

Display strings, page titles, nav labels, marketing copy, classroom grade names, and docs that teach the product should say **LockedGM**.

## Intentional technical identifiers (do not rename casually)

These stay as `lockgm` / `Lockgm` / `LOCKGM_*` for route, storage, and API stability:

| Kind | Examples |
| --- | --- |
| App routes | `/lockgm`, `/lockgm/office`, `/api/lockgm/...` |
| Source folders | `src/app/lockgm/`, `src/lib/lockgm/` |
| CSS | `--lg-*` vars, `lockgm-display` class |
| Package scripts | `assert:lockgm-*`, `scripts/assert-lockgm-*.ts` |
| Env / DNS | `LOCKGM_DOMAIN`, example host `lockgm.com` |
| Storage / cookies | `lockgm_referral`, `lockgm-analytics`, `lockgm_sport_v1`, `lockgm_attribution_v1` |
| Data model | `lockgmProfile`, `LockgmProfile`, `LOCKGM_*` constants |
| Doc filenames | `docs/lockgm-*.md` (titles inside say LockedGM) |

“Lock City …” franchise club names are separate fiction branding and may stay.

## Guard

```bash
npm run assert:lockgm-brand
```

Fails if user-facing LockedGM page/chrome sources still contain bare product title `LockGM`.
