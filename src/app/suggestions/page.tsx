import type { Metadata } from "next";
import { JustPutzItNotOnSeedPage } from "@/components/just-putzit-not-on-seed";

export const metadata: Metadata = {
  title: "Suggestions — Cinch Seed",
  description:
    "Just Putz It is not a Cinch Seed. Cinch does not queue please-do updates for justputzit.com.",
};

export default function SuggestionsPage() {
  return (
    <JustPutzItNotOnSeedPage title="No Just Putz It suggestions on Cinch Seed" />
  );
}
