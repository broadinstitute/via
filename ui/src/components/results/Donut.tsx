import type { ReactNode } from "react";
import type { BreakdownSegment } from "../../types/results";
import styles from "./Donut.module.css";

interface DonutProps {
  segments: BreakdownSegment[];
  centerLabel: ReactNode;
}

const SIZE = 190;
const CENTER = SIZE / 2;
const RADIUS = 80;
const STROKE_WIDTH = 30;

export default function Donut({ segments, centerLabel }: DonutProps) {
  let cumulative = 0;
  const arcs = segments.map((segment) => {
    const start = cumulative;
    cumulative += segment.percent;
    return { ...segment, start };
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.donut}>
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
            {/* Covers the whole ring, then "shrinks" via a dasharray animation to
                reveal it clockwise from the top, like a clock hand sweeping around. */}
            <circle
              className={styles.reveal}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE_WIDTH + 2}
              pathLength={100}
            />
          </g>
        </svg>
        <div className={styles.center}>{centerLabel}</div>
      </div>
    </div>
  );
}
