/**
 * Guard: user-facing LockedGM UI must not show bare product title "LockGM".
 * Technical paths (/lockgm, lockgmProfile, --lg-*, assert:lockgm-*) stay as-is.
 * Run: npm run assert:lockgm-brand
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd());
const SCAN_ROOTS = [
  join(ROOT, "src/app/lockgm"),
  join(ROOT, "src/components/site-header.tsx"),
  join(ROOT, "src/components/site-footer.tsx"),
  join(ROOT, "src/app/portal/page.tsx"),
  join(ROOT, "src/app/legal/page.tsx"),
];

const FILE_RE = /\.(tsx|ts|jsx|js|md)$/;
/** Bare legacy product title — must not appear in scanned UI sources. */
const BARE_BRAND = /LockGM/;

function collectFiles(entry: string, out: string[] = []): string[] {
  const st = statSync(entry);
  if (st.isFile()) {
    if (FILE_RE.test(entry)) out.push(entry);
    return out;
  }
  for (const name of readdirSync(entry)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    collectFiles(join(entry, name), out);
  }
  return out;
}

const hits: string[] = [];
for (const root of SCAN_ROOTS) {
  for (const file of collectFiles(root)) {
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (BARE_BRAND.test(line)) {
        hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
      }
    });
  }
}

if (hits.length) {
  console.error(
    "assert:lockgm-brand failed — user-facing sources still say LockGM (use LockedGM):\n",
  );
  for (const hit of hits.slice(0, 40)) console.error(`  ${hit}`);
  if (hits.length > 40) console.error(`  … and ${hits.length - 40} more`);
  process.exitCode = 1;
} else {
  console.log(
    "assert:lockgm-brand passed — no bare LockGM in scanned user-facing UI sources.",
  );
}
