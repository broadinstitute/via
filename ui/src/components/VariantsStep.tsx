import type { CSSProperties } from "react";
import colors from "../libs/colors";
import { useFocus, useHover } from "../libs/hooks";
import * as Style from "../libs/style";
import { variantEntryStatus } from "../utils/variants";
import FieldHint from "./FieldHint";
import StepPanel, { type StepPanelAppearance, type StepTag } from "./StepPanel";

const styles = {
  input: {
    ...Style.inputs.mono,
    // Grows to fill the card, but from its own height (flexBasis auto), not from 0 as `flex: 1`
    // would: a zero basis overrides `height`, so dragging the resize handle -- which sets
    // `height` -- did nothing. flexShrink 0 so the dragged height isn't squeezed back either.
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: "auto",
    lineHeight: 1.6,
    resize: "vertical",
  },
  hintRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  exampleLink: {
    flexShrink: 0,
    padding: 0,
    border: "none",
    background: "none",
    color: colors.textAccent,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  exampleLinkHover: {
    textDecoration: "underline",
  },
} as const satisfies Record<string, CSSProperties>;

/** How many are entered (red past the limit), then the limit itself. */
function countTags(count: number, limit: number): StepTag[] {
  const overLimit = count > limit;
  return [
    {
      label: `${count} entered`,
      variant: overLimit ? "overLimit" : "count",
      title: overLimit ? `Search is limited to ${limit} variants.` : "Variants entered, one per line.",
    },
    { label: `limit ${limit}`, variant: "limit" },
  ];
}

interface VariantsStepProps {
  value: string;
  onChange: (value: string) => void;
  limit: number;
  /** The textarea's starting height; it can still be resized taller. */
  minHeight: number;
  /** See StepPanel. */
  appearance?: StepPanelAppearance;
  /** Shows a "Try an example" link while the field is empty. */
  onUseExample?: () => void;
}

/** Step 1 of a search: the candidate-variants textarea, with its count and limit. */
export default function VariantsStep({
  value,
  onChange,
  limit,
  minHeight,
  appearance,
  onUseExample,
}: VariantsStepProps) {
  const { focused, focusProps } = useFocus();
  const { hovered: exampleHovered, hoverProps: exampleHoverProps } = useHover();
  const { count } = variantEntryStatus(value, limit);

  return (
    <StepPanel stepNumber={1} title="Candidate variants" tags={countTags(count, limit)} appearance={appearance}>
      <textarea
        aria-label="Candidate variants"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"8-11708582-C-T\n8-11708590-G-GAA\n8-11708598-T-C"}
        style={{ ...styles.input, minHeight, ...(focused ? Style.inputs.focused : undefined) }}
        {...focusProps}
      />
      <div style={styles.hintRow}>
        {/* Short enough to share a line with "Try an example"; the placeholder shows the format. */}
        <FieldHint>One variant per line, as chr-pos-ref-alt.</FieldHint>
        {onUseExample && !value.trim() && (
          <button
            type="button"
            style={{ ...styles.exampleLink, ...(exampleHovered ? styles.exampleLinkHover : undefined) }}
            onClick={onUseExample}
            {...exampleHoverProps}
          >
            Try an example
          </button>
        )}
      </div>
    </StepPanel>
  );
}
