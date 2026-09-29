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
  "Same origin ships together — one pickup and one quote from that warehouse.";

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
    const palletCount = list.reduce((sum, item) => {
      const count =
        item.palletCount > 0
          ? item.palletCount
          : palletCountFromFreightLabel(item.label);
      return sum + Math.max(0, count);
    }, 0);
    const amountCents = list.reduce((sum, item) => sum + item.amountCents, 0);
    const place =
      list.map((item) => placeFromFreightLabel(item.label)).find(Boolean) ??
      null;
    merged.push({
      ...list[0],
      originZip: zip,
      palletCount: Math.max(1, palletCount),
      amountCents,
      label: freightShipsTogetherLabel({
        originZip: zip,
        palletCount: Math.max(1, palletCount),
        place,
      }),
    });
  }

  return [...merged, ...leftover];
}
