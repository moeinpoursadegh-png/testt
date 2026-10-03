import * as THREE from 'three';
import { RECV_R, RECV_TOP_Y } from '../animation/layout';
import { createBrushedRoughness, createSoftShadowTexture } from '../utils/proceduralTextures';

/** Floating circular receiving plate with a fake soft shadow for whatever lands on it. */
export class Receiver {
  readonly group = new THREE.Group();
  private readonly shadowTex = createSoftShadowTexture();
  private readonly shadowMat = new THREE.MeshBasicMaterial({
    map: this.shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0,
    color: 0x2a1c05,
  });
  private readonly shadow: THREE.Mesh;
  private readonly brushed = createBrushedRoughness();
  private readonly mats: THREE.Material[] = [];

  constructor() {
    const top = new THREE.MeshPhysicalMaterial({
      color: 0xeceae5,
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.25,
      envMapIntensity: 0.9,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0xc7cacf,
      metalness: 1,
      roughness: 0.3,
      roughnessMap: this.brushed,
      envMapIntensity: 1.1,
    });
    const under = new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: 0.6, roughness: 0.5 });
    this.mats.push(top, rim, under);

    // profile: rounded rim + flat top, thickness ~0.16
    const th = 0.16;
    const rr = 0.05;
    const prof: THREE.Vector2[] = [new THREE.Vector2(0, -th)];
    prof.push(new THREE.Vector2(RECV_R - 0.1, -th));
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
      prof.push(new THREE.Vector2(RECV_R - rr + Math.cos(a) * rr, -th + rr + Math.sin(a) * rr));
    }
    prof.push(new THREE.Vector2(RECV_R, -0.03));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), rim);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(RECV_R - 0.1, 96), top);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.0;
    const underside = new THREE.Mesh(new THREE.CircleGeometry(RECV_R - 0.1, 64), under);
    underside.rotation.x = Math.PI / 2;
    underside.position.y = -th - 0.002;
    const groove = new THREE.Mesh(new THREE.RingGeometry(RECV_R - 0.16, RECV_R - 0.13, 96), rim);
    groove.rotation.x = -Math.PI / 2;
    groove.position.y = 0.002;
    this.group.add(body, disc, underside, groove);

    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.004;
    this.shadow.renderOrder = 0;
    this.group.add(this.shadow);
    this.group.position.y = RECV_TOP_Y;
  }

  setBob(y: number): void {
    this.group.position.y = RECV_TOP_Y + y;
  }

  setBlobShadow(x: number, width: number, opacity: number): void {
    this.shadow.position.x = x;
    this.shadow.scale.set(width * 2.6, width * 2.6, 1);
    this.shadowMat.opacity = opacity;
  }

  dispose(): void {
    this.shadowTex.dispose();
    this.shadowMat.dispose();
    this.brushed.dispose();
    this.shadow.geometry.dispose();
    this.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.mats.forEach((m) => m.dispose());
  }
}
