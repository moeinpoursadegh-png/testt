// Canvas-2D motion-graphics toolkit: easing, text, shapes, video framing and post effects.
export const W = 1080;
export const H = 1920;
export type Ctx = CanvasRenderingContext2D;

export const C = {
  bg: '#06070a',
  cyan: '#35e4ff',
  orange: '#ff7a1c',
  white: '#f5f7fa',
  muted: 'rgba(245,247,250,0.58)',
};

// ------------------------------------------------------------------ math & easing
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const eOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const eInExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
export const eInOutExpo = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
export const eOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const eInCubic = (t: number) => t * t * t;
export const eInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const eOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** deterministic hash noise */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ------------------------------------------------------------------ offscreen buffers
const pool = new Map<string, HTMLCanvasElement>();
export function buf(name: string, w = W, h = H): { c: HTMLCanvasElement; x: Ctx } {
  let c = pool.get(name);
  if (!c) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    pool.set(name, c);
  }
  const x = c.getContext('2d')!;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  x.filter = 'none';
  x.clearRect(0, 0, c.width, c.height);
  return { c, x };
}

// ------------------------------------------------------------------ text
export interface TextOpts {
  size: number;
  weight?: number;
  family?: 'Inter' | 'Grotesk' | 'Mono';
  color?: string;
  align?: CanvasTextAlign;
  tracking?: number; // em
  alpha?: number;
  stroke?: number; // outline width instead of fill
  baseline?: CanvasTextBaseline;
}
export function setFont(ctx: Ctx, o: TextOpts): void {
  ctx.font = `${o.weight ?? 700} ${o.size}px ${o.family ?? 'Inter'}`;
  ctx.letterSpacing = `${(o.tracking ?? 0) * o.size}px`;
  ctx.textBaseline = o.baseline ?? 'alphabetic';
}
export function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts): number {
  ctx.save();
  setFont(ctx, o);
  ctx.textAlign = o.align ?? 'left';
  ctx.globalAlpha *= o.alpha ?? 1;
  // letterSpacing adds trailing space; compensate when centring
  const trail = (o.tracking ?? 0) * o.size;
  const dx = ctx.textAlign === 'center' ? trail / 2 : ctx.textAlign === 'right' ? trail : 0;
  if (o.stroke) {
    ctx.lineWidth = o.stroke;
    ctx.strokeStyle = o.color ?? C.white;
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x + dx, y);
  } else {
    ctx.fillStyle = o.color ?? C.white;
    ctx.fillText(s, x + dx, y);
  }
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

/** per-letter kinetic reveal; p = 0..1 */
export function kinetic(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  o: TextOpts,
  p: number,
  mode: 'rise' | 'drop' | 'scale' | 'type' = 'rise',
): void {
  ctx.save();
  setFont(ctx, o);
  const chars = [...s];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) - (o.tracking ?? 0) * o.size;
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const n = chars.length;
  const span = mode === 'type' ? 1 : 5;
  chars.forEach((ch, i) => {
    const lp = clamp((p * (n + span) - i) / span);
    if (lp <= 0) {
      cx += widths[i];
      return;
    }
    const e = mode === 'type' ? 1 : eOutCubic(lp);
    ctx.save();
    ctx.globalAlpha *= (o.alpha ?? 1) * (mode === 'type' ? 1 : e);
    ctx.fillStyle = o.color ?? C.white;
    ctx.strokeStyle = o.color ?? C.white;
    ctx.lineWidth = o.stroke ?? 0;
    let ty = y;
    if (mode === 'rise') ty += (1 - e) * o.size * 0.6;
    if (mode === 'drop') ty -= (1 - e) * o.size * 0.6;
    ctx.translate(cx + widths[i] / 2, ty);
    if (mode === 'scale') ctx.scale(lerp(2.2, 1, e), lerp(2.2, 1, e));
    ctx.textAlign = 'center';
    ctx.letterSpacing = '0px';
    if (o.stroke) ctx.strokeText(ch, 0, 0);
    else ctx.fillText(ch, 0, 0);
    ctx.restore();
    cx += widths[i];
  });
  ctx.restore();
}

export function measure(ctx: Ctx, s: string, o: TextOpts): number {
  ctx.save();
  setFont(ctx, o);
  const w = ctx.measureText(s).width - (o.tracking ?? 0) * o.size;
  ctx.restore();
  return w;
}

// ------------------------------------------------------------------ shapes
export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** pill label that wipes in from the left; p 0..1 in, q 0..1 out */
export function chip(ctx: Ctx, label: string, x: number, y: number, color: string, p: number, q = 0, align: 'left' | 'right' = 'left'): void {
  if (p <= 0 || q >= 1) return;
  const o: TextOpts = { size: 30, weight: 600, family: 'Mono', tracking: 0.08, color: C.white };
  const tw = measure(ctx, label, o);
  const w = tw + 70;
  const h = 64;
  const bx = align === 'left' ? x : x - w;
  const reveal = eOutExpo(p) * (1 - eInExpo(q));
  ctx.save();
  ctx.beginPath();
  ctx.rect(align === 'left' ? bx : bx + w * (1 - reveal), y - 4, w * reveal, h + 8);
  ctx.clip();
  rrect(ctx, bx, y, w, h, 32);
  ctx.fillStyle = 'rgba(6,7,10,0.72)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx + 30, y + h / 2, 7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  text(ctx, label, bx + 48, y + h / 2 + 11, o);
  ctx.restore();
}

/** leader-line callout: dot at (px,py), elbow line to a label */
export function callout(ctx: Ctx, px: number, py: number, lx: number, ly: number, title: string, sub: string, color: string, p: number, q = 0): void {
  if (p <= 0 || q >= 1) return;
  const a = 1 - eInCubic(q);
  ctx.save();
  ctx.globalAlpha *= a;
  const l1 = eOutCubic(seg(p, 0, 0.45));
  const l2 = eOutCubic(seg(p, 0.35, 0.8));
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py, 10 * eOutBack(seg(p, 0, 0.25)), 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, 10 + 30 * seg(p, 0, 0.6), 0, Math.PI * 2);
  ctx.globalAlpha *= 1 - seg(p, 0, 0.6);
  ctx.stroke();
  ctx.globalAlpha = a;
  ctx.beginPath();
  ctx.moveTo(px, py);
  const mx = lerp(px, lx, l1);
  const my = lerp(py, ly, l1);
  ctx.lineTo(mx, my);
  if (l2 > 0) ctx.lineTo(lx + (lx > px ? 1 : -1) * 260 * l2, ly);
  ctx.stroke();
  const tp = seg(p, 0.5, 1);
  const right = lx > px;
  kinetic(ctx, title, lx + (right ? 0 : -260), ly - 22, { size: 52, weight: 800, color: C.white, align: 'left' }, tp);
  kinetic(ctx, sub, lx + (right ? 0 : -260), ly + 44, { size: 26, weight: 500, family: 'Mono', color, align: 'left', tracking: 0.04 }, seg(p, 0.6, 1), 'type');
  ctx.restore();
}

// ------------------------------------------------------------------ video framing
export function drawCover(ctx: Ctx, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number, zoom = 1, fx = 0.5, fy = 0.5): void {
  const iw = img.width;
  const ih = img.height;
  const s = Math.max(w / iw, h / ih) * zoom;
  const sw = w / s;
  const sh = h / s;
  const sx = clamp((iw - sw) * fx, 0, iw - sw);
  const sy = clamp((ih - sh) * fy, 0, ih - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** cheap large blur: downsample then upsample */
export function blurFill(ctx: Ctx, img: CanvasImageSource & { width: number; height: number }, darken = 0.55, zoom = 1.25): void {
  const small = buf('blur-small', 54, 96);
  small.x.imageSmoothingQuality = 'high';
  drawCover(small.x, img, 0, 0, 54, 96, zoom);
  const mid = buf('blur-mid', 216, 384);
  mid.x.imageSmoothingQuality = 'high';
  mid.x.drawImage(small.c, 0, 0, 216, 384);
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mid.c, 0, 0, W, H);
  ctx.fillStyle = `rgba(4,5,8,${darken})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ------------------------------------------------------------------ post effects
let grain: HTMLCanvasElement[] = [];
export function initGrain(): void {
  grain = [0, 1, 2, 3].map((k) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const im = x.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = hash(i * 0.37 + k * 911) * 255;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c;
  });
}
export function postGrain(ctx: Ctx, frame: number, amount = 0.07): void {
  const g = grain[frame % 4];
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount;
  const pat = ctx.createPattern(g, 'repeat')!;
  pat.setTransform(new DOMMatrix().translate(hash(frame) * 256, hash(frame + 7) * 256));
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
export function vignette(ctx: Ctx, amount = 0.55): void {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
export function flash(ctx: Ctx, a: number, color = '255,255,255'): void {
  if (a <= 0.001) return;
  ctx.save();
  ctx.fillStyle = `rgba(${color},${clamp(a)})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** RGB split: redraw the canvas content with channel offsets */
export function chroma(ctx: Ctx, src: HTMLCanvasElement, amt: number): void {
  if (amt < 0.5) return;
  const tmp = buf('chroma');
  tmp.x.drawImage(src, 0, 0);
  const ch = buf('chroma-ch');
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const parts: [string, number][] = [
    ['#ff0000', -amt],
    ['#00ff00', 0],
    ['#0000ff', amt],
  ];
  for (const [col, dx] of parts) {
    ch.x.globalCompositeOperation = 'source-over';
    ch.x.clearRect(0, 0, W, H);
    ch.x.drawImage(tmp.c, 0, 0);
    ch.x.globalCompositeOperation = 'multiply';
    ch.x.fillStyle = col;
    ch.x.fillRect(0, 0, W, H);
    ctx.drawImage(ch.c, dx, 0);
  }
  ctx.restore();
}

/** horizontal slice displacement glitch */
export function glitch(ctx: Ctx, src: HTMLCanvasElement, amt: number, seed: number): void {
  if (amt <= 0.01) return;
  const tmp = buf('glitch');
  tmp.x.drawImage(src, 0, 0);
  const slices = 18;
  for (let i = 0; i < slices; i++) {
    const r = hash(seed * 13.1 + i * 7.7);
    if (r > 0.55 + 0.4 * (1 - amt)) continue;
    const y = Math.floor(hash(seed + i * 3.3) * H);
    const h = 8 + Math.floor(hash(seed * 2 + i) * 120 * amt);
    const dx = (hash(seed * 5 + i * 1.9) - 0.5) * 260 * amt;
    ctx.drawImage(tmp.c, 0, y, W, h, dx, y, W, h);
    if (r < 0.15) {
      ctx.fillStyle = hash(i + seed) > 0.5 ? 'rgba(53,228,255,0.35)' : 'rgba(255,122,28,0.35)';
      ctx.fillRect(dx, y, W, Math.max(2, h * 0.15));
    }
  }
}

/** directional motion blur by stacking offset copies */
export function smear(ctx: Ctx, src: HTMLCanvasElement, dx: number, dy: number, copies = 8): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(src, 0, 0);
  for (let i = 1; i <= copies; i++) {
    ctx.globalAlpha = 0.5 / i;
    ctx.drawImage(src, (dx * i) / copies, (dy * i) / copies);
  }
  ctx.restore();
}
