import { useRef } from "react";
import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { BreakdownSegment } from "../../types/results";
import { useTooltip } from "../common/useTooltip";

// A breakdown as one stacked bar with a legend beneath listing every group, its code and share.
// Every run names itself in the app's tooltip on hover, and a hovered run or legend entry
// quietens the rest. Sized to the width it's given, so it suits a band across the page.

/** A sliver of a group stays visible even when its share rounds to nothing. */
const MIN_RUN_WIDTH = 3;

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
    borderRadius: 5,
    overflow: "hidden",
    background: colors.surface0,
  },
  run: {
    height: "100%",
    minWidth: MIN_RUN_WIDTH,
    transition: "opacity 0.12s ease, filter 0.12s ease",
  },
  quiet: {
    opacity: 0.4,
  },
  hot: {
    filter: "saturate(1.15)",
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
    transition: "opacity 0.12s ease",
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
  /** The bar's thickness in px. */
  height?: number;
}

export default function BreakdownBar({ segments, label, height = 10 }: BreakdownBarProps) {
  const { hoveredKey, hoverProps } = useHoveredKey<string>();
  const description = segments.map((segment) => `${segment.label} ${Math.round(segment.percent)}%`).join(", ");

  return (
    <div style={styles.root}>
      <div style={{ ...styles.bar, height }} role="img" aria-label={`${label} breakdown: ${description}`}>
        {segments.map((segment, index) => (
          <Run
            key={segment.label}
            segment={segment}
            index={index}
            quiet={hoveredKey !== null && hoveredKey !== segment.label}
            hot={hoveredKey === segment.label}
            hoverProps={hoverProps(segment.label)}
          />
        ))}
      </div>
      <div style={styles.legend} aria-hidden="true">
        {segments.map((segment) => (
          <span
            key={segment.label}
            style={{
              ...styles.legendItem,
              ...(hoveredKey !== null && hoveredKey !== segment.label ? styles.quiet : undefined),
            }}
            {...hoverProps(segment.label)}
          >
            <span style={Style.colorDot(segment.color, 8)} />
            {segment.label}
            <span style={styles.legendPercent}>{Math.round(segment.percent)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface RunProps {
  segment: BreakdownSegment;
  index: number;
  quiet: boolean;
  hot: boolean;
  hoverProps: { onMouseEnter: () => void; onMouseLeave: () => void };
}

/** One group's run of the bar, with the app's tooltip naming it and its count on hover. */
function Run({ segment, index, quiet, hot, hoverProps }: RunProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const tooltip = useTooltip(
    ref,
    `${segment.label}: ${segment.count.toLocaleString()} participants (${Math.round(segment.percent)}%)`,
  );

  return (
    <span
      ref={ref}
      className="animate-grow-x"
      style={{
        ...styles.run,
        flex: `${segment.count || 1} 0 ${MIN_RUN_WIDTH}px`,
        background: segment.color,
        animationDelay: `${index * 0.06}s`,
        ...(quiet ? styles.quiet : undefined),
        ...(hot ? styles.hot : undefined),
      }}
      onMouseEnter={() => {
        hoverProps.onMouseEnter();
        tooltip.anchorProps.onMouseEnter();
      }}
      onMouseLeave={() => {
        hoverProps.onMouseLeave();
        tooltip.anchorProps.onMouseLeave();
      }}
    >
      {tooltip.bubble}
    </span>
  );
}
