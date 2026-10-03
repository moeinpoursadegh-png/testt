import * as THREE from 'three';
import { PED_TOP_Y, RECV_X } from '../animation/layout';
import { clamp } from '../utils/math';

const BASE_FOV = 24;
const ELEVATION = THREE.MathUtils.degToRad(6);

/** Fixed telephoto-ish camera. Only breathing and a tiny hero push-in move it. */
export class CameraController {
  readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 1, 200);
  private aspect = 1;
  private viewH = 15;
  private target = new THREE.Vector3(0, 1.4, 0);
  private breathe = true;

  resize(w: number, h: number): void {
    this.aspect = w / Math.max(h, 1);
    let hv = clamp(14.4 - (this.aspect - 0.46) * 0.8, 13.6, 14.4);
    hv = Math.max(hv, 7.2 / this.aspect); // keep the apparatus whole on very narrow screens
    this.viewH = hv;
    // pedestal top sits ~20% above the bottom edge
    const bottom = PED_TOP_Y - 0.215 * hv;
    this.target.set(RECV_X, bottom + hv / 2, 0);
    this.camera.aspect = this.aspect;
    this.apply(0, 0);
  }

  setBreathing(on: boolean): void {
    this.breathe = on;
  }

  get fov(): number {
    return this.camera.fov;
  }

  update(time: number, push: number): void {
    this.apply(this.breathe ? time : 0, push);
  }

  private apply(time: number, push: number): void {
    const fov = BASE_FOV * (1 - 0.06 * push);
    const hvEff = this.viewH * (1 - 0.0 * push);
    this.camera.fov = fov;
    const dist = hvEff / 2 / Math.tan(THREE.MathUtils.degToRad(BASE_FOV) / 2);
    const bx = Math.sin(time * 0.31) * 0.09;
    const by = Math.sin(time * 0.23 + 1.2) * 0.06;
    this.camera.position.set(
      this.target.x + bx,
      this.target.y + Math.sin(ELEVATION) * dist + by,
      this.target.z + Math.cos(ELEVATION) * dist,
    );
    this.camera.lookAt(this.target.x, this.target.y + push * 0.5, this.target.z);
    this.camera.updateProjectionMatrix();
  }
}
