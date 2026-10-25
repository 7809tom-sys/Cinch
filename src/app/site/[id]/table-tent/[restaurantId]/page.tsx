import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { TestingBanner } from "@/components/delivery/testing-banner";
import { hometownSiteTesting } from "@/lib/hometown-testing";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { tableTentCta, tableTentOrderUrl } from "@/lib/table-tent";
import { getProject } from "@/lib/store";
import { TableTentPrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function TableTentPage({
  params,
}: {
  params: Promise<{ id: string; restaurantId: string }>;
}) {
  const { id, restaurantId } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const ops = await ensureDeliveryOpsInSeed(project);
  const restaurant = ops?.restaurants.find((row) => row.id === restaurantId);
  if (!ops || !restaurant) notFound();
  const name = restaurant.name.trim();
  const cta = tableTentCta(name);
  const orderUrl = tableTentOrderUrl({ projectId: id, restaurantId });
  const qr = await QRCode.toDataURL(orderUrl, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
  });

  return (
    <main className="min-h-dvh bg-white px-4 py-6 text-[#1a1714]">
      <style>{`
        .tent-sheet {
          width: 8.5in;
          max-width: 100%;
          margin: 1rem auto;
          background: white;
          color: #1a1714;
        }
        .tent-face {
          box-sizing: border-box;
          min-height: 4.7in;
          padding: 0.45in 0.6in;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-left: 1px dashed #6b6258;
          border-right: 1px dashed #6b6258;
        }
        .tent-face-top { transform: rotate(180deg); }
        .tent-brand {
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .tent-name {
          margin-top: 0.35rem;
          font-size: 2rem;
          font-weight: 800;
          line-height: 1.1;
        }
        .tent-qr { width: 2.4in; height: 2.4in; margin-top: 0.4rem; }
        .tent-cta { margin-top: 0.35rem; font-size: 1.15rem; font-weight: 700; }
        .tent-fold, .tent-cut {
          border-top: 1px dashed #6b6258;
          text-align: center;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.15rem 0;
        }
        @media print {
          [data-testing-banner], .table-tent-toolbar, [data-hometown-corner] { display: none !important; }
          body { background: white; }
          .tent-sheet { margin: 0 auto; }
          @page { size: letter; margin: 0.4in; }
        }
      `}</style>
      {hometownSiteTesting(ops) ? <TestingBanner /> : null}
      <div className="table-tent-toolbar mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#5c564e]">
          Letter page. Fold on the center line. The top face is upside down so both sides read upright. Cut on the dashed side guides.
        </p>
        <TableTentPrintButton />
      </div>
      <article className="tent-sheet" data-table-tent="true" data-table-url={orderUrl}>
        <p className="tent-cut">Cut</p>
        <Face name={name} cta={cta} qr={qr} flipped />
        <p className="tent-fold">Fold</p>
        <Face name={name} cta={cta} qr={qr} />
        <p className="tent-cut">Cut</p>
      </article>
    </main>
  );
}

function Face({
  name,
  cta,
  qr,
  flipped = false,
}: {
  name: string;
  cta: string;
  qr: string;
  flipped?: boolean;
}) {
  return (
    <section className={flipped ? "tent-face tent-face-top" : "tent-face"}>
      <p className="tent-brand">Hometown Runner</p>
      {name ? <h1 className="tent-name">{name}</h1> : null}
      <img className="tent-qr" src={qr} alt={cta} />
      <p className="tent-cta">{cta}</p>
    </section>
  );
}
