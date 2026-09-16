import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import type { ClinVarSignificance } from "../../types/results";
import { CLINVAR_BADGE_CONFIG } from "../../utils/clinvar";

const styles = {
  tagBadge: {
    display: "inline-block",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  splitBadge: {
    display: "inline-flex",
    width: 62,
    borderRadius: 4,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: 600,
  },
  splitHalf: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
} as Record<string, CSSProperties>;

interface ClinvarBadgeProps {
  significance: ClinVarSignificance;
  stars?: number | null;
  mode?: "split" | "tag";
}

export default function ClinvarBadge({ significance, stars = null, mode = "split" }: ClinvarBadgeProps) {
  const config = CLINVAR_BADGE_CONFIG[significance];

  if (mode === "tag") {
    return (
      <span
        style={{
          ...styles.tagBadge,
          background: config.fill,
          color: config.ink,
          border: config.borderStyle === "solid" ? `1px solid ${config.ink}` : `1px dashed ${config.ink}`,
          padding: config.tagPadding,
        }}
      >
        {significance}
      </span>
    );
  }

  return (
    <span
      style={{
        ...styles.splitBadge,
        border: `1px ${config.borderStyle} ${config.ink}`,
      }}
    >
      <span style={{ ...styles.splitHalf, background: config.fill, color: config.ink }}>
        {config.shortLabel}
      </span>
      {stars !== null && (
        <span
          style={{
            ...styles.splitHalf,
            borderLeft: `1px solid ${config.ink}`,
            color: colors.textSecondary,
          }}
        >
          {`${stars}★`}
        </span>
      )}
    </span>
  );
}
