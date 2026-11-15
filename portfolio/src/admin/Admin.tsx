import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { actions, isDirty, parseSite, uid, useStore } from '../content/store';
import type { Experience, NavItem, SkillGroup } from '../content/types';
import { Icon } from '../components/Icon';
import { Logo, ThemeToggle } from '../components/Shell';
import ProjectEditor, { newProject } from './ProjectEditor';
import { Card, Confirm, FilePick, Lines, ListEditor, move, reId, Select, Text, Toasts, Toggle, useToast } from './ui';
import '../styles/admin.css';

const PAGES = ['/work', '/about', '/resume', '/contact'] as const;

/* ── Projects ── */
function Projects() {
  const { draft } = useStore();
  const nav = useNavigate();
  const toast = useToast();
  const [del, setDel] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const target = draft.projects.find((p) => p.id === del);
  const list = draft.projects.filter((p) => filter === 'all' || p.status === filter);
  const reorder = (from: number, to: number) => actions.update((d) => { d.projects = move(d.projects, from, to); });

  const create = () => {
    const p = newProject();
    actions.update((d) => { d.projects.push(p); });
    nav(`/admin/projects/${p.id}`);
  };

  return (
    <>
      <PageHead title="Projects" hint="Order here is the order on the Work page. Drag rows or use the arrows.">
        <button type="button" className="btn btn-primary" onClick={create}><Icon name="plus" /> New project</button>
      </PageHead>
      <div className="tabs" role="group" aria-label="Filter projects">
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)} <span className="pill">{f === 'all' ? draft.projects.length : draft.projects.filter((p) => p.status === f).length}</span>
          </button>
        ))}
      </div>

      {!list.length ? (
        <div className="empty">
          <Icon name="frame" size={20} />
          <p>{draft.projects.length ? `No ${filter} projects.` : 'No projects yet. Create the first one.'}</p>
          {!draft.projects.length && <button type="button" className="btn btn-sm" onClick={create}>New project</button>}
        </div>
      ) : (
        <ol className="proj-list">
          {list.map((p) => {
            const i = draft.projects.indexOf(p);
            const featured = draft.featured.includes(p.id);
            return (
              <li
                key={p.id}
                className={drag === i ? 'is-dragging' : ''}
                onDragOver={(e) => drag !== null && e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (drag !== null && drag !== i) reorder(drag, i); setDrag(null); }}
              >
                <span className="le-drag" draggable aria-hidden="true" title="Drag to reorder" onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)}><Icon name="drag" /></span>
                <span className={`proj-chip accent-${p.accent}`} aria-hidden="true" />
                <Link to={`/admin/projects/${p.id}`} className="proj-main">
                  <strong>{p.title}</strong>
                  <span>{p.headline}</span>
                </Link>
                <span className={`pill ${p.status === 'published' ? 'pill-ok' : 'pill-warn'}`}>{p.status}</span>
                <span className="proj-meta mono">{p.sections.length} sections</span>
                <div className="le-actions">
                  <button type="button" className={`icon-btn${featured ? ' is-on' : ''}`} aria-pressed={featured} aria-label={`${featured ? 'Remove from' : 'Add to'} featured on home`}
                    onClick={() => actions.update((d) => { d.featured = featured ? d.featured.filter((x) => x !== p.id) : [...d.featured, p.id]; })}><Icon name="star" /></button>
                  <button type="button" className="icon-btn" disabled={i === 0} aria-label={`Move ${p.title} up`} onClick={() => reorder(i, i - 1)}><Icon name="up" /></button>
                  <button type="button" className="icon-btn" disabled={i === draft.projects.length - 1} aria-label={`Move ${p.title} down`} onClick={() => reorder(i, i + 1)}><Icon name="down" /></button>
                  <button type="button" className="icon-btn" aria-label={`Duplicate ${p.title}`} onClick={() => {
                    const copy = { ...reId(p), title: `${p.title} (copy)`, slug: `${p.slug}-copy-${uid('x').slice(-3)}`, status: 'draft' as const };
                    actions.update((d) => { d.projects.splice(i + 1, 0, copy); });
                    toast(`Duplicated “${p.title}” as a draft`);
                  }}><Icon name="duplicate" /></button>
                  <button type="button" className="icon-btn icon-danger" aria-label={`Delete ${p.title}`} onClick={() => setDel(p.id)}><Icon name="trash" /></button>
                  <Link to={`/admin/projects/${p.id}`} className="btn btn-sm">Edit</Link>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Confirm
        open={!!target} title={`Delete “${target?.title ?? ''}”?`} body="The project and its case study are removed from your draft. This cannot be undone after you publish."
        confirmLabel="Delete project" onClose={() => setDel(null)}
        onConfirm={() => { actions.update((d) => { d.projects = d.projects.filter((x) => x.id !== del); d.featured = d.featured.filter((x) => x !== del); }); toast('Project deleted'); }}
      />
    </>
  );
}

/* ── Profile ── */
function Profile() {
  const { draft } = useStore();
  const p = draft.profile;
  const set = (fn: (d: typeof draft) => void) => actions.update(fn);
  const emailError = p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email) ? 'Enter a valid email address.' : undefined;
  return (
    <>
      <PageHead title="Profile" hint="Introduction, biography, experience, skills and contact details." />
      <Card title="Introduction">
        <div className="grid-3">
          <Text label="Name" value={p.name} onChange={(v) => set((d) => { d.profile.name = v; })} />
          <Text label="Title" value={p.title} onChange={(v) => set((d) => { d.profile.title = v; })} />
          <Text label="Focus" value={p.focus} onChange={(v) => set((d) => { d.profile.focus = v; })} />
        </div>
        <Text label="Home headline" value={p.headline} onChange={(v) => set((d) => { d.profile.headline = v; })} hint="Wrap a phrase in *asterisks* to emphasize it." />
        <Text label="Home summary" rows={3} value={p.summary} onChange={(v) => set((d) => { d.profile.summary = v; })} />
        <Lines label="Biography" rows={8} items={p.bio} onChange={(v) => set((d) => { d.profile.bio = v; })} hint="One paragraph per line." />
        <FilePick label="Portrait" src={p.portrait.src} kinds={['image']} onPick={(src) => set((d) => { d.profile.portrait.src = src; })} onClear={() => set((d) => { d.profile.portrait.src = ''; })} />
        <Text label="Portrait alt text" value={p.portrait.alt} onChange={(v) => set((d) => { d.profile.portrait.alt = v; })} />
      </Card>
      <Card title="Contact">
        <div className="grid-2">
          <Text label="Email" type="email" value={p.email} onChange={(v) => set((d) => { d.profile.email = v; })} error={emailError} />
          <Text label="Location" value={p.location} onChange={(v) => set((d) => { d.profile.location = v; })} />
          <Text label="LinkedIn URL" value={p.linkedin} onChange={(v) => set((d) => { d.profile.linkedin = v; })} />
          <Text label="Website" value={p.website} onChange={(v) => set((d) => { d.profile.website = v; })} />
          <Text label="Phone" type="tel" value={p.phone} onChange={(v) => set((d) => { d.profile.phone = v; })} />
        </div>
        <Toggle label="Show phone number publicly" hint="Off by default. Email and LinkedIn are always shown." checked={p.showPhone} onChange={(v) => set((d) => { d.profile.showPhone = v; })} />
      </Card>
      <Card title="Experience">
        <ListEditor<Experience>
          noun="role" items={draft.experience} onChange={(v) => set((d) => { d.experience = v; })}
          title={(e) => <><b>{e.company || 'New role'}</b> · {e.role} <span className="pill">{e.period}</span></>}
          make={() => ({ id: uid('e'), company: '', role: 'Product Designer', period: '', meta: '', bullets: [], projectSlug: '' })}
          render={(e, patch) => (
            <>
              <div className="grid-2">
                <Text label="Company" value={e.company} onChange={(company) => patch({ company })} />
                <Text label="Role" value={e.role} onChange={(role) => patch({ role })} />
                <Text label="Period" value={e.period} onChange={(period) => patch({ period })} />
                <Text label="Type · location" value={e.meta} onChange={(meta) => patch({ meta })} />
              </div>
              <Lines label="Highlights" rows={6} items={e.bullets} onChange={(bullets) => patch({ bullets })} />
              <Select label="Linked case study" value={e.projectSlug} options={[['', 'None'], ...draft.projects.map((x) => [x.slug, x.title] as [string, string])]} onChange={(projectSlug) => patch({ projectSlug })} />
            </>
          )}
        />
      </Card>
      <Card title="Skills">
        <ListEditor<SkillGroup>
          noun="skill group" items={draft.skills} onChange={(v) => set((d) => { d.skills = v; })}
          title={(g) => <><b>{g.title || 'New group'}</b> <span className="pill">{g.items.length}</span></>}
          make={() => ({ id: uid('k'), title: '', items: [] })}
          render={(g, patch) => (
            <>
              <Text label="Group title" value={g.title} onChange={(title) => patch({ title })} />
              <Lines label="Skills" rows={6} items={g.items} onChange={(items) => patch({ items })} />
            </>
          )}
        />
      </Card>
      <Card title="Education & certification">
        <ListEditor
          noun="entry" items={draft.education} onChange={(v) => set((d) => { d.education = v; })}
          title={(e) => e.title || 'New entry'}
          make={() => ({ id: uid('ed'), title: '', org: '', period: '', note: '' })}
          render={(e, patch) => (
            <>
              <div className="grid-3">
                <Text label="Title" value={e.title} onChange={(title) => patch({ title })} />
                <Text label="Organization" value={e.org} onChange={(org) => patch({ org })} />
                <Text label="Period" value={e.period} onChange={(period) => patch({ period })} />
              </div>
              <Text label="Note" rows={2} value={e.note} onChange={(note) => patch({ note })} />
            </>
          )}
        />
      </Card>
    </>
  );
}

/* ── Résumé ── */
function ResumeAdmin() {
  const { draft } = useStore();
  const r = draft.resume;
  return (
    <>
      <PageHead title="Résumé" hint="The PDF offered by the Download button on the Résumé page." />
      <Card title="Downloadable file" hint="The on-page résumé preview is generated from your Profile content, so it never goes out of date.">
        <FilePick
          label="Résumé PDF" src={r.src} kinds={['pdf']} fileName={r.fileName}
          onPick={(src, _k, name) => actions.update((d) => { d.resume = { src, fileName: name, updated: new Date().toISOString().slice(0, 10) }; })}
          onClear={() => actions.update((d) => { d.resume = { src: '', fileName: '', updated: '' }; })}
        />
        <Text label="Download file name" value={r.fileName} onChange={(v) => actions.update((d) => { d.resume.fileName = v; })} />
        {r.updated && <p className="field-hint">Last replaced {r.updated}.</p>}
        <p className="notice"><Icon name="info" /> Check the PDF for details you do not want public, such as a phone number, before uploading it.</p>
      </Card>
    </>
  );
}

/* ── Site settings ── */
function SiteSettings() {
  const { draft } = useStore();
  const toast = useToast();
  const [reset, setReset] = useState(false);
  const notFeatured = draft.projects.filter((p) => !draft.featured.includes(p.id));

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'portfolio-content.json' });
    a.click();
    URL.revokeObjectURL(url);
    toast('Content exported');
  };
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      actions.importSite(parseSite(await file.text()));
      toast('Content imported into your draft');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Import failed', 'error');
    }
  };

  return (
    <>
      <PageHead title="Site settings" hint="Navigation, featured projects, SEO and content backup." />
      <Card title="Navigation" hint="Order and visibility of the main links.">
        <ListEditor<NavItem>
          noun="link" items={draft.nav} onChange={(v) => actions.update((d) => { d.nav = v; })} startOpen
          title={(n) => <><b>{n.label}</b> <span className="mono">{n.path}</span> {!n.visible && <span className="pill pill-warn">hidden</span>}</>}
          make={() => ({ id: uid('nav'), label: 'New link', path: '/work', visible: true })}
          render={(n, patch) => (
            <div className="grid-3">
              <Text label="Label" value={n.label} onChange={(label) => patch({ label })} />
              <Select label="Page" value={n.path} options={PAGES as readonly string[]} onChange={(path) => patch({ path })} />
              <Toggle label="Visible" checked={n.visible} onChange={(visible) => patch({ visible })} />
            </div>
          )}
        />
      </Card>
      <Card title="Featured on home" hint="Shown under “Selected work”, in this order. Drafts are skipped on the public site.">
        {!draft.featured.length && <div className="empty empty-sm"><p>Nothing featured. The home page falls back to the first four projects.</p></div>}
        <ol className="simple-list">
          {draft.featured.map((id, i) => {
            const p = draft.projects.find((x) => x.id === id);
            if (!p) return null;
            return (
              <li key={id}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                <strong>{p.title}</strong>
                {p.status === 'draft' && <span className="pill pill-warn">draft</span>}
                <div className="le-actions">
                  <button type="button" className="icon-btn" disabled={i === 0} aria-label={`Move ${p.title} up`} onClick={() => actions.update((d) => { d.featured = move(d.featured, i, i - 1); })}><Icon name="up" /></button>
                  <button type="button" className="icon-btn" disabled={i === draft.featured.length - 1} aria-label={`Move ${p.title} down`} onClick={() => actions.update((d) => { d.featured = move(d.featured, i, i + 1); })}><Icon name="down" /></button>
                  <button type="button" className="icon-btn icon-danger" aria-label={`Remove ${p.title} from featured`} onClick={() => actions.update((d) => { d.featured = d.featured.filter((x) => x !== id); })}><Icon name="x" /></button>
                </div>
              </li>
            );
          })}
        </ol>
        {notFeatured.length > 0 && (
          <Select label="Add a project" value="" options={[['', 'Choose…'], ...notFeatured.map((p) => [p.id, p.title] as [string, string])]} onChange={(id) => id && actions.update((d) => { d.featured.push(id); })} />
        )}
      </Card>
      <Card title="SEO" hint="Defaults for the home page and for sharing.">
        <Text label="Site title" value={draft.seo.title} onChange={(v) => actions.update((d) => { d.seo.title = v; })} />
        <Text label="Meta description" rows={3} value={draft.seo.description} onChange={(v) => actions.update((d) => { d.seo.description = v; })} hint={`${draft.seo.description.length} characters · aim for under 160.`} />
        <FilePick label="Social sharing image" src={draft.seo.ogImage} kinds={['image']} onPick={(src) => actions.update((d) => { d.seo.ogImage = src; })} onClear={() => actions.update((d) => { d.seo.ogImage = ''; })} />
      </Card>
      <Card title="Backup & demo data" hint="Export the content model as JSON. In this phase, committing that file is how content reaches the real site.">
        <div className="row-actions">
          <button type="button" className="btn" onClick={exportJson}><Icon name="download" /> Export content (JSON)</button>
          <label className="btn">
            <Icon name="up" /> Import JSON
            <input type="file" accept="application/json" className="sr-only" onChange={(e) => { importJson(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <button type="button" className="btn btn-danger" onClick={() => setReset(true)}>Reset demo data</button>
        </div>
      </Card>
      <Confirm open={reset} title="Reset all demo data?" body="Your draft and locally published changes in this browser are replaced by the original content." confirmLabel="Reset" onClose={() => setReset(false)} onConfirm={() => { actions.resetAll(); toast('Demo data reset'); }} />
    </>
  );
}

function PageHead({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <header className="admin-pagehead">
      <div><h1>{title}</h1><p>{hint}</p></div>
      {children}
    </header>
  );
}

/* ── Layout ── */
const NAV = [
  ['/admin', 'Projects', 'layers'],
  ['/admin/profile', 'Profile', 'user'],
  ['/admin/resume', 'Résumé', 'file'],
  ['/admin/site', 'Site settings', 'settings'],
] as const;

function Layout() {
  const store = useStore();
  const nav = useNavigate();
  const toast = useToast();
  const { pathname } = useLocation();
  const dirty = isDirty(store);
  const [discard, setDiscard] = useState(false);

  useEffect(() => {
    document.title = 'Admin — Portfolio';
    actions.setPreview(false);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const problems = store.draft.projects.filter((p, i, all) => !p.slug || all.findIndex((x) => x.slug === p.slug) !== i);

  const publish = () => {
    if (problems.length) return toast(`Fix the URL slug of “${problems[0].title}” before publishing`, 'error');
    if (actions.publish()) toast('Published in this browser');
    else toast('Could not publish: browser storage is full or blocked', 'error');
  };

  return (
    <div className="admin">
      <a className="skip" href="#admin-main">Skip to content</a>
      <aside className="admin-side">
        <Link to="/admin" className="admin-brand"><Logo /><span><strong>Portfolio</strong><small className="mono">Admin</small></span></Link>
        <nav aria-label="Admin">
          {NAV.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => (isActive || (to === '/admin' && pathname.startsWith('/admin/projects')) ? 'active' : '')}>
              <Icon name={icon} size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-side-foot">
          <Link to="/" className="btn btn-sm"><Icon name="out" size={14} /> View site</Link>
          <ThemeToggle />
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-bar">
          <p className={`save-state${store.saveError ? ' is-error' : ''}`} role="status">
            <Icon name={store.saveError ? 'info' : 'check'} />
            {store.saveError || (dirty ? 'Draft saved · unpublished changes' : 'Everything is published')}
          </p>
          <div className="admin-bar-actions">
            {dirty && <button type="button" className="btn btn-ghost" onClick={() => setDiscard(true)}>Discard changes</button>}
            <button type="button" className="btn" onClick={() => { actions.setPreview(true); nav('/'); }}><Icon name="eye" /> Preview</button>
            <button type="button" className="btn btn-primary" disabled={!dirty} onClick={publish}>Publish</button>
          </div>
        </div>
        <p className="demo-banner"><Icon name="info" /> <span><strong>Design-phase demo.</strong> There is no sign-in and no server: this page is not protected, and changes are stored in this browser only.</span></p>
        <main id="admin-main" className="admin-content">
          <Routes>
            <Route index element={<Projects />} />
            <Route path="projects/:id" element={<ProjectEditor />} />
            <Route path="profile" element={<Profile />} />
            <Route path="resume" element={<ResumeAdmin />} />
            <Route path="site" element={<SiteSettings />} />
            <Route path="*" element={<div className="empty"><p>This admin page does not exist.</p><Link className="btn btn-sm" to="/admin">Back to projects</Link></div>} />
          </Routes>
        </main>
      </div>
      <Confirm open={discard} title="Discard unpublished changes?" body="Your draft goes back to the last published version." confirmLabel="Discard" onClose={() => setDiscard(false)} onConfirm={() => { actions.discardDraft(); toast('Changes discarded'); }} />
    </div>
  );
}

export default function Admin() {
  return <Toasts><Layout /></Toasts>;
}
