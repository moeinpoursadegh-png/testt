import { BlobPose, FlexTimeline } from '../animation/FlexTimeline';
import { easeInCubic } from '../animation/easing';
import { FLEX_LEVELS, type FlexLevel } from '../animation/profiles';
import { SceneManager } from '../scene/SceneManager';
import { Controls } from '../ui/Controls';
import { Hud } from '../ui/Hud';
import { clamp } from '../utils/math';

const SWITCH_FADE = 0.28;

export class App {
  private readonly scene: SceneManager;
  private readonly timeline = new FlexTimeline();
  private readonly pose = new BlobPose();
  private readonly hud: Hud;
  private readonly controls: Controls;
  private level: FlexLevel = 0;
  private time = 0;
  private clock = 0;
  private playing = true;
  private auto = true;
  private switching: { t: number; to: FlexLevel } | null = null;
  private last = 0;
  private raf = 0;
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, hudRoot: HTMLElement, controlsRoot: HTMLElement) {
    this.scene = new SceneManager(canvas);
    this.hud = new Hud(hudRoot);
    this.controls = new Controls(controlsRoot, {
      onSelect: (l) => this.select(l),
      onTogglePlay: () => this.togglePlay(),
      onReplay: () => this.replay(),
      onToggleAuto: () => this.toggleAuto(),
    });
    if (this.reduced) {
      this.playing = false;
      this.auto = false;
      this.scene.setBreathing(false);
    }
    this.params();
    this.syncUi(true);
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.scene.setLevel(this.level);
    if (this.reduced) this.time = this.timeline.holdTime(this.level);
    this.frame(0);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
    (window as unknown as { __flex: unknown }).__flex = this;
  }

  /** ?level=50&t=3.2 pins the scene to one frame (used for screenshots / debugging). */
  private params(): void {
    const q = new URLSearchParams(location.search);
    const lv = Number(q.get('level'));
    if (q.has('level') && (FLEX_LEVELS as readonly number[]).includes(lv)) this.level = lv as FlexLevel;
    if (q.has('t')) {
      this.time = Number(q.get('t')) || 0;
      this.playing = false;
    }
    if (q.get('auto') === '0') this.auto = false;
  }

  /** Jump to an exact moment of a test (debug / screenshots). */
  seek(level: FlexLevel, t: number): void {
    this.level = level;
    this.time = t;
    this.switching = null;
    this.playing = false;
    this.scene.setLevel(level);
    this.syncUi(true);
    this.frame(0);
  }

  private select(level: FlexLevel): void {
    if (this.switching) {
      if (this.switching.to === level) return;
    } else if (level === this.level && this.time < 0.6) {
      return;
    }
    this.hud.set(level);
    this.controls.setLevel(level);
    if (this.reduced && !this.playing) {
      this.level = level;
      this.time = this.timeline.holdTime(level);
      this.scene.setLevel(level);
      this.frame(0);
      return;
    }
    const visible = this.time > 0.5 && this.time < this.timeline.duration(this.level) - 0.4;
    if (visible) this.switching = { t: 0, to: level };
    else this.start(level);
    this.playing = true;
    this.controls.setPlaying(true);
  }

  private start(level: FlexLevel): void {
    this.level = level;
    this.time = 0;
    this.switching = null;
    this.scene.setLevel(level);
  }

  private togglePlay(): void {
    this.playing = !this.playing;
    this.controls.setPlaying(this.playing);
    if (this.playing && !this.auto && this.time >= this.timeline.holdTime(this.level)) this.replay();
  }

  private replay(): void {
    const target = this.switching ? this.switching.to : this.level;
    this.hud.set(target);
    this.controls.setLevel(target);
    this.start(target);
    this.playing = true;
    this.controls.setPlaying(true);
  }

  private toggleAuto(): void {
    this.auto = !this.auto;
    this.controls.setAuto(this.auto);
  }

  private step(dir: 1 | -1): void {
    const i = FLEX_LEVELS.indexOf(this.switching ? this.switching.to : this.level);
    const n = FLEX_LEVELS.length;
    this.select(FLEX_LEVELS[(i + dir + n) % n]);
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLElement && e.target.closest('button') && e.code === 'Space') return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.step(1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.step(-1);
        break;
      case 'KeyR':
        this.replay();
        break;
    }
  };

  private readonly onVisibility = (): void => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
    } else if (!this.disposed) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  };

  private syncUi(instant = false): void {
    this.hud.set(this.level, instant);
    this.controls.setLevel(this.level);
    this.controls.setPlaying(this.playing);
    this.controls.setAuto(this.auto);
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.advance(dt);
    this.frame(dt);
    this.raf = requestAnimationFrame(this.tick);
  };

  private advance(dt: number): void {
    this.clock += dt;
    if (this.switching) {
      this.switching.t += dt;
      this.time += dt;
      if (this.switching.t >= SWITCH_FADE) this.start(this.switching.to);
      return;
    }
    if (!this.playing) return;
    this.time += dt;
    const dur = this.timeline.duration(this.level);
    if (this.auto) {
      if (this.time >= dur) {
        const i = FLEX_LEVELS.indexOf(this.level);
        const next = FLEX_LEVELS[(i + 1) % FLEX_LEVELS.length];
        this.hud.set(next);
        this.controls.setLevel(next);
        this.start(next);
      }
    } else {
      this.time = Math.min(this.time, this.timeline.holdTime(this.level));
    }
  }

  private frame(_dt: number): void {
    let t = this.time;
    if (!this.auto && !this.switching) t = Math.min(t, this.timeline.holdTime(this.level));
    this.timeline.evaluate(this.level, t, this.pose);
    if (this.switching) {
      const f = 1 - easeInCubic(clamp(this.switching.t / SWITCH_FADE));
      this.pose.scale *= f;
    }
    this.scene.render(this.pose, this.reduced && !this.playing ? 0 : this.clock);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.scene.dispose();
  }
}
