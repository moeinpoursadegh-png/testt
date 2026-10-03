import * as THREE from 'three';
import {
  BOTTLE_BOTTOM_R,
  BOTTLE_BOTTOM_Y,
  BOTTLE_TOP_Y,
  FUNNEL_NECK_Y,
  FUNNEL_TOP_Y,
  RING1,
  RING2,
  SPAWN_Y,
  TUBE_R,
  WAIST_R,
  WAIST_Y,
  bottleRadius,
} from '../animation/layout';
import { createBrushedRoughness } from '../utils/proceduralTextures';

const FUNNEL_R_TOP = 1.85;
const FUNNEL_R_NECK = 0.92;

function funnelRadius(y: number): number {
  const k = (y - FUNNEL_NECK_Y) / (FUNNEL_TOP_Y - FUNNEL_NECK_Y);
  // bell flare: tight near the neck, opening quickly toward the lip
  return FUNNEL_R_NECK + (FUNNEL_R_TOP - FUNNEL_R_NECK) * Math.pow(k, 2.2);
}

export class GlassRig {
  readonly group = new THREE.Group();
  readonly glass: THREE.MeshPhysicalMaterial;
  private readonly metal: THREE.MeshStandardMaterial;
  private readonly crackMat: THREE.LineBasicMaterial;
  private readonly brushed = createBrushedRoughness();

  constructor() {
    this.glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.03,
      transmission: 1,
      thickness: 0.28,
      ior: 1.5,
      attenuationColor: new THREE.Color(0xd3e8e2),
      attenuationDistance: 2.2,
      specularIntensity: 1,
      envMapIntensity: 1.0,
      side: THREE.DoubleSide,
      clearcoat: 0.6,
      clearcoatRoughness: 0.04,
    });
    this.metal = new THREE.MeshStandardMaterial({
      color: 0xc9ccd1,
      metalness: 1,
      roughness: 0.32,
      roughnessMap: this.brushed,
      envMapIntensity: 1.1,
    });
    this.crackMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.buildFunnel();
    this.buildRings();
    this.buildBottle();
    this.buildExitGuide();
    this.buildDispenser();
    this.group.add(this.buildCracks());
  }

  private latheOf(fn: (y: number) => number, y0: number, y1: number, steps: number, segs = 72): THREE.Mesh {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= steps; i++) {
      const y = y0 + ((y1 - y0) * i) / steps;
      pts.push(new THREE.Vector2(fn(y), y));
    }
    return new THREE.Mesh(new THREE.LatheGeometry(pts, segs), this.glass);
  }

  private torus(R: number, r: number, mat: THREE.Material, rad = 20, tub = 96): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, rad, tub), mat);
    m.rotation.x = Math.PI / 2;
    return m;
  }

  private buildFunnel(): void {
    this.group.add(this.latheOf(funnelRadius, FUNNEL_NECK_Y, FUNNEL_TOP_Y, 40));
    const lip = this.torus(FUNNEL_R_TOP, 0.05, this.glass);
    lip.position.y = FUNNEL_TOP_Y;
    const collar = this.torus(FUNNEL_R_NECK + 0.02, 0.035, this.metal);
    collar.position.y = FUNNEL_NECK_Y;
    const lipMetal = this.torus(FUNNEL_R_TOP + 0.045, 0.014, this.metal);
    lipMetal.position.y = FUNNEL_TOP_Y - 0.02;
    this.group.add(lip, collar, lipMetal);
  }

  private buildRings(): void {
    for (const [pos, tilt] of [
      [RING1, -0.1],
      [RING2, 0.1],
    ] as const) {
      const g = new THREE.Group();
      g.position.set(pos.x, pos.y, 0);
      g.rotation.z = tilt;
      g.add(this.torus(0.98, 0.1, this.glass, 28, 96));
      const band = this.torus(0.98, 0.022, this.metal, 14, 96);
      band.scale.set(1.0, 1.0, 1.0);
      band.position.y = 0.0;
      const outer = this.torus(1.09, 0.014, this.metal, 12, 96);
      g.add(band, outer);
      this.group.add(g);
    }
  }

  private buildBottle(): void {
    const bottle = this.latheOf(bottleRadius, BOTTLE_BOTTOM_Y, BOTTLE_TOP_Y, 64);
    this.group.add(bottle);
    const top = this.torus(bottleRadius(BOTTLE_TOP_Y) + 0.02, 0.035, this.metal);
    top.position.y = BOTTLE_TOP_Y;
    const waist = this.torus(WAIST_R + 0.045, 0.05, this.metal, 24, 96);
    waist.position.y = WAIST_Y;
    const waist2 = this.torus(WAIST_R + 0.04, 0.02, this.metal, 12, 96);
    waist2.position.y = WAIST_Y + 0.14;
    const bot = this.torus(BOTTLE_BOTTOM_R + 0.02, 0.03, this.metal);
    bot.position.y = BOTTLE_BOTTOM_Y;
    this.group.add(top, waist, waist2, bot);
  }

  readonly exitCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, BOTTLE_BOTTOM_Y, 0),
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(0.12, -0.12, 0),
      new THREE.Vector3(0.36, -0.55, 0),
    ],
    false,
    'centripetal',
  );

  private buildExitGuide(): void {
    const geo = new THREE.TubeGeometry(this.exitCurve, 48, TUBE_R, 56, false);
    this.group.add(new THREE.Mesh(geo, this.glass));
    const end = this.exitCurve.getPoint(1);
    const tan = this.exitCurve.getTangent(1);
    const rim = this.torus(TUBE_R + 0.01, 0.034, this.metal);
    rim.position.copy(end);
    rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    rim.rotateX(Math.PI / 2);
    this.group.add(rim);
  }

  private buildDispenser(): void {
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.9, roughness: 0.35 });
    const ring = this.torus(0.46, 0.05, dark);
    ring.position.y = SPAWN_Y + 0.25;
    const inner = this.torus(0.34, 0.022, this.metal);
    inner.position.y = SPAWN_Y + 0.25;
    this.group.add(ring, inner);
  }

  private buildCracks(): THREE.LineSegments {
    // a few hairline fractures running over the glass around the aperture, on the camera-facing side
    const pts: number[] = [];
    let seed = 7;
    const rnd = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return seed / 4294967296;
    };
    const starts: [number, number, number][] = [
      [WAIST_Y + 0.08, Math.PI / 2 - 0.25, 1],
      [WAIST_Y + 0.02, Math.PI / 2 + 0.2, -1],
      [WAIST_Y + 0.15, Math.PI / 2 + 0.05, 1],
    ];
    for (const [y0, th0, dir] of starts) {
      let y = y0;
      let th = th0;
      for (let i = 0; i < 6; i++) {
        const ny = y + dir * (0.07 + rnd() * 0.07);
        const nth = th + (rnd() - 0.45) * 0.32;
        for (const [yy, tt] of [
          [y, th],
          [ny, nth],
        ]) {
          const r = bottleRadius(yy) + 0.018;
          pts.push(r * Math.cos(tt), yy, r * Math.sin(tt));
        }
        y = ny;
        th = nth;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(geo, this.crackMat);
    lines.renderOrder = 5;
    return lines;
  }

  setCrack(v: number): void {
    this.crackMat.opacity = v * 0.9;
  }

  setFlash(v: number): void {
    this.glass.envMapIntensity = 1 + 0.9 * v;
    this.glass.specularIntensity = 1 + 0.5 * v;
  }

  dispose(): void {
    this.brushed.dispose();
    this.group.traverse((o) => {
      (o as THREE.Mesh).geometry?.dispose();
    });
    this.glass.dispose();
    this.metal.dispose();
    this.crackMat.dispose();
  }
}
