/**
 * HARD RULE — Edit Seed must be read and reacted to.
 *
 * When an owner changes the Seed name or brief (Edit Seed → Save), Cinch must
 * read that edit and rebuild the live site + queue any missing capability work.
 * Never ignore an edit, never treat Save as a plain Visit, never rename-only.
 *
 * Implementation: `src/lib/seed-edit-rule.ts`, `updateProjectDetails`,
 * `applySeedIdentityEdit`. Guard: `npm run assert:seed-edit-react`.
 */

export {};
