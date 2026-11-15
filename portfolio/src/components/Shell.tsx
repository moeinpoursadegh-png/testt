import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { actions, useSite } from '../content/store';
import { Icon, LinkedInIcon } from './Icon';

const NAV_ICON: Record<string, string> = { '/work': 'work', '/about': 'user', '/resume': 'file', '/contact': 'mail' };

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('mp.theme', next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}

export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <i /><i /><i /><i />
      <b>M</b>
    </span>
  );
}

/** Sets the document title and description on the client; the prerender script does the same at build time. */
export function useHead(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}

export function Shell({ children }: { children: ReactNode }) {
  const { site, preview } = useSite();
  const { pathname } = useLocation();
  const nav = site.nav.filter((n) => n.visible);
  const crumb = pathname === '/' ? 'Portfolio' : pathname.split('/').filter(Boolean)[0];

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      {preview && (
        <div className="preview-bar" role="status">
          <Icon name="eye" />
          <span>Previewing your unpublished draft</span>
          <Link to="/admin" className="btn btn-sm">Back to admin</Link>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => actions.setPreview(false)}>
            Exit preview
          </button>
        </div>
      )}
      <header className="topbar">
        <Link to="/" className="brand" aria-label={`${site.profile.name} — home`}>
          <Logo />
          <span className="brand-name">{site.profile.name}</span>
          <span className="brand-crumb mono" aria-hidden="true">/ {crumb}</span>
        </Link>
        <nav className="topnav" aria-label="Primary">
          {nav.filter((n) => n.path !== '/contact').map((n) => (
            <NavLink key={n.id} to={n.path}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="topbar-actions">
          <ThemeToggle />
          <Link to="/contact" className="btn btn-primary">Contact</Link>
        </div>
      </header>

      <main id="main" tabIndex={-1}>{children}</main>

      <footer className="footer">
        <div className="footer-cta">
          <p className="kicker mono">Contact</p>
          <h2 className="display">Have a complex product problem? <em>Let’s talk.</em></h2>
          <div className="footer-links">
            <a className="btn btn-primary btn-lg" href={`mailto:${site.profile.email}`}>
              <Icon name="mail" /> {site.profile.email}
            </a>
            <a className="btn btn-lg" href={site.profile.linkedin} target="_blank" rel="noreferrer">
              <LinkedInIcon /> LinkedIn <Icon name="out" size={14} />
            </a>
          </div>
        </div>
        <div className="footer-meta mono">
          <span>© {new Date().getFullYear()} {site.profile.name}</span>
          <span>{site.profile.location}</span>
          <Link to="/admin">Admin</Link>
        </div>
      </footer>

      <nav className="dock" aria-label="Primary">
        <NavLink to="/" end><Icon name="frame" size={20} /><span>Home</span></NavLink>
        {nav.map((n) => (
          <NavLink key={n.id} to={n.path}>
            <Icon name={NAV_ICON[n.path] ?? 'frame'} size={20} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
