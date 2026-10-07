import type { CSSProperties, ReactNode } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";

const styles = {
  panel: {
    ...Style.elements.panel,
    display: "flex",
    flexDirection: "column",
    boxShadow: Style.shadows.panel,
  },
  header: {
    ...Style.elements.panelHeader,
    justifyContent: "space-between",
    gap: 12,
    minHeight: 53,
  },
  // Dark ink rather than panelTitle's accent blue, which elsewhere on the page means "clickable".
  title: {
    flexShrink: 0,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: -0.1,
  },
} as const satisfies Record<string, CSSProperties>;

interface ResultsPanelProps {
  title: ReactNode;
  /** Actions and counts at the header's right end, e.g. the table's Export TSV. */
  headerRight?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

/** The bordered card the results page's views sit in: a title strip, then the content. */
export default function ResultsPanel({ title, headerRight, children, style }: ResultsPanelProps) {
  return (
    <div style={{ ...styles.panel, ...style }}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title}</h2>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
