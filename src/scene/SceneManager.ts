import * as THREE from 'three';
import type { BlobPose } from '../animation/FlexTimeline';
import type { FlexLevel } from '../animation/profiles';
import { FlexBlob } from '../objects/FlexBlob';
import { GlassRig } from '../objects/GlassRig';
import { Pedestal } from '../objects/Pedestal';
import { Receiver } from '../objects/Receiver';
import { disposeObject } from '../utils/dispose';
import { observeResize } from '../utils/resize';
import { Background } from './Background';
import { CameraController } from './CameraController';
import { createStudioEnvironment } from './Environment';
import { createLighting } from './Lighting';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cameraCtl = new CameraController();
  private readonly blob = new FlexBlob();
  private readonly rig = new GlassRig();
  private readonly receiver = new Receiver();
  private readonly pedestal = new Pedestal();
  private readonly background = new Background();
  private readonly envTex: THREE.Texture;
  private readonly stopResize: () => void;
  private readonly world = new THREE.Group();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.transmissionResolutionScale = 0.75;

    this.envTex = createStudioEnvironment(this.renderer);
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 1;
    createLighting(this.scene);

    this.cameraCtl.camera.add(this.background.mesh);
    this.scene.add(this.cameraCtl.camera);
    this.world.add(this.pedestal.group, this.receiver.group, this.blob.mesh, this.rig.group);
    this.scene.add(this.world);

    this.stopResize = observeResize(canvas.parentElement ?? canvas, (w, h) => this.resize(w, h));
  }

  private resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.cameraCtl.resize(w, h);
    this.background.fit(this.cameraCtl.camera.fov, w / Math.max(h, 1));
  }

  setLevel(level: FlexLevel): void {
    this.blob.setLevel(level);
  }

  setBreathing(on: boolean): void {
    this.cameraCtl.setBreathing(on);
  }

  render(pose: BlobPose, time: number): void {
    this.blob.apply(pose, time);
    this.rig.group.position.set(pose.rigShakeX, pose.rigShakeY, 0);
    this.rig.setCrack(pose.crack);
    this.rig.setFlash(pose.flash);
    this.receiver.setBob(pose.receiverY);
    // soft contact shadow follows the blob and tightens as it nears the plate
    const near = 1 - pose.height;
    const width = pose.scale * Math.max(pose.squash, 0.7) * (1 + 0.6 * Math.max(0, 1 - pose.flatY / Math.max(pose.stretch, 0.5)));
    this.receiver.setBlobShadow(pose.position.x, Math.max(width, 0.001), 0.08 + 0.5 * near * near * Math.min(1, pose.scale / 0.5));
    this.cameraCtl.update(time, pose.push);
    this.background.fit(this.cameraCtl.camera.fov, this.cameraCtl.camera.aspect);
    this.background.update(time);
    this.renderer.render(this.scene, this.cameraCtl.camera);
  }

  dispose(): void {
    this.stopResize();
    this.blob.dispose();
    this.rig.dispose();
    this.receiver.dispose();
    this.pedestal.dispose();
    this.background.dispose();
    this.envTex.dispose();
    disposeObject(this.scene);
    this.renderer.dispose();
  }
}
