import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import type { BreakdownSegment } from "../../types/results";

// A breakdown as one stacked bar, each group's share as a run of its colour, with the legend in a
// line beneath. Sized to the width it's given, so it suits a band across the page where a donut
// would have to be small to fit the height.

/** A sliver of a group stays visible even when its share rounds to nothing. */
const MIN_SEGMENT_WIDTH = 3;

const styles = {
  // Fills whatever width it's given, in a row or a column.
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  bar: {
    display: "flex",
    gap: 2,
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    background: colors.surface0,
  },
  segment: {
    height: "100%",
    minWidth: MIN_SEGMENT_WIDTH,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "3px 12px",
    fontSize: 11.5,
    color: colors.textBody,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  legendPercent: {
    color: colors.textSecondary,
    fontVariantNumeric: "tabular-nums",
  },
} as const satisfies Record<string, CSSProperties>;

interface BreakdownBarProps {
  segments: BreakdownSegment[];
  /** What the bar breaks down, e.g. "Ancestry", for its accessible name. */
  label: string;
}

export default function BreakdownBar({ segments, label }: BreakdownBarProps) {
  // Proportions from counts, not the rounded percents, which needn't add up to exactly 100.
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const description = segments.map((segment) => `${segment.label} ${Math.round(segment.percent)}%`).join(", ");

  return (
    <div style={styles.root}>
      <div className="animate-fade-in" style={styles.bar} role="img" aria-label={`${label} breakdown: ${description}`}>
        {segments.map((segment) => (
          <span
            key={segment.label}
            style={{ ...styles.segment, flex: `${total > 0 ? segment.count : 1} 0 ${MIN_SEGMENT_WIDTH}px`, background: segment.color }}
            title={`${segment.label}: ${segment.count.toLocaleString()} participants (${Math.round(segment.percent)}%)`}
          />
        ))}
      </div>
      <div style={styles.legend} aria-label={`${label} breakdown`}>
        {segments.map((segment) => (
          <span key={segment.label} style={styles.legendItem} title={`${segment.count.toLocaleString()} participants`}>
            <span style={Style.colorDot(segment.color, 8)} />
            {segment.label}
            <span style={styles.legendPercent}>{Math.round(segment.percent)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
