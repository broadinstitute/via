import type { CSSProperties, ReactNode } from "react";
import colors from "../../libs/colors";
import DnaSpinner from "../common/DnaSpinner";
import ResultsPanel from "./ResultsPanel";

const styles = {
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: "56px 20px",
    color: colors.textSecondary,
    fontSize: 12.5,
    textAlign: "center",
  },
} as const satisfies Record<string, CSSProperties>;

interface SectionLoadingPanelProps {
  title: string;
  /** The loaded panel's ScopeChip, or a stand-in for one, so the header doesn't change shape. */
  scope?: ReactNode;
  message?: string;
  minHeight?: number;
}

export default function SectionLoadingPanel({
  title,
  scope,
  message = "Loading…",
  minHeight,
}: SectionLoadingPanelProps) {
  return (
    <ResultsPanel title={title} scope={scope}>
      <div
        // minHeight comes from the caller so this placeholder occupies roughly the same
        // footprint as the panel it stands in for.
        style={{ ...styles.body, minHeight }}
      >
        <DnaSpinner size={56} />
        <span>{message}</span>
      </div>
    </ResultsPanel>
  );
}
