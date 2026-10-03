export const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const gauss = (x: number, c: number, w: number): number => Math.exp(-(((x - c) / w) ** 2));

/** Monotone piecewise-cubic Hermite interpolation (Fritsch–Carlson / PCHIP). C1 continuous, no overshoot. */
export class Pchip {
  private readonly d: number[];
  constructor(private readonly xs: number[], private readonly ys: number[]) {
    const n = xs.length;
    const h: number[] = [];
    const del: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      h.push(xs[i + 1] - xs[i]);
      del.push((ys[i + 1] - ys[i]) / h[i]);
    }
    const d = new Array<number>(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      if (del[i - 1] * del[i] <= 0) continue;
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      d[i] = (w1 + w2) / (w1 / del[i - 1] + w2 / del[i]);
    }
    d[0] = Pchip.endSlope(h[0], h[1] ?? h[0], del[0], del[1] ?? del[0]);
    d[n - 1] = Pchip.endSlope(h[n - 2], h[n - 3] ?? h[n - 2], del[n - 2], del[n - 3] ?? del[n - 2]);
    this.d = d;
  }
  private static endSlope(h0: number, h1: number, d0: number, d1: number): number {
    let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(s) !== Math.sign(d0)) s = 0;
    else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > 3 * Math.abs(d0)) s = 3 * d0;
    return s;
  }
  private seg(x: number): number {
    const xs = this.xs;
    let i = xs.length - 2;
    while (i > 0 && x < xs[i]) i--;
    return i;
  }
  eval(x: number): number {
    const xs = this.xs;
    if (x <= xs[0]) return this.ys[0];
    if (x >= xs[xs.length - 1]) return this.ys[xs.length - 1];
    const i = this.seg(x);
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * this.ys[i] +
      (t3 - 2 * t2 + t) * h * this.d[i] +
      (-2 * t3 + 3 * t2) * this.ys[i + 1] +
      (t3 - t2) * h * this.d[i + 1]
    );
  }
  deriv(x: number): number {
    const xs = this.xs;
    if (x <= xs[0] || x >= xs[xs.length - 1]) return x <= xs[0] ? 0 : this.d[xs.length - 1];
    const i = this.seg(x);
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    return (
      ((6 * t2 - 6 * t) * this.ys[i] +
        (3 * t2 - 4 * t + 1) * h * this.d[i] +
        (-6 * t2 + 6 * t) * this.ys[i + 1] +
        (3 * t2 - 2 * t) * h * this.d[i + 1]) /
      h
    );
  }
}
