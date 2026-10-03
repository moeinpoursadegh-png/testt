import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Fully procedural studio reflections: RoomEnvironment plus a few extra strip softboxes. */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const room = new RoomEnvironment();
  const strip = (w: number, h: number, x: number, y: number, z: number, intensity: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.92).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 3, 0);
    room.add(m);
  };
  strip(1.2, 9, -7, 5, 3, 7); // tall key strip, camera-left
  strip(0.9, 8, 7.5, 4, -2, 5); // rim strip, right-back
  strip(7, 0.8, 0, 10, 2, 4); // overhead
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(room, 0.03).texture;
  pmrem.dispose();
  room.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    (mesh.material as THREE.Material | undefined)?.dispose?.();
  });
  return tex;
}
