import type { CSSProperties, ReactNode } from "react";
import colors from "../../libs/colors";

/** Exported for what has to sit just below the bar, e.g. the edit-search popover's backdrop. */
export const TOP_BAR_HEIGHT = 46;

const styles = {
  bar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: TOP_BAR_HEIGHT,
    padding: "0 20px",
    background: colors.surface2,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    fontSize: 12,
  },
  title: {
    flexShrink: 0,
    margin: 0,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 700,
  },
  // What the view is for, in a line beside its title. Truncates before it pushes the actions off.
  lede: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.textSecondary,
    fontSize: 12,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
} as const satisfies Record<string, CSSProperties>;

interface TopBarProps {
  /** The view's name, as the page's heading. Left out by a view whose bar is a control (the results search box). */
  title?: ReactNode;
  /** One line on what the view is for, after the title. */
  lede?: ReactNode;
  /** Anything else in the bar, between the title and the actions. */
  children?: ReactNode;
  /** Buttons at the bar's right end. */
  actions?: ReactNode;
}

/**
 * The strip across the top of every view, inside the shell: it says what the view is and holds
 * the view's own actions. The things that are the same on every view -- who's signed in, the
 * usage figure, the way to other views -- are on the rail instead.
 */
export default function TopBar({ title, lede, children, actions }: TopBarProps) {
  return (
    <div style={styles.bar}>
      {title !== undefined && <h1 style={styles.title}>{title}</h1>}
      {lede !== undefined && <p style={styles.lede}>{lede}</p>}
      {children}
      {actions !== undefined && <div style={styles.actions}>{actions}</div>}
    </div>
  );
}
