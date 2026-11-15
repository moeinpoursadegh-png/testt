import { Link } from 'react-router-dom';
import { useSite } from '../content/store';
import type { Site } from '../content/types';
import { Icon } from '../components/Icon';
import { ProjectFrame } from '../components/ProjectFrame';
import { useHead } from '../components/Shell';

/** `*word*` in the headline becomes the emphasized phrase. */
export function Headline({ text }: { text: string }) {
  return <>{text.split('*').map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))}</>;
}

export function visibleProjects(site: Site, preview: boolean) {
  return site.projects.filter((p) => preview || p.status === 'published');
}

const APPROACH = [
  ['Discover', 'Find the problems worth solving with interviews, behavioral analytics and audits.', 'k-research'],
  ['Decide', 'Turn evidence into priorities and align product, engineering and stakeholders on trade-offs.', 'k-product'],
  ['Design', 'Shape flows, interactions and systems that hold up across platforms.', 'k-systems'],
  ['Validate', 'Test with people, measure what changed, and hand off work that is ready to build.', 'k-methods'],
] as const;

export default function Home() {
  const { site, preview } = useSite();
  const { profile } = site;
  useHead(site.seo.title, site.seo.description);

  const all = visibleProjects(site, preview);
  const featured = site.featured.map((id) => all.find((p) => p.id === id)).filter((p) => !!p);
  const shown = featured.length ? featured : all.slice(0, 4);
  const notes = shown.filter((p) => p.metrics[0]).slice(0, 3);

  return (
    <>
      <section className="hero canvas-dots">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow mono">
              <span className="dot" /> {profile.title} · {profile.focus}
            </p>
            <h1 className="display hero-title">
              <span className="selection">
                <span className="selection-label mono" aria-hidden="true">{profile.name}</span>
                <span className="handles" aria-hidden="true"><i /><i /><i /><i /></span>
                <Headline text={profile.headline} />
              </span>
            </h1>
            <p className="lede">{profile.summary}</p>
            <div className="hero-cta">
              <Link to="/work" className="btn btn-primary btn-lg">View selected work <Icon name="arrow" /></Link>
              <Link to="/resume" className="btn btn-lg">Résumé</Link>
            </div>
          </div>

          <ul className="hero-notes" aria-label="Highlights from selected projects">
            {notes.map((p, i) => (
              <li key={p.id} className={`sticky accent-${p.accent} tilt-${i}`}>
                <Link to={`/work/${p.slug}`}>
                  <strong>{p.metrics[0].value}</strong>
                  <p>{p.metrics[0].label}</p>
                  <span className="sticky-foot mono">{p.title} · {p.metrics[0].context}</span>
                </Link>
              </li>
            ))}
          </ul>

          <span className="cursor cursor-a" aria-hidden="true"><Icon name="cursor" size={18} /><b>Research</b></span>
          <span className="cursor cursor-b" aria-hidden="true"><Icon name="cursor" size={18} /><b>Interaction</b></span>
        </div>
      </section>

      <section className="band" aria-labelledby="work-h">
        <header className="band-head">
          <div>
            <p className="kicker mono">Selected work</p>
            <h2 id="work-h" className="display">Problems, decisions, <em>evidence.</em></h2>
          </div>
          <Link to="/work" className="btn">All projects <Icon name="arrow" size={14} /></Link>
        </header>
        {shown.length ? (
          <div className="frames">
            {shown.map((p, i) => <ProjectFrame key={p.id} project={p} index={i} eager={i < 2} />)}
          </div>
        ) : (
          <div className="empty"><Icon name="frame" size={20} /><p>No published projects yet.</p></div>
        )}
      </section>

      <section className="band" aria-labelledby="approach-h">
        <header className="band-head">
          <div>
            <p className="kicker mono">Approach</p>
            <h2 id="approach-h" className="display">From discovery <em>to handoff.</em></h2>
          </div>
        </header>
        <ol className="approach">
          {APPROACH.map(([title, body, group], i) => (
            <li key={title}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <ul className="chips">
                {(site.skills.find((s) => s.id === group)?.items ?? []).slice(0, 4).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="band" aria-labelledby="exp-h">
        <header className="band-head">
          <div>
            <p className="kicker mono">Experience</p>
            <h2 id="exp-h" className="display">Where I’ve <em>worked.</em></h2>
          </div>
          <Link to="/about" className="btn">About me <Icon name="arrow" size={14} /></Link>
        </header>
        <ul className="exp-list">
          {site.experience.map((e) => (
            <li key={e.id}>
              <strong>{e.company}</strong>
              <span>{e.role}</span>
              <span className="mono">{e.meta}</span>
              <span className="mono">{e.period}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
