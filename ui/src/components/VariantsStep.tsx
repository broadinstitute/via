import type { CSSProperties } from "react";
import { useFocus } from "../libs/hooks";
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
}

/** Step 1 of a search: the candidate-variants textarea, with its count and limit. */
export default function VariantsStep({ value, onChange, limit, minHeight, appearance }: VariantsStepProps) {
  const { focused, focusProps } = useFocus();
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
      <FieldHint>One variant per line, entered as chr-pos-ref-alt (e.g. 8-11708582-C-T).</FieldHint>
    </StepPanel>
  );
}
