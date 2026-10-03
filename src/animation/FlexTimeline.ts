import * as THREE from 'three';
import { Pchip, clamp, gauss, lerp, smoothstep } from '../utils/math';
import { dampedCos, dampedSin, easeInCubic, easeInOutCubic, easeOutCubic } from './easing';
import {
  BLOB_RADIUS as R,
  RECV_TOP_Y,
  SPAWN_Y,
  WAIST_Y,
  BOTTLE_BOTTOM_Y,
  bottleRadius,
} from './layout';
import { MotionPath } from './motionPath';
import { FLEX_LEVELS, PROFILES, type FlexLevel, type FlexProfile } from './profiles';

/** Everything the scene needs to draw one frame of one test. Written in place, never reallocated. */
export class BlobPose {
  readonly position = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();
  /** uniform mesh scale (radius in world units, includes spawn / absorb scaling) */
  scale = 0;
  stretch = 1;
  squash = 1;
  skew = 0;
  neck = 0;
  neckPos = 0.15;
  wobble = 0;
  bend = 0;
  flatY = 99;
  noise = 0.03;
  velocity = 0;
  stress = 0;
  readonly lag = new THREE.Vector3();
  /** receiver bob (world units) */
  receiverY = 0;
  /** apparatus shake offsets */
  rigShakeX = 0;
  rigShakeY = 0;
  /** 0..1 stress cracks near the aperture */
  crack = 0;
  /** 0..1 pulse used for glass highlight response */
  flash = 0;
  /** 0..1 subtle camera push for the hero state */
  push = 0;
  /** 0..1 shadow strength driver (height above receiver) */
  height = 0;
  /** 0 or 1: blob is touching the receiver */
  contact = 0;
}

interface Keys {
  s: Pchip;
  tAp: number;
  tExit: number;
  tLand: number;
  tHold: number;
  duration: number;
  /** rigid state */
  tContact: number;
  yContact: number;
}

const LAG_ROT = 0.1;
const LAG_DEF = 0.12;
const ABSORB = 0.55;

const v0 = new THREE.Vector3();
const v1 = new THREE.Vector3();
const vT = new THREE.Vector3();
const vX = new THREE.Vector3();
const vY = new THREE.Vector3();
const vZ = new THREE.Vector3();
const vUp = new THREE.Vector3(0, 0, 1);
const vDown = new THREE.Vector3(0, -1, 0);
const m4 = new THREE.Matrix4();
const qTmp = new THREE.Quaternion();

export class FlexTimeline {
  readonly path = new MotionPath();
  private readonly keys = new Map<FlexLevel, Keys>();
  private readonly yContact: number;

  constructor() {
    this.yContact = this.findRigidContact();
    for (const l of FLEX_LEVELS) this.keys.set(l, this.buildKeys(PROFILES[l]));
  }

  duration(level: FlexLevel): number {
    return this.keys.get(level)!.duration;
  }

  /** time after which a non-auto run holds still instead of absorbing the blob */
  holdTime(level: FlexLevel): number {
    return this.keys.get(level)!.tHold;
  }

  private findRigidContact(): number {
    for (let yc = 3.5; yc > 0.8; yc -= 0.005) {
      let dmin = Infinity;
      for (let y = BOTTLE_BOTTOM_Y; y <= 2.45; y += 0.01) {
        dmin = Math.min(dmin, Math.hypot(bottleRadius(y), y - yc));
      }
      if (dmin <= R) return yc;
    }
    return WAIST_Y;
  }

  private buildKeys(p: FlexProfile): Keys {
    const P = this.path;
    const d = p.apertureDelay;
    const sy = (y: number) => P.sForY(y);
    if (p.level === 0) {
      const yc = this.yContact;
      const tContact = 2.35;
      const t = [0, 0.85, 1.2, 1.5, 1.8, 2.1, tContact];
      const s = [sy(SPAWN_Y), sy(5.7), sy(4.7), sy(3.8), sy(3.0), sy(2.45), sy(yc)];
      return {
        s: new Pchip(t, s), tAp: tContact, tExit: 99, tLand: 99,
        tHold: tContact + 1.25, duration: p.duration, tContact, yContact: yc,
      };
    }
    const tAp = 2.5 + d;
    const tExit = 2.95 + d;
    const tLand = 3.6 + d;
    const tApproach = 2.1 + 0.3 * d;
    const t = [
      0, 0.85, 1.2, 1.5, 1.8, tApproach,
      tApproach + (tAp - tApproach) * 0.62, tAp, tExit, 3.3 + d, tLand,
    ];
    const s = [
      sy(SPAWN_Y), sy(5.7), sy(4.7), sy(3.8), sy(3.0), sy(2.2),
      sy(1.8), sy(WAIST_Y), sy(0.7), sy(-0.2), 1,
    ];
    const duration = p.duration;
    return {
      s: new Pchip(t, s), tAp, tExit, tLand, tHold: duration - ABSORB - 0.01,
      duration, tContact: 99, yContact: 0,
    };
  }

  evaluate(level: FlexLevel, time: number, out: BlobPose): void {
    const prof = PROFILES[level];
    const K = this.keys.get(level)!;
    const t = clamp(time, 0, K.duration);
    this.resetPose(out);
    if (level === 0) this.evalRigid(prof, K, t, out);
    else this.evalSoft(prof, K, t, out);
  }

  private resetPose(o: BlobPose): void {
    o.stretch = 1; o.squash = 1; o.skew = 0; o.neck = 0; o.neckPos = 0.15; o.wobble = 0;
    o.bend = 0; o.flatY = 99; o.noise = 0.03; o.velocity = 0; o.stress = 0; o.lag.set(0, 0, 0);
    o.receiverY = 0; o.rigShakeX = 0; o.rigShakeY = 0; o.crack = 0; o.flash = 0; o.push = 0;
    o.height = 1; o.contact = 0;
  }

  private frame(dir: THREE.Vector3, out: THREE.Quaternion): void {
    vY.copy(dir).normalize();
    vX.crossVectors(vY, vUp).normalize();
    vZ.crossVectors(vX, vY);
    m4.makeBasis(vX, vY, vZ);
    out.setFromRotationMatrix(m4);
  }

  private evalRigid(prof: FlexProfile, K: Keys, t: number, o: BlobPose): void {
    const P = this.path;
    const sNow = K.s.eval(t);
    P.pointAt(sNow, v0);
    const speedC = K.s.deriv(K.tContact - 0.001) * P.length;
    const tau = t - K.tContact;
    let x = 0;
    let rollZ = 0;
    let y = v0.y;
    let squashHit = 0;
    if (tau > 0) {
      y = K.yContact;
      const T1 = 0.5;
      const T2 = 0.3;
      const h1 = clamp(speedC * 0.1, 0.18, 0.4);
      if (tau < T1) {
        const u = tau / T1;
        y += 4 * h1 * u * (1 - u);
      } else if (tau < T1 + T2) {
        const u = (tau - T1) / T2;
        y += 4 * h1 * 0.22 * u * (1 - u);
      }
      x = 0.1 * smoothstep(0, 1.0, tau) * (1 + 0.15 * Math.sin(tau * 9) * Math.exp(-tau * 2));
      rollZ = -0.5 * smoothstep(0, 1.1, tau);
      squashHit = Math.exp(-tau * 16);
    }
    // retract into the dispenser: the reset beat
    const tR = K.tHold;
    const ur = clamp((t - tR) / 1.05);
    let sc = easeOutCubic(clamp((t - 0.05) / 0.4));
    if (ur > 0) {
      y = lerp(y, SPAWN_Y, easeInOutCubic(ur));
      x *= 1 - ur;
      sc *= 1 - smoothstep(0.55, 1, ur);
    }
    o.position.set(x, y, 0);
    const lagS = K.s.eval(t - LAG_ROT);
    P.tangentAt(lagS, v1);
    this.frame(tau > 0 ? vDown : v1, o.quaternion);
    qTmp.setFromAxisAngle(vUp, rollZ);
    o.quaternion.premultiply(qTmp);
    o.scale = R * sc;
    const a = 1 - 0.08 * squashHit;
    o.stretch = a;
    o.squash = 1 / Math.sqrt(a);
    o.wobble = prof.wobble * 0.25 * squashHit;
    o.velocity = clamp(K.s.deriv(t) * P.length / 3.2, 0, 1) * (tau > 0 ? 0 : 1);
    o.stress = 0;
    // stress response
    const crackIn = smoothstep(0, 0.12, tau);
    const crackOut = 1 - smoothstep(tR - 0.1, tR + 0.9, t);
    o.crack = tau > 0 ? crackIn * crackOut : 0;
    o.flash = tau > 0 ? Math.exp(-tau * 5) : 0;
    const sh = tau > 0 ? Math.exp(-tau * 9) : 0;
    o.rigShakeX = 0.035 * sh * Math.sin(tau * 78);
    o.rigShakeY = 0.012 * sh * Math.sin(tau * 61 + 1.3);
    o.height = 1;
  }

  private evalSoft(prof: FlexProfile, K: Keys, t: number, o: BlobPose): void {
    const P = this.path;
    const L = P.length;
    const sNow = K.s.eval(t);
    const speed = K.s.deriv(t) * L;
    P.pointAt(sNow, v0);

    // landing spring continues the free-fall velocity, then jiggles
    const tauL = t - K.tLand;
    const vLand = K.s.deriv(K.tLand - 0.001) * L;
    let sink = 0;
    let spring = 0;
    if (tauL > 0) {
      const f = 2.4 / Math.sqrt(0.6 + prof.recovery * 0.5);
      const zeta = 2.4 * prof.recovery * 0.9 + 1.2;
      const omega = 2 * Math.PI * f;
      spring = ((prof.impact * vLand) / omega) * dampedSin(tauL, f, zeta) * 0.65;
      sink = prof.restSink * smoothstep(0, 1.6 / prof.recovery, tauL);
    }
    const sc0 = easeOutCubic(clamp((t - 0.05) / 0.4));
    const floor = RECV_TOP_Y + 0; // receiver bob applied below
    let y = v0.y - spring - sink;
    const x = v0.x;

    // orientation (lagged, then settles vertical)
    P.tangentAt(K.s.eval(t - LAG_ROT), v1);
    const land = smoothstep(K.tLand - 0.1, K.tLand + 0.35, t);
    v1.lerp(vDown, land);
    this.frame(v1, o.quaternion);

    // deformation driver heights (delayed so squeeze trails the position)
    P.pointAt(K.s.eval(t - LAG_DEF), v1);
    const g = gauss(v1.y, WAIST_Y + 0.05, 0.85);
    const speedN = clamp(speed / 3.2);
    const flying = 1 - smoothstep(K.tLand - 0.08, K.tLand + 0.15, t);
    const aVel = 1 + prof.stretch * 0.6 * speedN * flying;
    let b = (1 / Math.sqrt(aVel)) * (1 - (1 - prof.squash) * g);
    let a = Math.min(1 / (b * b), 3.4);
    b = 1 / Math.sqrt(a);

    // recoil after leaving the constriction
    const tauE = t - K.tExit;
    const kd = 3.2 * prof.recovery;
    const fE = 1.5 + 0.4 / prof.recovery;
    const osc = prof.wobble * 0.3 * dampedSin(tauE, fE, kd);
    // landing jiggle
    const oscL = prof.wobble * 0.22 * dampedCos(tauL, 2.2 / Math.sqrt(0.5 + prof.recovery * 0.5), 1.8 * prof.recovery + 1.4);
    const k = 1 + osc + oscL;
    a *= k;
    b /= Math.sqrt(k);

    // settle toward the rest shape
    const rest = smoothstep(K.tLand, K.tLand + 0.9 / prof.recovery + 0.3, t);
    a = lerp(a, prof.restStretch, rest);
    b = lerp(b, 1 / Math.sqrt(prof.restStretch), rest);

    // pinch forming two lobes
    const neckBump = Math.exp(-0.5 * ((t - (K.tExit + 0.2)) / (prof.level === 100 ? 0.4 : 0.3)) ** 2);
    o.neck = prof.neck * neckBump;
    o.neckPos = 0.2;

    // curvature of the path drives bend
    const ds = 0.02;
    P.tangentAt(sNow + ds, vT);
    P.tangentAt(sNow - ds, v0);
    vT.sub(v0).multiplyScalar(1 / (2 * ds * L));
    // local X axis of the frame is column 0 of the quaternion rotation
    vX.set(1, 0, 0).applyQuaternion(o.quaternion);
    const kappa = vT.dot(vX);
    o.bend = clamp(0.5 * kappa * R * prof.bend, -0.1, 0.1);

    // tail lag: how far the lagged position trails the current one, in the local frame
    P.pointAt(K.s.eval(t - 0.18), v1);
    P.pointAt(sNow, v0);
    v1.sub(v0);
    vX.set(1, 0, 0).applyQuaternion(o.quaternion);
    vZ.set(0, 0, 1).applyQuaternion(o.quaternion);
    o.lag.set(v1.dot(vX) / R, 0, v1.dot(vZ) / R).multiplyScalar(0.08 * prof.skew);

    // surface wobble envelope
    const envE = Math.exp(-Math.max(0, tauE) * 1.8 * prof.recovery) * smoothstep(K.tAp - 0.3, K.tAp + 0.2, t);
    const envL = tauL > 0 ? Math.exp(-tauL * 1.1 * prof.recovery) : 0;
    o.wobble = prof.wobble * (0.5 * envE + 0.9 * envL) * 0.5;
    o.noise = 0.03 + 0.01 * prof.wobble * (envE + envL);

    // floor contact: the plane cuts the lowest part, giving squash + spread
    const bob = tauL > 0 ? 0.012 * prof.impact * dampedSin(tauL, 7, 4.5) : 0;
    const floorY = floor + bob;
    const flatLocal = (y - floorY) / R;
    o.flatY = Math.max(0.16, flatLocal);
    o.contact = flatLocal < a ? 1 : 0;
    o.receiverY = bob;

    // end: absorb into the receiver
    const ua = clamp((t - (K.duration - ABSORB)) / (ABSORB - 0.04));
    let sc = sc0;
    if (ua > 0) {
      const e = easeInCubic(ua);
      sc *= 1 - smoothstep(0.35, 1, ua);
      y -= 0.45 * easeInOutCubic(ua);
      a *= 1 - 0.25 * e;
      b *= 1 + 0.2 * e;
      o.flatY = Math.max(0.16, (y - floorY) / R);
    }

    o.position.set(x, y, 0);
    o.scale = R * sc;
    o.stretch = a;
    o.squash = b;
    o.skew = prof.skew * speedN * flying;
    o.velocity = speedN * flying;
    o.stress = clamp((a - 1) * 0.25 + (1 - b) * 0.8, 0, 1);
    o.height = clamp((y - RECV_TOP_Y) / 3, 0, 1);
    o.flash = 0.35 * gauss(t, K.tAp + 0.1, 0.18) * 0.4 + 0.35 * dampedCos(tauL, 5, 6);
    o.rigShakeX = 0.004 * prof.impact * gauss(t, K.tAp, 0.15) * Math.sin(t * 70);

    // hero push-in for the near-liquid state
    if (prof.level === 100) {
      o.push = smoothstep(1.2, 3.2, t) * (1 - smoothstep(K.duration - 1.6, K.duration - 0.4, t));
    }
  }
}
