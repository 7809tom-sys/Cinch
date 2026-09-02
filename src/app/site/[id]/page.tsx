import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerOwnsProject, getCurrentCustomer } from "@/lib/customer-auth";
import {
  establishMasterSession,
  getMasterSession,
  isMasterEmail,
} from "@/lib/master-auth";
import {
  buildSeedSitePreview,
  briefAsksForEcommerce,
  ensureBusinessAdminInSeed,
  ensureShopInSeed,
  repairCustomerLandingIfNeeded,
  seedNeedsBusinessAdmin,
} from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import { SiteOwnerChrome } from "./owner-chrome";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return { title: "Seed site" };
  return {
    title: project.name,
    description: project.brief.slice(0, 160),
    robots: project.sitePublishedAt ? "index,follow" : "noindex",
  };
}

/**
 * Public live website for a Seed — full multi-section site, not a hero stub.
 * Owners (and master admins) see Publish / Library / Admin on the preview.
 */
export default async function PublicSeedSitePage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  await repairCustomerLandingIfNeeded(project);
  if (seedNeedsBusinessAdmin(project.brief)) {
    await ensureBusinessAdminInSeed(project);
  }
  if (briefAsksForEcommerce(project.brief)) {
    await ensureShopInSeed(project);
  }
  const preview = await buildSeedSitePreview(project);
  const showShop = briefAsksForEcommerce(project.brief);

  const [customer, master] = await Promise.all([
    getCurrentCustomer(),
    getMasterSession(),
  ]);

  // Portal login for a master-email account may only set the customer cookie.
  // Promote to a real master session so Cinch build-room links still work.
  let masterSession = master;
  if (!masterSession && customer && isMasterEmail(customer.email)) {
    await establishMasterSession({
      email: customer.email,
      name: customer.name || customer.email.split("@")[0] || customer.email,
    });
    masterSession = await getMasterSession();
  }

  const isMaster = Boolean(
    masterSession || (customer && isMasterEmail(customer.email)),
  );
  const isOwner = Boolean(
    customer &&
      (customerOwnsProject(customer, project.id) ||
        project.customerEmail === customer.email),
  );
  const showOwnerChrome = isOwner || isMaster;
  const businessAdminHref =
    (isOwner || isMaster) && seedNeedsBusinessAdmin(project.brief)
      ? `/site/${project.id}/admin`
      : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: preview.css }} />
      <main
        className="seed-site"
        style={showOwnerChrome ? { paddingBottom: "5.5rem" } : undefined}
      >
        <nav className="seed-nav" aria-label="Primary">
          <a className="seed-nav-brand" href="#top">
            {preview.brand}
          </a>
          <ul className="seed-nav-links">
            <li>
              <a href="#services">Services</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
            {showShop ? (
              <li>
                <a href={`/site/${project.id}/shop`}>Shop</a>
              </li>
            ) : null}
            <li>
              <a href="#book">{preview.cta}</a>
            </li>
          </ul>
        </nav>

        <section className="seed-hero" id="top">
          <div
            className="seed-hero-media"
            style={{ backgroundImage: `url("${preview.heroImage}")` }}
            aria-hidden
          />
          <div className="seed-hero-scrim" aria-hidden />
          <div className="seed-hero-copy">
            <p className="brand">{preview.brand}</p>
            <h1>{preview.headline}</h1>
            <p className="support">{preview.support}</p>
            <a className="cta" href="#book">
              {preview.cta}
            </a>
          </div>
        </section>

        <section className="seed-section seed-services" id="services">
          <div className="seed-section-inner">
            <p className="seed-eyebrow">{preview.servicesEyebrow}</p>
            <h2>{preview.servicesHeadline}</h2>
            <ul className="seed-service-list">
              {preview.services.map((service) => (
                <li key={service.title}>
                  <h3>{service.title}</h3>
                  <p>{service.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="seed-section seed-about" id="about">
          <div className="seed-section-inner">
            <p className="seed-eyebrow">{preview.aboutEyebrow}</p>
            <h2>{preview.aboutHeadline}</h2>
            <p className="lead">{preview.aboutBody}</p>
          </div>
        </section>

        <section className="seed-section seed-book" id="book">
          <div className="seed-section-inner">
            <p className="seed-eyebrow">{preview.bookEyebrow}</p>
            <h2>{preview.bookHeadline}</h2>
            <p className="lead">{preview.bookBody}</p>
            <form className="seed-book-form" action="#" method="post">
              <label>
                Name
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label>
                Phone or email
                <input name="contact" type="text" autoComplete="tel" required />
              </label>
              <label>
                What do you need?
                <textarea name="notes" rows={4} />
              </label>
              <button className="cta" type="submit">
                {preview.cta}
              </button>
            </form>
            <p className="book-note">{preview.bookNote}</p>
          </div>
        </section>

        <footer className="seed-footer">
          <p>{preview.footerNote}</p>
        </footer>
      </main>
      {showOwnerChrome ? (
        <SiteOwnerChrome
          projectId={project.id}
          projectName={project.name}
          sitePublished={Boolean(project.sitePublishedAt)}
          listedInLibrary={Boolean(project.marketplaceListingId)}
          marketplaceListingId={project.marketplaceListingId}
          showPublishControls={isOwner || isMaster}
          portalHref={isOwner || isMaster ? `/portal/${project.id}` : null}
          editHref={isOwner || isMaster ? `/portal/${project.id}/edit` : null}
          adminHref={businessAdminHref}
        />
      ) : null}
    </>
  );
}
