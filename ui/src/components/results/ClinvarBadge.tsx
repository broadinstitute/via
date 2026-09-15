import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import type { ClinVarSignificance } from "../../types/results";
import {
  CLINVAR_BADGE_TONE_COLORS,
  CLINVAR_SHORT_LABEL,
  clinvarStarRating,
  clinvarTagVariant,
} from "../../utils/clinvar";
import Tag from "./Tag";

const styles = {
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
} as const satisfies Record<string, CSSProperties>;

interface ClinvarBadgeProps {
  significance: ClinVarSignificance;
  stars?: number | null;
  mode?: "split" | "tag";
}

export default function ClinvarBadge({ significance, stars = null, mode = "split" }: ClinvarBadgeProps) {
  if (mode === "tag") {
    return <Tag variant={clinvarTagVariant(significance)}>{significance}</Tag>;
  }

  const tone = CLINVAR_BADGE_TONE_COLORS[significance];
  const isLikely = significance === "Likely pathogenic" || significance === "Likely benign";

  return (
    <span
      style={{
        ...styles.splitBadge,
        border: `1px ${isLikely ? "dashed" : "solid"} ${tone.ink}`,
      }}
    >
      <span style={{ ...styles.splitHalf, background: tone.fill, color: tone.ink }}>
        {CLINVAR_SHORT_LABEL[significance]}
      </span>
      {stars !== null && (
        <span
          style={{
            ...styles.splitHalf,
            borderLeft: `1px solid ${tone.ink}`,
            color: colors.textSecondary,
          }}
        >
          {clinvarStarRating(stars)}
        </span>
      )}
    </span>
  );
}
