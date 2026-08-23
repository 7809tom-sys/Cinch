"use server";

import { runAllProviderTests, type ProviderTestResult } from "@/lib/provider-tests";

export async function testProvidersAction(): Promise<{
  ok: true;
  results: ProviderTestResult[];
}> {
  const results = await runAllProviderTests();
  return { ok: true, results };
}
