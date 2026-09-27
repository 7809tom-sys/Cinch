/** Current Gemini Flash ids — 1.5-flash 404s on v1beta generateContent. */
export const GEMINI_MENU_VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
] as const;

export function geminiMenuVisionModels(preferred?: string): string[] {
  const env = preferred?.trim();
  const retired = Boolean(env && /^gemini-1\.5/i.test(env));
  return [
    ...new Set([
      ...(env && !retired ? [env] : []),
      ...GEMINI_MENU_VISION_MODELS,
    ]),
  ];
}

/** Kitchen tablet copy — never dump provider JSON or “add a key” after a 404. */
export function kitchenFacingVisionError(raw: string): string {
  const compact = raw.replace(/\s+/g, " ").trim();
  if (/No Gemini or Claude vision key is wired/i.test(compact)) {
    return "No Gemini or Claude vision key is wired. Wrote the Seed paper-menu fixture so you can still review prices and modifiers.";
  }
  if (
    /not found for API version|models\/gemini-1\.5|is not found for API/i.test(
      compact,
    )
  ) {
    return "Gemini Flash on this key is outdated. Wrote the Seed paper-menu fixture so you can still review prices and modifiers.";
  }
  if (/Those files had no photo or PDF bytes/i.test(compact)) {
    return compact;
  }
  if (/returned no plates/i.test(compact)) {
    return "Vision parse did not find plates on that upload. Wrote the Seed paper-menu fixture so you can still review prices and modifiers.";
  }
  return "Vision parse could not read that upload. Wrote the Seed paper-menu fixture so you can still review prices and modifiers.";
}
