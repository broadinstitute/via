// Style objects shared by two or more components -- the closest thing VIA has to a design system.
//
// Components style themselves with inline `style` objects rather than stylesheets (see
// docs/ui_styling.md). Anything used in more than one place lands here, imported as:
//
//   import * as Style from "../libs/style";
//   <div style={{ ...Style.elements.panel, width: 500 }}>
//
// Spreading is how overrides work, so keep these groups flat and single-purpose. A style that only
// one component uses belongs in a local `styles` object in that component's own file instead.
//
// `as const satisfies Record<string, CSSProperties>` gets us both halves of the type check: the
// values stay narrow enough to spread without widening, and a misspelled or invalid CSS property
// fails to compile.

import type { CSSProperties } from "react";
import colors, { alpha } from "./colors";

/** Variant IDs, protein changes and version numbers -- anything that should line up per-character. */
export const monoFamily = '"SF Mono", "Courier New", monospace';

/** Buttons, inputs and inline callouts. Panels use the larger panelRadius. */
export const radius = 8;
export const panelRadius = 12;

export const shadows = {
  /** Results panels, which sit flat on the page. */
  panel: `0 1px 3px ${alpha(colors.textPrimary, 0.06)}`,
  /** The entry page's step cards and recent-search list, which float above the hero. */
  raised: `0 12px 28px ${alpha(colors.textPrimary, 0.14)}`,
  /** The selected pill in a segmented control. */
  pill: `0 1px 2px ${alpha(colors.textPrimary, 0.12)}`,
} as const;

export const elements = {
  /** The bordered white container behind every panel and card. */
  panel: {
    background: colors.surface2,
    border: `1px solid ${colors.border}`,
    borderRadius: panelRadius,
    overflow: "hidden",
  },
  /** A panel's title strip. */
  panelHeader: {
    display: "flex",
    alignItems: "center",
    padding: "12px 14px",
    background: colors.surface1,
    borderBottom: `1px solid ${colors.border}`,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textAccent,
  },
  /** Small uppercase label introducing a value: "Condition", "Updated", "Sources". */
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mono: {
    fontFamily: monoFamily,
    fontSize: 11.5,
  },
  /** The em dash in muted ink that stands in for "no value here". */
  notAvailable: {
    color: colors.textMuted,
  },
  /** Circled "i" carrying a title-attribute explanation of the column beside it. */
  tooltipIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 14,
    height: 14,
    marginLeft: 4,
    border: "none",
    borderRadius: "50%",
    background: colors.textAccent,
    color: colors.white,
    fontSize: 9,
    fontWeight: 600,
    cursor: "help",
  },
  /** Explanatory line under a form field. */
  fieldHint: {
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 1.5,
    color: colors.textMuted,
  },
} as const satisfies Record<string, CSSProperties>;

// Each `*Hover` object is meant to be merged over its base while the pointer is inside the
// element, which is what <Clickable> does with its `hoverStyle` prop.
export const buttons = {
  /** Orange call to action: the page's Search, Export TSV, "add a phenotype". */
  primary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "7px 14px",
    border: "none",
    borderRadius: radius,
    background: colors.accentOrange,
    color: colors.white,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  primaryHover: {
    background: colors.accentOrangeHover,
  },
  /** Outlined neutral button standing next to a primary one, e.g. the drawer's Cancel. */
  secondary: {
    padding: "7px 14px",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius,
    background: colors.surface2,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryHover: {
    background: colors.surface1,
  },
  /** Outlined button in accent ink: "Modify search", "View results". */
  accent: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius,
    background: "none",
    color: colors.textAccent,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  accentHover: {
    background: colors.bgAccent,
  },
  /** Icon-only button with no chrome until hovered: copy, expand-row. */
  icon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    border: "none",
    borderRadius: 4,
    background: "none",
    color: colors.textMuted,
    cursor: "pointer",
  },
  iconHover: {
    background: colors.surface1,
    color: colors.textAccent,
  },
  disabled: {
    opacity: 0.5,
    cursor: "default",
    pointerEvents: "none",
  },
} as const satisfies Record<string, CSSProperties>;

export const inputs = {
  label: {
    display: "block",
    marginBottom: 4,
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
  },
  /** Prose field -- a phenotype term, a search box. */
  text: {
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius,
    background: colors.surface2,
    color: colors.textBody,
    fontFamily: "inherit",
    fontSize: 12,
  },
  /** Field holding variant IDs, where a monospace face keeps chr-pos-ref-alt readable. */
  mono: {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: radius,
    background: colors.surface1,
    color: colors.textBody,
    fontFamily: monoFamily,
    fontSize: 13,
  },
  /** Merged over the base while focused, in place of a `:focus` rule. */
  focused: {
    outline: "none",
    borderColor: colors.textAccent,
    background: colors.surface2,
  },
} as const satisfies Record<string, CSSProperties>;

// Both variant tables are built from these. Note that neither sets borderCollapse: the cohort
// table needs `separate` for its two stacked sticky header rows (see CohortVariantsPanel), while
// the phenotype-matched table below it uses `collapse`.
export const table = {
  base: {
    width: "100%",
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  /** Wrapper that scrolls the table under its own sticky header. */
  scroller: {
    overflow: "auto",
    scrollbarWidth: "thin",
  },
  headerCell: {
    position: "sticky",
    padding: "8px 10px",
    background: colors.surface1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 600,
    textAlign: "left",
    zIndex: 1,
  },
  bodyCell: {
    padding: "7px 10px",
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textBody,
  },
  sortable: {
    cursor: "pointer",
    userSelect: "none",
  },
  sortableHover: {
    color: colors.textAccent,
  },
  /** Fixed-width slot for the ▲/▼ glyph, so a header doesn't shift when it becomes the sort key. */
  sortIndicator: {
    display: "inline-block",
    width: 10,
    marginLeft: 2,
    fontSize: 9,
    color: colors.textAccent,
  },
  checkbox: {
    width: 14,
    height: 14,
    accentColor: colors.textAccent,
    cursor: "pointer",
  },
} as const satisfies Record<string, CSSProperties>;

/**
 * The small round swatch tying a row to its slice of a donut chart.
 *
 * A function rather than a static object because the color is the whole point and always comes
 * from the data -- the same reason Terra UI's style.ts has entries like `itemContainer(selected)`.
 */
export function colorDot(color: string, size = 7): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  };
}
