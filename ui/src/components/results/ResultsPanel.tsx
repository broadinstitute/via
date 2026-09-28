import type { CSSProperties, ReactNode } from "react";
import colors, { alpha } from "../../libs/colors";
import * as Style from "../../libs/style";

/** Shared by the chip's text and its loading placeholder, which has to match its height. */
const CHIP_LINE_HEIGHT = 1.2;

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
    lineHeight: CHIP_LINE_HEIGHT,
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
  chipSkeleton: {
    display: "inline-block",
    width: 150,
    height: 10,
    marginBlock: `calc((${CHIP_LINE_HEIGHT}em - 10px) / 2)`,
    borderRadius: 4,
  },
  chipSkeletonNeutral: {
    background: colors.border,
  },
  // colors.border reads as muddy grey on the blue fill; a deeper tint of the chip's own blue doesn't.
  chipSkeletonAccent: {
    background: alpha(colors.textAccent, 0.25),
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
  /** Shows a pulsing placeholder in place of the text (kept for screen readers), for a scope still being fetched. */
  loading?: boolean;
}

/** The pill after a panel's title saying what the panel covers: "All participants", a phenotype. */
export function ScopeChip({ children, icon, tone = "neutral", title, loading = false }: ScopeChipProps) {
  const accent = tone === "accent";
  return (
    <span style={{ ...styles.chip, ...(accent ? styles.chipAccent : styles.chipNeutral) }} title={title}>
      {icon}
      {loading ? (
        <>
          <span
            className="animate-skeleton-pulse"
            style={{ ...styles.chipSkeleton, ...(accent ? styles.chipSkeletonAccent : styles.chipSkeletonNeutral) }}
            aria-hidden="true"
          />
          {/* The placeholder says nothing to a screen reader; the chip's text still does. */}
          <span style={Style.elements.visuallyHidden}>{children}</span>
        </>
      ) : (
        <span style={styles.chipText}>{children}</span>
      )}
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
