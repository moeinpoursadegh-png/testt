import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M, numberDecal } from './materials';

/** One separable piece of the kit. Built in car space; its group sits at the piece's centre. */
export interface Part {
  name: string;
  group: THREE.Group;
  home: THREE.Vector3;
  /** layout category (row grouping on the flat-lay) */
  cat: number;
  /** assembly order: lower = earlier */
  stage: number;
}

// ---------------------------------------------------------------- dimensions
const HW = 0.92; // half width of the body
const SKIN = 0.1; // side panel thickness
const B = 0.022; // bevel
const G = B + 0.007; // half gap between neighbouring panels (bevel + visible seam)
const XF = 2.25;
const XR = -2.25;
const RN = 0.36; // nose / tail rounding length
export const WY = 0.34; // wheel radius = axle height
const WXS = [1.38, -1.32];
const AR = 0.43; // arch radius
const WZ = HW - 0.15;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

function rawTop(x: number): number {
  if (x > 0.75) return 0.98 - 0.2 * Math.pow((x - 0.75) / 1.5, 1.8);
  if (x > -0.95) return 0.98;
  const k = (-0.95 - x) / 1.3;
  return 0.98 - 0.1 * k * k;
}
function rawBot(x: number): number {
  const kf = Math.max(0, (x - 1.8) / 0.45);
  const kr = Math.max(0, (-1.8 - x) / 0.45);
  let b = 0.3 + 0.13 * kf * kf + 0.11 * kr * kr;
  for (const wx of WXS) {
    const dx = x - wx;
    if (Math.abs(dx) < AR) b = Math.max(b, WY + Math.sqrt(AR * AR - dx * dx));
  }
  return b;
}
function endF(x: number): number {
  const k = Math.max(clamp((x - (XF - RN)) / RN), clamp((XR + RN - x) / RN));
  return Math.pow(Math.max(0, 1 - Math.pow(k, 2.4)), 1 / 2.4);
}
function mid(x: number): number {
  const t = rawTop(x);
  const b = rawBot(x);
  return b + (t - b) * 0.5;
}
const top = (x: number) => mid(x) + (rawTop(x) - mid(x)) * endF(x);
const bot = (x: number) => mid(x) + (rawBot(x) - mid(x)) * endF(x);

function bandPoly(x0: number, x1: number, lo: (x: number) => number, hi: (x: number) => number): THREE.Vector2[] {
  const n = Math.max(2, Math.ceil((x1 - x0) / 0.015));
  const up: THREE.Vector2[] = [];
  const dn: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const h = hi(x);
    const l = Math.min(lo(x), h - 0.006);
    up.push(new THREE.Vector2(x, h));
    dn.push(new THREE.Vector2(x, l));
  }
  return [...up, ...dn.reverse()];
}

function chaikin(pts: THREE.Vector2[], iters: number): THREE.Vector2[] {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const out: THREE.Vector2[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      out.push(a.clone().lerp(b, 0.25), a.clone().lerp(b, 0.75));
    }
    p = out;
  }
  return p;
}

/** Extrude an XY profile across Z (z0..z1 includes the bevel), smooth-shaded. */
function extrude(poly: THREE.Vector2[], z0: number, z1: number, bevel = B, segs = 4): THREE.BufferGeometry {
  const depth = Math.max(0.002, z1 - z0 - 2 * bevel);
  let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(new THREE.Shape(poly), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segs,
    curveSegments: 6,
    steps: 1,
  });
  g.translate(0, 0, z0 + bevel);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  return g;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos?: [number, number, number], rot?: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  return m;
}

const rbox = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.99);

export function buildCar(): Part[] {
  const parts: Part[] = [];
  const add = (name: string, meshes: THREE.Mesh[], cat: number, stage: number, edges = true) => {
    const group = new THREE.Group();
    group.name = name;
    meshes.forEach((m) => group.add(m));
    const box = new THREE.Box3().setFromObject(group);
    const c = box.getCenter(new THREE.Vector3());
    for (const m of meshes) {
      m.position.sub(c);
      m.castShadow = true;
      if (edges && m.material !== M.glass) {
        const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 18), M.wire);
        l.position.copy(m.position);
        l.quaternion.copy(m.quaternion);
        l.scale.copy(m.scale);
        group.add(l);
      }
    }
    group.position.copy(c);
    parts.push({ name, group, home: c.clone(), cat, stage });
  };
  // glass gets a denser line treatment so the greenhouse still reads in wireframe
  const glassLines = (m: THREE.Mesh) => {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 10), M.wire);
    return l;
  };

  // ------------------------------------------------------------- body shell
  const stripeZ: [number, number][] = [
    [0.09, 0.23],
    [-0.23, -0.09],
  ];
  const stripes = (x0: number, x1: number): THREE.Mesh[] =>
    stripeZ.map(([z0, z1]) =>
      mesh(
        extrude(bandPoly(x0, x1, (x) => top(x) + B - 0.004, (x) => top(x) + B + 0.01), z0, z1, 0.004, 2),
        M.stripe,
      ),
    );

  const cuts = [XR + 0.0015, -1.75, -0.75, 0.75, 1.75, XF - 0.0015];
  const SLAB = 0.09;
  for (let s = 0; s < 5; s++) {
    const x0 = cuts[s] + (s === 0 ? 0 : G);
    const x1 = cuts[s + 1] - (s === 4 ? 0 : G);
    if (s === 0 || s === 4) {
      const name = s === 0 ? 'tail' : 'nose';
      add(name, [mesh(extrude(bandPoly(x0, x1, bot, top), -HW, HW), M.paint), ...stripes(s === 0 ? XR + 0.1 : x0, s === 0 ? x1 : XF - 0.1)], 0, 7);
      continue;
    }
    const label = ['', 'rear', 'door', 'front'][s];
    // top slab: hood / beltline / deck
    const slab = [mesh(extrude(bandPoly(x0, x1, (x) => top(x) - SLAB + G, top), -HW, HW), M.paint)];
    if (s !== 2) slab.push(...stripes(x0, x1));
    add(`${label}-deck`, slab, 0, 7);
    // side skins
    for (const side of [1, -1]) {
      const z0 = side > 0 ? HW - SKIN : -HW;
      const z1 = side > 0 ? HW : -HW + SKIN;
      const meshes = [mesh(extrude(bandPoly(x0, x1, bot, (x) => top(x) - SLAB - G), z0, z1), M.paint)];
      if (s === 2) {
        const d = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), numberDecal());
        d.position.set(0.02, 0.6, side * (HW + 0.002));
        if (side < 0) d.rotation.y = Math.PI;
        meshes.push(d);
      }
      add(`${label}-skin-${side > 0 ? 'L' : 'R'}`, meshes, 0, 6);
    }
    // inner structure
    add(`${label}-core`, [mesh(extrude(bandPoly(x0, x1, (x) => bot(x) + 0.03, (x) => top(x) - SLAB - G), -HW + SKIN + 0.008, HW - SKIN - 0.008), M.core)], 1, 5);
  }

  // ------------------------------------------------------------- cabin
  const cab = chaikin(
    [
      new THREE.Vector2(0.84, 0.95),
      new THREE.Vector2(0.12, 1.43),
      new THREE.Vector2(-0.62, 1.43),
      new THREE.Vector2(-1.22, 0.95),
    ],
    3,
  );
  const glass = mesh(extrude(cab, -0.71, 0.71, 0.05, 5), M.glass);
  glass.renderOrder = 2;
  add('greenhouse', [glass], 0, 8, false);
  {
    const l = glassLines(glass);
    l.position.copy(glass.position);
    parts[parts.length - 1].group.add(l);
  }
  const roof = chaikin(
    [new THREE.Vector2(0.16, 1.41), new THREE.Vector2(0.16, 1.47), new THREE.Vector2(-0.66, 1.47), new THREE.Vector2(-0.66, 1.41)],
    2,
  );
  add('roof', [mesh(extrude(roof, -0.74, 0.74, 0.02), M.paint), ...stripeZ.map(([z0, z1]) => mesh(extrude(chaikin([new THREE.Vector2(0.14, 1.485), new THREE.Vector2(0.14, 1.5), new THREE.Vector2(-0.64, 1.5), new THREE.Vector2(-0.64, 1.485)], 1), z0, z1, 0.004, 2), M.stripe))], 0, 9);
  const strip = (a: THREE.Vector2, b: THREE.Vector2, w: number) => {
    const d = b.clone().sub(a).normalize();
    const n = new THREE.Vector2(-d.y, d.x).multiplyScalar(w / 2);
    return [a.clone().add(n), b.clone().add(n), b.clone().sub(n), a.clone().sub(n)];
  };
  const pillars: [string, THREE.Vector2, THREE.Vector2][] = [
    ['a-pillar', new THREE.Vector2(0.8, 0.98), new THREE.Vector2(0.14, 1.42)],
    ['b-pillar', new THREE.Vector2(-0.28, 0.98), new THREE.Vector2(-0.28, 1.42)],
    ['c-pillar', new THREE.Vector2(-0.64, 1.42), new THREE.Vector2(-1.18, 0.98)],
  ];
  for (const [name, a, b] of pillars) {
    for (const side of [1, -1]) {
      const z0 = side > 0 ? 0.68 : -0.755;
      add(`${name}-${side > 0 ? 'L' : 'R'}`, [mesh(extrude(strip(a, b, name === 'b-pillar' ? 0.09 : 0.07), z0, z0 + 0.075, 0.012, 3), M.paint)], 2, 9);
    }
  }

  // ------------------------------------------------------------- wheels
  const tireProfile: THREE.Vector2[] = [];
  {
    const ri = 0.235;
    const ro = WY;
    const hw = 0.13;
    const r = 0.055;
    const corners: [number, number, number][] = [
      [ro - r, hw - r, 0],
      [ro - r, -hw + r, -Math.PI / 2],
    ];
    tireProfile.push(new THREE.Vector2(ri, hw - 0.01));
    for (const [cx, cy, a0] of corners) {
      for (let i = 0; i <= 8; i++) {
        const a = a0 + Math.PI / 2 - (i / 8) * (Math.PI / 2);
        tireProfile.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
    }
    tireProfile.push(new THREE.Vector2(ri, -hw + 0.01));
  }
  for (const wx of WXS) {
    for (const side of [1, -1]) {
      const tag = `${wx > 0 ? 'F' : 'R'}${side > 0 ? 'L' : 'R'}`;
      const z = side * WZ;
      const faceRot: [number, number, number] = [Math.PI / 2, 0, 0];
      const tire = mesh(new THREE.LatheGeometry(tireProfile, 64), M.rubber, [wx, WY, z], faceRot);
      add(`tire-${tag}`, [tire], 3, 4);
      // rim: barrel + 6 spokes + cap
      const rimMeshes = [mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.2, 48, 1, true), M.chrome, [wx, WY, z], faceRot)];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sp = mesh(rbox(0.045, 0.2, 0.03, 0.012), M.chrome, [wx + Math.cos(a) * 0.115, WY + Math.sin(a) * 0.115, z + side * 0.07], [0, 0, a - Math.PI / 2]);
        rimMeshes.push(sp);
      }
      rimMeshes.push(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.05, 24), M.chrome, [wx, WY, z + side * 0.085], faceRot));
      add(`rim-${tag}`, rimMeshes, 3, 4);
      add(`disc-${tag}`, [mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.025, 48), M.steel, [wx, WY, z - side * 0.04], faceRot)], 3, 3);
      add(`caliper-${tag}`, [mesh(rbox(0.12, 0.09, 0.07, 0.025), M.caliper, [wx - 0.12, WY + 0.12, z - side * 0.04], [0, 0, 0.8])], 5, 3);
    }
    add(`axle-${wx > 0 ? 'F' : 'R'}`, [mesh(new THREE.CylinderGeometry(0.035, 0.035, 2 * WZ - 0.1, 16), M.steel, [wx, WY, 0], [Math.PI / 2, 0, 0])], 4, 1);
    for (const side of [1, -1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 160; i++) {
        const t = i / 160;
        const a = t * Math.PI * 2 * 6;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.07, t * 0.3 - 0.15, Math.sin(a) * 0.07));
      }
      const spring = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.013, 8), M.caliper, [wx, 0.56, side * 0.5]);
      add(`spring-${wx > 0 ? 'F' : 'R'}${side > 0 ? 'L' : 'R'}`, [spring], 4, 2);
      add(`shock-${wx > 0 ? 'F' : 'R'}${side > 0 ? 'L' : 'R'}`, [mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 16), M.chrome, [wx, 0.56, side * 0.5])], 4, 2);
    }
  }

  // ------------------------------------------------------------- chassis & mechanicals
  add('floor-pan', [mesh(rbox(3.9, 0.05, 1.45, 0.024), M.dark, [0, 0.33, 0])], 1, 0);
  add('engine-block', [mesh(rbox(0.75, 0.28, 0.55, 0.05), M.steel, [1.38, 0.55, 0])], 4, 2);
  for (const side of [1, -1]) {
    add(`cam-cover-${side > 0 ? 'L' : 'R'}`, [mesh(rbox(0.66, 0.08, 0.17, 0.035), M.paint, [1.38, 0.73, side * 0.13])], 4, 3);
  }
  add('air-filter', [mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 40), M.chrome, [1.38, 0.8, 0])], 4, 3);
  add('radiator', [mesh(rbox(0.06, 0.36, 1.05, 0.02), M.dark, [1.98, 0.55, 0])], 4, 2);
  add('grille', [mesh(rbox(0.05, 0.16, 0.86, 0.025), M.chrome, [2.21, 0.53, 0]), ...[-1, 0, 1].map((k) => mesh(rbox(0.04, 0.025, 0.8, 0.01), M.dark, [2.225, 0.53 + k * 0.045, 0]))], 5, 10);
  for (const side of [1, -1]) {
    const s = side > 0 ? 'L' : 'R';
    const ex = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.1, 0.45, side * 0.28),
      new THREE.Vector3(0.6, 0.3, side * 0.36),
      new THREE.Vector3(-1.2, 0.29, side * 0.42),
      new THREE.Vector3(-2.15, 0.33, side * 0.45),
    ]);
    add(`exhaust-${s}`, [mesh(new THREE.TubeGeometry(ex, 64, 0.028, 10), M.steel)], 4, 1);
    add(`muffler-${s}`, [mesh(new THREE.CapsuleGeometry(0.065, 0.42, 6, 18), M.steel, [-1.7, 0.31, side * 0.44], [0, 0, Math.PI / 2])], 4, 1);
    add(`tip-${s}`, [mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.2, 24, 1, true), M.chrome, [-2.28, 0.33, side * 0.45], [0, 0, Math.PI / 2])], 5, 10);
    add(`headlight-${s}`, [mesh(new THREE.SphereGeometry(0.09, 32, 20).scale(0.6, 1, 1), M.head, [2.19, 0.645, side * 0.58])], 5, 10);
    add(`taillight-${s}`, [mesh(rbox(0.06, 0.08, 0.3, 0.03), M.tail, [-2.19, 0.76, side * 0.58])], 5, 10);
    add(`mirror-${s}`, [mesh(rbox(0.12, 0.08, 0.14, 0.035), M.paint, [0.6, 1.07, side * 0.9]), mesh(rbox(0.04, 0.03, 0.12, 0.01), M.dark, [0.62, 1.02, side * 0.82])], 5, 11);
    add(`wiper-${s}`, [mesh(rbox(0.025, 0.02, 0.42, 0.008), M.dark, [0.72, 1.06, side * 0.26], [0, 0, 0.58])], 5, 11);
    // seats
    add(`seat-base-${s}`, [mesh(rbox(0.46, 0.1, 0.42, 0.04), M.leather, [-0.33, 0.62, side * 0.36])], 2, 3);
    add(`seat-back-${s}`, [mesh(rbox(0.1, 0.5, 0.42, 0.04), M.leather, [-0.6, 0.9, side * 0.36], [0, 0, 0.2])], 2, 3);
  }
  add('bumper-front', [mesh(new THREE.CapsuleGeometry(0.05, 1.55, 6, 18), M.chrome, [2.29, 0.39, 0], [Math.PI / 2, 0, 0])], 5, 10);
  add('bumper-rear', [mesh(new THREE.CapsuleGeometry(0.05, 1.55, 6, 18), M.chrome, [-2.29, 0.42, 0], [Math.PI / 2, 0, 0])], 5, 10);
  add('plate', [mesh(rbox(0.02, 0.12, 0.38, 0.01), M.stripe, [-2.26, 0.56, 0])], 5, 10);
  add('dashboard', [mesh(rbox(0.2, 0.12, 1.3, 0.04), M.dark, [0.55, 1.0, 0])], 2, 3);
  add('steering-wheel', [mesh(new THREE.TorusGeometry(0.14, 0.018, 12, 40), M.dark, [0.3, 1.02, 0.36], [0, Math.PI / 2 - 0.35, 0])], 5, 4);
  add('steering-column', [mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 12), M.steel, [0.45, 0.95, 0.36], [0, 0, 1.1])], 5, 3);
  add('antenna', [mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.5, 8), M.chrome, [-1.6, 1.22, -0.62])], 5, 11);
  return parts;
}
