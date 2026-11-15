import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { actions, uid, useStore } from '../content/store';
import type { Accent, Cluster, CoverVariant, Decision, LinkKind, MediaItem, MediaKind, Metric, Note, Project, ProjectLink, Section, SectionType } from '../content/types';
import { safeUrl } from '../content/media';
import { Icon } from '../components/Icon';
import { Card, FilePick, Lines, ListEditor, Select, Text, Toggle } from './ui';

const ACCENTS: Accent[] = ['blue', 'violet', 'green', 'yellow', 'pink', 'orange'];
const COVERS: CoverVariant[] = ['dashboard', 'mobile', 'chat', 'reviews', 'payments', 'analytics'];
const LINK_KINDS: [LinkKind, string][] = [['figma', 'Figma file'], ['figjam', 'FigJam board'], ['prototype', 'Prototype'], ['external', 'External link']];

export const SECTION_TYPES: [SectionType, string, string][] = [
  ['text', 'Text', 'Overview, context, reflection'],
  ['list', 'Numbered list', 'Problems, questions, constraints'],
  ['metrics', 'Metrics', 'Outcomes with their source'],
  ['board', 'Research board', 'FigJam-style clusters of notes'],
  ['flow', 'Flow / journey', 'Steps in order'],
  ['decisions', 'Key decisions', 'Decision cards'],
  ['media', 'Media', 'Images, video, PDFs'],
  ['embed', 'Figma / FigJam embed', 'Embed with fallback link'],
];

export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function newSection(type: SectionType): Section {
  const b = { id: uid('s'), kicker: SECTION_TYPES.find((t) => t[0] === type)![1], title: 'Untitled section', placeholder: true };
  switch (type) {
    case 'text': return { ...b, type, body: '' };
    case 'list': return { ...b, type, intro: '', items: [] };
    case 'metrics': return { ...b, type, intro: '', items: [] };
    case 'board': return { ...b, type, intro: '', clusters: [], figjamUrl: '' };
    case 'flow': return { ...b, type, intro: '', steps: [] };
    case 'decisions': return { ...b, type, intro: '', items: [] };
    case 'media': return { ...b, type, intro: '', items: [] };
    case 'embed': return { ...b, type, intro: '', kind: 'prototype', url: '' };
  }
}

export function newProject(): Project {
  const id = uid('p');
  return {
    id, slug: `untitled-${id.slice(-4)}`, status: 'draft', title: 'Untitled project', company: '', headline: 'A one-line statement of what this project achieved.',
    summary: '', period: '', role: 'Product Designer', employment: '', team: '', scope: '', domains: [], platforms: [], methods: [], accent: 'blue',
    cover: { variant: 'dashboard', src: '', alt: '' }, metrics: [], links: [],
    sections: [{ ...newSection('text'), kicker: 'Overview', title: 'Overview' }], seo: { title: '', description: '' },
  };
}

const urlError = (u: string) => (u && !safeUrl(u) ? 'Enter a full https:// URL.' : undefined);

function MetricsEditor({ items, onChange }: { items: Metric[]; onChange: (m: Metric[]) => void }) {
  return (
    <ListEditor
      noun="metric" items={items} onChange={onChange} startOpen
      title={(m) => <><b>{m.value || '—'}</b> {m.label}</>}
      make={() => ({ id: uid('m'), value: '', label: '', context: '' })}
      render={(m, patch) => (
        <div className="grid-3">
          <Text label="Value" value={m.value} onChange={(value) => patch({ value })} placeholder="62% → 88%" />
          <Text label="Label" value={m.label} onChange={(label) => patch({ label })} placeholder="Task success" />
          <Text label="Source / context" value={m.context} onChange={(context) => patch({ context })} placeholder="Usability testing" hint="Shown beside the number so test results are not read as production outcomes." />
        </div>
      )}
    />
  );
}

function StepsEditor({ items, onChange, noun }: { items: Decision[]; onChange: (d: Decision[]) => void; noun: string }) {
  return (
    <ListEditor
      noun={noun} items={items} onChange={onChange}
      title={(d) => d.title || `Untitled ${noun}`}
      make={() => ({ id: uid('d'), title: '', body: '' })}
      render={(d, patch) => (
        <>
          <Text label="Title" value={d.title} onChange={(title) => patch({ title })} />
          <Text label="Description" rows={3} value={d.body} onChange={(body) => patch({ body })} />
        </>
      )}
    />
  );
}

function MediaEditor({ items, onChange }: { items: MediaItem[]; onChange: (m: MediaItem[]) => void }) {
  return (
    <ListEditor
      noun="media item" items={items} onChange={onChange}
      title={(m) => <><span className="pill">{m.kind}</span> {m.caption || 'No caption'} {!m.src && <span className="pill pill-warn">placeholder</span>}</>}
      make={() => ({ id: uid('i'), kind: 'image' as MediaKind, src: '', alt: '', caption: '' })}
      render={(m, patch) => (
        <>
          <FilePick label="File" src={m.src} kinds={['image', 'video', 'pdf']} onPick={(src, kind) => patch({ src, kind })} onClear={() => patch({ src: '' })} />
          <div className="grid-2">
            <Text label="Caption" value={m.caption} onChange={(caption) => patch({ caption })} />
            <Text label="Alt text" value={m.alt} onChange={(alt) => patch({ alt })} hint="Describe the image for people who cannot see it." error={m.src && m.kind === 'image' && !m.alt ? 'Add alt text for this image.' : undefined} />
          </div>
        </>
      )}
    />
  );
}

function BoardEditor({ clusters, onChange }: { clusters: Cluster[]; onChange: (c: Cluster[]) => void }) {
  return (
    <ListEditor
      noun="theme" items={clusters} onChange={onChange}
      title={(c) => <><i className={`dot-swatch accent-${c.color}`} /> {c.title || 'Untitled theme'} <span className="pill">{c.notes.length} notes</span></>}
      make={() => ({ id: uid('c'), title: 'New theme', color: 'yellow' as Accent, notes: [] })}
      render={(c, patch) => (
        <>
          <div className="grid-2">
            <Text label="Theme title" value={c.title} onChange={(title) => patch({ title })} />
            <Select label="Color" value={c.color} options={ACCENTS} onChange={(color) => patch({ color })} />
          </div>
          <span className="field-label">Notes</span>
          <ListEditor<Note>
            noun="note" items={c.notes} onChange={(notes) => patch({ notes })} startOpen
            title={(n) => <>{n.text.slice(0, 60) || 'Empty note'} {!n.verified && <span className="pill pill-warn">placeholder</span>}</>}
            make={() => ({ id: uid('n'), text: '', verified: false })}
            render={(n, p) => (
              <>
                <Text label="Note" rows={2} value={n.text} onChange={(text) => p({ text })} />
                <Toggle label="Verified finding" hint="Off = shown with a dashed outline as an illustrative placeholder." checked={n.verified} onChange={(verified) => p({ verified })} />
              </>
            )}
          />
        </>
      )}
    />
  );
}

function SectionFields({ s, patch }: { s: Section; patch: (p: Partial<Section>) => void }) {
  const set = patch as (p: Record<string, unknown>) => void;
  return (
    <>
      <div className="grid-2">
        <Text label="Label" value={s.kicker} onChange={(kicker) => set({ kicker })} hint="Short label shown above the title and in the section list." />
        <Text label="Title" value={s.title} onChange={(title) => set({ title })} />
      </div>
      <Toggle label="Mark as illustrative placeholder" hint="Shows a visible badge so visitors do not read it as a verified claim." checked={s.placeholder} onChange={(placeholder) => set({ placeholder })} />
      {s.type === 'text' && <Text label="Body" rows={7} value={s.body} onChange={(body) => set({ body })} hint="Leave a blank line between paragraphs." />}
      {s.type !== 'text' && <Text label="Introduction" rows={3} value={s.intro} onChange={(intro) => set({ intro })} />}
      {s.type === 'list' && <Lines label="Items" rows={6} items={s.items} onChange={(items) => set({ items })} />}
      {s.type === 'metrics' && <MetricsEditor items={s.items} onChange={(items) => set({ items })} />}
      {s.type === 'flow' && <StepsEditor noun="step" items={s.steps} onChange={(steps) => set({ steps })} />}
      {s.type === 'decisions' && <StepsEditor noun="decision" items={s.items} onChange={(items) => set({ items })} />}
      {s.type === 'media' && <MediaEditor items={s.items} onChange={(items) => set({ items })} />}
      {s.type === 'board' && (
        <>
          <Text label="FigJam link (optional)" value={s.figjamUrl} onChange={(figjamUrl) => set({ figjamUrl })} placeholder="https://www.figma.com/board/…" error={urlError(s.figjamUrl)} hint="Adds an “Open in FigJam” link and an optional embed under the board." />
          <span className="field-label">Themes</span>
          <BoardEditor clusters={s.clusters} onChange={(clusters) => set({ clusters })} />
        </>
      )}
      {s.type === 'embed' && (
        <div className="grid-2">
          <Select label="Type" value={s.kind} options={LINK_KINDS} onChange={(kind) => set({ kind })} />
          <Text label="URL" value={s.url} onChange={(url) => set({ url })} placeholder="https://www.figma.com/proto/…" error={urlError(s.url)} hint="Figma links are embedded; a fallback link is always shown." />
        </div>
      )}
    </>
  );
}

const TABS = ['Details', 'Case study', 'Media & links', 'SEO'] as const;

export default function ProjectEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { draft } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Details');
  const [adding, setAdding] = useState(false);
  const project = draft.projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="empty">
        <Icon name="info" size={20} />
        <p>This project no longer exists.</p>
        <Link to="/admin" className="btn btn-sm">Back to projects</Link>
      </div>
    );
  }

  const set = (fn: (p: Project) => void) => actions.update((d) => { const p = d.projects.find((x) => x.id === id); if (p) fn(p); });
  const slugTaken = draft.projects.some((p) => p.id !== project.id && p.slug === project.slug);
  const slugError = !project.slug ? 'A URL slug is required.' : slugTaken ? 'Another project already uses this slug.' : undefined;

  return (
    <div className="editor">
      <div className="editor-head">
        <Link to="/admin" className="text-link"><Icon name="arrow" size={14} /> All projects</Link>
        <h1>{project.title || 'Untitled project'}</h1>
        <div className="editor-head-actions">
          <Select label="Status" value={project.status} options={[['draft', 'Draft'], ['published', 'Published']]} onChange={(status) => set((p) => { p.status = status; })} />
          <button type="button" className="btn" onClick={() => { actions.setPreview(true); nav(`/work/${project.slug}`); }}>
            <Icon name="eye" /> Preview page
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Project editor">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}{t === 'Case study' && <span className="pill">{project.sections.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'Details' && (
        <>
          <Card title="Basics">
            <div className="grid-2">
              <Text label="Project title" value={project.title} onChange={(v) => set((p) => { p.title = v; })} />
              <Text label="URL slug" value={project.slug} onChange={(v) => set((p) => { p.slug = slugify(v); })} error={slugError} hint={`Page address: /work/${project.slug}`} />
            </div>
            <Text label="Headline" rows={2} value={project.headline} onChange={(v) => set((p) => { p.headline = v; })} hint="The large title on the card and the case study." />
            <Text label="Summary" rows={3} value={project.summary} onChange={(v) => set((p) => { p.summary = v; })} />
          </Card>
          <Card title="Project facts" hint="Shown in the details panel beside the case study. Empty fields are hidden.">
            <div className="grid-2">
              <Text label="Role" value={project.role} onChange={(v) => set((p) => { p.role = v; })} />
              <Text label="Timeline" value={project.period} onChange={(v) => set((p) => { p.period = v; })} placeholder="Jun 2025 – Present" />
              <Text label="Engagement" value={project.employment} onChange={(v) => set((p) => { p.employment = v; })} placeholder="Full-time · Iran" />
              <Text label="Team" value={project.team} onChange={(v) => set((p) => { p.team = v; })} />
            </div>
            <Text label="Scope" value={project.scope} onChange={(v) => set((p) => { p.scope = v; })} />
            <div className="grid-3">
              <Lines label="Domains" items={project.domains} onChange={(v) => set((p) => { p.domains = v; })} hint="One per line. Used as filters on the Work page." />
              <Lines label="Platforms" items={project.platforms} onChange={(v) => set((p) => { p.platforms = v; })} />
              <Lines label="Methods" items={project.methods} onChange={(v) => set((p) => { p.methods = v; })} />
            </div>
          </Card>
          <Card title="Headline metrics" hint="The first metric also appears on the project card and the home page.">
            <MetricsEditor items={project.metrics} onChange={(m) => set((p) => { p.metrics = m; })} />
          </Card>
        </>
      )}

      {tab === 'Case study' && (
        <Card
          title="Sections"
          hint="Each project can use a different set and order of sections. Drag the handle or use the arrows to reorder."
          actions={<button type="button" className="btn btn-primary btn-sm" aria-expanded={adding} onClick={() => setAdding((a) => !a)}><Icon name="plus" size={14} /> Add section</button>}
        >
          {adding && (
            <div className="block-menu" role="group" aria-label="Choose a section type">
              {SECTION_TYPES.map(([type, label, hint]) => (
                <button key={type} type="button" onClick={() => { set((p) => { p.sections.push(newSection(type)); }); setAdding(false); }}>
                  <strong>{label}</strong><span>{hint}</span>
                </button>
              ))}
            </div>
          )}
          <ListEditor<Section>
            noun="section" items={project.sections} onChange={(sections) => set((p) => { p.sections = sections; })}
            empty="No sections yet. Add one to start the case study."
            title={(s) => <><span className="pill">{SECTION_TYPES.find((t) => t[0] === s.type)?.[1]}</span> <b>{s.kicker}</b> · {s.title} {s.placeholder && <span className="pill pill-warn">placeholder</span>}</>}
            render={(s, patch) => <SectionFields s={s} patch={patch} />}
          />
        </Card>
      )}

      {tab === 'Media & links' && (
        <>
          <Card title="Cover" hint="Used on project cards and at the top of the case study.">
            <FilePick label="Cover image" src={project.cover.src} kinds={['image']} onPick={(src) => set((p) => { p.cover.src = src; })} onClear={() => set((p) => { p.cover.src = ''; })} />
            <Text label="Cover alt text" value={project.cover.alt} onChange={(v) => set((p) => { p.cover.alt = v; })} error={project.cover.src && !project.cover.alt ? 'Add alt text for the cover image.' : undefined} />
            <div className="grid-2">
              <Select label="Placeholder artwork" value={project.cover.variant} options={COVERS} onChange={(v) => set((p) => { p.cover.variant = v; })} />
              <Select label="Accent color" value={project.accent} options={ACCENTS} onChange={(v) => set((p) => { p.accent = v; })} />
            </div>
          </Card>
          <Card title="Links" hint="Figma, FigJam, prototype and external links shown in the project details panel.">
            <ListEditor<ProjectLink>
              noun="link" items={project.links} onChange={(links) => set((p) => { p.links = links; })} startOpen
              title={(l) => <><span className="pill">{l.kind}</span> {l.label || l.url || 'New link'}</>}
              make={() => ({ id: uid('l'), kind: 'figma' as LinkKind, label: '', url: '' })}
              render={(l, patch) => (
                <div className="grid-3">
                  <Select label="Type" value={l.kind} options={LINK_KINDS} onChange={(kind) => patch({ kind })} />
                  <Text label="Label" value={l.label} onChange={(label) => patch({ label })} placeholder="Design file" />
                  <Text label="URL" value={l.url} onChange={(url) => patch({ url })} placeholder="https://" error={urlError(l.url)} />
                </div>
              )}
            />
          </Card>
        </>
      )}

      {tab === 'SEO' && (
        <Card title="Search & sharing" hint="Leave empty to use the project title and summary.">
          <Text label="Page title" value={project.seo.title} onChange={(v) => set((p) => { p.seo.title = v; })} placeholder={`${project.title} — ${draft.profile.name}`} />
          <Text label="Meta description" rows={3} value={project.seo.description} onChange={(v) => set((p) => { p.seo.description = v; })} placeholder={project.summary} hint={`${(project.seo.description || project.summary).length} characters · aim for under 160.`} />
        </Card>
      )}
    </div>
  );
}
