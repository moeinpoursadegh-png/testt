import * as THREE from 'three';
import { PATH_POINTS } from './layout';

const N = 1200;

export class MotionPath {
  readonly curve: THREE.CatmullRomCurve3;
  readonly length: number;
  private readonly samples: THREE.Vector3[] = [];
  private readonly markers: number[] = [];

  constructor() {
    this.curve = new THREE.CatmullRomCurve3(
      PATH_POINTS.map(([x, y]) => new THREE.Vector3(x, y, 0)),
      false,
      'centripetal',
    );
    this.length = this.curve.getLength();
    for (let i = 0; i <= N; i++) this.samples.push(this.curve.getPointAt(i / N));
    for (const [x, y] of PATH_POINTS) {
      let best = 0;
      let bd = Infinity;
      this.samples.forEach((p, i) => {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      this.markers.push(best / N);
    }
  }

  /** arc-length fraction at control point i (fractional i interpolates between neighbours) */
  marker(i: number): number {
    const a = Math.floor(i);
    const f = i - a;
    if (f === 0) return this.markers[a];
    return this.markers[a] + (this.markers[a + 1] - this.markers[a]) * f;
  }

  pointAt(s: number, out: THREE.Vector3): THREE.Vector3 {
    return this.curve.getPointAt(Math.min(1, Math.max(0, s)), out);
  }

  tangentAt(s: number, out: THREE.Vector3): THREE.Vector3 {
    return this.curve.getTangentAt(Math.min(1, Math.max(0, s)), out);
  }
}
