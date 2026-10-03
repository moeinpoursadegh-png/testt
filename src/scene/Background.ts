import * as THREE from 'three';

/** Camera-attached gradient backdrop (part of the scene so glass refracts it). */
export class Background {
  readonly mesh: THREE.Mesh;
  private readonly mat: THREE.ShaderMaterial;
  private readonly dist = 90;

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x8a93a9) },
        uMid: { value: new THREE.Color(0xb9bfd0) },
        uBot: { value: new THREE.Color(0x959baf) },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uTop, uMid, uBot;
        uniform float uTime;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p){
          vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
        }
        void main(){
          float y = vUv.y;
          vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.5, y));
          c = mix(c, uTop, smoothstep(0.55, 1.0, y));
          // large soft pool of light behind the rig
          float d = length((vUv - vec2(0.5, 0.52)) * vec2(1.0, 0.8));
          c += (1.0 - smoothstep(0.0, 0.65, d)) * 0.06;
          // soft diagonal light streaks, like light through a window
          float st = sin((vUv.x * 1.0 + vUv.y * 0.55) * 9.0 + uTime * 0.05) * 0.5 + 0.5;
          c += pow(st, 6.0) * 0.022 * smoothstep(0.2, 0.9, vUv.y);
          // faint drifting haze
          float n = vnoise(vUv * 2.2 + vec2(uTime * 0.01, 0.0)) * 0.6 + vnoise(vUv * 5.0 - vec2(0.0, uTime * 0.014)) * 0.4;
          c += (n - 0.5) * 0.028;
          // vignette
          c *= 1.0 - 0.16 * smoothstep(0.35, 0.95, length(vUv - 0.5) * 1.35);
          c += (hash(gl_FragCoord.xy) - 0.5) / 255.0; // dither against banding
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.position.z = -this.dist;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  fit(fovDeg: number, aspect: number): void {
    const h = 2 * this.dist * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2) * 1.05;
    this.mesh.scale.set(h * aspect, h, 1);
  }

  update(time: number): void {
    this.mat.uniforms.uTime.value = time;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
