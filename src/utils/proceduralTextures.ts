import * as THREE from 'three';

/** Periodic value noise on a lattice so textures tile around the pedestal without a seam. */
function makeNoise(period: number, seed: number) {
  const g = new Float32Array(period * period);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < g.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    g[i] = s / 4294967296;
  }
  return (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % period) + period) % period;
    const y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const a = g[y0 * period + x0];
    const b = g[y0 * period + x1];
    const c = g[y1 * period + x0];
    const d = g[y1 * period + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number, oct: number, base: number): number {
  let amp = 0.5;
  let f = base;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += noise(x * f, y * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

export interface StoneTextures {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

/** Pale warm stone with faint veining. Low contrast on purpose. */
export function createStoneTextures(size = 512): StoneTextures {
  const color = document.createElement('canvas');
  const bump = document.createElement('canvas');
  color.width = color.height = bump.width = bump.height = size;
  const cc = color.getContext('2d')!;
  const bc = bump.getContext('2d')!;
  const ci = cc.createImageData(size, size);
  const bi = bc.createImageData(size, size);
  const n1 = makeNoise(8, 11);
  const n2 = makeNoise(8, 97);
  const n3 = makeNoise(32, 5);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const cloud = fbm(n1, u * 8, v * 8, 5, 1);
      const warp = fbm(n2, u * 8, v * 8, 3, 1) * 0.25;
      const vein = 1 - Math.abs(fbm(n1, u * 8 + warp * 2, v * 8 - warp * 2, 4, 0.6) * 2 - 1);
      const veinMask = Math.pow(vein, 14) * 0.5;
      const grain = n3(u * 32 * 8, v * 32 * 8) - 0.5;
      const l = 0.5 + (cloud - 0.5) * 0.55 - veinMask * 0.35 + grain * 0.06;
      const i = (y * size + x) * 4;
      const r = 214 + (l - 0.5) * 70;
      ci.data[i] = r;
      ci.data[i + 1] = r - 3 - veinMask * 8;
      ci.data[i + 2] = r - 9 - veinMask * 10;
      ci.data[i + 3] = 255;
      const b = 128 + (cloud - 0.5) * 60 + grain * 70 - veinMask * 40;
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = b;
      bi.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0);
  bc.putImageData(bi, 0, 0);
  const map = new THREE.CanvasTexture(color);
  const bumpTex = new THREE.CanvasTexture(bump);
  for (const t of [map, bumpTex]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, bump: bumpTex };
}

/** Fine horizontal brushing used as a roughness map for the metal trim. */
export function createBrushedRoughness(size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const n = makeNoise(256, 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = 0.45 + (n(x * 0.02, y * 1.0) - 0.5) * 0.5 + (n(x * 0.2, y * 3.1) - 0.5) * 0.2;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v * 255));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft radial falloff used for fake contact shadows. */
export function createSoftShadowTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.35, 'rgba(0,0,0,0.65)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
