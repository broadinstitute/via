import type { CSSProperties, ReactNode } from "react";
import colors from "../libs/colors";
import * as Style from "../libs/style";

export type StepTagVariant = "limit" | "optional" | "count" | "overLimit";

export interface StepTag {
  label: string;
  variant: StepTagVariant;
  /** Hover text, for a tag whose label needs explaining. */
  title?: string;
}

const styles = {
  panel: {
    ...Style.elements.panel,
    display: "flex",
    flexDirection: "column",
    boxShadow: Style.shadows.raised,
    // elements.panel clips to its rounded corners with overflow: hidden, which also clips
    // anything a child positions outside the panel -- notably the condition field's dropdown,
    // which is cut off at the panel edge with no way to scroll to the rest of it. The header
    // rounds its own top corners below, so the clipping isn't needed here.
    overflow: "visible",
  },
  header: {
    ...Style.elements.panelHeader,
    gap: 8,
    // Was inherited from the panel's overflow: hidden. Inset by the panel's 1px border so the
    // header's fill doesn't bleed past the rounded edge.
    borderTopLeftRadius: Style.panelRadius - 1,
    borderTopRightRadius: Style.panelRadius - 1,
  },
  title: {
    ...Style.elements.panelTitle,
    flex: 1,
  },
  tag: {
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: 16,
  },
  // A line under the title saying what the step does for the search, before the control. The same
  // text as the folded phenotype row's, so a step reads the same open or closed.
  description: {
    margin: "0 0 8px",
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
  },
  // The plain look: no card, just a label row over the content, for a form that already sits
  // on its own surface (the results page's edit-search popover, the entry page's search card).
  plainPanel: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  plainHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  plainTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 600,
  },
  // With its number, the plain title steps up to read as a section rather than a field label.
  plainTitleNumbered: {
    marginLeft: 2,
    fontSize: 13,
  },
  plainBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
} as const satisfies Record<string, CSSProperties>;

const TAG_VARIANT_STYLE: Record<StepTagVariant, CSSProperties> = {
  limit: {
    background: colors.surface2,
    border: `1px solid ${colors.border}`,
    color: colors.textMuted,
  },
  optional: {
    background: colors.bgAccent,
    color: colors.textAccent,
  },
  count: {
    background: colors.bgAccent,
    color: colors.textAccent,
  },
  overLimit: {
    background: colors.bgDanger,
    color: colors.textDanger,
  },
};

interface StepPanelProps {
  stepNumber: number;
  title: string;
  /** Shown at the right of the header, in order. */
  tags?: StepTag[];
  /**
   * "card" (the default) is a numbered, raised card. "plain" drops the card and the step number,
   * leaving the title and tags as a label row, for a form already on its own surface.
   */
  appearance?: StepPanelAppearance;
  /** Keeps the step number in the plain look, for steps that are the form's sections. */
  numbered?: boolean;
  /** One line under the title on what the step does for the search. */
  description?: ReactNode;
  children: ReactNode;
}

export type StepPanelAppearance = "card" | "plain";

/** A step's tag as a small uppercase chip: "0 entered", "limit 50", "Optional". */
export function StepTagBadge({ tag }: { tag: StepTag }) {
  return (
    <span style={{ ...styles.tag, ...TAG_VARIANT_STYLE[tag.variant] }} title={tag.title}>
      {tag.label}
    </span>
  );
}

export default function StepPanel({
  stepNumber,
  title,
  tags = [],
  appearance = "card",
  numbered = false,
  description,
  children,
}: StepPanelProps) {
  const plain = appearance === "plain";
  const showNumber = !plain || numbered;
  const tagBadges = tags.map((tag) => <StepTagBadge key={tag.label} tag={tag} />);

  return (
    <div style={plain ? styles.plainPanel : styles.panel}>
      <div style={plain ? styles.plainHeader : styles.header}>
        {showNumber && <div style={Style.elements.stepNumber}>{stepNumber}</div>}
        <h2 style={plain ? { ...styles.plainTitle, ...(numbered ? styles.plainTitleNumbered : undefined) } : styles.title}>
          {title}
        </h2>
        {tagBadges}
      </div>
      <div style={plain ? styles.plainBody : styles.body}>
        {description && <p style={styles.description}>{description}</p>}
        {children}
      </div>
    </div>
  );
}
