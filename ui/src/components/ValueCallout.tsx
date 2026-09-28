import type { CSSProperties, ReactNode } from "react";
import colors, { alpha } from "../libs/colors";
import { LightbulbIcon } from "./icons";

const styles = {
  callout: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: "10px 12px",
    // A soft tint rather than a bordered box: a tip beside the field, not a warning.
    background: alpha(colors.bgAccent, 0.45),
    borderRadius: 8,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 1.55,
  },
  // Nudged down to sit on the first line of text rather than its box.
  icon: {
    flexShrink: 0,
    marginTop: 2,
    color: colors.textAccent,
  },
} as const satisfies Record<string, CSSProperties>;

interface ValueCalloutProps {
  children: ReactNode;
}

export default function ValueCallout({ children }: ValueCalloutProps) {
  return (
    <div style={styles.callout}>
      <LightbulbIcon size={16} aria-hidden="true" style={styles.icon} />
      <span>{children}</span>
    </div>
  );
}
