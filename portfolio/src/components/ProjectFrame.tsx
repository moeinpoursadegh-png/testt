import { Link } from 'react-router-dom';
import type { Project } from '../content/types';
import { Cover } from './Cover';
import { Icon } from './Icon';

/** A project presented as a frame on the canvas: label above, selectable body. */
export function ProjectFrame({ project, index, eager }: { project: Project; index: number; eager?: boolean }) {
  const m = project.metrics[0];
  return (
    <article className={`frame accent-${project.accent}`}>
      <div className="frame-label mono">
        <Icon name="frame" size={12} />
        <span>{String(index + 1).padStart(2, '0')} · {project.title}</span>
        <span className="frame-label-end">{project.period}</span>
      </div>
      <Link to={`/work/${project.slug}`} className="frame-body">
        <span className="handles" aria-hidden="true"><i /><i /><i /><i /></span>
        <Cover project={project} eager={eager} />
        <div className="frame-meta">
          <div className="tags">
            {project.domains.map((d) => <span key={d} className="tag">{d}</span>)}
            {project.status === 'draft' && <span className="tag tag-warn">Draft</span>}
          </div>
          <h3>{project.headline}</h3>
          <p>{project.summary}</p>
          {m && (
            <p className="frame-metric">
              <strong>{m.value}</strong>
              <span>{m.label} <em className="mono">· {m.context}</em></span>
            </p>
          )}
          <span className="frame-cta">Read case study <Icon name="arrow" size={14} /></span>
        </div>
      </Link>
    </article>
  );
}

export function ProjectRow({ project, index }: { project: Project; index: number }) {
  const m = project.metrics[0];
  return (
    <Link to={`/work/${project.slug}`} className={`row accent-${project.accent}`}>
      <span className="row-num mono">{String(index + 1).padStart(2, '0')}</span>
      <span className="row-main">
        <strong>{project.title}</strong>
        <span>{project.headline}</span>
      </span>
      <span className="row-tags">{project.domains.join(' · ')}</span>
      <span className="row-metric">{m ? <><b>{m.value}</b> {m.label}</> : null}</span>
      <span className="row-period mono">{project.period}</span>
      <Icon name="arrow" />
    </Link>
  );
}
