import { FLEX_LEVELS, type FlexLevel } from '../animation/profiles';

/** Title, odometer-style FLEX value and a small industrial label. */
export class Hud {
  private readonly strips: HTMLElement[] = [];
  private readonly hundreds: HTMLElement;
  private readonly label: HTMLElement;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="hud__title">MATERIAL FLEX</div>
      <div class="hud__value" role="status" aria-live="polite" aria-atomic="true">
        <span class="hud__col hud__col--hundreds"><span class="hud__strip"></span></span>
        <span class="hud__col"><span class="hud__strip"></span></span>
        <span class="hud__col"><span class="hud__strip"></span></span>
        <span class="hud__pct">%</span>
      </div>
      <div class="hud__label"></div>`;
    const strip = '0123456789'.split('').map((d) => `<i>${d}</i>`).join('');
    root.querySelectorAll<HTMLElement>('.hud__strip').forEach((el) => {
      el.innerHTML = strip;
      this.strips.push(el);
    });
    this.hundreds = root.querySelector('.hud__col--hundreds')!;
    this.label = root.querySelector('.hud__label')!;
  }

  set(level: FlexLevel, instant = false): void {
    const digits = [Math.floor(level / 100), Math.floor((level % 100) / 10), level % 10];
    this.strips.forEach((el, i) => {
      el.style.transition = instant ? 'none' : '';
      el.style.transform = `translateY(${-digits[i]}em)`;
    });
    this.hundreds.classList.toggle('is-open', level === 100);
    const idx = FLEX_LEVELS.indexOf(level) + 1;
    this.label.textContent = `DEFORMATION TEST  ${String(idx).padStart(2, '0')} / 05`;
    this.hundreds.parentElement!.setAttribute('aria-label', `${level} percent flex`);
  }
}
