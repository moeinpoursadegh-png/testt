import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cluster } from '../content/types';
import { figmaEmbedUrl, safeUrl } from '../content/media';
import { Icon } from './Icon';

type View = { x: number; y: number; k: number };
const MIN = 0.3;
const MAX = 2;
const clamp = (k: number) => Math.min(MAX, Math.max(MIN, k));

function Sticky({ text, verified, color }: { text: string; verified: boolean; color: string }) {
  return (
    <li className={`sticky accent-${color}${verified ? '' : ' is-placeholder'}`}>
      <p>{text}</p>
      <span className="sticky-foot mono">{verified ? '✓ From résumé' : 'Placeholder'}</span>
    </li>
  );
}

function Clusters({ clusters }: { clusters: Cluster[] }) {
  return (
    <>
      {clusters.map((c) => (
        <section key={c.id} className={`cluster accent-${c.color}`} aria-label={c.title}>
          <h3 className="cluster-title">{c.title}<span className="mono">{c.notes.length}</span></h3>
          <ul>
            {c.notes.map((n) => <Sticky key={n.id} text={n.text} verified={n.verified} color={c.color} />)}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * FigJam-style research board. Wide screens get a pannable, zoomable canvas
 * with explicit controls; a plain list view is always one click away and is
 * the only view on small screens, so nothing depends on dragging.
 */
export function Board({ clusters, figjamUrl }: { clusters: Cluster[]; figjamUrl: string }) {
  const [mode, setMode] = useState<'board' | 'list'>('board');
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [ready, setReady] = useState(false);
  const port = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const fit = useCallback(() => {
    const p = port.current, w = world.current;
    if (!p || !w || !p.clientWidth) return;
    const pad = 32;
    const k = clamp(Math.min((p.clientWidth - pad * 2) / w.offsetWidth, (p.clientHeight - pad * 2) / w.offsetHeight, 1));
    setView({ k, x: (p.clientWidth - w.offsetWidth * k) / 2, y: (p.clientHeight - w.offsetHeight * k) / 2 });
    setReady(true);
  }, []);

  useEffect(() => {
    if (mode !== 'board') return;
    fit();
    const ro = new ResizeObserver(fit);
    if (port.current) ro.observe(port.current);
    return () => ro.disconnect();
  }, [mode, fit, clusters]);

  const zoom = (factor: number, cx?: number, cy?: number) =>
    setView((v) => {
      const p = port.current;
      const ox = cx ?? (p ? p.clientWidth / 2 : 0);
      const oy = cy ?? (p ? p.clientHeight / 2 : 0);
      const k = clamp(v.k * factor);
      const r = k / v.k;
      return { k, x: ox - (ox - v.x) * r, y: oy - (oy - v.y) * r };
    });

  useEffect(() => {
    const p = port.current;
    if (!p || mode !== 'board') return;
    // Only zoom on Ctrl/⌘ + wheel so normal page scrolling is never hijacked.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = p.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    };
    p.addEventListener('wheel', onWheel, { passive: false });
    return () => p.removeEventListener('wheel', onWheel);
  }, [mode]);

  const onKey = (e: React.KeyboardEvent) => {
    const step = 60;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setView((v) => ({ ...v, x: v.x + moves[e.key][0], y: v.y + moves[e.key][1] }));
    } else if (e.key === '+' || e.key === '=') zoom(1.2);
    else if (e.key === '-') zoom(1 / 1.2);
    else if (e.key === '0') fit();
  };

  const embed = figmaEmbedUrl(figjamUrl);
  const link = safeUrl(figjamUrl);
  const total = clusters.reduce((s, c) => s + c.notes.length, 0);

  if (!clusters.length) {
    return <div className="empty"><Icon name="note" size={20} /><p>No notes on this board yet.</p></div>;
  }

  return (
    <div className={`board board-${mode}`}>
      <div className="board-bar">
        <div className="seg" role="group" aria-label="Board view">
          <button type="button" aria-pressed={mode === 'board'} onClick={() => setMode('board')}><Icon name="grid" size={14} /> Board</button>
          <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}><Icon name="list" size={14} /> List</button>
        </div>
        <span className="board-count mono">{clusters.length} themes · {total} notes</span>
        {mode === 'board' && (
          <div className="board-zoom" role="group" aria-label="Zoom">
            <button type="button" className="icon-btn" onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><Icon name="minus" /></button>
            <output className="mono" aria-live="off">{Math.round(view.k * 100)}%</output>
            <button type="button" className="icon-btn" onClick={() => zoom(1.2)} aria-label="Zoom in"><Icon name="plus" /></button>
            <button type="button" className="btn btn-sm" onClick={fit}><Icon name="fit" size={14} /> Fit</button>
          </div>
        )}
      </div>

      <div
        ref={port}
        className="board-port canvas-dots"
        tabIndex={0}
        role="group"
        aria-label="Research board. Use arrow keys to pan, plus and minus to zoom, 0 to fit. A list view is available above."
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          ref={world}
          className="board-world"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, opacity: ready ? 1 : 0 }}
        >
          <Clusters clusters={clusters} />
        </div>
        <p className="board-hint mono" aria-hidden="true">Drag to pan · Ctrl/⌘ + scroll to zoom</p>
      </div>

      <div className="board-listview">
        <Clusters clusters={clusters} />
      </div>

      <div className="board-legend">
        <span><i className="swatch" /> Verified from résumé</span>
        <span><i className="swatch swatch-dashed" /> Illustrative placeholder</span>
        {link && (
          <a href={link} target="_blank" rel="noreferrer">Open in FigJam <Icon name="out" size={14} /></a>
        )}
      </div>
      {embed && (
        <details className="embed-details">
          <summary>Show the embedded FigJam board</summary>
          <iframe src={embed} title="FigJam board" loading="lazy" allowFullScreen />
        </details>
      )}
    </div>
  );
}
