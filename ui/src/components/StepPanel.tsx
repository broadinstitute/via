import type { CSSProperties, ReactNode } from "react";
import colors from "../libs/colors";
import * as Style from "../libs/style";

export type StepTagVariant = "limit" | "optional";

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
  number: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: colors.textAccent,
    color: colors.white,
    fontSize: 11,
    fontWeight: 700,
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
};

interface StepPanelProps {
  stepNumber: number;
  title: string;
  tag?: { label: string; variant: StepTagVariant };
  children: ReactNode;
}

export default function StepPanel({ stepNumber, title, tag, children }: StepPanelProps) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.number}>{stepNumber}</div>
        <h2 style={styles.title}>{title}</h2>
        {tag && <span style={{ ...styles.tag, ...TAG_VARIANT_STYLE[tag.variant] }}>{tag.label}</span>}
      </div>
      <div style={styles.body}>{children}</div>
    </div>
  );
}
