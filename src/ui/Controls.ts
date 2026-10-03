import { FLEX_LEVELS, type FlexLevel } from '../animation/profiles';
import { clamp } from '../utils/math';

export interface ControlsHandlers {
  onSelect(level: FlexLevel): void;
  onTogglePlay(): void;
  onReplay(): void;
  onToggleAuto(): void;
}

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.4z" fill="currentColor"/></svg>';
const ICON_REPLAY =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 4.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 3.8v5.4h5.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export class Controls {
  private readonly root: HTMLElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly autoBtn: HTMLButtonElement;
  private readonly track: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly stops: HTMLButtonElement[] = [];
  private idleTimer = 0;
  private dragging = false;

  constructor(root: HTMLElement, private readonly h: ControlsHandlers) {
    this.root = root;
    root.innerHTML = `
      <div class="ctl__scrub" role="group" aria-label="Flex level">
        <div class="ctl__track" role="slider" tabindex="0" aria-label="Flex level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0 percent flex">
          <div class="ctl__rail"></div>
          <div class="ctl__knob"></div>
        </div>
      </div>
      <div class="ctl__btns">
        <button class="ctl__btn" data-act="play" aria-label="Pause"></button>
        <button class="ctl__btn" data-act="replay" aria-label="Replay current test">${ICON_REPLAY}</button>
        <button class="ctl__btn ctl__btn--text" data-act="auto" aria-pressed="true" aria-label="Auto advance">AUTO</button>
      </div>`;
    this.track = root.querySelector('.ctl__track')!;
    this.knob = root.querySelector('.ctl__knob')!;
    this.playBtn = root.querySelector('[data-act=play]')!;
    this.autoBtn = root.querySelector('[data-act=auto]')!;

    FLEX_LEVELS.forEach((lvl, i) => {
      const b = document.createElement('button');
      b.className = 'ctl__stop';
      b.style.left = `${i * 25}%`;
      b.setAttribute('aria-label', `Run ${lvl} percent flex test`);
      b.innerHTML = `<span class="ctl__tick"></span><span class="ctl__num">${lvl}</span>`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.h.onSelect(lvl);
      });
      this.track.appendChild(b);
      this.stops.push(b);
    });

    this.playBtn.addEventListener('click', () => this.h.onTogglePlay());
    root.querySelector('[data-act=replay]')!.addEventListener('click', () => this.h.onReplay());
    this.autoBtn.addEventListener('click', () => this.h.onToggleAuto());

    // drag along the rail, snapping to the nearest stop
    const pick = (e: PointerEvent): FlexLevel => {
      const r = this.track.getBoundingClientRect();
      const f = clamp((e.clientX - r.left) / r.width);
      return FLEX_LEVELS[Math.round(f * 4)];
    };
    this.track.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.ctl__stop')) return;
      this.dragging = true;
      this.track.setPointerCapture(e.pointerId);
      this.h.onSelect(pick(e));
    });
    this.track.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.h.onSelect(pick(e));
    });
    const end = () => (this.dragging = false);
    this.track.addEventListener('pointerup', end);
    this.track.addEventListener('pointercancel', end);

    // fade when idle, wake on any interaction
    const wake = () => this.wake();
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('keydown', wake);
    this.wake();
  }

  private wake(): void {
    this.root.classList.remove('is-idle');
    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => this.root.classList.add('is-idle'), 3200);
  }

  setLevel(level: FlexLevel): void {
    const i = FLEX_LEVELS.indexOf(level);
    this.knob.style.left = `${i * 25}%`;
    this.stops.forEach((s, k) => s.classList.toggle('is-active', k === i));
    this.track.setAttribute('aria-valuenow', String(level));
    this.track.setAttribute('aria-valuetext', `${level} percent flex`);
  }

  setPlaying(playing: boolean): void {
    this.playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    this.playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  setAuto(auto: boolean): void {
    this.autoBtn.setAttribute('aria-pressed', String(auto));
    this.autoBtn.classList.toggle('is-on', auto);
  }
}
