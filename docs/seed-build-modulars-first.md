# Seed build rule: modulars first

## Hard rule

When deciding how to build a Seed site:

1. **Go to existing library modulars right away** — survey the shared library before inventing work.
2. **Grab / adopt what fits** the brief (reuse fee at 85% of create+merge; creators earn 8%).
3. **Custom-build only the rest** — gaps the library does not cover.

Never start from a blank custom plan and sprinkle modulars on afterward.

## Where it is enforced

| Layer | Behavior |
| --- | --- |
| `SEED_BUILD_MODULARS_FIRST_RULE` | Constant in `src/lib/module-library.ts` |
| `selectModulesForSeedBuild` | Scores + picks modulars for the brief |
| `planBuild` | Adopts modulars **before** drafting custom tasks; first task is “Adopt existing library modulars” |
| Task details | Every build/growth task repeats: reuse modulars first, custom only for gaps |
| `docs/modulars-adopted.md` | Written into the Seed source when the adopt task runs |
| Growth wave | Live-site health wave must survey modulars before new adaptations |

## Anti-patterns (do not ship)

- Drafting a full custom backlog, then optionally reusing 5 random modulars
- Rebuilding booking, responsive, SEO, or trust blocks that already exist as modulars
- Skipping the library survey because the brief feels “unique”
