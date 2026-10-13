import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import type { ConditionConcept } from "../api/conditions";
import colors from "../libs/colors";
import * as Style from "../libs/style";
import Clickable from "../components/common/Clickable";
import AllOfUs from "../components/common/AllOfUs";
import Hero from "../components/Hero";
import PhenotypeDisclosure from "../components/PhenotypeDisclosure";
import PhenotypeStep from "../components/PhenotypeStep";
import RecentSearches from "../components/RecentSearches";
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
import { describePhenotypes, searchConceptId } from "../utils/phenotypes";
import { USE_CASES, type UseCase } from "../utils/useCases";

const PHENOTYPE_PANEL_ID = "phenotype-step";
const CONDITION_FIELD_ID = "condition";

// The form in the order it's filled: the variants box across the whole card, with the example
// searches a link beneath it while it's empty, then the phenotype as a row that opens into its field.
// The required step is the big one and the optional step is small until it's wanted, and the
// page starts with the form rather than a banner.
const styles = {
  main: {
    maxWidth: 860,
    margin: "20px auto 0",
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
  // The opened phenotype step, boxed so it reads as the row it replaced grown into a section.
  phenotype: {
    marginTop: 16,
    padding: "14px 16px",
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
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
  // The phenotypes picked from the dropdown, as concepts rather than names, so the backend counts
  // exactly what the user chose instead of re-resolving a name -- which matters for concepts a
  // text path would skip, e.g. ones with a zero participant estimate.
  const [phenotypes, setPhenotypes] = useState<ConditionConcept[]>([]);
  // The phenotype step starts folded to a row; it opens when asked for, or when an example
  // brings a condition with it. Opened by the row, the field takes focus so typing can start.
  const [phenotypeOpen, setPhenotypeOpen] = useState(false);
  const focusConditionOnOpen = useRef(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  useEffect(() => {
    if (!phenotypeOpen || !focusConditionOnOpen.current) return;
    focusConditionOnOpen.current = false;
    document.getElementById(CONDITION_FIELD_ID)?.focus();
  }, [phenotypeOpen]);

  const { count: variantCount, overLimit, canSearch } = variantEntryStatus(variants, VARIANTS_LIMIT);

  function openPhenotype() {
    focusConditionOnOpen.current = true;
    setPhenotypeOpen(true);
  }

  function fillExample(example: UseCase) {
    setVariants(example.variants.join("\n"));
    setPhenotypes([example.condition]);
    setPhenotypeOpen(true);
  }

  function handleSearch() {
    navigate(resultsPath(parseVariantsText(variants), searchConceptId(phenotypes)));
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
            Enter a list of candidate variants and see how often each appears across the <AllOfUs /> cohort. Add a
            phenotype to compare the participants who share it.
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
            <VariantsStep
              value={variants}
              onChange={setVariants}
              limit={VARIANTS_LIMIT}
              minHeight={160}
              appearance="plain"
              numbered
              examples={USE_CASES}
              onUseExample={fillExample}
            />
            {phenotypeOpen ? (
              <div id={PHENOTYPE_PANEL_ID} style={styles.phenotype}>
                <PhenotypeStep
                  id={CONDITION_FIELD_ID}
                  picked={phenotypes}
                  onPick={(concept) => setPhenotypes((current) => [...current, concept])}
                  onRemove={(conceptId) =>
                    setPhenotypes((current) => current.filter((concept) => concept.conceptId !== conceptId))
                  }
                  appearance="plain"
                  numbered
                />
              </div>
            ) : (
              <PhenotypeDisclosure controls={PHENOTYPE_PANEL_ID} onOpen={openPhenotype} />
            )}
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
                  {phenotypes.length > 0 && ` · filtered by ${describePhenotypes(phenotypes)}`}
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
