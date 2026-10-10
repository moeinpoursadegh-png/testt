import * as THREE from 'three';

/** World-X position of the wireframe → solid scan. Solid where x > sweep, wire where x < sweep. */
export const sweep = { value: 99 };
/** Height up to which the wireframe has been "drawn" (build-up at the start). */
export const draw = { value: 99 };

function inject(m: THREE.Material, mode: 'solid' | 'wire'): void {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSweep = sweep;
    sh.uniforms.uDraw = draw;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSwW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSwW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSwW;\nuniform float uSweep;\nuniform float uDraw;')
      .replace(
        '#include <clipping_planes_fragment>',
        mode === 'solid'
          ? '#include <clipping_planes_fragment>\nif (vSwW.x < uSweep) discard;'
          : '#include <clipping_planes_fragment>\nif (vSwW.x > uSweep || vSwW.y > uDraw) discard;',
      )
      .replace(
        '#include <opaque_fragment>',
        mode === 'solid'
          ? '#include <opaque_fragment>\ngl_FragColor.rgb += vec3(0.55, 0.8, 1.0) * 2.2 * exp(-(vSwW.x - uSweep) * 14.0);'
          : '#include <opaque_fragment>\ngl_FragColor.rgb += vec3(0.5, 0.75, 1.0) * 1.6 * exp(-abs(vSwW.x - uSweep) * 5.0);\ngl_FragColor.rgb += vec3(0.6, 0.85, 1.0) * 1.2 * exp(-abs(vSwW.y - uDraw) * 9.0);',
      );
  };
  m.customProgramCacheKey = () => `car-${mode}-${m.type}`;
}

function solid<T extends THREE.Material>(m: T): T {
  inject(m, 'solid');
  return m;
}

export const M = {
  paint: solid(new THREE.MeshPhysicalMaterial({ color: 0xb00d17, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.8 })),
  stripe: solid(new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 })),
  core: solid(new THREE.MeshPhysicalMaterial({ color: 0x8c9a62, roughness: 0.6, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.4 })),
  chrome: solid(new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.1, metalness: 1, envMapIntensity: 1.4, side: THREE.DoubleSide })),
  steel: solid(new THREE.MeshStandardMaterial({ color: 0x8b8f95, roughness: 0.38, metalness: 0.9 })),
  dark: solid(new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.55, metalness: 0.3 })),
  rubber: solid(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.82, metalness: 0 })),
  glass: solid(new THREE.MeshPhysicalMaterial({ color: 0x15202b, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.62, clearcoat: 1, envMapIntensity: 2.2 })),
  head: solid(new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xfff2d6, emissiveIntensity: 0.55, roughness: 0.05, clearcoat: 1 })),
  tail: solid(new THREE.MeshPhysicalMaterial({ color: 0xb3101a, emissive: 0xff2a2a, emissiveIntensity: 0.35, roughness: 0.1, clearcoat: 1 })),
  leather: solid(new THREE.MeshPhysicalMaterial({ color: 0x5a3324, roughness: 0.6, sheen: 0.4 })),
  caliper: solid(new THREE.MeshPhysicalMaterial({ color: 0xf2b705, roughness: 0.3, clearcoat: 1 })),
  wire: (() => {
    const m = new THREE.LineBasicMaterial({ color: 0xe9eef5, transparent: true, opacity: 0.85, depthWrite: false });
    inject(m, 'wire');
    return m;
  })(),
};

/** Canvas decal: white roundel with a racing number. */
export function numberDecal(): THREE.MeshPhysicalMaterial {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f1ea';
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 10;
  g.strokeStyle = '#111';
  g.beginPath();
  g.arc(128, 128, 104, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#111';
  g.font = 'bold 128px Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('30', 128, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return solid(new THREE.MeshPhysicalMaterial({ map: t, transparent: true, roughness: 0.3, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
}
