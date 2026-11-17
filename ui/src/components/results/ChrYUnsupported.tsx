import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import { useHover } from "../../libs/hooks";

const KNOWN_ISSUE_URL = "https://support.researchallofus.org/hc/en-us/article_attachments/55135196701076";

const styles = {
  wrap: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 },
  wrapCentered: { alignItems: "center", textAlign: "center" },
  link: { color: colors.textAccent, fontSize: 11, fontWeight: 600, textDecoration: "none" },
  linkHover: { textDecoration: "underline" },
} as const satisfies Record<string, CSSProperties>;

/**
 * Stands in for every phenotype-matched figure of a chromosome Y variant, in the table and in
 * Review (`centered` for the table's merged cell): the message, then a link to the All of Us report that documents the reason.
 */
export default function ChrYUnsupported({ centered = false }: { centered?: boolean }) {
  const { hovered, hoverProps } = useHover();
  return (
    <span style={{ ...styles.wrap, ...(centered ? styles.wrapCentered : undefined) }}>
      <span>chrY is not supported for phenotype-matched cohorts</span>
      <a
        style={{ ...styles.link, ...(hovered ? styles.linkHover : undefined) }}
        href={KNOWN_ISSUE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        {...hoverProps}
      >
        See Known Issue #5 in the CDRv9 Quality Report ↗
      </a>
    </span>
  );
}
