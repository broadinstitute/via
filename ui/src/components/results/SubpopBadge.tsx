import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import type { GnomadSubpopCode, SubpopCode } from "../../types/results";

// AFR, AMR, EAS, SAS, and OTH are shared between AoU and gnomAD, so they share
// a color; FIN, NFE, and ASJ only exist in gnomAD's subpopulation scheme.
export const SUBPOP_COLOR: Record<SubpopCode | GnomadSubpopCode, string> = {
  EUR: "#F9C854",
  AFR: "#2078B4",
  AMR: "#6DACE4",
  EAS: "#A27BD7",
  SAS: "#8CCA90",
  MID: "#CB2D4C",
  OTH: "#B3AEAD",
  FIN: "#6B4226",
  NFE: "#E67E22",
  ASJ: "#7B2D8E",
};

export const SUBPOP_LABEL: Record<SubpopCode | GnomadSubpopCode, string> = {
  EUR: "European",
  AFR: "African/African American",
  AMR: "Latino/Admixed American",
  EAS: "East Asian",
  SAS: "South Asian",
  MID: "Middle Eastern",
  OTH: "Other",
  FIN: "Finnish",
  NFE: "Non-Finnish European",
  ASJ: "Ashkenazi Jewish",
};

interface SubpopBadgeProps {
  subpopulation: SubpopCode | GnomadSubpopCode;
}

export default function SubpopBadge({ subpopulation }: SubpopBadgeProps) {
  return (
    <span
      // Fixed width (not padding-driven) so every code -- "MID", "SAS", "ASJ", etc. -- renders the
      // same size regardless of how wide its own glyphs happen to be at this font.
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        width: 52,
        padding: "2px 0",
        background: colors.surface1,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <span style={Style.colorDot(SUBPOP_COLOR[subpopulation])} />
      {subpopulation}
    </span>
  );
}
