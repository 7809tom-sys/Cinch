import Link from "next/link";
import { redirect } from "next/navigation";
import { HOMETOWN_PUBLIC_WELCOME } from "@/lib/seed-delivery";
import { ensureHometownHomeTown } from "@/lib/hometown-home-town";
import { seedRestaurantFulfillmentModes } from "@/lib/seed-site-copy";
import {
  HOMETOWN_ACCOUNT_PATH,
  HOMETOWN_PRIVACY_PATH,
  listHometownMarkets,
} from "@/lib/hometown-store";
import {
  assembleHometownDiner,
  sampleHometownDinner,
} from "@/lib/hometown-diner-model";
import { HometownDiner } from "@/components/delivery/hometown-diner";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { buildSeedShopPreview } from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import { openHometownMarketAction } from "./actions";

export const dynamic = "force-dynamic";

const fieldClass =
  "mt-1 block min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-base text-[#1a1714]";

const EMPTY_TAX = {
  enabled: false,
  ratePct: 0,
  taxInclusive: false,
  nexusStates: [] as string[],
  notes: "",
};

export default async function HometownAppPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; town?: string; kitchen?: string }>;
}) {
  const query = await searchParams;
  let markets = await listHometownMarkets();
  if (markets.length === 0) {
    await ensureHometownHomeTown();
    markets = await listHometownMarkets();
  }
  if (markets.length === 1 && query.error !== "market") {
    redirect(`/site/${markets[0].id}/shop`);
  }
  const selected =
    markets.find((market) => market.id === query.town) ?? markets[0] ?? null;

  let model = sampleHometownDinner({
    welcome: HOMETOWN_PUBLIC_WELCOME,
    accountHref: HOMETOWN_ACCOUNT_PATH,
    privacyHref: HOMETOWN_PRIVACY_PATH,
  });

  if (selected) {
    const project = await getProject(selected.id);
    if (project) {
      const [ops, shop] = await Promise.all([
        ensureDeliveryOpsInSeed(project),
        buildSeedShopPreview(project),
      ]);
      if (ops) {
        const townName = project.name.replace(/\s+seed$/i, "").trim() || project.name;
        model = assembleHometownDiner({
          preview: false,
          welcome: HOMETOWN_PUBLIC_WELCOME,
          townName,
          projectId: project.id,
          ops,
          storefront: shop?.products ?? [],
          shippingModes: shop?.shippingModes?.length
            ? shop.shippingModes
            : seedRestaurantFulfillmentModes(),
          salesTax: shop?.salesTax ?? EMPTY_TAX,
          towns: markets.map((market) => ({
            id: market.id,
            name: market.name,
            href: `/hometown?town=${encodeURIComponent(market.id)}`,
            selected: market.id === project.id,
          })),
          signInHref: `/site/${project.id}/enter`,
          merchantHref: `/site/${project.id}/enter?role=merchant`,
          driverHref: `/site/${project.id}/enter?role=driver`,
          accountHref: `${HOMETOWN_ACCOUNT_PATH}?market=${project.id}`,
          privacyHref: HOMETOWN_PRIVACY_PATH,
          websiteHref: `/site/${project.id}`,
        });
      }
    }
  }

  return (
    <div className="bg-[#f6f3ee] text-[#1a1714]">
      {query.error === "market" ? (
        <p
          className="mx-auto w-full max-w-6xl px-4 pt-4 text-sm font-semibold text-[#8a3b24]"
          role="alert"
        >
          That town isn&apos;t open. Pick one below.
        </p>
      ) : null}
      <HometownDiner
        key={model.projectId ?? "sample"}
        model={model}
        initialKitchenId={query.kitchen ?? null}
      />
      <section
        id="open-market"
        className="mx-auto w-full max-w-6xl px-4 pb-16"
      >
        <div className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(26,23,20,0.06)] sm:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2e2a]">
            Open a market
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#5c564f]">
            Choose your town, then order dinner, run a kitchen, or drive.
          </p>
          <form action={openHometownMarketAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#1a1714]">
              Town
              {markets.length > 0 ? (
                <select
                  name="marketCode"
                  required
                  className={fieldClass}
                  defaultValue={selected?.id ?? markets[0]?.id}
                >
                  {markets.map((market) => (
                    <option key={market.id} value={market.id}>
                      {market.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="marketCode"
                  required
                  autoComplete="off"
                  placeholder="From your kitchen"
                  className={fieldClass}
                />
              )}
            </label>
            <label className="block text-sm font-semibold text-[#1a1714]">
              I&apos;m here to
              <select name="destination" className={fieldClass} defaultValue="shop">
                <option value="shop">Order dinner</option>
                <option value="customer">Sign in</option>
                <option value="merchant">Run a kitchen</option>
                <option value="driver">Drive</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#e8a54b] px-5 text-sm font-bold text-[#1a1714] sm:col-span-2 sm:w-fit"
            >
              Continue
            </button>
          </form>
        </div>
        <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#0b2e2a]">
          <Link href={HOMETOWN_PRIVACY_PATH} className="underline">
            Privacy
          </Link>
          <Link href={HOMETOWN_ACCOUNT_PATH} className="underline">
            Delete login
          </Link>
          <Link href="/legal" className="underline">
            Terms
          </Link>
        </footer>
      </section>
    </div>
  );
}
