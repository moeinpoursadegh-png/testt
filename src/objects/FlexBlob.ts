import * as THREE from 'three';
import vertChunk from '../shaders/blob.vert.glsl?raw';
import fragChunk from '../shaders/blob.frag.glsl?raw';
import type { BlobPose } from '../animation/FlexTimeline';
import { PROFILES, type FlexLevel } from '../animation/profiles';

export class FlexBlob {
  readonly mesh: THREE.Mesh;
  private readonly geometry = new THREE.IcosahedronGeometry(1, 26);
  private readonly material: THREE.MeshPhysicalMaterial;
  private readonly uniforms = {
    uTime: { value: 0 },
    uFlex: { value: 0 },
    uStretch: { value: 1 },
    uSquash: { value: 1 },
    uSkew: { value: 0 },
    uWobble: { value: 0 },
    uImpact: { value: 0 },
    uVelocity: { value: 0 },
    uDirection: { value: new THREE.Vector3() },
    uNoiseAmount: { value: 0.03 },
    uNeck: { value: 0 },
    uNeckPos: { value: 0.15 },
    uBend: { value: 0 },
    uFlatY: { value: 99 },
    uSeed: { value: 3.7 },
    uStress: { value: 0 },
    uFlexLevel: { value: 0 },
  };

  constructor() {
    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xe3a93b,
      metalness: 1,
      roughness: 0.17,
      clearcoat: 0.35,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.25,
    });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${vertChunk}`)
        .replace(
          '#include <beginnormal_vertex>',
          'vec3 flexD = flexDeform(position);\nvec3 objectNormal = flexNormal(position, flexD);',
        )
        .replace('#include <begin_vertex>', 'vec3 transformed = flexD;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${fragChunk}`)
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor - 0.04 * uStress + 0.03 * (1.0 - uFlexLevel), 0.05, 1.0);
          diffuseColor.rgb *= mix(vec3(1.0), vec3(1.07, 1.03, 0.9), uStress);`,
        );
    };
    this.material.customProgramCacheKey = () => 'flex-blob-v1';
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  setLevel(level: FlexLevel): void {
    this.uniforms.uFlex.value = level / 100;
    this.uniforms.uFlexLevel.value = level / 100;
    this.uniforms.uSeed.value = 3.7 + level * 0.031;
    this.uniforms.uImpact.value = PROFILES[level].impact * 0.2;
  }

  apply(pose: BlobPose, time: number): void {
    const u = this.uniforms;
    this.mesh.position.copy(pose.position);
    this.mesh.quaternion.copy(pose.quaternion);
    this.mesh.scale.setScalar(Math.max(pose.scale, 1e-4));
    this.mesh.visible = pose.scale > 0.002;
    u.uTime.value = time;
    u.uStretch.value = pose.stretch;
    u.uSquash.value = pose.squash;
    u.uSkew.value = pose.skew;
    u.uWobble.value = pose.wobble;
    u.uVelocity.value = pose.velocity;
    u.uDirection.value.copy(pose.lag);
    u.uNoiseAmount.value = pose.noise;
    u.uNeck.value = pose.neck;
    u.uNeckPos.value = pose.neckPos;
    u.uBend.value = pose.bend;
    u.uFlatY.value = pose.flatY;
    u.uStress.value = pose.stress;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
