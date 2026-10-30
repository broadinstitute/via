import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ConditionConcept, HpoTerm } from "../api/conditions";
import colors, { alpha } from "../libs/colors";
import * as Style from "../libs/style";
import { hpoTermUrl } from "../utils/externalLinks";
import { describeHpo } from "../utils/hpo";
import { PHENOTYPES_LIMIT } from "../utils/phenotypes";
import AllOfUs from "./common/AllOfUs";
import Clickable from "./common/Clickable";
import ConditionSearchField, { describeEstimate } from "./ConditionSearchField";
import FieldHint from "./FieldHint";
import { CloseIcon, ExternalLinkIcon, UserIcon } from "./icons";
import StepPanel, { type StepPanelAppearance, type StepTag } from "./StepPanel";

// Step 2 of a search: the phenotypes to filter by, as a list. Each picked condition is a chip
// with its participant estimate and a remove control, with "or" between chips, since a
// participant is matched by any of them; the type-ahead beneath adds the next one until the
// search's limit is reached, when it gives way to a line saying so.
//
// The chip is one quiet object: white, a plain border, the name in one weight, then the estimate
// as muted text behind a hairline, then the HPO id as the link out to the term, for concepts
// that pair with one. No tint, so it reads as a choice, not a badge; the only icon is the person
// beside the estimate, which says what the number counts.

/** What the step does for the search; the folded row says the same, so the step reads alike open or closed. */
export const PHENOTYPE_STEP_DESCRIPTION =
  <>
    See how often each variant shows up among <AllOfUs /> participants recorded with any of up to three conditions.
  </>;

/** The step's tags, the same on the folded row and the open step: optional, then the limit. */
export function phenotypeTags(limit: number = PHENOTYPES_LIMIT): StepTag[] {
  return [
    { label: "Optional", variant: "optional" },
    { label: `limit ${limit}`, variant: "limit", title: `A search takes up to ${limit} phenotype${limit === 1 ? "" : "s"}.` },
  ];
}

const styles = {
  picked: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    margin: "0 0 8px",
    padding: 0,
    listStyle: "none",
  },
  // A pick and, from the second on, the "or" before it: one item, so the word wraps with its chip.
  pick: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  // The semantics, said where the choice is made. Quiet: it's a conjunction, not a control.
  or: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: 500,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    height: 30,
    padding: "0 4px 0 12px",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 999,
    background: colors.surface2,
    color: colors.textBody,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  chipDivider: {
    flexShrink: 0,
    width: 1,
    height: 14,
    margin: "0 10px",
    background: colors.border,
  },
  // The same estimate the dropdown showed for the pick, so the chip confirms what was chosen,
  // with the dropdown's person icon ahead of it: "~47" on its own doesn't say what it counts.
  chipEstimate: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    ...Style.elements.mono,
    fontSize: 11.5,
    fontWeight: 500,
    color: colors.textSecondary,
  },
  chipEstimateIcon: {
    display: "block",
    flexShrink: 0,
  },
  // The HPO id the dropdown showed, now a link to the term: underlined faintly so it reads as a
  // cross-reference rather than a second label, with the term's name and the caveat on hover.
  chipHpo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    ...Style.elements.mono,
    fontSize: 11,
    fontWeight: 600,
    color: colors.textAccent,
    textDecoration: "underline",
    textDecorationColor: alpha(colors.textAccent, 0.35),
    textUnderlineOffset: 2,
  },
  remove: {
    ...Style.buttons.icon,
    width: 20,
    height: 20,
    marginLeft: 4,
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
  description?: ReactNode;
  /** Extra content below the hint. */
  children?: ReactNode;
}

function ChipEstimate({ estimate }: { estimate: number | null }) {
  const { label, tooltip, spoken } = describeEstimate(estimate);
  return (
    <span style={styles.chipEstimate} title={tooltip} aria-label={spoken}>
      <UserIcon size={11} strokeWidth={2.5} style={styles.chipEstimateIcon} aria-hidden="true" />
      {label}
    </span>
  );
}

/** The pick's HPO id as the link out to the term; "≈" ahead of it marks a nearest match. */
function ChipHpo({ hpo }: { hpo: HpoTerm }) {
  const { label, tooltip, spoken } = describeHpo(hpo, { link: true });
  return (
    <a href={hpoTermUrl(hpo.id)} target="_blank" rel="noopener noreferrer" style={styles.chipHpo} title={tooltip} aria-label={spoken}>
      {label}
      <ExternalLinkIcon size={10} aria-hidden="true" />
    </a>
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
  description,
  children,
}: PhenotypeStepProps) {
  // What's typed in the field: transient, cleared by a pick. Only picked concepts filter a search,
  // so text left here without picking is ignored, the same as leaving the field empty.
  const [text, setText] = useState("");
  const atLimit = picked.length >= limit;
  const tags = phenotypeTags(limit);

  return (
    <StepPanel
      stepNumber={2}
      title="Phenotype"
      tags={tags}
      appearance={appearance}
      numbered={numbered}
      description={description}
    >
      {picked.length > 0 && (
        <ul style={styles.picked} aria-label="Picked phenotypes">
          {picked.map((concept, index) => (
            <li key={concept.conceptId} style={styles.pick}>
              {index > 0 && <span style={styles.or}>or</span>}
              <span style={styles.chip}>
                {concept.name}
                <span style={styles.chipDivider} aria-hidden="true" />
                <ChipEstimate estimate={concept.estimatedParticipantCount} />
                {concept.hpo && (
                  <>
                    <span style={styles.chipDivider} aria-hidden="true" />
                    <ChipHpo hpo={concept.hpo} />
                  </>
                )}
                <Clickable
                  style={styles.remove}
                  hoverStyle={styles.removeHover}
                  aria-label={`Remove ${concept.name}`}
                  onClick={() => onRemove(concept.conceptId)}
                >
                  <CloseIcon size={11} strokeWidth={2.2} aria-hidden="true" />
                </Clickable>
              </span>
            </li>
          ))}
        </ul>
      )}
      {atLimit ? (
        <p style={styles.atLimit}>
          {limit === 1
            ? "You have reached the maximum of one phenotype. Remove it to pick another."
            : `You have reached the maximum of ${limit} phenotypes. Remove one to pick another.`}
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
            // A concept already picked is left out of the list, rather than picked again to no effect.
            excludeConceptIds={picked.map((concept) => concept.conceptId)}
            placeholder={picked.length === 0 ? "e.g. tetralogy of fallot" : "Add another condition"}
          />
          <FieldHint>
            {picked.length === 0 ? (
              <>
                Start typing a condition and pick one from the list, then add more if you like, up to {limit}. Matched
                against the <AllOfUs /> condition vocabulary.
              </>
            ) : (
              `Add up to ${limit - picked.length} more. A participant recorded with any of these conditions is matched.`
            )}
          </FieldHint>
        </>
      )}
      {children}
    </StepPanel>
  );
}
