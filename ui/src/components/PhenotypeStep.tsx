import type { ReactNode } from "react";
import type { ConditionConcept } from "../api/conditions";
import ConditionSearchField from "./ConditionSearchField";
import FieldHint from "./FieldHint";
import StepPanel from "./StepPanel";

interface PhenotypeStepProps {
  id: string;
  value: string;
  /** A concept already picked, e.g. the one the results page was searched with. */
  initialSelection?: ConditionConcept | null;
  /** Same contract as ConditionSearchField: fires before onSelect on a pick. */
  onChange: (value: string) => void;
  onSelect: (concept: ConditionConcept) => void;
  /** See StepPanel. */
  flat?: boolean;
  /** Extra content below the hint, e.g. the entry page's callout. */
  children?: ReactNode;
}

/** Step 2 of a search: the optional condition, picked from the type-ahead. */
export default function PhenotypeStep({
  id,
  value,
  initialSelection,
  onChange,
  onSelect,
  flat,
  children,
}: PhenotypeStepProps) {
  return (
    <StepPanel stepNumber={2} title="Phenotype" tags={[{ label: "Optional", variant: "optional" }]} flat={flat}>
      <ConditionSearchField
        id={id}
        value={value}
        initialSelection={initialSelection}
        onChange={onChange}
        onSelect={onSelect}
        placeholder="e.g. tetralogy of fallot"
      />
      <FieldHint>
        Start typing a condition and pick one from the list. Matched against All of Us's condition
        vocabulary.
      </FieldHint>
      {children}
    </StepPanel>
  );
}
