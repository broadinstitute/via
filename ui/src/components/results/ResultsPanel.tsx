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
  },
  heading: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  // Dark ink rather than panelTitle's accent blue, which elsewhere on the page means "clickable".
  title: {
    flexShrink: 0,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: -0.1,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 600,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
  chipNeutral: {
    border: `1px solid ${colors.border}`,
    background: colors.surface2,
    color: colors.textSecondary,
  },
  chipAccent: {
    border: `1px solid ${colors.bgAccent}`,
    background: colors.bgAccent,
    color: colors.textPrimary,
  },
  // Not trimmed to cap height like other icon-and-text pairs: the ellipsis needs overflow
  // hidden, which would then clip descenders.
  chipText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
} as const satisfies Record<string, CSSProperties>;

interface ScopeChipProps {
  children: ReactNode;
  /** Leading icon, e.g. a UserIcon for a participant count. */
  icon?: ReactNode;
  /** accent marks a scope narrowed by the user's search (a phenotype); neutral, everything. */
  tone?: "neutral" | "accent";
  /** Full text, for when the chip truncates. */
  title?: string;
}

/** The pill after a panel's title saying what the panel covers: "All participants", a phenotype. */
export function ScopeChip({ children, icon, tone = "neutral", title }: ScopeChipProps) {
  return (
    <span style={{ ...styles.chip, ...(tone === "accent" ? styles.chipAccent : styles.chipNeutral) }} title={title}>
      {icon}
      <span style={styles.chipText}>{children}</span>
    </span>
  );
}

interface ResultsPanelProps {
  title: ReactNode;
  /** A ScopeChip after the title, distinguishing panels that share one. */
  scope?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

export default function ResultsPanel({ title, scope, headerRight, children, style }: ResultsPanelProps) {
  return (
    <div style={{ ...styles.panel, ...style }}>
      <div style={styles.header}>
        <div style={styles.heading}>
          <h2 style={styles.title}>{title}</h2>
          {scope}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
