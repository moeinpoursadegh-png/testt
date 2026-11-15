import { useEffect, useState } from 'react';
import type { MediaKind } from './types';

/**
 * Demo file storage in IndexedDB. Files never leave this browser.
 * In production, uploads go to the server, which validates type and size again.
 */

const DB = 'mp-media';
const STORE = 'files';
export const MAX_BYTES = 8 * 1024 * 1024;

export const ACCEPT: Record<MediaKind, string[]> = {
  image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
  video: ['video/mp4', 'video/webm'],
  pdf: ['application/pdf'],
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function kindOf(file: File): MediaKind | null {
  return (Object.keys(ACCEPT) as MediaKind[]).find((k) => ACCEPT[k].includes(file.type)) ?? null;
}

/** Validates and stores a file. Returns a `idb:<id>` reference. */
export async function saveFile(file: File, allowed: MediaKind[]): Promise<{ src: string; kind: MediaKind }> {
  const kind = kindOf(file);
  if (!kind || !allowed.includes(kind)) throw new Error(`Unsupported file type. Allowed: ${allowed.join(', ')}.`);
  if (file.size > MAX_BYTES) throw new Error('File is larger than 8 MB.');
  const db = await open();
  const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return { src: `idb:${key}`, kind };
}

const cache = new Map<string, string>();

async function resolve(src: string): Promise<string> {
  if (!src.startsWith('idb:')) return src;
  const hit = cache.get(src);
  if (hit) return hit;
  const db = await open();
  const blob = await new Promise<Blob | undefined>((res, rej) => {
    const req = db.transaction(STORE).objectStore(STORE).get(src.slice(4));
    req.onsuccess = () => res(req.result as Blob | undefined);
    req.onerror = () => rej(req.error);
  });
  if (!blob) throw new Error('missing');
  const url = URL.createObjectURL(blob);
  cache.set(src, url);
  return url;
}

/** Resolves a media reference to a usable URL. `status` drives loading and error states. */
export function useMediaUrl(src: string): { url: string; status: 'empty' | 'loading' | 'ready' | 'error' } {
  const direct = src && !src.startsWith('idb:') ? src : '';
  const [res, setRes] = useState<{ src: string; url: string; error: boolean }>({ src: '', url: '', error: false });
  useEffect(() => {
    if (!src.startsWith('idb:')) return;
    let live = true;
    resolve(src)
      .then((url) => live && setRes({ src, url, error: false }))
      .catch(() => live && setRes({ src, url: '', error: true }));
    return () => {
      live = false;
    };
  }, [src]);
  if (!src) return { url: '', status: 'empty' };
  if (direct) return { url: direct, status: 'ready' };
  if (res.src !== src) return { url: '', status: 'loading' };
  return res.error ? { url: '', status: 'error' } : { url: res.url, status: 'ready' };
}

/** Only http(s) and site-relative URLs are rendered as links or embeds. */
export function safeUrl(url: string): string {
  const u = url.trim();
  if (u.startsWith('/') && !u.startsWith('//')) return u;
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:' ? p.href : '';
  } catch {
    return '';
  }
}

/** Figma/FigJam share links can be embedded; anything else falls back to a plain link. */
export function figmaEmbedUrl(url: string): string {
  const u = safeUrl(url);
  if (!u) return '';
  const host = new URL(u, 'https://x.invalid').hostname;
  if (host !== 'figma.com' && host !== 'www.figma.com') return '';
  return `https://www.figma.com/embed?embed_host=portfolio&url=${encodeURIComponent(u)}`;
}
