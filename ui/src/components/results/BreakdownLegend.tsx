import type { BreakdownSegment } from "../../types/results";
import styles from "./BreakdownLegend.module.css";

interface BreakdownLegendProps {
  segments: BreakdownSegment[];
}

export default function BreakdownLegend({ segments }: BreakdownLegendProps) {
  return (
    <div className={styles.list}>
      {segments.map((segment, index) => (
        <div
          key={segment.label}
          className={styles.row}
          style={{ animationDelay: `${0.5 + index * 0.04}s` }}
        >
          <span className={styles.dot} style={{ background: segment.color }} />
          <span className={styles.name}>{segment.label}</span>
          <span className={styles.count}>{segment.count}</span>
          <span className={styles.percent}>{segment.percent}%</span>
        </div>
      ))}
    </div>
  );
}
