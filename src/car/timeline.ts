import * as THREE from 'three';
import { Pchip, clamp } from '../utils/math';
import { easeInOutCubic, easeOutCubic } from '../animation/easing';
import type { Part } from './build';

export const DURATION = 10;

/** Story beats (seconds). */
export const T = {
  drawEnd: 0.9, // wireframe finishes building up
  sweepStart: 1.55,
  sweepEnd: 2.55,
  explode: 3.35,
  toLayout: 4.65,
  layoutHeld: 6.35,
  assemble: 6.6,
  assembled: 8.95,
};

interface Anim {
  part: Part;
  qExp: THREE.Quaternion;
  exp: THREE.Vector3;
  lay: THREE.Vector3;
  qLay: THREE.Quaternion;
  tE: number;
  tL: number;
  tA: number;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ID = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

export class CarTimeline {
  private readonly anims: Anim[] = [];
  readonly layoutSize = new THREE.Vector2();
  private readonly cam: Record<'az' | 'el' | 'dist' | 'tx' | 'ty' | 'tz', Pchip>;

  constructor(parts: Part[]) {
    const r = rng(1234);
    const C = new THREE.Vector3(0, 0.62, 0);

    // ---- flat-lay orientation + footprint for each part
    const info = parts.map((p) => {
      const g = p.group;
      g.position.set(0, 0, 0);
      g.quaternion.identity();
      g.updateMatrixWorld(true);
      const box = new THREE.Box3();
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.computeBoundingBox();
          box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
        }
      });
      const size = box.getSize(new THREE.Vector3());
      const dims = [size.x, size.y, size.z];
      const ax = dims.indexOf(Math.min(...dims));
      const centre = p.home.clone().sub(C);
      const sign = ax === 1 ? 1 : Math.sign(centre.getComponent(ax)) || 1;
      const from = new THREE.Vector3().setComponent(ax, sign);
      const q = new THREE.Quaternion().setFromUnitVectors(from, Y);
      const rb = box.clone();
      const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(
        (i) => new THREE.Vector3(i & 1 ? rb.max.x : rb.min.x, i & 2 ? rb.max.y : rb.min.y, i & 4 ? rb.max.z : rb.min.z).applyQuaternion(q),
      );
      let fb = new THREE.Box3().setFromPoints(corners);
      let fs = fb.getSize(new THREE.Vector3());
      if (fs.z > fs.x) {
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(Y, Math.PI / 2));
        fb = new THREE.Box3().setFromPoints(corners.map((c) => c.applyAxisAngle(Y, Math.PI / 2)));
        fs = fb.getSize(new THREE.Vector3());
      }
      if (/skin-R/.test(p.name)) q.premultiply(new THREE.Quaternion().setFromAxisAngle(Y, Math.PI));
      g.position.copy(p.home);
      return { p, q, w: fs.x, d: fs.z, h: fs.y, off: fb.getCenter(new THREE.Vector3()) };
    });

    // ---- shelf-pack the kit into a portrait sheet (rows by category, big first)
    const order = [...info].sort((a, b) => a.p.cat - b.p.cat || b.w * b.d - a.w * a.d);
    const gap = 0.16;
    const pack = (W: number) => {
      const pos: { x: number; z: number }[] = [];
      let x = 0;
      let z = 0;
      let rowD = 0;
      let lastCat = order[0].p.cat;
      let maxW = 0;
      for (const it of order) {
        const newCat = it.p.cat !== lastCat && it.p.cat <= 3 && x > W * 0.55;
        if ((x > 0 && x + it.w > W) || newCat) {
          z += rowD + gap;
          x = 0;
          rowD = 0;
        }
        lastCat = it.p.cat;
        pos.push({ x: x + it.w / 2, z: z + it.d / 2 });
        x += it.w + gap;
        maxW = Math.max(maxW, x - gap);
        rowD = Math.max(rowD, it.d);
      }
      return { pos, w: maxW, h: z + rowD };
    };
    let best = pack(4);
    for (let W = 2.5; W < 12; W += 0.05) {
      const p = pack(W);
      if (p.h / p.w <= 16 / 9 * 0.92) {
        best = p;
        break;
      }
    }
    this.layoutSize.set(best.w, best.h);

    order.forEach((it, i) => {
      const p = it.p;
      const lay = new THREE.Vector3(best.pos[i].x - best.w / 2, 0, best.pos[i].z - best.h / 2);
      // position the group so the rotated box sits on the floor at the slot centre
      lay.x -= it.off.x;
      lay.z -= it.off.z;
      lay.y = -it.off.y + it.h / 2 + 0.002;
      // ---- exploded-view target: radial, lifted, a touch of tumble
      const v = p.home.clone().sub(C);
      v.set(v.x * 0.3, v.y * 2.4 + 0.6, v.z * 1.5);
      if (v.length() < 0.25) v.set(r() - 0.5, 1, r() - 0.5);
      v.normalize();
      const dist = 1.0 + r() * 1.0 + (p.cat === 0 ? 0.3 : 0);
      const exp = p.home.clone().addScaledVector(v, dist);
      const qExp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), (r() - 0.5) * 1.1);
      this.anims.push({
        part: p,
        exp,
        qExp,
        lay,
        qLay: it.q,
        tE: T.explode + r() * 0.3,
        tL: T.toLayout + (i / order.length) * 0.55 + r() * 0.08,
        tA: 0,
      });
    });
    // assembly: by stage, inside a stage by height
    const asm = [...this.anims].sort((a, b) => a.part.stage - b.part.stage || a.part.home.y - b.part.home.y);
    const span = T.assembled - T.assemble - 0.7;
    asm.forEach((a, i) => (a.tA = T.assemble + (i / (asm.length - 1)) * span));

    // ---- camera keys
    const fitTop = Math.max(this.layoutSize.y * 1.22, this.layoutSize.x * 1.12 * (16 / 9)) / 2 / Math.tan(THREE.MathUtils.degToRad(15));
    const k = (rows: number[][]) => {
      const ts = rows.map((r0) => r0[0]);
      return (col: number) => new Pchip(ts, rows.map((r0) => r0[col]));
    };
    const key = k([
      // t      az    el    dist   tx    ty    tz
      [0.0, 128, 16, 19.5, 0, 0.62, 0],
      [1.55, 70, 18, 18.8, 0, 0.62, 0],
      [3.35, 34, 21, 18.2, 0, 0.62, 0],
      [4.55, 18, 30, 30, 0, 1.5, 0],
      [5.95, 0, 89.3, fitTop, 0, 0, -this.layoutSize.y * 0.06],
      [6.6, 0, 89.3, fitTop * 0.97, 0, 0, -this.layoutSize.y * 0.06],
      [8.3, -32, 20, 18.6, 0, 0.62, 0],
      [10.0, -52, 17, 17.4, 0, 0.62, 0],
    ]);
    this.cam = { az: key(1), el: key(2), dist: key(3), tx: key(4), ty: key(5), tz: key(6) };
  }

  camera(t: number, cam: THREE.PerspectiveCamera): void {
    const az = THREE.MathUtils.degToRad(this.cam.az.eval(t));
    const el = THREE.MathUtils.degToRad(this.cam.el.eval(t));
    const d = this.cam.dist.eval(t);
    const tx = this.cam.tx.eval(t);
    const ty = this.cam.ty.eval(t);
    const tz = this.cam.tz.eval(t);
    cam.position.set(tx + Math.sin(az) * Math.cos(el) * d, ty + Math.sin(el) * d, tz + Math.cos(az) * Math.cos(el) * d);
    cam.up.set(0, 1, 0);
    cam.lookAt(tx, ty, tz);
  }

  parts(t: number): void {
    for (const a of this.anims) {
      const g = a.part.group;
      const home = a.part.home;
      if (t < a.tE) {
        g.position.copy(home);
        g.quaternion.identity();
        continue;
      }
      if (t < a.tL) {
        const u = easeOutCubic(clamp((t - a.tE) / 0.95));
        g.position.lerpVectors(home, a.exp, u);
        // slow drift while floating
        const drift = clamp((t - a.tE - 0.95) / 2);
        g.position.y += drift * 0.12;
        g.quaternion.slerpQuaternions(ID, a.qExp, u);
        continue;
      }
      if (t < a.tA) {
        const u = easeInOutCubic(clamp((t - a.tL) / 1.1));
        tmpV.copy(a.exp);
        tmpV.y += 0.12 * clamp((a.tL - a.tE - 0.95) / 2);
        g.position.lerpVectors(tmpV, a.lay, u);
        g.position.y += Math.sin(Math.PI * u) * 0.6;
        tmpQ.copy(a.qExp);
        g.quaternion.slerpQuaternions(tmpQ, a.qLay, u);
        continue;
      }
      const u = clamp((t - a.tA) / 0.72);
      const e = easeInOutCubic(u);
      g.position.lerpVectors(a.lay, home, e);
      g.position.y += Math.sin(Math.PI * e) * 1.3;
      // tiny settle when the piece clicks home
      const tau = t - a.tA - 0.72;
      if (tau > 0) g.position.y += -0.025 * Math.exp(-tau * 14) * Math.sin(tau * 40);
      g.quaternion.slerpQuaternions(a.qLay, ID, e);
    }
  }
}
