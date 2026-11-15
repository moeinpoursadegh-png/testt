import { useMemo, useState } from 'react';
import { useSite } from '../content/store';
import { Icon } from '../components/Icon';
import { ProjectFrame, ProjectRow } from '../components/ProjectFrame';
import { useHead } from '../components/Shell';
import { visibleProjects } from './Home';

export default function Work() {
  const { site, preview } = useSite();
  useHead(`Work — ${site.profile.name}`, 'Selected product design case studies across fintech, healthcare, SaaS and AI-assisted products.');
  const projects = visibleProjects(site, preview);
  const domains = useMemo(() => [...new Set(projects.flatMap((p) => p.domains))], [projects]);
  const [filter, setFilter] = useState('All');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const active = domains.includes(filter) ? filter : 'All';
  const shown = active === 'All' ? projects : projects.filter((p) => p.domains.includes(active));

  return (
    <section className="page">
      <header className="page-head">
        <p className="kicker mono">Work · {projects.length} projects</p>
        <h1 className="display">Selected <em>work</em></h1>
        <p className="lede">Case studies from fintech, healthcare, SaaS and AI-assisted products, ordered by depth of evidence.</p>
      </header>

      <div className="browser-bar">
        <div className="tabs" role="group" aria-label="Filter by domain">
          {['All', ...domains].map((d) => (
            <button key={d} type="button" aria-pressed={active === d} onClick={() => setFilter(d)}>{d}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Layout">
          <button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} aria-label="Grid view"><Icon name="grid" /></button>
          <button type="button" aria-pressed={layout === 'list'} onClick={() => setLayout('list')} aria-label="List view"><Icon name="list" /></button>
        </div>
      </div>

      {!shown.length ? (
        <div className="empty"><Icon name="frame" size={20} /><p>No projects to show here yet.</p></div>
      ) : layout === 'grid' ? (
        <div className="frames">{shown.map((p, i) => <ProjectFrame key={p.id} project={p} index={projects.indexOf(p)} eager={i < 2} />)}</div>
      ) : (
        <div className="rows">{shown.map((p) => <ProjectRow key={p.id} project={p} index={projects.indexOf(p)} />)}</div>
      )}
    </section>
  );
}
