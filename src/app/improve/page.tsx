import type { Metadata } from "next";
import { JustPutzItNotOnSeedPage } from "@/components/just-putzit-not-on-seed";

export const metadata: Metadata = {
  title: "Just Putz It is not a Cinch Seed",
  description:
    "Manus hosts justputzit.com. Cinch Seed does not queue pretend updates or spend AI time on that host.",
};

export default function ImprovePage() {
  return <JustPutzItNotOnSeedPage title="Just Putz It is not on this Seed" />;
}
