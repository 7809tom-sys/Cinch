/** One LTL pickup from a warehouse — cabinets from the same origin ship together. */

export type FreightRateGroup = {
  originZip: string;
  label: string;
  amountCents: number;
  palletCount: number;
  source?: string;
};

export function originZipFromFreightLabel(label: string): string | null {
  const match = String(label ?? "").match(/\borigin\s+(\d{5})\b/i);
  return match?.[1] ?? null;
}

export function palletCountFromFreightLabel(label: string): number {
  const match = String(label ?? "").match(/(\d+)\s+pallets?\b/i);
  return match ? Number(match[1]) : 0;
}

export function placeFromFreightLabel(label: string): string | null {
  const match = String(label ?? "").match(/\(([^)]+)\)/);
  const place = match?.[1]?.trim();
  return place || null;
}

export function freightShipsTogetherLabel(input: {
  originZip: string;
  palletCount: number;
  place?: string | null;
}): string {
  const pallets = Math.max(1, input.palletCount);
  const place = input.place?.trim();
  const where = place ? `${place} · ` : "";
  return `Ships together · ${where}origin ${input.originZip} · ${pallets} pallet${
    pallets === 1 ? "" : "s"
  }`;
}

export const SAME_ORIGIN_FREIGHT_NOTE =
  "Same origin ships together — restack one warehouse load so leftover cube shares pallets. Fewer pallets than quoting each finish alone.";

/** Split quotes waste the last pallet of each finish. Combining fills that leftover. */
export function restackSameOriginPallets(palletCounts: number[]): number {
  const counts = palletCounts
    .map((count) => Math.max(0, Math.floor(count)))
    .filter((count) => count > 0);
  if (counts.length === 0) return 1;
  const sum = counts.reduce((total, count) => total + count, 0);
  const largest = Math.max(...counts);
  if (counts.length === 1) return sum;
  return Math.max(1, largest, sum - (counts.length - 1));
}

export function restackSameOriginFreightCents(
  groups: Array<{ palletCount: number; amountCents: number }>,
  combinedPallets: number,
): number {
  if (groups.length === 0) return 0;
  const sumPallets = groups.reduce(
    (total, group) => total + Math.max(0, group.palletCount),
    0,
  );
  const sumCents = groups.reduce(
    (total, group) => total + Math.max(0, group.amountCents),
    0,
  );
  const largest = groups.reduce((best, group) =>
    group.palletCount > best.palletCount ||
    (group.palletCount === best.palletCount &&
      group.amountCents > best.amountCents)
      ? group
      : best,
  );
  if (combinedPallets >= sumPallets) return sumCents;
  if (combinedPallets <= largest.palletCount) return largest.amountCents;
  const extraPallets = combinedPallets - largest.palletCount;
  const otherPallets = Math.max(1, sumPallets - largest.palletCount);
  const otherCents = Math.max(0, sumCents - largest.amountCents);
  return largest.amountCents + Math.round((otherCents * extraPallets) / otherPallets);
}

export const SPLIT_ORIGIN_FREIGHT_NOTE =
  "Each origin is packed and quoted separately using final pallet dimensions and loaded weight.";

/** Merge rate groups that share an origin ZIP into one load. */
export function consolidateSameOriginFreight(
  groups: FreightRateGroup[],
): FreightRateGroup[] {
  const buckets = new Map<string, FreightRateGroup[]>();
  const leftover: FreightRateGroup[] = [];

  for (const group of groups) {
    const zip =
      group.originZip.trim() || originZipFromFreightLabel(group.label) || "";
    if (!/^\d{5}$/.test(zip)) {
      leftover.push(group);
      continue;
    }
    const list = buckets.get(zip) ?? [];
    list.push({ ...group, originZip: zip });
    buckets.set(zip, list);
  }

  const merged: FreightRateGroup[] = [];
  for (const [zip, list] of buckets) {
    if (list.length === 1) {
      merged.push(list[0]);
      continue;
    }
    const packed = list.map((item) => ({
      palletCount:
        item.palletCount > 0
          ? item.palletCount
          : palletCountFromFreightLabel(item.label),
      amountCents: item.amountCents,
    }));
    const palletCount = restackSameOriginPallets(
      packed.map((item) => item.palletCount),
    );
    const amountCents = restackSameOriginFreightCents(packed, palletCount);
    const place =
      list.map((item) => placeFromFreightLabel(item.label)).find(Boolean) ??
      null;
    merged.push({
      ...list[0],
      originZip: zip,
      palletCount,
      amountCents,
      label: freightShipsTogetherLabel({
        originZip: zip,
        palletCount,
        place,
      }),
    });
  }

  return [...merged, ...leftover];
}
