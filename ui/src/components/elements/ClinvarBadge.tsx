import type { CSSProperties } from "react";
import colors, { alpha } from "../../libs/colors";
import type { ClinVarSignificance } from "../../types/results";
import { CLINVAR_BADGE_CONFIG } from "../../utils/clinvar";

// The same pill as SubpopBadge and ScopeChip -- rounded, a tinted fill, a soft border in the ink
// at partial opacity -- so a ClinVar call sits beside an ancestry badge or a scope chip as one
// family. A dot before the code is filled for a definitive call (P, B, VUS) and hollow for a
// "likely" one (LP, LB); the review star count follows a hairline divider in the same ink.

const DOT = 7;
/** Split badges share one width, so a column of them lines up. */
const SPLIT_WIDTH = 82;
/** The code sits in a slot wide enough for "VUS", so the divider and stars fall at the same x in every row. */
const SPLIT_CODE_WIDTH = 24;

const styles = {
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
  split: {
    boxSizing: "border-box",
    width: SPLIT_WIDTH,
    padding: "2px 7px",
  },
  splitCode: {
    width: SPLIT_CODE_WIDTH,
    flexShrink: 0,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: "50%",
    flexShrink: 0,
  },
  // The review stars, in secondary ink after a hairline in the badge's own colour. The fixed code
  // slot before them keeps the hairline in one place down a column.
  stars: {
    paddingLeft: 6,
    fontWeight: 500,
    color: colors.textSecondary,
  },
} as const satisfies Record<string, CSSProperties>;

interface ClinvarBadgeProps {
  significance: ClinVarSignificance;
  /** ClinVar's 0–4 review stars; omitted from the badge when null. */
  stars?: number | null;
  /** "split" shows the short code (P, LP, VUS…) for table cells; "tag" spells the classification out. */
  mode?: "split" | "tag";
}

export default function ClinvarBadge({ significance, stars = null, mode = "split" }: ClinvarBadgeProps) {
  const config = CLINVAR_BADGE_CONFIG[significance];
  const label = mode === "tag" ? significance : config.shortLabel;

  return (
    <span
      style={{
        ...styles.badge,
        ...(mode === "split" ? styles.split : undefined),
        background: config.fill,
        border: `1px solid ${alpha(config.ink, 0.35)}`,
        color: config.ink,
      }}
      title={`ClinVar: ${significance}${stars !== null ? `, ${stars} of 4 review stars` : ""}`}
    >
      <span
        aria-hidden="true"
        style={{
          ...styles.dot,
          ...(config.definitive
            ? { background: config.ink }
            : { border: `1.5px solid ${config.ink}`, background: "transparent", boxSizing: "border-box" }),
        }}
      />
      <span style={mode === "split" ? styles.splitCode : undefined}>{label}</span>
      {stars !== null && (
        <span style={{ ...styles.stars, borderLeft: `1px solid ${alpha(config.ink, 0.3)}` }}>{`${stars}★`}</span>
      )}
    </span>
  );
}
