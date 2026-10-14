import { ClubTasteQuiz } from "@/components/club-taste-quiz";
import type { CustomerReferenceSite } from "@/lib/seed-comparable-research";
import type { SeedSiteCopy } from "@/lib/seed-site-copy";

const CLUB_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap");

.club {
  --sand: #f6f1e7;
  --charcoal: #2a211c;
  --burgundy: #8c2f45;
  --wine: #3f1826;
  --line: rgba(42, 33, 28, 0.14);
  background: var(--sand);
  color: var(--charcoal);
  font-family: Outfit, system-ui, sans-serif;
  min-height: 100vh;
}

.club * { box-sizing: border-box; }

.club a { color: inherit; }

.club-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem clamp(1.1rem, 4vw, 2.5rem);
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(246, 241, 231, 0.94);
  border-bottom: 1px solid var(--line);
}

.club-brand {
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 1.05rem;
  text-decoration: none;
  letter-spacing: -0.01em;
}

.club-nav ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.club-nav a {
  text-decoration: none;
  font-size: 0.92rem;
}

.club-nav a:hover { color: var(--burgundy); }

.club-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(16rem, 0.85fr);
  min-height: min(78vh, 44rem);
  background: var(--wine);
  color: var(--sand);
}

.club-hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.2rem;
  padding: clamp(2rem, 6vw, 4.5rem);
}

.club-kicker {
  margin: 0 0 0.65rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 600;
}

.club-hero h1 {
  margin: 0 0 1rem;
  font-family: "Source Serif 4", Georgia, serif;
  font-weight: 500;
  font-size: clamp(3rem, 6.4vw, 5.5rem);
  line-height: 0.92;
  letter-spacing: -0.03em;
}

.club-hero .club-support {
  max-width: 36rem;
  margin: 0 0 1.6rem;
  font-size: 1.12rem;
  line-height: 1.5;
  color: rgba(246, 241, 231, 0.88);
}

.club-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 2.85rem;
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  background: var(--burgundy);
  color: var(--sand);
  text-decoration: none;
  font-weight: 600;
}

.club-cta:hover { background: #74263a; }

.club-hero-photo {
  background-position: center;
  background-size: cover;
  min-height: 18rem;
}

.club-section {
  padding: clamp(2.5rem, 6vw, 4.5rem) clamp(1.1rem, 4vw, 2.5rem);
}

.club-section-inner {
  max-width: 68rem;
  margin: 0 auto;
}

.club h2 {
  margin: 0 0 0.8rem;
  font-family: "Source Serif 4", Georgia, serif;
  font-weight: 500;
  font-size: clamp(2rem, 4vw, 3.1rem);
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.club-lead {
  max-width: 40rem;
  margin: 0 0 1.5rem;
  font-size: 1.08rem;
  line-height: 1.55;
}

.club-quiz-wrap {
  background: #fffdf8;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.club-quiz h3,
.club-quiz-result h3 {
  margin: 0 0 1.1rem;
  max-width: 22ch;
  font-family: "Source Serif 4", Georgia, serif;
  font-weight: 500;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.club-quiz-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.club-quiz-options button {
  min-height: 2.85rem;
  min-width: 7.5rem;
  padding: 0.7rem 1.1rem;
  border: 1px solid var(--charcoal);
  border-radius: 999px;
  background: transparent;
  color: var(--charcoal);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.club-quiz-options button:hover,
.club-quiz-options button.is-selected {
  background: var(--burgundy);
  border-color: var(--burgundy);
  color: var(--sand);
}

.club-text-button {
  margin-top: 1.1rem;
  padding: 0.4rem 0;
  border: 0;
  background: none;
  color: var(--burgundy);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.club-quiz-result p {
  max-width: 40rem;
  line-height: 1.55;
}

.club-quiz-note {
  color: rgba(42, 33, 28, 0.68);
  font-size: 0.92rem;
}

.club-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem 2rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.club-facts h3 {
  margin: 0 0 0.4rem;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 1.45rem;
  font-weight: 500;
}

.club-facts p,
.club-prose p {
  margin: 0;
  line-height: 1.55;
}

.club-prose p + p { margin-top: 0.9rem; }

.club-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
}

.club-split article + article {
  padding-left: 2.5rem;
  border-left: 1px solid var(--line);
}

.club-aims {
  background: var(--wine);
  color: var(--sand);
}

.club-aims .club-lead { color: rgba(246, 241, 231, 0.82); }

.club-aim-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.club-aim-list strong {
  display: block;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  font-weight: 500;
  letter-spacing: -0.03em;
}

.club-aim-list span {
  display: block;
  margin: 0.2rem 0 0.45rem;
  font-size: 0.92rem;
}

.club-aim-list p {
  margin: 0;
  color: rgba(246, 241, 231, 0.75);
  font-size: 0.92rem;
  line-height: 1.45;
}

.club-refs {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 1rem;
}

.club-refs a {
  font-weight: 600;
  color: var(--burgundy);
}

.club-refs p {
  margin: 0.25rem 0 0;
  line-height: 1.45;
}

.club-footer {
  padding: 1.4rem clamp(1.1rem, 4vw, 2.5rem) 2rem;
  border-top: 1px solid var(--line);
  font-size: 0.92rem;
}

.club-owner-space { padding-bottom: 5.5rem; }

@media (max-width: 800px) {
  .club-nav {
    flex-direction: column;
    align-items: flex-start;
  }

  .club-hero,
  .club-facts,
  .club-split,
  .club-aim-list {
    grid-template-columns: 1fr;
  }

  .club-split article + article {
    padding-left: 0;
    padding-top: 1.5rem;
    border-left: 0;
    border-top: 1px solid var(--line);
  }
}
`;

export function CheeseWineClubSite({
  copy,
  references = [],
  reserveOwnerChrome = false,
}: {
  copy: SeedSiteCopy;
  references?: CustomerReferenceSite[];
  reserveOwnerChrome?: boolean;
}) {
  return (
    <div className={reserveOwnerChrome ? "club club-owner-space" : "club"}>
      <style dangerouslySetInnerHTML={{ __html: CLUB_CSS }} />
      <header className="club-nav">
        <a className="club-brand" href="#top">
          {copy.brand}
        </a>
        <nav aria-label="Primary">
          <ul>
            <li>
              <a href="#quiz">Taste quiz</a>
            </li>
            <li>
              <a href="#month">The month</a>
            </li>
            <li>
              <a href="#makers">Makers</a>
            </li>
            <li>
              <a href="#aims">Year two</a>
            </li>
            {references.length > 0 ? (
              <li>
                <a href="#references">References</a>
              </li>
            ) : null}
          </ul>
        </nav>
      </header>

      <section className="club-hero" id="top">
        <div className="club-hero-copy">
          <p className="club-kicker">{copy.brand}</p>
          <h1>{copy.headline}</h1>
          <p className="club-support">{copy.support}</p>
          <a className="club-cta" href="#quiz">
            {copy.cta}
          </a>
        </div>
        <div
          className="club-hero-photo"
          style={{ backgroundImage: `url("${copy.heroImage}")` }}
          role="img"
          aria-label="Wine poured for a pairing"
        />
      </section>

      <section className="club-section club-quiz-wrap" id="quiz">
        <div className="club-section-inner">
          <p className="club-kicker">{copy.bookEyebrow}</p>
          <h2>{copy.bookHeadline}</h2>
          <p className="club-lead">{copy.bookBody}</p>
          <ClubTasteQuiz />
        </div>
      </section>

      <section className="club-section" id="month">
        <div className="club-section-inner">
          <p className="club-kicker">{copy.servicesEyebrow}</p>
          <h2>{copy.servicesHeadline}</h2>
          <ul className="club-facts">
            {copy.services.map((service) => (
              <li key={service.title}>
                <h3>{service.title}</h3>
                <p>{service.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="club-section" id="makers">
        <div className="club-section-inner club-split">
          <article>
            <p className="club-kicker">{copy.processEyebrow}</p>
            <h2>{copy.processHeadline}</h2>
            <div className="club-prose">
              {copy.process.map((step) => (
                <p key={step.title}>
                  <strong>{step.title}. </strong>
                  {step.detail}
                </p>
              ))}
            </div>
          </article>
          <article>
            <p className="club-kicker">{copy.aboutEyebrow}</p>
            <h2>{copy.aboutHeadline}</h2>
            <div className="club-prose">
              <p>{copy.aboutBody}</p>
              <p>{copy.areaBody}</p>
            </div>
          </article>
        </div>
      </section>

      <section className="club-section club-aims" id="aims">
        <div className="club-section-inner">
          <p className="club-kicker">{copy.resultsEyebrow}</p>
          <h2>{copy.resultsHeadline}</h2>
          <p className="club-lead">{copy.resultsSupport}</p>
          <ul className="club-aim-list">
            {copy.results.map((stat) => (
              <li key={`${stat.value}-${stat.label}`}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
                <p>{stat.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {references.length > 0 ? (
        <section className="club-section" id="references">
          <div className="club-section-inner">
            <p className="club-kicker">For the person who ordered this site</p>
            <h2>Five sites to open</h2>
            <p className="club-lead">
              These competitors were part of the research. The features are
              on this club. Their headlines stay on their sites.
            </p>
            <ol className="club-refs">
              {references.map((site) => (
                <li key={site.url}>
                  <a href={site.url} target="_blank" rel="noopener noreferrer">
                    {site.host}
                  </a>
                  <p>{site.feature}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <footer className="club-footer">
        <p>{copy.footerNote}</p>
      </footer>
    </div>
  );
}
