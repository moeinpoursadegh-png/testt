import type { Project } from '../content/types';
import { useMediaUrl } from '../content/media';

/**
 * Project cover. Shows the uploaded image when there is one; otherwise an
 * abstract wireframe so the layout holds up before real assets exist.
 */

const ink = 'var(--cover-ink)';
const a = 'var(--a)';

type Shape = [x: number, y: number, w: number, h: number, fill?: string, op?: number, r?: number];

const draw = (shapes: Shape[]) =>
  shapes.map(([x, y, w, h, fill = ink, op = 0.14, r = 3], i) => (
    <rect key={i} x={x} y={y} width={w} height={h} rx={r} fill={fill} opacity={op} />
  ));

const window_: Shape[] = [[40, 30, 320, 190, 'var(--cover-card)', 1, 8]];
const phone = (x: number, y: number): Shape[] => [[x, y, 96, 196, 'var(--cover-card)', 1, 14]];

const VARIANTS: Record<Project['cover']['variant'], Shape[]> = {
  dashboard: [
    ...window_,
    [40, 30, 64, 190, ink, 0.06, 8],
    [52, 46, 40, 8], [52, 70, 32, 5], [52, 84, 38, 5], [52, 98, 28, 5], [52, 112, 34, 5],
    [120, 46, 110, 10, ink, 0.3], [296, 44, 48, 14, a, 1, 7],
    [120, 72, 70, 44, a, 0.22, 6], [198, 72, 70, 44, ink, 0.08, 6], [276, 72, 68, 44, ink, 0.08, 6],
    [120, 128, 224, 8], [120, 144, 224, 8], [120, 160, 224, 8], [120, 176, 150, 8],
    [120, 196, 60, 10, a, 0.6, 5],
  ],
  mobile: [
    ...phone(74, 26), ...phone(152, 40), ...phone(230, 26),
    [86, 44, 50, 8, ink, 0.3], [86, 62, 72, 38, a, 0.25, 8], [86, 108, 72, 8], [86, 122, 56, 8], [86, 180, 72, 22, a, 1, 11],
    [164, 58, 44, 8, ink, 0.3], [164, 76, 72, 20, ink, 0.08, 6], [164, 102, 72, 20, ink, 0.08, 6], [164, 128, 72, 20, a, 0.25, 6], [164, 154, 72, 20, ink, 0.08, 6], [164, 196, 72, 22, a, 1, 11],
    [242, 44, 40, 8, ink, 0.3], [242, 62, 72, 72, ink, 0.08, 8], [264, 84, 28, 28, a, 0.7, 14], [242, 144, 72, 8], [242, 158, 48, 8], [242, 180, 72, 22, ink, 0.2, 11],
  ],
  chat: [
    ...phone(100, 26), [212, 46, 128, 150, 'var(--cover-card)', 1, 10],
    [112, 44, 40, 8, ink, 0.3], [112, 66, 56, 18, ink, 0.1, 9], [128, 90, 56, 18, a, 0.9, 9], [112, 114, 64, 26, ink, 0.1, 9], [128, 146, 56, 18, a, 0.9, 9], [112, 190, 72, 18, ink, 0.08, 9],
    [224, 60, 60, 8, ink, 0.3], [224, 80, 104, 30, a, 0.2, 6], [224, 118, 104, 30, ink, 0.07, 6], [224, 156, 104, 30, ink, 0.07, 6],
  ],
  reviews: [
    ...window_,
    [58, 48, 120, 10, ink, 0.3], [58, 70, 284, 52, a, 0.2, 8], [70, 82, 150, 7, a, 0.9], [70, 96, 220, 6], [70, 108, 180, 6],
    [58, 134, 88, 70, ink, 0.07, 6], [156, 134, 88, 70, ink, 0.07, 6], [254, 134, 88, 70, ink, 0.07, 6],
    [68, 146, 40, 6, a, 0.8], [166, 146, 40, 6, a, 0.8], [264, 146, 40, 6, a, 0.8],
    [68, 162, 68, 5], [68, 174, 56, 5], [166, 162, 68, 5], [166, 174, 50, 5], [264, 162, 68, 5], [264, 174, 60, 5],
  ],
  payments: [
    ...window_,
    [58, 48, 90, 10, ink, 0.3], [58, 72, 150, 88, a, 0.9, 10], [72, 88, 50, 8, 'var(--cover-card)', 0.9], [72, 132, 90, 8, 'var(--cover-card)', 0.6],
    [224, 72, 118, 24, ink, 0.07, 6], [224, 104, 118, 24, ink, 0.07, 6], [224, 136, 118, 24, a, 0.22, 6],
    [58, 176, 284, 8], [58, 192, 200, 8],
  ],
  analytics: [
    ...window_,
    [58, 48, 100, 10, ink, 0.3], [58, 72, 180, 132, ink, 0.05, 6],
    [74, 160, 18, 32, a, 0.4], [100, 136, 18, 56, a, 0.55], [126, 148, 18, 44, a, 0.4], [152, 112, 18, 80, a, 0.9], [178, 126, 18, 66, a, 0.55], [204, 96, 18, 96, a, 0.9],
    [250, 72, 92, 60, a, 0.2, 6], [250, 142, 92, 62, ink, 0.07, 6], [262, 154, 50, 6], [262, 168, 68, 6], [262, 182, 40, 6],
  ],
};

export function Cover({ project, eager = false }: { project: Project; eager?: boolean }) {
  const { url, status } = useMediaUrl(project.cover.src);
  if (status === 'ready') {
    return (
      <div className={`cover accent-${project.accent}`}>
        <img src={url} alt={project.cover.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      </div>
    );
  }
  return (
    <div className={`cover accent-${project.accent}`}>
      <svg viewBox="0 0 400 250" role="img" aria-label={`Placeholder cover for ${project.title}`} preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="250" fill="var(--cover-bg)" />
        <rect width="400" height="250" fill={a} opacity="0.16" />
        {draw(VARIANTS[project.cover.variant] ?? VARIANTS.dashboard)}
      </svg>
      <span className="cover-tag mono">Placeholder cover</span>
    </div>
  );
}
