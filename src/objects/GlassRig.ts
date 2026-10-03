import * as THREE from 'three';
import { BREAK_U, PATH_POINTS, PIPE_FIRST, PIPE_LAST, pipeRadius } from '../animation/layout';
import type { BlobPose } from '../animation/FlexTimeline';
import { createBrushedRoughness } from '../utils/proceduralTextures';

const SHARDS = 240;
const SEGS = 220;
const RADIAL = 64;
const GRAVITY = 9.5;

/** Glass S-pipe. The upper section shatters into instanced shards when the rigid ball hits it. */
export class GlassRig {
  readonly group = new THREE.Group();
  private readonly glassA: THREE.MeshPhysicalMaterial;
  private readonly glassB: THREE.MeshPhysicalMaterial;
  private readonly growA = { value: 1 };
  private readonly growB = { value: 1 };
  private readonly metal: THREE.MeshStandardMaterial;
  private readonly brushed = createBrushedRoughness();
  private readonly curve: THREE.CatmullRomCurve3;
  private readonly frames: ReturnType<THREE.CatmullRomCurve3['computeFrenetFrames']>;
  private readonly shards: THREE.InstancedMesh;
  private readonly shardMat: THREE.MeshPhysicalMaterial;
  private readonly shardData: { p: THREE.Vector3; v: THREE.Vector3; axis: THREE.Vector3; spin: number; s: THREE.Vector3; delay: number }[] = [];
  private readonly m4 = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly pos = new THREE.Vector3();

  constructor() {
    const mk = (grow: { value: number }, key: string) => {
      const m = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.025,
        transmission: 1,
        thickness: 0.3,
        ior: 1.5,
        attenuationColor: new THREE.Color(0xd9eaee),
        attenuationDistance: 2.0,
        envMapIntensity: 1.1,
        side: THREE.DoubleSide,
        clearcoat: 0.6,
        clearcoatRoughness: 0.04,
      });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uGrow = grow;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float aU;\nvarying float vU;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvU = aU;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vU;\nuniform float uGrow;')
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vU > uGrow) discard;');
      };
      m.customProgramCacheKey = () => key;
      return m;
    };
    this.glassA = mk(this.growA, 'pipe-a');
    this.glassB = mk(this.growB, 'pipe-b');
    this.metal = new THREE.MeshStandardMaterial({
      color: 0xc9ccd1, metalness: 1, roughness: 0.32, roughnessMap: this.brushed, envMapIntensity: 1.1,
    });

    this.curve = new THREE.CatmullRomCurve3(
      PATH_POINTS.slice(PIPE_FIRST, PIPE_LAST + 1).map(([x, y]) => new THREE.Vector3(x, y, 0)),
      false,
      'centripetal',
    );
    this.frames = this.curve.computeFrenetFrames(SEGS, false);

    // upper section (shatters) is grown from u=0 → BREAK_U, lower section is permanent
    const a = new THREE.Mesh(this.buildPipe(0, BREAK_U), this.glassA);
    const b = new THREE.Mesh(this.buildPipe(BREAK_U, 1), this.glassB);
    a.frustumCulled = b.frustumCulled = false;
    this.group.add(a, b);
    for (const u of [0.002, BREAK_U, 0.997]) this.addRim(u);
    this.group.add(this.addDarkTip());

    // shards
    this.shardMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2f8fa, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.32,
      envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1,
    });
    const g = new THREE.TetrahedronGeometry(1, 0);
    this.shards = new THREE.InstancedMesh(g, this.shardMat, SHARDS);
    this.shards.frustumCulled = false;
    this.shards.count = 0;
    this.shards.renderOrder = 4;
    this.group.add(this.shards);
    let seed = 41;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const n = new THREE.Vector3();
    const T = new THREE.Vector3();
    for (let i = 0; i < SHARDS; i++) {
      const u = 0.01 + rnd() * (BREAK_U - 0.02);
      const th = rnd() * Math.PI * 2;
      this.surface(u, th, this.pos, n, T);
      const big = rnd() < 0.18;
      const sz = big ? 0.14 + rnd() * 0.12 : 0.04 + rnd() * 0.08;
      const near = Math.exp(-(((u - 0.2) / 0.1) ** 2)); // fragments near the impact fly faster
      this.shardData.push({
        p: this.pos.clone(),
        v: new THREE.Vector3(-1.2 - rnd() * 1.0 * near, 0.4 + rnd() * 1.4, 0)
          .addScaledVector(n, 1.0 + rnd() * 2.8 * (0.5 + near))
          .addScaledVector(T, (rnd() - 0.5) * 1.5),
        axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
        spin: (rnd() - 0.5) * 14,
        s: new THREE.Vector3(sz, sz * (0.6 + rnd() * 0.8), sz * 0.12),
        delay: rnd() * 0.08 * (1 - near),
      });
    }
  }

  private surface(u: number, th: number, p: THREE.Vector3, n: THREE.Vector3, T: THREE.Vector3): void {
    const k = Math.min(SEGS, Math.round(u * SEGS));
    const c = this.curve.getPointAt(u);
    const N = this.frames.normals[k];
    const B = this.frames.binormals[k];
    n.copy(N).multiplyScalar(Math.cos(th)).addScaledVector(B, Math.sin(th));
    p.copy(c).addScaledVector(n, pipeRadius(u));
    T.copy(this.frames.tangents[k]);
  }

  private buildPipe(u0: number, u1: number): THREE.BufferGeometry {
    const rows = Math.max(2, Math.round(SEGS * (u1 - u0)));
    const pos: number[] = [];
    const nor: number[] = [];
    const au: number[] = [];
    const idx: number[] = [];
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const T = new THREE.Vector3();
    for (let i = 0; i <= rows; i++) {
      const u = u0 + ((u1 - u0) * i) / rows;
      for (let j = 0; j <= RADIAL; j++) {
        this.surface(u, (j / RADIAL) * Math.PI * 2, p, n, T);
        pos.push(p.x, p.y, p.z);
        nor.push(n.x, n.y, n.z);
        au.push(u);
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < RADIAL; j++) {
        const a = i * (RADIAL + 1) + j;
        const b = a + RADIAL + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1));
    g.setIndex(idx);
    return g;
  }

  private addRim(u: number): void {
    const c = this.curve.getPointAt(u);
    const tan = this.curve.getTangentAt(u);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(pipeRadius(u) + 0.015, 0.03, 16, 96), this.metal);
    rim.position.copy(c);
    rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    this.group.add(rim);
  }

  private addDarkTip(): THREE.Mesh {
    const c = this.curve.getPointAt(1);
    const tan = this.curve.getTangentAt(1);
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(pipeRadius(1) + 0.03, 0.05, 16, 96),
      new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.8, roughness: 0.4 }),
    );
    m.position.copy(c).addScaledVector(tan, -0.02);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    return m;
  }

  update(pose: BlobPose): void {
    this.growA.value = pose.grow;
    this.glassA.envMapIntensity = this.glassB.envMapIntensity = 1.1 + 0.8 * pose.flash;
    const tau = pose.shardT;
    if (tau < 0 || pose.grow >= 0.999) {
      this.shards.count = 0;
      return;
    }
    this.shards.count = SHARDS;
    for (let i = 0; i < SHARDS; i++) {
      const d = this.shardData[i];
      const t = Math.max(0, tau - d.delay);
      this.pos.copy(d.p).addScaledVector(d.v, t);
      this.pos.y -= 0.5 * GRAVITY * t * t;
      this.q.setFromAxisAngle(d.axis, d.spin * t);
      const vis = t > 0 && this.pos.y > -9 ? 1 : 0.0001;
      this.m4.compose(t > 0 ? this.pos : d.p, this.q, vis === 1 ? d.s : this.tiny);
      this.shards.setMatrixAt(i, this.m4);
    }
    this.shards.instanceMatrix.needsUpdate = true;
  }

  private readonly tiny = new THREE.Vector3(0.0001, 0.0001, 0.0001);

  dispose(): void {
    this.brushed.dispose();
    this.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.shards.dispose();
    this.glassA.dispose();
    this.glassB.dispose();
    this.metal.dispose();
    this.shardMat.dispose();
  }
}
