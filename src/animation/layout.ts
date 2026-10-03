/** Shared world-space layout (y up). The glass pipe follows PIPE_POINTS; the blob continues past its end. */
export const BLOB_RADIUS = 0.55;

export const RECV_X = 0.3;
export const RECV_TOP_Y = -0.9;
export const RECV_R = 1.75;
export const PED_TOP_Y = -2.3;
export const PED_R = 2.4;
export const REST_Y = RECV_TOP_Y + 0.56;

/** Centre line of the blob path. Indices 1..9 are the glass pipe, 0 is a pad above the mouth, 10+ is the fall. */
export const PATH_POINTS: [number, number][] = [
  [-1.35, 7.7], // 0 above the mouth
  [-1.35, 6.9], // 1 pipe mouth
  [-1.35, 6.0], // 2
  [-1.2, 5.1], // 3 first elbow
  [-0.6, 4.55], // 4
  [0.1, 4.2], // 5 crossing
  [0.55, 3.6], // 6
  [0.6, 2.7], // 7
  [0.6, 1.9], // 8 narrow section
  [0.55, 1.3], // 9 pipe end
  [0.5, 0.6], // 10
  [0.4, 0.1], // 11
  [RECV_X, REST_Y], // 12 rest on the receiver
];
export const PIPE_FIRST = 1;
export const PIPE_LAST = 9;
export const PIPE_R = 0.62;
export const PIPE_MIN_R = 0.5;
/** pipe segment that shatters when the rigid ball hits it, as a fraction of the pipe length */
export const BREAK_U = 0.34;

/** Inner radius of the pipe at normalised length u (narrows toward the exit). */
export function pipeRadius(u: number): number {
  const k = Math.min(1, Math.max(0, (u - 0.7) / 0.22));
  const taper = k * k * (3 - 2 * k);
  const flare = Math.min(1, Math.max(0, (u - 0.93) / 0.07));
  return PIPE_R - (PIPE_R - PIPE_MIN_R) * taper + 0.06 * flare;
}
