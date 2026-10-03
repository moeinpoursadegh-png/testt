import * as THREE from 'three';
import { PED_R, PED_TOP_Y } from '../animation/layout';
import { createBrushedRoughness, createSoftShadowTexture, createStoneTextures } from '../utils/proceduralTextures';

export class Pedestal {
  readonly group = new THREE.Group();
  private readonly stone = createStoneTextures(512);
  private readonly brushed = createBrushedRoughness();
  private readonly shadowTex = createSoftShadowTexture();
  private readonly disposables: { dispose(): void }[] = [];

  constructor() {
    this.stone.map.repeat.set(3, 3);
    this.stone.bump.repeat.set(3, 3);
    const stoneMat = new THREE.MeshPhysicalMaterial({
      color: 0xc9c9c4,
      map: this.stone.map,
      bumpMap: this.stone.bump,
      bumpScale: 1.2,
      roughness: 0.72,
      metalness: 0,
      clearcoat: 0.05,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.5,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xe0bd72,
      metalness: 1,
      roughness: 0.3,
      roughnessMap: this.brushed,
      envMapIntensity: 1.15,
    });
    this.disposables.push(stoneMat, trimMat);

    const depth = 7;
    const rr = 0.09;
    const prof: THREE.Vector2[] = [new THREE.Vector2(0, PED_TOP_Y)];
    prof.push(new THREE.Vector2(PED_R - rr, PED_TOP_Y));
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI / 2 - (i / 8) * (Math.PI / 2);
      prof.push(new THREE.Vector2(PED_R - rr + Math.cos(a) * rr, PED_TOP_Y - rr + Math.sin(a) * rr));
    }
    prof.push(new THREE.Vector2(PED_R, PED_TOP_Y - depth));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 128), stoneMat);
    this.group.add(body);

    // brushed-metal inlay ring on the top face + trim bands on the wall
    const inlay = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.06, 128), trimMat);
    inlay.rotation.x = -Math.PI / 2;
    inlay.position.y = PED_TOP_Y + 0.002;
    const band1 = new THREE.Mesh(new THREE.CylinderGeometry(PED_R + 0.012, PED_R + 0.012, 0.09, 128, 1, true), trimMat);
    band1.position.y = PED_TOP_Y - 0.3;
    const band2 = new THREE.Mesh(new THREE.CylinderGeometry(PED_R + 0.012, PED_R + 0.012, 0.03, 128, 1, true), trimMat);
    band2.position.y = PED_TOP_Y - 0.42;
    this.group.add(inlay, band1, band2);

    // soft occlusion of the floating plate on the stone
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      color: 0x3a3630,
    });
    this.disposables.push(shadowMat);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(4.6, 4.6, 1);
    shadow.position.y = PED_TOP_Y + 0.004;
    this.group.add(shadow);
  }

  dispose(): void {
    this.stone.map.dispose();
    this.stone.bump.dispose();
    this.brushed.dispose();
    this.shadowTex.dispose();
    this.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.disposables.forEach((d) => d.dispose());
  }
}
