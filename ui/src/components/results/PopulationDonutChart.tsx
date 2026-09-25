import type { CSSProperties, ReactNode } from "react";
import colors from "../../libs/colors";
import type { BreakdownSegment } from "../../types/results";

interface PopulationDonutChartProps {
  segments: BreakdownSegment[];
  centerLabel: ReactNode;
}

const SIZE = 190;
const CENTER = SIZE / 2;
const RADIUS = 80;
const STROKE_WIDTH = 30;

const styles = {
  wrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 12,
  },
  donut: {
    position: "relative",
    flexShrink: 0,
    width: SIZE,
    height: SIZE,
  },
  // Sits in the hole of the ring, fading in just as the reveal animation finishes.
  center: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.3,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
} as const satisfies Record<string, CSSProperties>;

/**
 * One slice of the ring as an open arc, clockwise from 12 o'clock, between two fractions of the
 * whole. An open path rather than a dash on a closed circle: a dash that meets a circle's closing
 * point gets joined around it, and draws as a spike into the first slice.
 */
function arcPath(startFraction: number, endFraction: number): string {
  const point = (fraction: number) => {
    const angle = 2 * Math.PI * fraction - Math.PI / 2;
    return `${CENTER + RADIUS * Math.cos(angle)} ${CENTER + RADIUS * Math.sin(angle)}`;
  };
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;
  return `M ${point(startFraction)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${point(endFraction)}`;
}

export default function PopulationDonutChart({ segments, centerLabel }: PopulationDonutChartProps) {
  // Sized from counts, not the rounded percents, which needn't add up to exactly 100 and would
  // leave the ring short or overlapping at the top.
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  let cumulative = 0;
  const arcs = segments.map((segment) => {
    const start = total > 0 ? cumulative / total : 0;
    cumulative += segment.count;
    return { ...segment, start, end: total > 0 ? cumulative / total : 0 };
  });

  return (
    <div style={styles.wrap}>
      <div style={styles.donut}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
          {arcs.map((arc) =>
            // An arc can't start and end at the same point, so a slice that is the whole ring
            // is drawn as the circle itself.
            arc.end - arc.start >= 1 ? (
              <circle
                key={arc.label}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE_WIDTH}
              />
            ) : (
              arc.end > arc.start && (
                <path
                  key={arc.label}
                  d={arcPath(arc.start, arc.end)}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={STROKE_WIDTH}
                />
              )
            ),
          )}
          {/* Covers the whole ring in the page background, then "shrinks" via the animation to
              reveal it clockwise from the top (see .animate-donut-reveal in style.css).
              pathLength=100 lets the animation's dasharray be expressed as percentages. */}
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            <circle
              className="animate-donut-reveal"
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={colors.surface2}
              strokeWidth={STROKE_WIDTH + 2}
              pathLength={100}
            />
          </g>
        </svg>
        <div className="animate-fade-in" style={styles.center}>
          {centerLabel}
        </div>
      </div>
    </div>
  );
}
