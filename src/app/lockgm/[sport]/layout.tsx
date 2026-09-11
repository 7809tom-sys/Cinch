import { notFound } from "next/navigation";
import { isSportId, SPORTS } from "@/lib/lockgm/sports";
import { SportLock } from "../components/sport-lock";

export function generateStaticParams() {
  return SPORTS.map((sport) => ({ sport: sport.id }));
}

export const dynamicParams = false;

export default async function SportHubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  if (!isSportId(sport)) notFound();
  return <SportLock sportId={sport}>{children}</SportLock>;
}
