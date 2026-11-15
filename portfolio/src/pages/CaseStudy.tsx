import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSite } from '../content/store';
import { safeUrl } from '../content/media';
import { Cover } from '../components/Cover';
import { Icon } from '../components/Icon';
import { MetricCards, SectionView } from '../components/Sections';
import { useHead } from '../components/Shell';
import { visibleProjects } from './Home';
import NotFound from './NotFound';

const LINK_LABEL = { figma: 'Figma', figjam: 'FigJam', prototype: 'Prototype', external: 'Link' } as const;

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');
  const key = ids.join('|');
  useEffect(() => {
    const els = ids.map((i) => document.getElementById(i)).filter((e) => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}

export default function CaseStudy() {
  const { slug } = useParams();
  const { site, preview } = useSite();
  const projects = visibleProjects(site, preview);
  const index = projects.findIndex((p) => p.slug === slug);
  const project = projects[index];
  const active = useActiveSection(project ? project.sections.map((s) => s.id) : []);
  useHead(
    project ? project.seo.title || `${project.title} — ${site.profile.name}` : 'Not found',
    project ? project.seo.description || project.summary : undefined,
  );
  if (!project) return <NotFound />;

  const next = projects[(index + 1) % projects.length];
  const props: [string, string][] = [
    ['Role', project.role],
    ['Timeline', project.period],
    ['Engagement', project.employment],
    ['Team', project.team],
    ['Scope', project.scope],
    ['Platforms', project.platforms.join(', ')],
  ];
  const links = project.links.map((l) => ({ ...l, url: safeUrl(l.url) })).filter((l) => l.url);

  return (
    <article className={`case accent-${project.accent}`}>
      <header className="case-head">
        <p className="crumbs mono">
          <Link to="/work">Work</Link> / {project.title}
          {project.status === 'draft' && <span className="tag tag-warn">Draft</span>}
        </p>
        <h1 className="display">{project.headline}</h1>
        <p className="lede">{project.summary}</p>
        {project.metrics.length > 0 && <MetricCards items={project.metrics} />}
      </header>

      <div className="case-cover"><Cover project={project} eager /></div>

      <div className="case-grid">
        <nav className="layers" aria-label="Case study sections">
          <p className="panel-title mono">Sections</p>
          <ol>
            {project.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
                  <Icon name={s.type === 'board' ? 'note' : s.type === 'media' ? 'image' : 'frame'} size={12} />
                  <span>{s.kicker}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="case-body">
          {project.sections.length ? (
            project.sections.map((s) => <SectionView key={s.id} section={s} />)
          ) : (
            <div className="empty"><Icon name="note" size={20} /><p>This case study is being written.</p></div>
          )}
        </div>

        <aside className="inspector" aria-label="Project details">
          <p className="panel-title mono">Project</p>
          <dl>
            {props.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {project.methods.length > 0 && (
            <>
              <p className="panel-title mono">Methods</p>
              <ul className="chips">{project.methods.map((m) => <li key={m}>{m}</li>)}</ul>
            </>
          )}
          {links.length > 0 && (
            <>
              <p className="panel-title mono">Links</p>
              <ul className="link-list">
                {links.map((l) => (
                  <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      <span className="mono">{LINK_LABEL[l.kind]}</span> {l.label || l.url} <Icon name="out" size={12} />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>

      {next && next.id !== project.id && (
        <Link to={`/work/${next.slug}`} className={`next accent-${next.accent}`}>
          <span className="kicker mono">Next project</span>
          <span className="display">{next.title} <Icon name="arrow" size={28} /></span>
          <span>{next.headline}</span>
        </Link>
      )}
    </article>
  );
}
