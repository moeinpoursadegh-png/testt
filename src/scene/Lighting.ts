import * as THREE from 'three';

export function createLighting(scene: THREE.Scene): THREE.Light[] {
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  key.position.set(-8, 14, 14);
  const fill = new THREE.DirectionalLight(0xdde8ff, 0.7);
  fill.position.set(10, 4, 10);
  const rim = new THREE.DirectionalLight(0xffffff, 2.0);
  rim.position.set(6, 9, -10);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9a9690, 0.35);
  scene.add(key, fill, rim, hemi);
  return [key, fill, rim, hemi];
}
