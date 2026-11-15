/**
 * Content model. Everything the public site renders comes from one `Site`
 * object, so a future backend only has to serve and validate this shape.
 */

export type Accent = 'blue' | 'violet' | 'green' | 'yellow' | 'pink' | 'orange';
export type CoverVariant = 'dashboard' | 'mobile' | 'chat' | 'reviews' | 'payments' | 'analytics';
export type LinkKind = 'figma' | 'figjam' | 'prototype' | 'external';
export type MediaKind = 'image' | 'video' | 'pdf';

/** `src` is a URL, or `idb:<id>` for a file kept in this browser by the admin demo. */
export interface MediaItem {
  id: string;
  kind: MediaKind;
  src: string;
  alt: string;
  caption: string;
}

export interface Metric {
  id: string;
  value: string;
  label: string;
  /** Where the number comes from, e.g. "Usability testing". Always shown next to the value. */
  context: string;
}

export interface ProjectLink {
  id: string;
  kind: LinkKind;
  label: string;
  url: string;
}

export interface Note {
  id: string;
  text: string;
  /** false = illustrative placeholder, rendered with a dashed outline. */
  verified: boolean;
}

export interface Cluster {
  id: string;
  title: string;
  color: Accent;
  notes: Note[];
}

export interface Decision {
  id: string;
  title: string;
  body: string;
}

interface SectionBase {
  id: string;
  /** Small label above the title, e.g. "Research". */
  kicker: string;
  title: string;
  /** Marks the whole section as illustrative placeholder content. */
  placeholder: boolean;
}

export type Section =
  | (SectionBase & { type: 'text'; body: string })
  | (SectionBase & { type: 'list'; intro: string; items: string[] })
  | (SectionBase & { type: 'metrics'; intro: string; items: Metric[] })
  | (SectionBase & { type: 'board'; intro: string; clusters: Cluster[]; figjamUrl: string })
  | (SectionBase & { type: 'flow'; intro: string; steps: Decision[] })
  | (SectionBase & { type: 'decisions'; intro: string; items: Decision[] })
  | (SectionBase & { type: 'media'; intro: string; items: MediaItem[] })
  | (SectionBase & { type: 'embed'; intro: string; kind: LinkKind; url: string });

export type SectionType = Section['type'];

export interface Project {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  title: string;
  company: string;
  headline: string;
  summary: string;
  period: string;
  role: string;
  employment: string;
  team: string;
  scope: string;
  domains: string[];
  platforms: string[];
  methods: string[];
  accent: Accent;
  cover: { variant: CoverVariant; src: string; alt: string };
  metrics: Metric[];
  links: ProjectLink[];
  sections: Section[];
  seo: { title: string; description: string };
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  period: string;
  meta: string;
  bullets: string[];
  projectSlug: string;
}

export interface SkillGroup {
  id: string;
  title: string;
  items: string[];
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
}

export interface Site {
  version: number;
  profile: {
    name: string;
    title: string;
    focus: string;
    location: string;
    headline: string;
    summary: string;
    bio: string[];
    email: string;
    linkedin: string;
    website: string;
    phone: string;
    showPhone: boolean;
    portrait: { src: string; alt: string };
  };
  experience: Experience[];
  skills: SkillGroup[];
  education: { id: string; title: string; org: string; period: string; note: string }[];
  resume: { src: string; fileName: string; updated: string };
  nav: NavItem[];
  featured: string[];
  seo: { title: string; description: string; ogImage: string };
  projects: Project[];
}
