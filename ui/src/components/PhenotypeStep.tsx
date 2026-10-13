import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ConditionConcept } from "../api/conditions";
import colors, { alpha } from "../libs/colors";
import * as Style from "../libs/style";
import { PHENOTYPES_LIMIT } from "../utils/phenotypes";
import AllOfUs from "./common/AllOfUs";
import Clickable from "./common/Clickable";
import ConditionSearchField, { describeEstimate } from "./ConditionSearchField";
import FieldHint from "./FieldHint";
import { CloseIcon, UserIcon } from "./icons";
import StepPanel, { type StepPanelAppearance, type StepTag } from "./StepPanel";

// Step 2 of a search: the phenotypes to filter by, as a list. Each picked condition is a chip
// with its participant estimate and a remove control; the type-ahead beneath adds the next one until the
// search's limit is reached, when it gives way to a line saying so. A list even while the
// limit is one, so the form doesn't change shape when the backend takes more.

const styles = {
  picked: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    margin: "0 0 8px",
    padding: 0,
    listStyle: "none",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 4px 4px 11px",
    border: `1px solid ${alpha(colors.textAccent, 0.35)}`,
    borderRadius: 999,
    background: colors.bgAccent,
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  // The same estimate the dropdown showed for the pick, so the chip confirms what was chosen.
  chipEstimate: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    ...Style.elements.mono,
    fontSize: 11,
    fontWeight: 600,
    color: colors.textAccent,
  },
  remove: {
    ...Style.buttons.icon,
    width: 20,
    height: 20,
    borderRadius: "50%",
    color: colors.textSecondary,
  },
  removeHover: {
    background: colors.surface2,
    color: colors.textDanger,
  },
  atLimit: {
    ...Style.elements.fieldHint,
    marginTop: 0,
  },
} as const satisfies Record<string, CSSProperties>;

interface PhenotypeStepProps {
  id: string;
  /** The phenotypes picked so far, in the order they were picked. */
  picked: ConditionConcept[];
  onPick: (concept: ConditionConcept) => void;
  onRemove: (conceptId: number) => void;
  /** How many the search can take; the field hides once they're all picked. */
  limit?: number;
  /** See StepPanel. */
  appearance?: StepPanelAppearance;
  numbered?: boolean;
  /** Extra content below the hint. */
  children?: ReactNode;
}

function ChipEstimate({ estimate }: { estimate: number | null }) {
  const { label, tooltip, spoken } = describeEstimate(estimate);
  return (
    <span style={styles.chipEstimate} title={tooltip} aria-label={spoken}>
      <UserIcon size={11} strokeWidth={2.5} aria-hidden="true" />
      <span style={Style.elements.trimmedText}>{label}</span>
    </span>
  );
}

export default function PhenotypeStep({
  id,
  picked,
  onPick,
  onRemove,
  limit = PHENOTYPES_LIMIT,
  appearance,
  numbered,
  children,
}: PhenotypeStepProps) {
  // What's typed in the field: transient, cleared by a pick. Only picked concepts filter a search,
  // so text left here without picking is ignored, the same as leaving the field empty.
  const [text, setText] = useState("");
  const atLimit = picked.length >= limit;
  const tags: StepTag[] = [{ label: "Optional", variant: "optional" }];
  if (limit > 1) tags.push({ label: `limit ${limit}`, variant: "limit" });

  return (
    <StepPanel stepNumber={2} title="Phenotype" tags={tags} appearance={appearance} numbered={numbered}>
      {picked.length > 0 && (
        <ul style={styles.picked} aria-label="Picked phenotypes">
          {picked.map((concept) => (
            <li key={concept.conceptId} style={styles.chip}>
              {concept.name}
              <ChipEstimate estimate={concept.estimatedParticipantCount} />
              <Clickable
                style={styles.remove}
                hoverStyle={styles.removeHover}
                aria-label={`Remove ${concept.name}`}
                onClick={() => onRemove(concept.conceptId)}
              >
                <CloseIcon size={12} strokeWidth={2.5} aria-hidden="true" />
              </Clickable>
            </li>
          ))}
        </ul>
      )}
      {atLimit ? (
        <p style={styles.atLimit}>
          {limit === 1
            ? "Searches support one phenotype for now. Remove it to pick another."
            : `Searches support up to ${limit} phenotypes.`}
        </p>
      ) : (
        <>
          <ConditionSearchField
            id={id}
            value={text}
            onChange={setText}
            onSelect={(concept) => {
              setText("");
              if (!picked.some((other) => other.conceptId === concept.conceptId)) onPick(concept);
            }}
            placeholder={picked.length === 0 ? "e.g. tetralogy of fallot" : "Add another condition"}
          />
          <FieldHint>
            Start typing a condition and pick one from the list. Matched against the <AllOfUs /> condition
            vocabulary.
          </FieldHint>
        </>
      )}
      {children}
    </StepPanel>
  );
}
