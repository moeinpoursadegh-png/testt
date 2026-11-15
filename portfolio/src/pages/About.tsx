import { Link } from 'react-router-dom';
import { useSite } from '../content/store';
import { useMediaUrl } from '../content/media';
import { Icon } from '../components/Icon';
import { useHead } from '../components/Shell';

export default function About() {
  const { site, preview } = useSite();
  const { profile } = site;
  useHead(`About — ${profile.name}`, profile.summary);
  const portrait = useMediaUrl(profile.portrait.src);
  const slugs = new Set(site.projects.filter((p) => preview || p.status === 'published').map((p) => p.slug));

  return (
    <div className="page">
      <header className="page-head about-head">
        <div>
          <p className="kicker mono">About · {profile.location}</p>
          <h1 className="display">{profile.title}, <em>{profile.focus}</em></h1>
          <div className="prose">{profile.bio.map((p, i) => <p key={i}>{p}</p>)}</div>
          <div className="hero-cta">
            <Link to="/resume" className="btn btn-primary">View résumé <Icon name="arrow" size={14} /></Link>
            <Link to="/contact" className="btn">Get in touch</Link>
          </div>
        </div>
        <figure className="portrait">
          {portrait.status === 'ready' ? (
            <img src={portrait.url} alt={profile.portrait.alt} />
          ) : (
            <div className="media-ph canvas-dots" role="img" aria-label="Portrait placeholder">
              <Icon name="user" size={28} /><span className="mono">Portrait placeholder</span>
            </div>
          )}
        </figure>
      </header>

      <section className="band" aria-labelledby="xp-h">
        <header className="band-head"><div><p className="kicker mono">Experience</p><h2 id="xp-h" className="display">Experience</h2></div></header>
        <ol className="timeline">
          {site.experience.map((e) => (
            <li key={e.id}>
              <div className="timeline-side">
                <span className="mono">{e.period}</span>
                <span className="mono muted">{e.meta}</span>
              </div>
              <div>
                <h3>{e.company} <span>· {e.role}</span></h3>
                <ul>{e.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                {slugs.has(e.projectSlug) && (
                  <Link to={`/work/${e.projectSlug}`} className="text-link">Read the case study <Icon name="arrow" size={14} /></Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="band" aria-labelledby="sk-h">
        <header className="band-head"><div><p className="kicker mono">Skills</p><h2 id="sk-h" className="display">Skills &amp; tools</h2></div></header>
        <div className="skills">
          {site.skills.map((g) => (
            <div key={g.id}>
              <h3>{g.title}</h3>
              <ul className="chips">{g.items.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="ed-h">
        <header className="band-head"><div><p className="kicker mono">Education</p><h2 id="ed-h" className="display">Education &amp; certification</h2></div></header>
        <ul className="edu">
          {site.education.map((e) => (
            <li key={e.id}>
              <h3>{e.title}</h3>
              <p>{[e.org, e.period].filter(Boolean).join(' · ')}</p>
              {e.note && <p className="muted">{e.note}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
