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

export default function PopulationDonutChart({ segments, centerLabel }: PopulationDonutChartProps) {
  let cumulative = 0;
  const arcs = segments.map((segment) => {
    const start = cumulative;
    cumulative += segment.percent;
    return { ...segment, start };
  });

  return (
    <div style={styles.wrap}>
      <div style={styles.donut}>
        {/* pathLength=100 lets dasharray/dashoffset be expressed directly as percentages. */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE_WIDTH}
                pathLength={100}
                strokeDasharray={`${arc.percent} ${100 - arc.percent}`}
                strokeDashoffset={-arc.start}
              />
            ))}
            {/* Covers the whole ring in the page background, then "shrinks" via the animation to
                reveal it clockwise from the top (see .animate-donut-reveal in style.css). */}
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
