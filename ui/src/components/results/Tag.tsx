import type { CSSProperties, ReactNode } from "react";
import colors from "../../libs/colors";

export type TagVariant = "path" | "likely-path" | "vus" | "likely-benign" | "benign";

const base: CSSProperties = {
  display: "inline-block",
  padding: "2px 7px",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
};

// Pathogenic and Benign additionally get a border in their own text color, to set them apart from
// their "Likely" counterparts as the more definitive calls. Padding drops by the border's 1px on
// each side so the overall badge size still matches the unbordered variants.
const VARIANT_STYLE: Record<TagVariant, CSSProperties> = {
  path: {
    background: colors.bgDanger,
    color: colors.textDanger,
    border: `1px solid ${colors.textDanger}`,
    padding: "1px 6px",
  },
  "likely-path": {
    background: colors.bgDanger,
    color: colors.textDanger,
  },
  vus: {
    background: colors.bgWarning,
    color: colors.textWarning,
  },
  "likely-benign": {
    background: colors.bgSuccess,
    color: colors.textSuccess,
  },
  benign: {
    background: colors.bgSuccess,
    color: colors.textSuccess,
    border: `1px solid ${colors.textSuccess}`,
    padding: "1px 6px",
  },
};

interface TagProps {
  variant: TagVariant;
  children: ReactNode;
  style?: CSSProperties;
}

export default function Tag({ variant, children, style }: TagProps) {
  return <span style={{ ...base, ...VARIANT_STYLE[variant], ...style }}>{children}</span>;
}
