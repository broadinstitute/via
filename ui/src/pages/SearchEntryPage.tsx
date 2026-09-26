import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import colors from "../libs/colors";
import * as Style from "../libs/style";
import Clickable from "../components/common/Clickable";
import Hero from "../components/Hero";
import PhenotypeStep from "../components/PhenotypeStep";
import RecentSearches from "../components/RecentSearches";
import SearchSteps from "../components/SearchSteps";
import ValueCallout from "../components/ValueCallout";
import VariantsStep from "../components/VariantsStep";
import { SearchIcon } from "../components/icons";
import Footer from "../components/results/Footer";
import TopBar from "../components/results/TopBar";
import { overLimitMessage, parseVariantsText, VARIANTS_LIMIT, variantEntryStatus } from "../utils/variants";

const styles = {
  // Pulled up over the hero's bottom padding so the step panels overlap the photo.
  main: {
    position: "relative",
    zIndex: 3,
    maxWidth: 900,
    margin: "-54px auto 0",
    padding: "0 20px 48px",
  },
  error: {
    marginTop: 12,
    color: colors.textDanger,
    fontSize: 12.5,
    fontWeight: 600,
  },
  searchButton: {
    ...Style.buttons.primary,
    // Block-level, unlike the shared inline-flex default: it spans the page on its own line.
    display: "flex",
    width: "100%",
    marginTop: 20,
    padding: 13,
    fontSize: 14,
    fontWeight: 700,
    gap: 8,
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
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  const { count: variantCount, overLimit, canSearch } = variantEntryStatus(variants, VARIANTS_LIMIT);

  function handleSearch() {
    const parsedVariants = parseVariantsText(variants);
    const params = new URLSearchParams();
    for (const variant of parsedVariants) {
      params.append("variants", variant);
    }
    // Only a picked concept filters: text typed without picking from the list is ignored, the
    // same as leaving the field empty.
    if (conditionConceptId !== null) {
      params.set("conditionConceptId", String(conditionConceptId));
    }
    navigate(`/results?${params.toString()}`);
  }

  return (
    <>
      <TopBar userEmail={userEmail} />
      <Hero
        title="Variant Interpretation"
        subtitle="Rule candidate variants in or out by comparing them against All of Us's full participant cohort — no coding required."
      />
      <main style={styles.main}>
        <SearchSteps>
          <VariantsStep value={variants} onChange={setVariants} limit={VARIANTS_LIMIT} minHeight={210} />
          <PhenotypeStep
            id="condition"
            value={condition}
            // Relies on ConditionSearchField calling onChange before onSelect when a concept
            // is picked: this clears the id for a plain edit, and the onSelect below puts it
            // back for a pick. Typed-but-unpicked text therefore carries no id, and so
            // doesn't filter the search.
            onChange={(value) => {
              setCondition(value);
              setConditionConceptId(null);
            }}
            onSelect={(concept) => setConditionConceptId(concept.conceptId)}
          >
            <ValueCallout>
              <b style={{ color: colors.textPrimary }}>
                Unlock the full power of All of Us by providing a phenotype.
              </b>{" "}
              See how often each variant shows up specifically among All of Us participants who share this
              phenotype.
            </ValueCallout>
          </PhenotypeStep>
        </SearchSteps>

        {overLimit && (
          <p style={styles.error} aria-live="polite">
            {overLimitMessage(variantCount, VARIANTS_LIMIT)}
          </p>
        )}

        <Clickable
          style={styles.searchButton}
          hoverStyle={Style.buttons.primaryHover}
          disabledStyle={Style.buttons.disabled}
          disabled={!canSearch}
          onClick={handleSearch}
        >
          <SearchIcon size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          Search
        </Clickable>

        <RecentSearches />

        <Footer style={{ marginTop: 28 }} />
      </main>
    </>
  );
}
