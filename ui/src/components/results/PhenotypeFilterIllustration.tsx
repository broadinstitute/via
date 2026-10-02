import type { CSSProperties } from "react";
import colors, { alpha } from "../../libs/colors";

/**
 * The empty-state picture for the two panels that need a phenotype filter: the whole cohort as a
 * scatter of participants, a dashed funnel standing where the filter would go, and beneath it a
 * dashed outline of what the panel would show once one is added -- the breakdown donut, or the
 * phenotype-matched variants table. Decorative; the text beside it carries the meaning.
 */

const VIEW_W = 220;
const VIEW_H = 176;

/** The ancestry palette the breakdown donut uses, so the crowd reads as the same participants. */
const DOT_COLORS = [
  colors.subpopEur,
  colors.subpopAfr,
  colors.subpopAmr,
  colors.subpopEas,
  colors.subpopSas,
  colors.subpopMid,
  colors.subpopOth,
] as const;

/** Hand-placed so the crowd looks scattered rather than gridded, denser toward the funnel's mouth. */
const DOTS: { x: number; y: number; r: number; color: string }[] = [
  { x: 42, y: 24, r: 5, color: DOT_COLORS[0] },
  { x: 64, y: 12, r: 4.5, color: DOT_COLORS[1] },
  { x: 86, y: 30, r: 5.5, color: DOT_COLORS[2] },
  { x: 106, y: 13, r: 4.5, color: DOT_COLORS[3] },
  { x: 128, y: 34, r: 5, color: DOT_COLORS[4] },
  { x: 150, y: 15, r: 5, color: DOT_COLORS[5] },
  { x: 172, y: 28, r: 4.5, color: DOT_COLORS[6] },
  { x: 190, y: 13, r: 4, color: DOT_COLORS[0] },
  { x: 54, y: 44, r: 4, color: DOT_COLORS[3] },
  { x: 108, y: 46, r: 5, color: DOT_COLORS[1] },
  { x: 160, y: 44, r: 4.5, color: DOT_COLORS[2] },
  { x: 30, y: 10, r: 3.5, color: DOT_COLORS[4] },
  { x: 78, y: 50, r: 3.5, color: DOT_COLORS[6] },
  { x: 136, y: 52, r: 3.5, color: DOT_COLORS[5] },
];

const DASH = "5 4";

const styles = {
  svg: {
    display: "block",
    maxWidth: "100%",
    height: "auto",
  },
} as const satisfies Record<string, CSSProperties>;

export type PhenotypeFilterIllustrationVariant = "breakdown" | "table";

interface PhenotypeFilterIllustrationProps {
  /** What the dashed outline under the funnel sketches: the breakdown donut or the matched-variants table. */
  variant: PhenotypeFilterIllustrationVariant;
  /** Rendered width in px; height follows. */
  width?: number;
}

export default function PhenotypeFilterIllustration({ variant, width = 200 }: PhenotypeFilterIllustrationProps) {
  const outline = { fill: "none", stroke: colors.borderStrong, strokeWidth: 1.5, strokeDasharray: DASH };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={width}
      height={(width * VIEW_H) / VIEW_W}
      style={styles.svg}
      aria-hidden="true"
      data-testid={`phenotype-filter-illustration-${variant}`}
    >
      {/* The cohort: every participant, with nothing yet to pick them apart by. Each dot fades in
          on its own beat so the crowd gathers rather than appearing. */}
      {DOTS.map((dot, index) => (
        <circle
          key={index}
          className="animate-fade-in"
          style={{ animationDelay: `${0.15 + index * 0.04}s` }}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill={dot.color}
          fillOpacity={0.85}
        />
      ))}

      {/* The missing filter. */}
      <path d="M56 66 H164 L120 104 V124 H100 V104 Z" {...outline} strokeLinejoin="round" fill={colors.surface1} />
      {/* The "add" badge on its rim, in the same orange as the button under it. */}
      <circle cx="164" cy="66" r="10" fill={colors.accentOrange} />
      <path d="M164 61.5v9M159.5 66h9" stroke={colors.white} strokeWidth="2.2" strokeLinecap="round" />

      {/* What the filter would feed, still just an outline. */}
      {variant === "breakdown" ? (
        <g>
          <circle cx="92" cy="152" r="18" {...outline} />
          <circle cx="92" cy="152" r="7" fill={alpha(colors.borderStrong, 0.25)} />
          <rect x="120" y="140" width="46" height="6" rx="3" {...outline} />
          <rect x="120" y="154" width="34" height="6" rx="3" {...outline} />
        </g>
      ) : (
        <g>
          <rect x="50" y="132" width="120" height="9" rx="4.5" {...outline} />
          <rect x="50" y="146" width="96" height="9" rx="4.5" {...outline} />
          <rect x="50" y="160" width="108" height="9" rx="4.5" {...outline} />
        </g>
      )}
    </svg>
  );
}
