import { useSyncExternalStore } from 'react';
import { defaultSite } from './site';
import type { Site } from './types';

/**
 * Demo persistence. The admin edits a draft kept in localStorage; "Publish"
 * copies it to a second key that the public pages read in this browser only.
 * A production backend replaces `load`/`save` with authenticated API calls.
 */

const DRAFT = 'mp.draft';
const PUBLISHED = 'mp.published';
const PREVIEW = 'mp.preview';

type State = { draft: Site; published: Site; preview: boolean; saveError: string };

const isBrowser = typeof window !== 'undefined';
const serverState: State = { draft: defaultSite, published: defaultSite, preview: false, saveError: '' };

function read(key: string): Site | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Site;
    return v && v.version === defaultSite.version && Array.isArray(v.projects) ? v : null;
  } catch {
    return null;
  }
}

let state: State = serverState;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || !isBrowser) return;
  loaded = true;
  const published = read(PUBLISHED) ?? defaultSite;
  let preview = false;
  try {
    preview = sessionStorage.getItem(PREVIEW) === '1';
  } catch {
    /* storage unavailable */
  }
  state = { draft: read(DRAFT) ?? published, published, preview, saveError: '' };
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function persist(key: string, value: Site): string {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return '';
  } catch {
    return 'Could not save in this browser (storage is full or blocked).';
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot() {
  ensureLoaded();
  return state;
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, snapshot, () => serverState);
}

/** Content for public pages: the draft while previewing, otherwise what is published. */
export function useSite(): { site: Site; preview: boolean } {
  const s = useStore();
  return { site: s.preview ? s.draft : s.published, preview: s.preview };
}

export const actions = {
  update(fn: (draft: Site) => void) {
    const draft = structuredClone(state.draft);
    fn(draft);
    set({ draft, saveError: persist(DRAFT, draft) });
  },
  publish(): boolean {
    const err = persist(PUBLISHED, state.draft);
    set({ published: state.draft, saveError: err });
    return !err;
  },
  discardDraft() {
    set({ draft: state.published, saveError: persist(DRAFT, state.published) });
  },
  resetAll() {
    try {
      localStorage.removeItem(DRAFT);
      localStorage.removeItem(PUBLISHED);
    } catch {
      /* ignore */
    }
    set({ draft: defaultSite, published: defaultSite, saveError: '' });
  },
  importSite(site: Site) {
    set({ draft: site, saveError: persist(DRAFT, site) });
  },
  setPreview(on: boolean) {
    try {
      if (on) sessionStorage.setItem(PREVIEW, '1');
      else sessionStorage.removeItem(PREVIEW);
    } catch {
      /* ignore */
    }
    set({ preview: on });
  },
};

export function isDirty(s: State) {
  return s.draft !== s.published && JSON.stringify(s.draft) !== JSON.stringify(s.published);
}

export function parseSite(json: string): Site {
  const v = JSON.parse(json) as Site;
  if (!v || typeof v !== 'object' || !Array.isArray(v.projects) || !v.profile || !Array.isArray(v.nav)) {
    throw new Error('This file is not a portfolio content export.');
  }
  return { ...defaultSite, ...v, version: defaultSite.version };
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
