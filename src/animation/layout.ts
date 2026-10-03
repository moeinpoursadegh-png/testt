/** Shared world-space layout of the rig (y up, units ≈ metres of an imaginary lab bench). */
export const BLOB_RADIUS = 0.55;

export const SPAWN_Y = 6.6;
export const FUNNEL_TOP_Y = 6.3;
export const FUNNEL_NECK_Y = 4.6;
export const RING1 = { x: -0.2, y: 3.8 } as const;
export const RING2 = { x: 0.2, y: 3.0 } as const;
export const BOTTLE_TOP_Y = 2.45;
export const WAIST_Y = 1.4;
export const WAIST_R = 0.5;
export const BOTTLE_BOTTOM_Y = 0.7;
export const BOTTLE_BOTTOM_R = 0.62;
export const TUBE_R = 0.62;
export const RECV_TOP_Y = -1.95;
export const RECV_R = 1.75;
export const PED_TOP_Y = -3.1;
export const PED_R = 2.4;
export const REST_Y = RECV_TOP_Y + 0.56;

/** Inner glass radius of the narrow bottle (aperture) at height y. */
export function bottleRadius(y: number): number {
  if (y >= WAIST_Y) {
    const k = (y - WAIST_Y) / (BOTTLE_TOP_Y - WAIST_Y);
    return WAIST_R + 0.45 * k * k;
  }
  const k = (WAIST_Y - y) / (WAIST_Y - BOTTLE_BOTTOM_Y);
  return WAIST_R + (BOTTLE_BOTTOM_R - WAIST_R) * k * k;
}
