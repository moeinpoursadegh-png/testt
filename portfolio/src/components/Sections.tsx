import type { MediaItem, Section } from '../content/types';
import { figmaEmbedUrl, safeUrl, useMediaUrl } from '../content/media';
import { Board } from './Board';
import { Icon } from './Icon';

export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).filter((p) => p.trim()).map((p, i) => <p key={i}>{p}</p>)}
    </>
  );
}

export function MetricCards({ items }: { items: { id: string; value: string; label: string; context: string }[] }) {
  return (
    <dl className="metrics">
      {items.map((m) => (
        <div key={m.id} className="metric">
          <dt>{m.label}</dt>
          <dd>{m.value}</dd>
          <span className="metric-ctx mono">{m.context}</span>
        </div>
      ))}
    </dl>
  );
}

export function Media({ item }: { item: MediaItem }) {
  const { url, status } = useMediaUrl(item.src);
  let body;
  if (status === 'empty') {
    body = (
      <div className="media-ph canvas-dots" role="img" aria-label={`Placeholder for: ${item.caption || item.kind}`}>
        <Icon name={item.kind === 'pdf' ? 'file' : 'image'} size={22} />
        <span className="mono">Placeholder {item.kind}</span>
      </div>
    );
  } else if (status === 'loading') {
    body = <div className="media-ph is-loading" aria-busy="true"><span className="mono">Loading…</span></div>;
  } else if (status === 'error') {
    body = <div className="media-ph is-error" role="alert"><Icon name="info" size={20} /><span className="mono">This file is not available in this browser</span></div>;
  } else if (item.kind === 'video') {
    body = <video src={url} controls preload="metadata" aria-label={item.alt} />;
  } else if (item.kind === 'pdf') {
    body = (
      <a className="media-ph media-pdf" href={url} target="_blank" rel="noreferrer">
        <Icon name="file" size={22} /><span>{item.alt || 'Open PDF'}</span><Icon name="out" size={14} />
      </a>
    );
  } else {
    body = <img src={url} alt={item.alt} loading="lazy" decoding="async" />;
  }
  return (
    <figure className="media">
      {body}
      {item.caption && <figcaption>{item.caption}</figcaption>}
    </figure>
  );
}

function Embed({ kind, url }: { kind: string; url: string }) {
  const link = safeUrl(url);
  const embed = figmaEmbedUrl(url);
  const label = kind === 'figjam' ? 'FigJam board' : kind === 'figma' ? 'Figma file' : kind === 'prototype' ? 'prototype' : 'link';
  if (!link) {
    return (
      <div className="empty">
        <Icon name="link" size={20} />
        <p>No {label} has been linked yet.</p>
      </div>
    );
  }
  return (
    <div className="embed">
      {embed && <iframe src={embed} title={`Embedded ${label}`} loading="lazy" allowFullScreen />}
      <a className="btn" href={link} target="_blank" rel="noreferrer">
        Open the {label} in a new tab <Icon name="out" size={14} />
      </a>
    </div>
  );
}

function Body({ s }: { s: Section }) {
  switch (s.type) {
    case 'text':
      return <div className="prose"><Paragraphs text={s.body} /></div>;
    case 'list':
      return (
        <div className="prose">
          <Paragraphs text={s.intro} />
          <ol className="numbered">{s.items.map((it, i) => <li key={i}>{it}</li>)}</ol>
        </div>
      );
    case 'metrics':
      return (
        <>
          <div className="prose"><Paragraphs text={s.intro} /></div>
          <MetricCards items={s.items} />
        </>
      );
    case 'board':
      return (
        <>
          <div className="prose"><Paragraphs text={s.intro} /></div>
          <Board clusters={s.clusters} figjamUrl={s.figjamUrl} />
        </>
      );
    case 'flow':
      return (
        <>
          <div className="prose"><Paragraphs text={s.intro} /></div>
          <ol className="flow">
            {s.steps.map((st, i) => (
              <li key={st.id}>
                <span className="flow-n mono">{String(i + 1).padStart(2, '0')}</span>
                <strong>{st.title}</strong>
                <p>{st.body}</p>
              </li>
            ))}
          </ol>
        </>
      );
    case 'decisions':
      return (
        <>
          <div className="prose"><Paragraphs text={s.intro} /></div>
          <ul className="decisions">
            {s.items.map((d, i) => (
              <li key={d.id}>
                <span className="mono">Decision {i + 1}</span>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </li>
            ))}
          </ul>
        </>
      );
    case 'media':
      return (
        <>
          <div className="prose"><Paragraphs text={s.intro} /></div>
          {s.items.length ? (
            <div className={`media-grid n${Math.min(s.items.length, 4)}`}>{s.items.map((m) => <Media key={m.id} item={m} />)}</div>
          ) : (
            <div className="empty"><Icon name="image" size={20} /><p>No media added yet.</p></div>
          )}
        </>
      );
    case 'embed':
      return (
        <>
          <div className="prose"><Paragraphs text={s.intro} /></div>
          <Embed kind={s.kind} url={s.url} />
        </>
      );
  }
}

export function SectionView({ section }: { section: Section }) {
  return (
    <section id={section.id} className={`cs-section cs-${section.type}`} aria-labelledby={`${section.id}-h`}>
      <header className="cs-section-head">
        <p className="kicker mono">
          {section.kicker}
          {section.placeholder && <span className="ph-badge">Illustrative placeholder</span>}
        </p>
        <h2 id={`${section.id}-h`}>{section.title}</h2>
      </header>
      <Body s={section} />
    </section>
  );
}
