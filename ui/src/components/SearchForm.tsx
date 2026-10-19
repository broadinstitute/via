import type { CSSProperties, ReactNode } from "react";
import type { ConditionConcept } from "../api/conditions";
import colors from "../libs/colors";
import * as Style from "../libs/style";
import { isSubmitShortcut, SUBMIT_SHORTCUT_LABEL } from "../utils/submitShortcut";
import { describeAlternatives } from "../utils/phenotypes";
import { USE_CASES, type UseCase } from "../utils/useCases";
import { overLimitMessage, VARIANTS_LIMIT, variantEntryStatus } from "../utils/variants";
import AllOfUs from "./common/AllOfUs";
import Clickable from "./common/Clickable";
import { SearchIcon } from "./icons";
import PhenotypeStep, { PHENOTYPE_STEP_DESCRIPTION } from "./PhenotypeStep";
import VariantsStep from "./VariantsStep";

const CONDITION_FIELD_ID = "condition";

// The form in the order it's filled: the variants box across the whole card, with the example
// searches a link beneath it while it's empty, then the phenotype step, open from the start --
// nearly every search adds one, so it isn't folded behind a click. Each step says in a line what
// it does for the search.
const styles = {
  // Both steps in one card, so the page reads as a single search form with one action.
  card: {
    ...Style.elements.panel,
    // elements.panel clips with overflow: hidden, which would cut off the condition field's
    // dropdown at the card's edge. The footer rounds its own bottom corners instead.
    overflow: "visible",
    boxShadow: Style.shadows.raised,
  },
  cardBody: {
    padding: "20px 20px 18px",
  },
  // A later step, divided from the one before by a hairline: the steps sit bare in the card, which
  // is the one container the form needs. A box around either would nest it inside the other.
  step: {
    marginTop: 18,
    paddingTop: 18,
    borderTop: `1px solid ${colors.border}`,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    padding: "12px 20px",
    background: colors.surface1,
    borderTop: `1px solid ${colors.border}`,
    // Inset by the card's 1px border, like StepPanel's header.
    borderBottomLeftRadius: Style.panelRadius - 1,
    borderBottomRightRadius: Style.panelRadius - 1,
  },
  status: {
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  statusReady: {
    color: colors.textPrimary,
    fontWeight: 600,
  },
  statusError: {
    color: colors.textDanger,
    fontWeight: 600,
  },
  shortcut: {
    marginLeft: 8,
    color: colors.textMuted,
    fontSize: 11.5,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  searchButton: {
    ...Style.buttons.primary,
    gap: 8,
    padding: "9px 22px",
    fontSize: 13,
    fontWeight: 700,
  },
} as const satisfies Record<string, CSSProperties>;

export interface SearchFormProps {
  variants: string;
  onVariantsChange: (value: string) => void;
  phenotypes: ConditionConcept[];
  onPhenotypesChange: (phenotypes: ConditionConcept[]) => void;
  /** Runs the search. Only called while there's something valid to search. */
  onSearch: () => void;
  /** What the primary button says; "Search" unless a saved search is being re-run. */
  searchLabel?: string;
  /** Offers the example searches under an empty variants box. */
  withExamples?: boolean;
  /** Buttons beside the primary one, e.g. Save as…. */
  secondaryActions?: ReactNode;
  /** Another section between the phenotype step and the footer, e.g. a saved search's notes. */
  children?: ReactNode;
}

/**
 * The search form: the two steps in one card with the status line and the Search button in its
 * footer. The entry page and a saved search's page both render it; the results page's edit popover
 * composes the same steps its own way.
 */
export default function SearchForm({
  variants,
  onVariantsChange,
  phenotypes,
  onPhenotypesChange,
  onSearch,
  searchLabel = "Search",
  withExamples = false,
  secondaryActions,
  children,
}: SearchFormProps) {
  const { count: variantCount, overLimit, canSearch } = variantEntryStatus(variants, VARIANTS_LIMIT);

  function fillExample(example: UseCase) {
    onVariantsChange(example.variants.join("\n"));
    onPhenotypesChange([example.condition]);
  }

  return (
    <section
      style={styles.card}
      aria-label="Search"
      onKeyDown={(event) => {
        if (!isSubmitShortcut(event)) return;
        event.preventDefault();
        if (canSearch) onSearch();
      }}
    >
      <div style={styles.cardBody}>
        <VariantsStep
          value={variants}
          onChange={onVariantsChange}
          limit={VARIANTS_LIMIT}
          minHeight={160}
          appearance="plain"
          numbered
          description={
            <>
              Enter the variants you're interpreting. Each is looked up across the entire <AllOfUs /> cohort.
            </>
          }
          examples={withExamples ? USE_CASES : []}
          onUseExample={withExamples ? fillExample : undefined}
        />
        <div style={styles.step}>
          <PhenotypeStep
            id={CONDITION_FIELD_ID}
            picked={phenotypes}
            onPick={(concept) => onPhenotypesChange([...phenotypes, concept])}
            onRemove={(conceptId) => onPhenotypesChange(phenotypes.filter((concept) => concept.conceptId !== conceptId))}
            appearance="plain"
            numbered
            description={PHENOTYPE_STEP_DESCRIPTION}
          />
        </div>
        {children !== undefined && <div style={styles.step}>{children}</div>}
      </div>

      <div style={styles.cardFooter}>
        {/* Says why Search is disabled, since the disabled button itself takes no pointer events. */}
        <p style={styles.status} aria-live="polite">
          {overLimit ? (
            <span style={styles.statusError}>{overLimitMessage(variantCount, VARIANTS_LIMIT)}</span>
          ) : variantCount === 0 ? (
            "Enter at least one variant to search."
          ) : (
            <>
              <span style={styles.statusReady}>
                {variantCount} variant{variantCount === 1 ? "" : "s"} ready
              </span>
              {phenotypes.length > 0 && ` · filtered by ${describeAlternatives(phenotypes.map((phenotype) => phenotype.name))}`}
              <span style={styles.shortcut}>{SUBMIT_SHORTCUT_LABEL} to search</span>
            </>
          )}
        </p>
        <div style={styles.actions}>
          {secondaryActions}
          <Clickable
            style={styles.searchButton}
            hoverStyle={Style.buttons.primaryHover}
            disabledStyle={Style.buttons.disabled}
            disabled={!canSearch}
            onClick={onSearch}
          >
            <SearchIcon size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
            {searchLabel}
          </Clickable>
        </div>
      </div>
    </section>
  );
}
