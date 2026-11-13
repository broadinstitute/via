import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import { useHover } from "../../libs/hooks";
import InfoLabel from "../common/InfoLabel";

const KNOWN_ISSUE_URL = "https://support.researchallofus.org/hc/en-us/article_attachments/55135196701076";

// The tooltip can't hold the link: it isn't interactive (it vanishes when the pointer leaves the
// icon), so the link sits beside the label instead.
const CHRY_TOOLTIP =
  "Phenotype-matched cohorts aren't available for chromosome Y variants due to a known issue in the All of Us " +
  "dataset. See Known Issue #5 in the CDRv9 Genomic & Multi-omic Research Data Quality Report.";

const styles = {
  wrap: { display: "inline-flex", alignItems: "center", flexWrap: "wrap", columnGap: 8 },
  link: { color: colors.textAccent, fontSize: 11, fontWeight: 600, textDecoration: "none" },
  linkHover: { textDecoration: "underline" },
} as const satisfies Record<string, CSSProperties>;

/**
 * Stands in for every phenotype-matched figure of a chromosome Y variant, in the table and in
 * Review, with the reason on hover and a link to the All of Us report that documents it.
 */
export default function ChrYUnsupported() {
  const { hovered, hoverProps } = useHover();
  return (
    <span style={styles.wrap}>
      <InfoLabel tooltip={CHRY_TOOLTIP}>chrY is not supported for phenotype-matched cohorts</InfoLabel>
      <a
        style={{ ...styles.link, ...(hovered ? styles.linkHover : undefined) }}
        href={KNOWN_ISSUE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        {...hoverProps}
      >
        Known Issue #5 ↗
      </a>
    </span>
  );
}
