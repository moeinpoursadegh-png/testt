import codeSrc from '../car/build.ts?raw';
import { Pchip } from '../utils/math';
import {
  C, H, W, type Ctx, blurFill, buf, callout, chip, chroma, clamp, drawCover, eInCubic, eInExpo, eInOutCubic, eInOutExpo,
  eOutBack, eOutCubic, eOutExpo, flash, glitch, hash, initGrain, kinetic, lerp, measure, postGrain, rrect, seg, smear, text,
  vignette,
} from './fx';

export const DURATION = 60;
const FPS = 30;

// ------------------------------------------------------------------ frame sources
type Src = 'car' | 'bmw';
const SRC = {
  car: { dir: '/mgsrc/car30', n: 300, fps: 30 },
  bmw: { dir: '/mgsrc/bmw', n: 360, fps: 30 },
};
const cache = new Map<string, Promise<HTMLImageElement>>();
function frame(src: Src, seconds: number): Promise<HTMLImageElement> {
  const s = SRC[src];
  const i = Math.max(1, Math.min(s.n, Math.round(seconds * s.fps) + 1));
  const url = `${s.dir}/f${String(i).padStart(4, '0')}.jpg`;
  let p = cache.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => img.decode().then(() => res(img), () => res(img));
      img.onerror = rej;
      img.src = url;
    });
    cache.set(url, p);
    if (cache.size > 160) cache.delete(cache.keys().next().value!);
  }
  return p;
}
const curve = (keys: [number, number][]) => new Pchip(keys.map((k) => k[0]), keys.map((k) => k[1]));

// speed-ramped source clocks
const carClock = curve([
  [8.5, 0.45],
  [11.5, 2.5],
  [12.9, 3.9],
  [15.5, 4.95],
  [17.4, 6.35],
  [19.6, 6.42],
  [23.0, 9.9],
  [24.5, 10],
]);
const bmwClock = curve([
  [27.0, 0],
  [28.4, 1.4],
  [30.5, 3.5],
  [33.5, 5.6],
  [35.5, 8.2],
  [39.5, 11.4],
  [41.2, 12],
]);
const splitCar = curve([
  [41.0, 3.0],
  [46.5, 6.3],
  [47.2, 6.6],
  [52.2, 10],
]);
const splitBmw = curve([
  [41.0, 1.2],
  [46.5, 6.2],
  [47.2, 8.4],
  [52.2, 12],
]);

// ------------------------------------------------------------------ shared bits
const INK = '#0b0d12';
const beat = (t: number) => Math.exp(-(((t % 0.5) + 0.5) % 0.5) * 9);
const codeLines = codeSrc.split('\n').filter((l) => l.trim().length > 0);

function bgGrid(ctx: Ctx, t: number, color: string, alpha = 0.08): void {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  const off = (t * 40) % 90;
  for (let x = -90 + (off % 90); x < W + 90; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = -90 + off; y < H + 90; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.45, H * 0.6);
  g.addColorStop(0, color === C.cyan ? 'rgba(53,228,255,0.10)' : 'rgba(255,122,28,0.10)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function topBar(ctx: Ctx, label: string, color: string, progress: number, a = 1): void {
  ctx.save();
  ctx.globalAlpha *= a;
  text(ctx, label, 60, 112, { size: 30, weight: 700, family: 'Mono', color: INK, tracking: 0.12 });
  ctx.fillStyle = 'rgba(11,13,18,0.15)';
  ctx.fillRect(60, 140, W - 120, 4);
  ctx.fillStyle = color;
  ctx.fillRect(60, 140, (W - 120) * clamp(progress), 4);
  ctx.restore();
}

function bottomCaption(ctx: Ctx, s: string, color: string, p: number, q = 0): void {
  if (p <= 0 || q >= 1) return;
  ctx.save();
  ctx.globalAlpha *= 1 - eInCubic(q);
  const g = ctx.createLinearGradient(0, H - 420, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H - 420, W, 420);
  const fs = Math.min(58, (58 * (W - 120)) / measure(ctx, s, { size: 58, weight: 800, tracking: 0.02 }));
  kinetic(ctx, s, W / 2, H - 230, { size: fs, weight: 800, align: 'center', tracking: 0.02 }, eOutCubic(p));
  ctx.fillStyle = color;
  const w = 520 * eOutExpo(seg(p, 0.2, 1));
  ctx.fillRect(W / 2 - w / 2, H - 196, w, 6);
  ctx.restore();
}

// ------------------------------------------------------------------ scenes
async function sOpen(ctx: Ctx, t: number): Promise<void> {
  bgGrid(ctx, t, C.cyan, 0.05);
  const prompt = '> make a car that explodes into parts';
  const typed = Math.floor(clamp((t - 0.25) / 1.3) * prompt.length);
  const up = eInOutExpo(seg(t, 1.6, 1.9));
  const py = lerp(960, 640, up);
  ctx.save();
  ctx.globalAlpha = 1 - 0.5 * up;
  const shown = prompt.slice(0, typed);
  const o = { size: 40, weight: 500, family: 'Mono' as const, color: C.white };
  const full = measure(ctx, prompt, o);
  const x0 = W / 2 - full / 2;
  text(ctx, shown.slice(0, 1), x0, py, { ...o, color: C.cyan });
  const w1 = measure(ctx, shown.slice(0, 1), o);
  text(ctx, shown.slice(1), x0 + w1 + 2, py, o);
  const cw = measure(ctx, shown, o);
  if (Math.floor(t * 3) % 2 === 0 || t < 1.6) {
    ctx.fillStyle = C.cyan;
    ctx.fillRect(x0 + cw + 10, py - 34, 20, 42);
  }
  ctx.restore();
  // slam
  if (t >= 1.75) {
    const p = seg(t, 1.75, 2.1);
    const s = lerp(1.9, 1, eOutExpo(p));
    ctx.save();
    ctx.translate(W / 2 + (1 - p) * (hash(t * 60) - 0.5) * 40, 950);
    ctx.scale(s, s);
    text(ctx, 'SAME PROMPT.', 0, 0, { size: 132, weight: 900, align: 'center', tracking: -0.02, alpha: eOutCubic(p) });
    ctx.restore();
  }
  if (t >= 2.25) {
    kinetic(ctx, 'TWO PIPELINES.', W / 2, 1110, { size: 112, weight: 900, align: 'center', stroke: 3, color: C.cyan, tracking: 0.01 }, seg(t, 2.25, 2.7), 'rise');
  }
}

async function sVersus(ctx: Ctx, t: number): Promise<void> {
  const lt = t - 3;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const inTop = eOutExpo(seg(lt, 0, 0.45));
  const inBot = eOutExpo(seg(lt, 0.1, 0.55));
  const [car, bmw] = await Promise.all([frame('car', 3.2), frame('bmw', 2.2)]);
  const drift = lt * 18;
  // top panel (code)
  ctx.save();
  ctx.translate(-(1 - inTop) * W, 0);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H * 0.44);
  ctx.lineTo(0, H * 0.56);
  ctx.closePath();
  ctx.clip();
  drawCover(ctx, car, 0, -drift, W, H * 0.6, 1.25, 0.5, 0.48);
  ctx.fillStyle = 'rgba(4,10,14,0.55)';
  ctx.fillRect(0, 0, W, H);
  const gt = ctx.createLinearGradient(0, 0, 0, H * 0.56);
  gt.addColorStop(0, 'rgba(53,228,255,0.0)');
  gt.addColorStop(1, 'rgba(53,228,255,0.22)');
  ctx.fillStyle = gt;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // bottom panel (mcp)
  ctx.save();
  ctx.translate((1 - inBot) * W, 0);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.56 + 14);
  ctx.lineTo(W, H * 0.44 + 14);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.clip();
  drawCover(ctx, bmw, 0, H * 0.42 + drift, W, H * 0.6, 1.0, 0.5, 0.5);
  ctx.fillStyle = 'rgba(14,8,4,0.5)';
  ctx.fillRect(0, 0, W, H);
  const gb = ctx.createLinearGradient(0, H * 0.44, 0, H);
  gb.addColorStop(0, 'rgba(255,122,28,0.22)');
  gb.addColorStop(1, 'rgba(255,122,28,0.0)');
  ctx.fillStyle = gb;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // titles
  kinetic(ctx, 'PURE CODE', 70, 420, { size: 128, weight: 900, tracking: -0.01 }, seg(lt, 0.25, 0.75));
  kinetic(ctx, 'Claude Code + Three.js', 74, 490, { size: 34, weight: 500, family: 'Mono', color: C.cyan }, seg(lt, 0.55, 1.1), 'type');
  kinetic(ctx, 'MCP + BLENDER', W - 70, 1560, { size: 112, weight: 900, align: 'right', tracking: -0.01 }, seg(lt, 0.4, 0.9));
  kinetic(ctx, 'Claude + MCP + a ready-made model', W - 74, 1630, { size: 30, weight: 500, family: 'Mono', color: C.orange, align: 'right' }, seg(lt, 0.7, 1.3), 'type');
  // VS badge
  const vp = seg(lt, 0.5, 0.85);
  if (vp > 0) {
    const r = 112 * eOutBack(vp) * (1 + 0.06 * beat(t));
    const ring = seg(lt, 0.5, 1.2);
    ctx.save();
    ctx.translate(W / 2, H / 2 + 7);
    ctx.strokeStyle = C.white;
    ctx.globalAlpha = 1 - ring;
    ctx.lineWidth = 6 * (1 - ring) + 1;
    ctx.beginPath();
    ctx.arc(0, 0, 112 + 420 * eOutCubic(ring), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate((1 - eOutBack(vp)) * -0.6);
    text(ctx, 'VS', 0, 34, { size: 96 * eOutBack(vp), weight: 900, align: 'center', color: C.bg, tracking: -0.04 });
    ctx.restore();
  }
}

async function sRound(ctx: Ctx, t: number, n: 1 | 2): Promise<void> {
  const t0 = n === 1 ? 6 : 24;
  const lt = t - t0;
  const col = n === 1 ? C.cyan : C.orange;
  bgGrid(ctx, t, col, 0.06);
  if (n === 1) {
    // scrolling source code of the actual car scene
    ctx.save();
    const lh = 34;
    const scroll = lt * 140;
    const first = Math.floor(scroll / lh);
    for (let i = 0; i < 64; i++) {
      const li = (((first + i) % codeLines.length) + codeLines.length) % codeLines.length;
      const y = i * lh - (scroll % lh) + 40;
      const hl = i === 30;
      text(ctx, codeLines[li].slice(0, 58), 40, y, { size: 22, weight: 500, family: 'Mono', color: hl ? C.cyan : 'rgba(53,228,255,0.16)' });
    }
    ctx.restore();
    const fade = ctx.createLinearGradient(0, 0, 0, H);
    fade.addColorStop(0, 'rgba(6,7,10,0.9)');
    fade.addColorStop(0.5, 'rgba(6,7,10,0.35)');
    fade.addColorStop(1, 'rgba(6,7,10,0.9)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
  }
  text(ctx, 'ROUND', W / 2, 470, { size: 40, weight: 700, family: 'Mono', align: 'center', tracking: 0.5, color: col, alpha: eOutCubic(seg(lt, 0.05, 0.4)) });
  kinetic(ctx, n === 1 ? '01' : '02', W / 2, 900, { size: 460, weight: 900, align: 'center', stroke: 5, color: col, tracking: -0.04 }, seg(lt, 0.1, 0.55), 'scale');
  kinetic(ctx, n === 1 ? 'PURE CODE' : 'MCP + BLENDER', W / 2, 1110, { size: n === 1 ? 128 : 110, weight: 900, align: 'center', tracking: -0.01 }, seg(lt, 0.35, 0.85));
  if (n === 1) {
    kinetic(ctx, 'Claude Code · Three.js · zero 3D assets', W / 2, 1200, { size: 32, weight: 500, family: 'Mono', align: 'center', color: C.muted }, seg(lt, 0.8, 1.6), 'type');
    chip(ctx, 'EVERY PART WRITTEN IN CODE', W / 2 - 300, 1290, C.cyan, seg(lt, 1.3, 1.9));
  } else {
    kinetic(ctx, 'Claude drives a real 3D app via MCP', W / 2, 1200, { size: 32, weight: 500, family: 'Mono', align: 'center', color: C.muted }, seg(lt, 0.8, 1.6), 'type');
    // pipeline
    const nodes = ['CLAUDE', 'MCP', 'BLENDER', 'RENDER'];
    const y = 1420;
    const bw = 210;
    const gap = (W - 120 - bw * 4) / 3;
    nodes.forEach((label, i) => {
      const p = seg(lt, 1.0 + i * 0.18, 1.4 + i * 0.18);
      if (p <= 0) return;
      const x = 60 + i * (bw + gap);
      ctx.save();
      ctx.globalAlpha = eOutCubic(p);
      ctx.translate(x + bw / 2, y + 45);
      ctx.scale(lerp(0.6, 1, eOutBack(p)), lerp(0.6, 1, eOutBack(p)));
      rrect(ctx, -bw / 2, -45, bw, 90, 20);
      ctx.fillStyle = i === 2 ? 'rgba(255,122,28,0.22)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = i === 2 ? C.orange : 'rgba(255,255,255,0.5)';
      ctx.stroke();
      text(ctx, label, 0, 11, { size: 28, weight: 700, family: 'Mono', align: 'center', tracking: 0.06 });
      ctx.restore();
      if (i < 3) {
        const lp = seg(lt, 1.3 + i * 0.18, 1.6 + i * 0.18);
        const x1 = x + bw + 8;
        const x2 = x + bw + gap - 8;
        ctx.strokeStyle = C.orange;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y + 45);
        ctx.lineTo(lerp(x1, x2, eOutCubic(lp)), y + 45);
        ctx.stroke();
      }
    });
    // data pulse travelling through the chain
    const pp = (lt - 1.9) / 0.9;
    if (pp > 0 && pp < 1.6) {
      const u = pp % 1;
      const x = lerp(60 + bw / 2, W - 60 - bw / 2, eInOutCubic(u));
      ctx.fillStyle = C.white;
      ctx.shadowColor = C.orange;
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(x, y + 45, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

async function sCar(ctx: Ctx, t: number): Promise<void> {
  const st = carClock.eval(t);
  const img = await frame('car', st);
  const explode = 12.35;
  const punch = t > explode ? 0.14 * Math.exp(-(t - explode) * 5) : 0;
  const freeze = seg(t, 17.4, 17.6) * (1 - seg(t, 19.4, 19.7));
  const zoom = 1 + 0.04 * seg(t, 9, 24) + punch + 0.03 * freeze;
  const sh = t > explode ? Math.exp(-(t - explode) * 9) * 18 : 0;
  ctx.save();
  ctx.translate((hash(t * 97) - 0.5) * sh, (hash(t * 53) - 0.5) * sh);
  drawCover(ctx, img, 0, 0, W, H, zoom, 0.5, 0.5);
  ctx.restore();
  if (freeze > 0) {
    ctx.fillStyle = `rgba(4,6,10,${0.55 * freeze})`;
    ctx.fillRect(0, 0, W, H);
  }
  topBar(ctx, 'ROUND 01 · PURE CODE', C.cyan, seg(t, 9, 24));
  chip(ctx, 'WIREFRAME BUILD', 60, 200, C.cyan, seg(t, 9.25, 9.6), seg(t, 10.6, 10.9));
  chip(ctx, 'SCAN → SOLID', 60, 200, C.cyan, seg(t, 10.7, 11.05), seg(t, 12.1, 12.4));
  if (t > explode && t < 15.8) {
    const p = seg(t, explode, explode + 0.4);
    const q = seg(t, 15.2, 15.6);
    ctx.save();
    ctx.globalAlpha = 1 - eInCubic(q);
    kinetic(ctx, 'BREAK IT', W / 2, 430, { size: 150, weight: 900, align: 'center', tracking: -0.02, color: INK }, p, 'scale');
    kinetic(ctx, 'DOWN', W / 2, 580, { size: 150, weight: 900, align: 'center', stroke: 5, color: '#0096b8', tracking: -0.02 }, seg(t, explode + 0.15, explode + 0.55), 'scale');
    ctx.restore();
  }
  // slow-motion indicator
  const sm = seg(t, 13.0, 13.3) * (1 - seg(t, 15.3, 15.6));
  if (sm > 0) {
    ctx.save();
    ctx.globalAlpha = sm;
    text(ctx, '0.4×', W - 60, 250, { size: 64, weight: 800, family: 'Grotesk', align: 'right', color: '#0096b8' });
    text(ctx, 'SLOW MOTION', W - 60, 288, { size: 22, weight: 600, family: 'Mono', align: 'right', color: INK, tracking: 0.2 });
    ctx.restore();
  }
  // freeze-frame stats on the flat-lay
  callout(ctx, 330, 640, 560, 470, '80 PARTS', 'each one generated in code', C.cyan, seg(t, 17.55, 18.3), seg(t, 19.2, 19.5));
  callout(ctx, 760, 1180, 520, 1010, '0 MODELS', 'no downloads, no textures', C.cyan, seg(t, 17.9, 18.65), seg(t, 19.25, 19.55));
  callout(ctx, 420, 1520, 640, 1700, '749 LINES', 'TypeScript + Three.js', C.cyan, seg(t, 18.25, 19.0), seg(t, 19.3, 19.6));
  chip(ctx, 'REASSEMBLY', 60, 200, C.cyan, seg(t, 19.7, 20.05), seg(t, 22.4, 22.7));
  bottomCaption(ctx, 'FAST · CONTROLLABLE · STYLIZED', C.cyan, seg(t, 22.6, 23.2), seg(t, 23.75, 23.95));
}

/** BMW clip in a vertical frame: blends between a floating 16:9 panel and a full-bleed crop */
async function sBmw(ctx: Ctx, t: number): Promise<void> {
  const st = bmwClock.eval(t);
  const img = await frame('bmw', st);
  const full = (a: number, b: number) => eInOutExpo(seg(t, a, a + 0.35)) * (1 - eInOutExpo(seg(t, b, b + 0.35)));
  const m = Math.max(full(28.35, 30.35), full(33.4, 35.35), full(38.5, 99));
  blurFill(ctx, img, 0.5, 1.4);
  // panel rect (contain) vs full-bleed rect (cover crop)
  const iw = img.width;
  const ih = img.height;
  const pw = 1000;
  const ph = (pw * ih) / iw;
  const cropW = (ih * W) / H;
  const sx = lerp(0, (iw - cropW) / 2, m);
  const sw = lerp(iw, cropW, m);
  const dx = lerp((W - pw) / 2, 0, m);
  const dy = lerp(H / 2 - ph / 2 + 40, 0, m);
  const dw = lerp(pw, W, m);
  const dh = lerp(ph, H, m);
  const pop = 28.45;
  const sh = t > pop ? Math.exp(-(t - pop) * 9) * 22 : 0;
  ctx.save();
  ctx.translate((hash(t * 91) - 0.5) * sh, (hash(t * 37) - 0.5) * sh);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 60 * (1 - m);
  rrect(ctx, dx, dy, dw, dh, 28 * (1 - m));
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  const z = 1 + 0.03 * Math.sin(t * 0.7);
  ctx.drawImage(img, sx + (sw * (1 - 1 / z)) / 2, (ih * (1 - 1 / z)) / 2, sw / z, ih / z, dx, dy, dw, dh);
  ctx.restore();
  if (m < 0.99) {
    ctx.save();
    ctx.globalAlpha = 1 - m;
    rrect(ctx, dx, dy, dw, dh, 28);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,122,28,0.8)';
    ctx.stroke();
    ctx.restore();
  }
  topBar(ctx, 'ROUND 02 · MCP + BLENDER', C.orange, seg(t, 27, 41));
  chip(ctx, 'READY-MADE MODEL', 60, 200, C.orange, seg(t, 27.2, 27.55), seg(t, 28.2, 28.45));
  if (t > 28.5 && t < 30.5) {
    const q = seg(t, 30.0, 30.4);
    ctx.save();
    ctx.globalAlpha = 1 - eInCubic(q);
    kinetic(ctx, 'REAL', W / 2, 470, { size: 170, weight: 900, align: 'center', tracking: -0.02, color: INK }, seg(t, 28.5, 28.85), 'scale');
    kinetic(ctx, 'DETAIL', W / 2, 640, { size: 170, weight: 900, align: 'center', stroke: 5, color: '#e5600a', tracking: -0.02 }, seg(t, 28.65, 29.0), 'scale');
    ctx.restore();
  }
  chip(ctx, 'PRODUCTION MATERIALS', 60, 440, C.orange, seg(t, 30.7, 31.05), seg(t, 33.1, 33.4));
  chip(ctx, 'STUDIO LIGHTING', 60, 520, C.orange, seg(t, 31.0, 31.35), seg(t, 33.15, 33.45));
  chip(ctx, 'HUNDREDS OF PARTS', 60, 200, C.orange, seg(t, 33.6, 33.95), seg(t, 35.2, 35.45));
  chip(ctx, 'REASSEMBLY', 60, 440, C.orange, seg(t, 35.6, 35.95), seg(t, 38.2, 38.5));
  bottomCaption(ctx, 'PHOTOREAL · NEEDS BLENDER + A MODEL', C.orange, seg(t, 39.1, 39.7), seg(t, 40.7, 40.95));
}

async function sSplit(ctx: Ctx, t: number): Promise<void> {
  const lt = t - 41;
  const [car, bmw] = await Promise.all([frame('car', splitCar.eval(t)), frame('bmw', splitBmw.eval(t))]);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  const a = eOutExpo(seg(lt, 0, 0.5));
  const b = eOutExpo(seg(lt, 0.08, 0.58));
  // top: code car (vertical source → centre band)
  ctx.save();
  ctx.translate(-(1 - a) * W, 0);
  ctx.beginPath();
  ctx.rect(0, 0, W, H / 2 - 3);
  ctx.clip();
  ctx.drawImage(car, 0, 470, car.width, car.width * (960 / W), 0, 0, W, 960);
  ctx.restore();
  // bottom: blender car (horizontal source → centre crop)
  ctx.save();
  ctx.translate((1 - b) * W, 0);
  ctx.beginPath();
  ctx.rect(0, H / 2 + 3, W, H / 2);
  ctx.clip();
  const cw = bmw.height * (W / 960);
  ctx.drawImage(bmw, (bmw.width - cw) / 2, 0, cw, bmw.height, 0, H / 2, W, 960);
  ctx.restore();
  // divider
  const d = eOutExpo(seg(lt, 0.3, 0.8));
  ctx.fillStyle = C.white;
  ctx.fillRect(W / 2 - (W / 2) * d, H / 2 - 3, W * d, 6);
  chip(ctx, 'PURE CODE', 50, 60, C.cyan, seg(lt, 0.45, 0.8));
  chip(ctx, 'MCP + BLENDER', 50, H / 2 + 50, C.orange, seg(lt, 0.55, 0.9));
  const phase = t < 46.8 ? 'EXPLODE' : 'ASSEMBLE';
  const pa = t < 46.8 ? seg(lt, 0.7, 1.1) : seg(t, 47.0, 47.4);
  text(ctx, `PHASE ${t < 46.8 ? '1' : '2'} — ${phase}`, W - 50, H / 2 - 30, { size: 26, weight: 700, family: 'Mono', align: 'right', tracking: 0.12, alpha: eOutCubic(pa) * (t > 46.5 && t < 47 ? 0 : 1) });
  // VS badge pulsing on the beat
  const vp = seg(lt, 0.5, 0.85);
  if (vp > 0) {
    const r = 70 * eOutBack(vp) * (1 + 0.08 * beat(t));
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'VS', 0, 21, { size: 58 * eOutBack(vp), weight: 900, align: 'center', color: C.bg, tracking: -0.04 });
    ctx.restore();
  }
}

async function sScore(ctx: Ctx, t: number): Promise<void> {
  const lt = t - 52;
  bgGrid(ctx, t, C.cyan, 0.04);
  kinetic(ctx, 'THE VERDICT', W / 2, 330, { size: 120, weight: 900, align: 'center', tracking: -0.01 }, seg(lt, 0.1, 0.55));
  text(ctx, 'OUR TAKE', W / 2, 400, { size: 26, weight: 600, family: 'Mono', align: 'center', color: C.muted, tracking: 0.4, alpha: seg(lt, 0.4, 0.8) });
  const rows: [string, number, number][] = [
    ['VISUAL REALISM', 38, 96],
    ['SETUP SPEED', 92, 45],
    ['CONTROL & REPEATABILITY', 95, 70],
  ];
  const bx = 60;
  const bw = W - 120;
  rows.forEach(([label, a, b], i) => {
    const y = 560 + i * 270;
    const p = seg(lt, 0.5 + i * 0.3, 1.2 + i * 0.3);
    if (p <= 0) return;
    text(ctx, label, bx, y, { size: 30, weight: 700, family: 'Mono', tracking: 0.1, alpha: eOutCubic(p) });
    const bars: [number, string, number][] = [
      [a, C.cyan, y + 40],
      [b, C.orange, y + 110],
    ];
    for (const [v, col, yy] of bars) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      rrect(ctx, bx, yy, bw - 150, 44, 22);
      ctx.fill();
      const w = (bw - 150) * (v / 100) * eOutExpo(p);
      ctx.fillStyle = col;
      rrect(ctx, bx, yy, Math.max(44, w), 44, 22);
      ctx.fill();
      text(ctx, String(Math.round(v * eOutExpo(p))), bx + bw, yy + 38, { size: 44, weight: 800, family: 'Grotesk', align: 'right', color: col });
    }
  });
  const ap = seg(lt, 1.6, 2.2);
  if (ap > 0) {
    const y = 1400;
    text(ctx, 'ASSETS NEEDED', bx, y, { size: 30, weight: 700, family: 'Mono', tracking: 0.1, alpha: eOutCubic(ap) });
    kinetic(ctx, 'NONE', bx, y + 90, { size: 72, weight: 900, color: C.cyan }, ap);
    kinetic(ctx, 'A 3D MODEL', W - 60, y + 90, { size: 72, weight: 900, color: C.orange, align: 'right' }, seg(lt, 1.8, 2.4));
  }
  const lg = seg(lt, 2.2, 2.6);
  if (lg > 0) {
    ctx.save();
    ctx.globalAlpha = eOutCubic(lg);
    for (const [label, col, x] of [
      ['PURE CODE', C.cyan, 60],
      ['MCP + BLENDER', C.orange, 600],
    ] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x + 14, 1712, 14, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, label, x + 44, 1724, { size: 30, weight: 700, family: 'Mono', tracking: 0.08 });
    }
    ctx.restore();
  }
}

async function sOutro(ctx: Ctx, t: number): Promise<void> {
  const lt = t - 57;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  // faint ghosts of both cars
  const [car, bmw] = await Promise.all([frame('car', 9.9), frame('bmw', 11.9)]);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.drawImage(car, 0, 470, car.width, car.width * (960 / W), 0, -60 - lt * 20, W, 960);
  const cw = bmw.height * (W / 960);
  ctx.drawImage(bmw, (bmw.width - cw) / 2, 0, cw, bmw.height, 0, H / 2 + 60 + lt * 20, W, 960);
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(6,7,10,0.2)');
  g.addColorStop(0.5, 'rgba(6,7,10,0.95)');
  g.addColorStop(1, 'rgba(6,7,10,0.2)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  kinetic(ctx, 'SAME AI.', W / 2, 860, { size: 160, weight: 900, align: 'center', tracking: -0.02 }, seg(lt, 0.1, 0.5), 'scale');
  {
    const o = { size: 104, weight: 900, tracking: -0.01 } as const;
    const w1 = measure(ctx, 'DIFFERENT ', o);
    const w2 = measure(ctx, 'TOOLS.', o);
    const x0 = W / 2 - (w1 + w2) / 2;
    kinetic(ctx, 'DIFFERENT', x0, 1010, { ...o, color: C.cyan }, seg(lt, 0.45, 0.85));
    kinetic(ctx, 'TOOLS.', x0 + w1, 1010, { ...o, color: C.orange }, seg(lt, 0.6, 1.0));
  }
  kinetic(ctx, 'Which one would you ship?', W / 2, 1150, { size: 46, weight: 500, align: 'center', color: C.muted }, seg(lt, 1.1, 1.7), 'type');
  const cp = seg(lt, 1.6, 2.0);
  if (cp > 0) {
    const bob = Math.sin(lt * 8) * 8 * eOutCubic(cp);
    chip(ctx, 'TELL US IN THE COMMENTS ↓', W / 2 - 290, 1320 + bob, C.orange, cp);
  }
}

// ------------------------------------------------------------------ edit decision list
type SceneFn = (ctx: Ctx, t: number) => Promise<void>;
const scenes: [number, number, SceneFn][] = [
  [0, 3, sOpen],
  [3, 6, sVersus],
  [6, 9, (c, t) => sRound(c, t, 1)],
  [9, 24, sCar],
  [24, 27, (c, t) => sRound(c, t, 2)],
  [27, 41, sBmw],
  [41, 52, sSplit],
  [52, 57, sScore],
  [57, 60, sOutro],
];
type Tr = 'cutFlash' | 'stripes' | 'iris' | 'glitch' | 'whip' | 'flashPunch' | 'blinds' | 'zoomBlur';
const transitions: [number, number, Tr][] = [
  [2.88, 3.12, 'cutFlash'],
  [5.55, 6.15, 'stripes'],
  [8.55, 9.2, 'iris'],
  [23.75, 24.2, 'glitch'],
  [26.6, 27.15, 'whip'],
  [40.8, 41.25, 'flashPunch'],
  [51.65, 52.25, 'blinds'],
  [56.6, 57.15, 'zoomBlur'],
];
const glitchHits: [number, number, number][] = [
  [1.75, 0.28, 1],
  [12.35, 0.2, 0.55],
  [28.45, 0.18, 0.5],
  [46.8, 0.22, 0.8],
  [57.05, 0.22, 0.6],
];

function sceneAt(t: number): number {
  for (let i = scenes.length - 1; i >= 0; i--) if (t >= scenes[i][0]) return i;
  return 0;
}

const canvas = document.getElementById('c') as HTMLCanvasElement;
const main = canvas.getContext('2d')!;

async function drawInto(ctx: Ctx, i: number, t: number): Promise<void> {
  ctx.save();
  await scenes[i][2](ctx, t);
  ctx.restore();
}

async function render(t: number): Promise<void> {
  const fi = Math.round(t * FPS);
  const tr = transitions.find(([a, b]) => t >= a && t < b);
  const ctx = main;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (!tr) {
    await drawInto(ctx, sceneAt(t), t);
  } else {
    const [a, b, kind] = tr;
    const mid = (a + b) / 2;
    const p = (t - a) / (b - a);
    const from = sceneAt(a);
    const to = from + 1;
    const A = buf('A');
    const B = buf('B');
    await drawInto(A.x, from, t);
    await drawInto(B.x, to, t);
    switch (kind) {
      case 'cutFlash': {
        ctx.drawImage(t < mid ? A.c : B.c, 0, 0);
        flash(ctx, 1 - Math.abs(p - 0.5) * 2);
        break;
      }
      case 'stripes': {
        ctx.drawImage(A.c, 0, 0);
        const n = 7;
        for (let k = 0; k < n; k++) {
          const lp = eInOutExpo(clamp(p * 1.6 - k * 0.09));
          const sw = (H * 1.6) / n;
          ctx.save();
          ctx.translate(W / 2, H / 2);
          ctx.rotate(-0.42);
          const y = -H * 0.8 + k * sw;
          ctx.beginPath();
          ctx.rect(-W * 1.5 + (1 - lp) * W * 3 * (k % 2 ? 1 : -1), y, W * 3, sw + 2);
          ctx.restore();
          ctx.save();
          ctx.clip();
          ctx.drawImage(B.c, 0, 0);
          ctx.restore();
          ctx.save();
          ctx.translate(W / 2, H / 2);
          ctx.rotate(-0.42);
          const edge = -W * 1.5 + (1 - lp) * W * 3 * (k % 2 ? 1 : -1);
          ctx.fillStyle = C.cyan;
          if (lp > 0 && lp < 1) ctx.fillRect(k % 2 ? edge - 12 : edge + W * 3, y, 12, sw + 2);
          ctx.restore();
        }
        break;
      }
      case 'iris': {
        const e = eInOutExpo(p);
        ctx.save();
        ctx.translate(W / 2, H / 2);
        const s1 = lerp(1, 2.4, eInExpo(p));
        ctx.scale(s1, s1);
        ctx.drawImage(A.c, -W / 2, -H / 2);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, H / 2 - 20, e * H * 0.62, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(W / 2, H / 2);
        const s2 = lerp(1.35, 1, eOutCubic(p));
        ctx.scale(s2, s2);
        ctx.drawImage(B.c, -W / 2, -H / 2);
        ctx.restore();
        ctx.strokeStyle = C.cyan;
        ctx.lineWidth = 8 * (1 - e);
        ctx.beginPath();
        ctx.arc(W / 2, H / 2 - 20, e * H * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'glitch': {
        const src = t < mid ? A.c : B.c;
        const amt = 1 - Math.abs(p - 0.5) * 2;
        ctx.drawImage(src, 0, 0);
        const tmp = buf('gl-src');
        tmp.x.drawImage(src, 0, 0);
        chroma(ctx, tmp.c, 28 * amt);
        glitch(ctx, tmp.c, amt, fi);
        flash(ctx, amt * 0.25, '53,228,255');
        break;
      }
      case 'whip': {
        const e = eInOutExpo(p);
        const dxA = -e * W;
        const dxB = (1 - e) * W;
        const sm = Math.sin(Math.PI * p) * 220;
        const tA = buf('wA');
        tA.x.drawImage(A.c, dxA, 0);
        tA.x.drawImage(B.c, dxB, 0);
        smear(ctx, tA.c, sm, 0, 10);
        break;
      }
      case 'flashPunch': {
        if (t < mid) {
          ctx.save();
          ctx.translate(W / 2, H / 2);
          const s = 1 + 0.15 * eInExpo(p * 2);
          ctx.scale(s, s);
          ctx.drawImage(A.c, -W / 2, -H / 2);
          ctx.restore();
        } else {
          ctx.drawImage(B.c, 0, 0);
        }
        flash(ctx, Math.pow(1 - Math.abs(p - 0.5) * 2, 1.5));
        break;
      }
      case 'blinds': {
        ctx.drawImage(A.c, 0, 0);
        const n = 8;
        const sw = W / n;
        for (let k = 0; k < n; k++) {
          const lp = eInOutCubic(clamp(p * 1.7 - k * 0.09));
          if (lp <= 0) continue;
          ctx.save();
          ctx.beginPath();
          ctx.rect(k * sw, 0, sw * lp + 1, H);
          ctx.clip();
          ctx.drawImage(B.c, 0, 0);
          ctx.restore();
          if (lp < 1) {
            ctx.fillStyle = k % 2 ? C.orange : C.cyan;
            ctx.fillRect(k * sw + sw * lp, 0, 6, H);
          }
        }
        break;
      }
      case 'zoomBlur': {
        const e = eInOutCubic(p);
        const tA = buf('zA');
        tA.x.globalAlpha = 1 - e;
        tA.x.translate(W / 2, H / 2);
        const s = 1 + 0.5 * eInExpo(p);
        for (let k = 0; k < 6; k++) {
          tA.x.globalAlpha = (1 - e) * (k === 0 ? 1 : 0.18);
          const ss = s * (1 + k * 0.03 * Math.sin(Math.PI * p));
          tA.x.save();
          tA.x.scale(ss, ss);
          tA.x.drawImage(A.c, -W / 2, -H / 2);
          tA.x.restore();
        }
        ctx.save();
        ctx.globalAlpha = e;
        ctx.translate(W / 2, H / 2);
        const s2 = lerp(0.85, 1, eOutCubic(p));
        ctx.scale(s2, s2);
        ctx.drawImage(B.c, -W / 2, -H / 2);
        ctx.restore();
        ctx.drawImage(tA.c, 0, 0);
        break;
      }
    }
  }
  // global hits
  for (const [ht, dur, amt] of glitchHits) {
    if (t >= ht && t < ht + dur) {
      const k = (1 - (t - ht) / dur) * amt;
      const tmp = buf('hit');
      tmp.x.drawImage(canvas, 0, 0);
      chroma(ctx, tmp.c, 22 * k);
      glitch(ctx, tmp.c, k, fi + 3);
    }
  }
  // camera-shutter flash on the freeze frame
  flash(ctx, Math.exp(-Math.max(0, t - 17.45) * 12) * (t >= 17.45 ? 0.7 : 0));
  vignette(ctx, 0.45);
  postGrain(ctx, fi, 0.06);
  // fade in / out
  flash(ctx, 1 - seg(t, 0, 0.25), '0,0,0');
  flash(ctx, seg(t, 59.4, 60), '0,0,0');
}

// ------------------------------------------------------------------ boot
(async () => {
  initGrain();
  await Promise.all([document.fonts.load('900 100px Inter'), document.fonts.load('500 40px Mono'), document.fonts.load('700 40px Grotesk')]);
  let playing = !new URLSearchParams(location.search).has('t');
  const startT = Number(new URLSearchParams(location.search).get('t') ?? 0);
  await render(startT);
  (window as unknown as { __mg: unknown }).__mg = {
    async seek(t: number) {
      playing = false;
      await render(t);
    },
  };
  if (playing) {
    const t0 = performance.now();
    const loop = async () => {
      if (!playing) return;
      await render(((performance.now() - t0) / 1000) % DURATION);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
})();
