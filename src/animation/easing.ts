export const easeInCubic = (t: number): number => t * t * t;
export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t: number): number => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
/** Damped oscillation: starts at 0 with velocity, e^{-kt} sin(wt). */
export const dampedSin = (tau: number, freq: number, damping: number): number =>
  tau <= 0 ? 0 : Math.exp(-damping * tau) * Math.sin(2 * Math.PI * freq * tau);
/** Damped oscillation starting at 1: e^{-kt} cos(wt). */
export const dampedCos = (tau: number, freq: number, damping: number): number =>
  tau <= 0 ? 0 : Math.exp(-damping * tau) * Math.cos(2 * Math.PI * freq * tau);
