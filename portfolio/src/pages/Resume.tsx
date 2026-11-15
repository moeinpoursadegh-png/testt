import { useSite } from '../content/store';
import { useMediaUrl } from '../content/media';
import { Icon } from '../components/Icon';
import { useHead } from '../components/Shell';

export default function Resume() {
  const { site } = useSite();
  const { profile } = site;
  useHead(`Résumé — ${profile.name}`, `Résumé of ${profile.name}, ${profile.title}.`);
  const file = useMediaUrl(site.resume.src);

  return (
    <div className="page resume-page">
      <header className="page-head no-print">
        <p className="kicker mono">Résumé</p>
        <h1 className="display">Résumé</h1>
        <div className="hero-cta">
          {file.status === 'ready' && (
            <a className="btn btn-primary" href={file.url} download={site.resume.fileName || true}>
              <Icon name="download" /> Download PDF
            </a>
          )}
          <button type="button" className="btn" onClick={() => window.print()}><Icon name="print" /> Print</button>
        </div>
      </header>

      <article className="sheet" aria-label="Résumé preview">
        <header>
          <h2>{profile.name}</h2>
          <p className="sheet-role">{profile.title} | {profile.focus}</p>
          <p className="sheet-contact">
            {profile.location} · <a href={`mailto:${profile.email}`}>{profile.email}</a>
            {profile.showPhone && profile.phone ? <> · {profile.phone}</> : null}
            {' · '}<a href={profile.website}>{profile.website.replace(/^https?:\/\//, '')}</a>
            {' · '}<a href={profile.linkedin}>LinkedIn</a>
          </p>
        </header>
        <section>
          <h3>Professional summary</h3>
          <p>{profile.bio.slice(0, 2).join(' ')}</p>
        </section>
        <section>
          <h3>Experience</h3>
          {site.experience.map((e) => (
            <div key={e.id} className="sheet-job">
              <p className="sheet-job-head"><strong>{e.company}</strong> — {e.role}<span>{e.period} · {e.meta}</span></p>
              <ul>{e.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          ))}
        </section>
        <section>
          <h3>Skills</h3>
          <ul className="sheet-skills">
            {site.skills.map((g) => <li key={g.id}><strong>{g.title}:</strong> {g.items.join(', ')}</li>)}
          </ul>
        </section>
        <section>
          <h3>Education &amp; certification</h3>
          {site.education.map((e) => (
            <p key={e.id}><strong>{e.title}</strong>{e.org && ` | ${e.org}`}{e.period && ` | ${e.period}`}{e.note && <><br />{e.note}</>}</p>
          ))}
        </section>
      </article>
    </div>
  );
}
