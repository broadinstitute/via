import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import type { ConditionConcept } from "../api/conditions";
import colors from "../libs/colors";
import * as Style from "../libs/style";
import Clickable from "../components/common/Clickable";
import AllOfUs from "../components/common/AllOfUs";
import Hero from "../components/Hero";
import PhenotypeStep from "../components/PhenotypeStep";
import RecentSearches from "../components/RecentSearches";
import SearchSteps from "../components/SearchSteps";
import ValueCallout from "../components/ValueCallout";
import VariantsStep from "../components/VariantsStep";
import { SearchIcon } from "../components/icons";
import Footer from "../components/results/Footer";
import TopBar from "../components/results/TopBar";
import { isSubmitShortcut, SUBMIT_SHORTCUT_LABEL } from "../utils/submitShortcut";
import {
  overLimitMessage,
  parseVariantsText,
  resultsPath,
  VARIANTS_LIMIT,
  variantEntryStatus,
} from "../utils/variants";
import { USE_CASES, type UseCase } from "../utils/useCases";

const styles = {
  // Pulled up over the hero's bottom padding so the search card overlaps the photo.
  main: {
    position: "relative",
    zIndex: 3,
    maxWidth: 900,
    margin: "-72px auto 0",
    padding: "0 20px 48px",
  },
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
  searchButton: {
    ...Style.buttons.primary,
    gap: 8,
    padding: "9px 22px",
    fontSize: 13,
    fontWeight: 700,
  },
} as const satisfies Record<string, CSSProperties>;

export default function SearchEntryPage() {
  const navigate = useNavigate();
  const [variants, setVariants] = useState("");
  const [condition, setCondition] = useState("");
  // The concept behind `condition`, when it was picked from the dropdown rather than typed.
  // Sent alongside the text so the backend counts exactly what the user chose instead of
  // re-resolving the name -- which matters for concepts the text path would skip, e.g. ones
  // with a zero participant estimate.
  const [conditionConceptId, setConditionConceptId] = useState<number | null>(null);
  // Set by an example search: its condition, shown as already picked. The phenotype field reads
  // this only when it mounts, so the key remounts it to take a new one.
  const [pickedCondition, setPickedCondition] = useState<ConditionConcept | null>(null);
  const [phenotypeKey, setPhenotypeKey] = useState(0);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  const { count: variantCount, overLimit, canSearch } = variantEntryStatus(variants, VARIANTS_LIMIT);

  function fillExample(example: UseCase) {
    setVariants(example.variants.join("\n"));
    setCondition(example.condition.name);
    setConditionConceptId(example.condition.conceptId);
    setPickedCondition(example.condition);
    setPhenotypeKey((key) => key + 1);
  }

  function handleSearch() {
    // Only a picked concept filters: text typed without picking from the list is ignored, the
    // same as leaving the field empty.
    navigate(resultsPath(parseVariantsText(variants), conditionConceptId));
  }

  return (
    <>
      <TopBar userEmail={userEmail} />
      <Hero
        title={
          <>
            <AllOfUs /> Variant Interpretation
          </>
        }
        subtitle={
          <>
            Interpret candidate variants using the full <AllOfUs /> participant cohort.
            <br />
            No coding required.
          </>
        }
      />
      <main style={styles.main}>
        <section
          style={styles.card}
          aria-label="Search"
          onKeyDown={(event) => {
            if (!isSubmitShortcut(event)) return;
            event.preventDefault();
            if (canSearch) handleSearch();
          }}
        >
          <div style={styles.cardBody}>
            <SearchSteps>
              <VariantsStep
                value={variants}
                onChange={setVariants}
                limit={VARIANTS_LIMIT}
                minHeight={180}
                appearance="plain"
                examples={USE_CASES}
                onUseExample={fillExample}
              />
              <PhenotypeStep
                key={phenotypeKey}
                id="condition"
                value={condition}
                initialSelection={pickedCondition}
                // Relies on ConditionSearchField calling onChange before onSelect when a concept
                // is picked: this clears the id for a plain edit, and the onSelect below puts it
                // back for a pick. Typed-but-unpicked text therefore carries no id, and so
                // doesn't filter the search.
                onChange={(value) => {
                  setCondition(value);
                  setConditionConceptId(null);
                }}
                onSelect={(concept) => setConditionConceptId(concept.conceptId)}
                appearance="plain"
              >
                <ValueCallout>
                  <b style={{ color: colors.textPrimary }}>Adding a phenotype unlocks more.</b> See how often
                  each variant shows up among <AllOfUs /> participants who share it.
                </ValueCallout>
              </PhenotypeStep>
            </SearchSteps>
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
                  {conditionConceptId !== null && ` · filtered by ${condition}`}
                  <span style={styles.shortcut}>{SUBMIT_SHORTCUT_LABEL} to search</span>
                </>
              )}
            </p>
            <Clickable
              style={styles.searchButton}
              hoverStyle={Style.buttons.primaryHover}
              disabledStyle={Style.buttons.disabled}
              disabled={!canSearch}
              onClick={handleSearch}
            >
              <SearchIcon size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
              Search
            </Clickable>
          </div>
        </section>

        <RecentSearches />

        <Footer style={{ marginTop: 28 }} />
      </main>
    </>
  );
}
