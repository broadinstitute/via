import type { CSSProperties } from "react";
import { useFocus } from "../libs/hooks";
import * as Style from "../libs/style";
import { variantEntryStatus } from "../utils/variants";
import FieldHint from "./FieldHint";
import StepPanel, { type StepTag } from "./StepPanel";

const styles = {
  input: {
    ...Style.inputs.mono,
    flex: 1,
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
  flat?: boolean;
}

/** Step 1 of a search: the candidate-variants textarea, with its count and limit. */
export default function VariantsStep({ value, onChange, limit, minHeight, flat }: VariantsStepProps) {
  const { focused, focusProps } = useFocus();
  const { count } = variantEntryStatus(value, limit);

  return (
    <StepPanel stepNumber={1} title="Candidate variants" tags={countTags(count, limit)} flat={flat}>
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
