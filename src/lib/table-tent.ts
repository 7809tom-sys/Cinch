/** Public ordering page encoded on a restaurant's table tent. */
export function tableTentOrderUrl(input: {
  projectId: string;
  restaurantId: string;
  origin?: string;
}): string {
  const origin = (input.origin ?? "https://hometownrunner.com").replace(/\/$/, "");
  const url = new URL(`/site/${input.projectId}/shop`, origin);
  url.searchParams.set("kitchen", input.restaurantId);
  url.searchParams.set("src", "table");
  return url.toString();
}

export function tableTentCta(restaurantName: string): string {
  const name = restaurantName.trim();
  return name ? `Scan to order from ${name}` : "Scan to order";
}
