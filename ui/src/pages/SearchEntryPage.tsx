import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import colors from "../libs/colors";
import { useFocus, useMediaQuery } from "../libs/hooks";
import * as Style from "../libs/style";
import Clickable from "../components/common/Clickable";
import ConditionSearchField from "../components/ConditionSearchField";
import FieldHint from "../components/FieldHint";
import Hero from "../components/Hero";
import RecentSearches from "../components/RecentSearches";
import StepPanel from "../components/StepPanel";
import ValueCallout from "../components/ValueCallout";
import { SearchIcon } from "../components/icons";
import TopBar from "../components/results/TopBar";
import { parseVariantsText } from "../utils/variants";

// Below this the two step panels no longer fit side by side, so they stack.
const NARROW_LAYOUT_QUERY = "(max-width: 720px)";

const styles = {
  // Pulled up over the hero's bottom padding so the step panels overlap the photo.
  main: {
    position: "relative",
    zIndex: 3,
    maxWidth: 900,
    margin: "-54px auto 0",
    padding: "0 20px 48px",
  },
  variantsInput: {
    ...Style.inputs.mono,
    flex: 1,
    minHeight: 210,
    lineHeight: 1.6,
    resize: "vertical",
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
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const isNarrow = useMediaQuery(NARROW_LAYOUT_QUERY);
  const { focused: variantsFocused, focusProps: variantsFocusProps } = useFocus();

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  function handleSearch() {
    const parsedVariants = parseVariantsText(variants);
    if (parsedVariants.length === 0) {
      setError("Please enter at least one candidate variant.");
      return;
    }
    setError(null);
    const params = new URLSearchParams();
    for (const variant of parsedVariants) {
      params.append("variants", variant);
    }
    const trimmedCondition = condition.trim();
    if (trimmedCondition) {
      params.set("condition", trimmedCondition);
    }
    if (conditionConceptId !== null) {
      params.set("conditionConceptIds", String(conditionConceptId));
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          <StepPanel stepNumber={1} title="Candidate variants" tag={{ label: "limit 50", variant: "limit" }}>
            <textarea
              value={variants}
              onChange={(event) => setVariants(event.target.value)}
              placeholder={"8-11708582-C-T\n8-11708590-G-GAA\n8-11708598-T-C"}
              style={{ ...styles.variantsInput, ...(variantsFocused ? Style.inputs.focused : undefined) }}
              {...variantsFocusProps}
            />
            <FieldHint>One variant per line, entered as chr-pos-ref-alt (e.g. 8-11708582-C-T).</FieldHint>
          </StepPanel>

          <StepPanel stepNumber={2} title="Phenotype" tag={{ label: "Optional", variant: "optional" }}>
            <ConditionSearchField
              id="condition"
              value={condition}
              // Relies on ConditionSearchField calling onChange before onSelect when a concept
              // is picked: this clears the id for a plain edit, and the onSelect below puts it
              // back for a pick. Typed-but-unpicked text therefore carries no id, which is
              // what makes the backend fall back to searching the text.
              onChange={(value) => {
                setCondition(value);
                setConditionConceptId(null);
              }}
              onSelect={(concept) => setConditionConceptId(concept.conceptId)}
              placeholder="e.g. tetralogy of fallot"
            />
            <FieldHint>
              Start typing a condition and pick one from the list. Matched against All of Us's
              condition vocabulary.
            </FieldHint>
            <ValueCallout>
              <b style={{ color: colors.textPrimary }}>
                Unlock the full power of All of Us by providing a phenotype.
              </b>{" "}
              See how often each variant shows up specifically among All of Us participants who share this
              phenotype.
            </ValueCallout>
          </StepPanel>
        </div>

        {error && (
          <p style={styles.error} role="alert">
            {error}
          </p>
        )}

        <Clickable
          style={styles.searchButton}
          hoverStyle={Style.buttons.primaryHover}
          onClick={handleSearch}
        >
          <SearchIcon size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          Search
        </Clickable>

        <RecentSearches />
      </main>
    </>
  );
}
