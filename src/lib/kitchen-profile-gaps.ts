/** What still has to be filled before an owner kitchen can go live. */
export function kitchenProfileGaps(restaurant: {
  name?: string | null;
  address?: string | null;
  hours?: string | null;
}): Array<"name" | "address" | "hours"> {
  const missing: Array<"name" | "address" | "hours"> = [];
  if ((restaurant.name ?? "").trim().length < 2) missing.push("name");
  if ((restaurant.address ?? "").trim().length < 4) missing.push("address");
  if (!(restaurant.hours ?? "").trim()) missing.push("hours");
  return missing;
}

export function kitchenProfileGapMessage(
  gaps: Array<"name" | "address" | "hours">,
): string {
  if (gaps.length === 0) return "";
  return `Add ${gaps.join(", ")} before this kitchen can go live.`;
}
