import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { buildSeedSitePreview, proofAndRepairSeedSite } from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import { SeedDriveBoard } from "./drive-board";

export const dynamic = "force-dynamic";

export default async function SeedDrivePage({
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
      <main className="seed-run seed-run-drive">
        <header className="seed-run-top">
          <div>
            <p className="seed-run-kicker">Driver / scout</p>
            <h1>{preview.brand}</h1>
            <p className="seed-run-support">
              Accept dispatch, pick up, deliver. Keep 100% of the fee and tip.
              The first driver to activate a restaurant earns a 5% residual on
              that restaurant’s delivery GMV.
            </p>
          </div>
          <nav className="seed-run-links" aria-label="Hometown apps">
            <Link href={`/site/${id}`}>Website</Link>
            <Link href={`/site/${id}/shop`}>Customer</Link>
            <Link href={`/site/${id}/merchant`}>Merchant</Link>
            <Link href={`/site/${id}/admin`}>Admin</Link>
          </nav>
        </header>
        <SeedDriveBoard projectId={id} ops={ops} />
      </main>
    </>
  );
}
