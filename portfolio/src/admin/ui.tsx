import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ACCEPT, saveFile, useMediaUrl } from '../content/media';
import { uid } from '../content/store';
import type { MediaKind } from '../content/types';
import { Icon } from '../components/Icon';

/* ── Toasts ── */
type Toast = { id: number; text: string; tone: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function Toasts({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, text, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon name={t.tone === 'ok' ? 'check' : 'info'} /> {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ── Fields ── */
type TextProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  rows?: number;
  placeholder?: string;
  type?: string;
};

export function Text({ label, value, onChange, hint, error, rows, placeholder, type = 'text' }: TextProps) {
  const id = useId();
  const described = hint || error ? `${id}-d` : undefined;
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {rows ? (
        <textarea id={id} rows={rows} value={value} placeholder={placeholder} aria-describedby={described} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={type} value={value} placeholder={placeholder} aria-describedby={described} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} />
      )}
      {(error || hint) && <p id={described} className="field-hint">{error || hint}</p>}
    </div>
  );
}

/** Edits a string list as one item per line. */
export function Lines({ label, items, onChange, hint, rows = 4 }: { label: string; items: string[]; onChange: (v: string[]) => void; hint?: string; rows?: number }) {
  const [text, setText] = useState(items.join('\n'));
  const parse = (t: string) => t.split('\n').map((s) => s.trim()).filter(Boolean);
  useEffect(() => {
    if (parse(text).join('\n') !== items.join('\n')) setText(items.join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  return (
    <Text label={label} value={text} rows={rows} hint={hint ?? 'One per line.'} onChange={(t) => { setText(t); onChange(parse(t)); }} />
  );
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (T | [T, string])[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span>{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

export function Card({ title, hint, children, actions }: { title: string; hint?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      <header className="card-head">
        <div><h2>{title}</h2>{hint && <p>{hint}</p>}</div>
        {actions}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

/* ── Confirm dialog ── */
export function Confirm({ open, title, body, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p>{body}</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-danger-solid" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}

/* ── File picker ── */
export function FilePick({ label, src, kinds, onPick, onClear, fileName }: { label: string; src: string; kinds: MediaKind[]; onPick: (src: string, kind: MediaKind, name: string) => void; onClear: () => void; fileName?: string }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { url, status } = useMediaUrl(src);
  const toast = useToast();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const r = await saveFile(file, kinds);
      onPick(r.src, r.kind, file.name);
      toast(`${file.name} added`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const isImage = status === 'ready' && kinds.includes('image') && !/\.pdf($|\?)/i.test(src) && !fileName?.endsWith('.pdf');
  return (
    <div className={`field filepick${error ? ' has-error' : ''}`}>
      <span className="field-label" id={`${id}-l`}>{label}</span>
      <div className="filepick-row">
        <div className="filepick-thumb">
          {busy ? <span className="mono">Uploading…</span>
            : status === 'ready' && isImage ? <img src={url} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
            : status === 'ready' ? <Icon name="file" size={20} />
            : status === 'error' ? <Icon name="info" size={20} />
            : <Icon name="image" size={20} />}
        </div>
        <div className="filepick-main">
          <p className="filepick-name">
            {status === 'empty' ? 'No file yet — the placeholder is shown.' : status === 'error' ? 'File missing in this browser.' : fileName || (src.startsWith('idb:') ? 'Uploaded file (stored in this browser)' : src)}
          </p>
          <div className="filepick-actions">
            <input ref={input} id={id} type="file" className="sr-only" accept={kinds.flatMap((k) => ACCEPT[k]).join(',')} aria-labelledby={`${id}-l`} onChange={(e) => pick(e.target.files?.[0])} />
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => input.current?.click()}>
              <Icon name="up" size={14} /> {status === 'empty' ? 'Upload' : 'Replace'}
            </button>
            {status !== 'empty' && <button type="button" className="btn btn-sm btn-ghost" onClick={onClear}>Remove</button>}
          </div>
        </div>
      </div>
      <p className="field-hint">{error || `Accepted: ${kinds.join(', ')} · up to 8 MB`}</p>
    </div>
  );
}

/* ── Reorderable list ── */
export function reId<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reId) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = k === 'id' && typeof v === 'string' ? uid(v.split('-')[0]) : reId(v);
    return out as T;
  }
  return value;
}

export function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

type ListProps<T extends { id: string }> = {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, patch: (p: Partial<T>) => void) => ReactNode;
  title: (item: T) => ReactNode;
  make?: () => T;
  addLabel?: string;
  noun: string;
  startOpen?: boolean;
  empty?: string;
};

export function ListEditor<T extends { id: string }>({ items, onChange, render, title, make, addLabel, noun, startOpen = false, empty }: ListProps<T>) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(startOpen ? items.map((i) => i.id) : []));
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  // Items added from outside (e.g. the "Add section" menu) open automatically.
  const known = useRef(new Set(items.map((i) => i.id)));
  useEffect(() => {
    const fresh = items.filter((i) => !known.current.has(i.id));
    if (!fresh.length) return;
    fresh.forEach((i) => known.current.add(i.id));
    setOpen((s) => new Set([...s, ...fresh.map((i) => i.id)]));
  }, [items]);
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="list-editor">
      {!items.length && <div className="empty empty-sm"><p>{empty ?? `No ${noun}s yet.`}</p></div>}
      <ol>
        {items.map((item, i) => {
          const isOpen = open.has(item.id);
          return (
            <li
              key={item.id}
              className={`le-item${dragging === i ? ' is-dragging' : ''}${over === i && dragging !== null && dragging !== i ? ' is-over' : ''}`}
              onDragOver={(e) => { if (dragging !== null) { e.preventDefault(); setOver(i); } }}
              onDrop={(e) => { e.preventDefault(); if (dragging !== null && dragging !== i) onChange(move(items, dragging, i)); setDragging(null); setOver(null); }}
            >
              <div className="le-head">
                <span
                  className="le-drag"
                  draggable
                  title="Drag to reorder"
                  aria-hidden="true"
                  onDragStart={(e) => { setDragging(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id); }}
                  onDragEnd={() => { setDragging(null); setOver(null); }}
                >
                  <Icon name="drag" />
                </span>
                <button type="button" className="le-title" aria-expanded={isOpen} onClick={() => toggle(item.id)}>
                  {title(item)}
                </button>
                <div className="le-actions">
                  <button type="button" className="icon-btn" disabled={i === 0} aria-label={`Move ${noun} up`} onClick={() => onChange(move(items, i, i - 1))}><Icon name="up" /></button>
                  <button type="button" className="icon-btn" disabled={i === items.length - 1} aria-label={`Move ${noun} down`} onClick={() => onChange(move(items, i, i + 1))}><Icon name="down" /></button>
                  <button type="button" className="icon-btn" aria-label={`Duplicate ${noun}`} onClick={() => { const copy = reId(item); onChange([...items.slice(0, i + 1), copy, ...items.slice(i + 1)]); setOpen((s) => new Set(s).add(copy.id)); }}><Icon name="duplicate" /></button>
                  <button type="button" className="icon-btn icon-danger" aria-label={`Delete ${noun}`} onClick={() => onChange(items.filter((x) => x.id !== item.id))}><Icon name="trash" /></button>
                </div>
              </div>
              {isOpen && (
                <div className="le-body">
                  {render(item, (p) => onChange(items.map((x) => (x.id === item.id ? { ...x, ...p } : x))))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {make && (
        <button type="button" className="btn btn-sm" onClick={() => { const it = make(); onChange([...items, it]); setOpen((s) => new Set(s).add(it.id)); }}>
          <Icon name="plus" size={14} /> {addLabel ?? `Add ${noun}`}
        </button>
      )}
    </div>
  );
}
