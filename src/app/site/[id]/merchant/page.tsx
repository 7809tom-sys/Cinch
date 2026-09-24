import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { buildSeedSitePreview, proofAndRepairSeedSite } from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import { SeedMerchantBoard } from "./merchant-board";

export const dynamic = "force-dynamic";

export default async function SeedMerchantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  await proofAndRepairSeedSite(project);
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) redirect(`/site/${id}`);

  const preview = await buildSeedSitePreview(project);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: preview.css }} />
      <main className="seed-run seed-run-merchant">
        <header className="seed-run-top">
          <div>
            <p className="seed-run-kicker">Merchant terminal</p>
            <h1>{preview.brand}</h1>
            <p className="seed-run-support">
              Accept tickets, mark ready, and hand to a Hometown driver. You
              pay a flat 10% on delivery GMV — not a seat at a restaurant host
              stand.
            </p>
          </div>
          <nav className="seed-run-links" aria-label="Hometown apps">
            <Link href={`/site/${id}`}>Website</Link>
            <Link href={`/site/${id}/shop`}>Customer</Link>
            <Link href={`/site/${id}/drive`}>Drive</Link>
            <Link href={`/site/${id}/admin`}>Admin</Link>
          </nav>
        </header>
        <SeedMerchantBoard projectId={id} ops={ops} />
      </main>
    </>
  );
}
