import type { CSSProperties } from "react";
import colors from "../libs/colors";
import * as Style from "../libs/style";
import Clickable from "./common/Clickable";
import { ChevronDownIcon } from "./icons";

// Step 2 before it's opened: one row in the search card that says what adding a phenotype gets
// you, and opens into the phenotype field on click. The optional step is visibly smaller than
// the required one above it, which is the honest hierarchy; the row's copy carries the pitch
// the field itself can't.

const styles = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    marginTop: 16,
    padding: "12px 16px",
    // Dashed: a place something could go, not a thing that's there.
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: Style.radius,
    background: colors.surface1,
    textAlign: "left",
    cursor: "pointer",
  },
  rowHover: {
    borderColor: colors.textAccent,
    background: colors.surface2,
  },
  text: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 600,
  },
  optional: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: 500,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
  },
  action: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: 600,
  },
} as const satisfies Record<string, CSSProperties>;

interface PhenotypeDisclosureProps {
  /** The id of the phenotype panel the row opens, for aria-controls. */
  controls: string;
  onOpen: () => void;
}

export default function PhenotypeDisclosure({ controls, onOpen }: PhenotypeDisclosureProps) {
  return (
    <Clickable style={styles.row} hoverStyle={styles.rowHover} aria-expanded={false} aria-controls={controls} onClick={onOpen}>
      <span style={Style.elements.stepNumber}>2</span>
      <span style={styles.text}>
        <span style={styles.title}>
          Add a phenotype
          <span style={styles.optional}>Optional</span>
        </span>
        <span style={styles.description}>
          See how often each variant shows up among participants recorded with a condition, beside the
          cohort-wide figure.
        </span>
      </span>
      <span style={styles.action}>
        Add
        <ChevronDownIcon size={12} strokeWidth={2.5} aria-hidden="true" />
      </span>
    </Clickable>
  );
}
