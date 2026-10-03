import * as THREE from 'three';
import { REST_Y } from './layout';

const N = 600;

export class MotionPath {
  readonly curve: THREE.CatmullRomCurve3;
  readonly length: number;
  private readonly ys = new Float32Array(N + 1);

  constructor() {
    this.curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 7.0, 0),
        new THREE.Vector3(0, 6.6, 0),
        new THREE.Vector3(0, 5.7, 0),
        new THREE.Vector3(0, 4.7, 0),
        new THREE.Vector3(-0.2, 3.8, 0),
        new THREE.Vector3(0.2, 3.0, 0),
        new THREE.Vector3(0, 2.2, 0),
        new THREE.Vector3(0, 1.4, 0),
        new THREE.Vector3(0, 0.7, 0),
        new THREE.Vector3(0.04, 0.25, 0),
        new THREE.Vector3(0.18, -0.2, 0),
        new THREE.Vector3(0.4, -0.6, 0),
        new THREE.Vector3(0.46, -1.0, 0),
        new THREE.Vector3(0.4, REST_Y, 0),
      ],
      false,
      'centripetal',
    );
    this.length = this.curve.getLength();
    const v = new THREE.Vector3();
    for (let i = 0; i <= N; i++) this.ys[i] = this.curve.getPointAt(i / N, v).y;
  }

  /** Arc-length fraction where the path first reaches height y (path descends monotonically). */
  sForY(y: number): number {
    const ys = this.ys;
    if (y >= ys[0]) return 0;
    for (let i = 1; i <= N; i++) {
      if (ys[i] <= y) {
        const f = (ys[i - 1] - y) / (ys[i - 1] - ys[i] || 1);
        return (i - 1 + f) / N;
      }
    }
    return 1;
  }

  pointAt(s: number, out: THREE.Vector3): THREE.Vector3 {
    return this.curve.getPointAt(Math.min(1, Math.max(0, s)), out);
  }

  tangentAt(s: number, out: THREE.Vector3): THREE.Vector3 {
    return this.curve.getTangentAt(Math.min(1, Math.max(0, s)), out);
  }
}
