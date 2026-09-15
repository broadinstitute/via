import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import type { BreakdownSegment } from "../../types/results";

const styles = {
  list: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 10,
    rowGap: 3,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    fontSize: 11,
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: colors.textBody,
    fontWeight: 500,
  },
  // Tabular figures keep the number columns aligned without a monospace face.
  count: {
    minWidth: 24,
    textAlign: "right",
    color: colors.textPrimary,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },
  percent: {
    minWidth: 34,
    textAlign: "right",
    color: colors.textSecondary,
    fontVariantNumeric: "tabular-nums",
  },
} as const satisfies Record<string, CSSProperties>;

interface BreakdownLegendProps {
  segments: BreakdownSegment[];
}

export default function BreakdownLegend({ segments }: BreakdownLegendProps) {
  return (
    <div style={styles.list}>
      {segments.map((segment, index) => (
        <div
          key={segment.label}
          className="animate-row-fade-in"
          // Staggered so the rows arrive in sequence just after the donut finishes its reveal.
          style={{ ...styles.row, animationDelay: `${0.5 + index * 0.04}s` }}
        >
          <span style={Style.colorDot(segment.color, 8)} />
          <span style={styles.name}>{segment.label}</span>
          <span style={styles.count}>{segment.count}</span>
          <span style={styles.percent}>{segment.percent}%</span>
        </div>
      ))}
    </div>
  );
}
