import type { BreakdownSegment } from "../../types/results";
import styles from "./BreakdownLegend.module.css";

interface BreakdownLegendProps {
  segments: BreakdownSegment[];
}

export default function BreakdownLegend({ segments }: BreakdownLegendProps) {
  return (
    <div className={styles.strip}>
      {segments.map((segment, index) => (
        <span
          key={segment.label}
          className={styles.chip}
          style={{ animationDelay: `${0.5 + index * 0.04}s` }}
        >
          <span className={styles.dot} style={{ background: segment.color }} />
          {segment.label} {segment.percent}%
        </span>
      ))}
    </div>
  );
}
