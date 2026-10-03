export type FlexLevel = 0 | 25 | 50 | 75 | 100;
export const FLEX_LEVELS: readonly FlexLevel[] = [0, 25, 50, 75, 100];

export interface FlexProfile {
  level: FlexLevel;
  /** seconds the blob hesitates extra at the aperture */
  apertureDelay: number;
  /** transverse scale (b/R) reached at the narrowest point; 1 = no squeeze */
  squash: number;
  /** extra axial stretch from speed */
  stretch: number;
  /** amplitude of secondary wobble */
  wobble: number;
  /** landing impact strength */
  impact: number;
  /** how quickly it recovers (higher = snappier) */
  recovery: number;
  /** tail lag / teardrop asymmetry */
  skew: number;
  /** bending along the path curvature */
  bend: number;
  /** pinch that forms two lobes (0..1) */
  neck: number;
  /** axial scale the shape settles to on the receiver */
  restStretch: number;
  /** how far the settled body sinks / spreads */
  restSink: number;
  /** total length of the test in seconds */
  duration: number;
}

export const PROFILES: Record<FlexLevel, FlexProfile> = {
  0: {
    level: 0, apertureDelay: 0, squash: 1, stretch: 0, wobble: 0.1, impact: 0.15, recovery: 3,
    skew: 0, bend: 0, neck: 0, restStretch: 1, restSink: 0, duration: 5.0,
  },
  25: {
    level: 25, apertureDelay: 0.2, squash: 0.88, stretch: 0.3, wobble: 0.3, impact: 0.35, recovery: 1.5,
    skew: 0.12, bend: 0.3, neck: 0, restStretch: 1, restSink: 0, duration: 5.2,
  },
  50: {
    level: 50, apertureDelay: 0.25, squash: 0.68, stretch: 0.55, wobble: 0.6, impact: 0.6, recovery: 1.1,
    skew: 0.3, bend: 0.6, neck: 0, restStretch: 0.96, restSink: 0.04, duration: 5.3,
  },
  75: {
    level: 75, apertureDelay: 0.32, squash: 0.56, stretch: 0.85, wobble: 0.9, impact: 0.85, recovery: 0.85,
    skew: 0.55, bend: 0.9, neck: 0.3, restStretch: 0.85, restSink: 0.12, duration: 5.5,
  },
  100: {
    level: 100, apertureDelay: 0.45, squash: 0.46, stretch: 1.1, wobble: 1.0, impact: 1.1, recovery: 0.6,
    skew: 0.85, bend: 1.2, neck: 0.96, restStretch: 0.62, restSink: 0.32, duration: 6.6,
  },
};
