import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCar } from './build';
import { draw, sweep } from './materials';
import { CarTimeline, DURATION, T } from './timeline';
import { clamp, smoothstep } from '../utils/math';
import { easeInOutCubic } from '../animation/easing';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const title = document.getElementById('title')!;
const count = document.getElementById('count')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const STUDIO = new THREE.Color(0xe6e6e4);
const BLACK = new THREE.Color(0x000000);
const bg = new THREE.Color();
scene.background = bg;
scene.fog = new THREE.Fog(bg, 26, 70);

const camera = new THREE.PerspectiveCamera(30, 9 / 16, 0.5, 200);

const key = new THREE.DirectionalLight(0xffffff, 2.6);
key.position.set(4, 12, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -7;
key.shadow.camera.right = 7;
key.shadow.camera.top = 7;
key.shadow.camera.bottom = -7;
key.shadow.camera.near = 2;
key.shadow.camera.far = 30;
key.shadow.radius = 14;
key.shadow.blurSamples = 24;
key.shadow.bias = -0.0005;
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7);
fill.position.set(-8, 5, -4);
const hemi = new THREE.HemisphereLight(0xffffff, 0xbdbab3, 0.55);
scene.add(key, key.target, fill, hemi);

const floorMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.95, metalness: 0, transparent: true });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const parts = buildCar();
const car = new THREE.Group();
parts.forEach((p) => car.add(p.group));
scene.add(car);
const timeline = new CarTimeline(parts);

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // keep the 9:16 framing: widen vertical fov on wider screens is unnecessary, but narrow screens need more
  const portrait = 9 / 16;
  camera.fov = camera.aspect < portrait ? 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * (portrait / camera.aspect))) : 30;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function frame(t: number): void {
  // wireframe build-up, then a scan that turns lines into solid parts
  draw.value = -0.1 + 1.9 * easeInOutCubic(clamp(t / T.drawEnd));
  if (t >= T.drawEnd) draw.value = 99;
  const s = clamp((t - T.sweepStart) / (T.sweepEnd - T.sweepStart));
  sweep.value = s <= 0 ? 99 : s >= 1 ? -99 : 2.6 - 5.2 * easeInOutCubic(s);
  const light = smoothstep(T.sweepStart + 0.1, T.sweepEnd - 0.05, t);
  bg.copy(BLACK).lerp(STUDIO, light);
  (scene.fog as THREE.Fog).color.copy(bg);
  floorMat.opacity = light;
  floor.visible = light > 0.002;
  scene.environmentIntensity = 0.35 + 0.65 * light;
  key.intensity = 2.2 * (0.25 + 0.75 * light);
  timeline.parts(t);
  timeline.camera(t, camera);
  const ink = Math.round(255 - 205 * light);
  title.style.color = count.style.color = `rgb(${ink},${ink},${ink + 4})`;
  title.style.opacity = String(clamp(t / 0.6) * (1 - smoothstep(9.3, 9.9, t) * 0));
  count.style.opacity = String(smoothstep(4.9, 5.4, t) * (1 - smoothstep(6.5, 7.0, t)));
  count.textContent = `${Math.round(parts.length * smoothstep(4.9, 6.0, t))} PARTS`;
  renderer.render(scene, camera);
}

let playing = !new URLSearchParams(location.search).has('t');
let t0 = performance.now();
let current = Number(new URLSearchParams(location.search).get('t') ?? 0);
frame(current);
function loop(now: number): void {
  if (playing) {
    current = ((now - t0) / 1000) % DURATION;
    frame(current);
  }
  raf = requestAnimationFrame(loop);
}
let raf = requestAnimationFrame(loop);

(window as unknown as { __car: unknown }).__car = {
  seek(t: number) {
    playing = false;
    cancelAnimationFrame(raf);
    current = t;
    frame(t);
  },
  play() {
    playing = true;
    t0 = performance.now();
  },
};
