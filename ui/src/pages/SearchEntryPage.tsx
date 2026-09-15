import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import colors from "../libs/colors";
import { useFocus, useMediaQuery } from "../libs/hooks";
import * as Style from "../libs/style";
import Clickable from "../components/Clickable";
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
  comingSoon: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 11.5,
    fontStyle: "italic",
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
  const [hpoTerm, setHpoTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const isNarrow = useMediaQuery(NARROW_LAYOUT_QUERY);
  const { focused: variantsFocused, focusProps: variantsFocusProps } = useFocus();
  const { focused: hpoFocused, focusProps: hpoFocusProps } = useFocus();

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
    const trimmedHpo = hpoTerm.trim();
    if (trimmedHpo) {
      params.set("hpoTerm", trimmedHpo);
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
            <input
              type="text"
              value={hpoTerm}
              onChange={(event) => setHpoTerm(event.target.value)}
              placeholder="e.g. HP:0001636"
              style={{ ...Style.inputs.mono, ...(hpoFocused ? Style.inputs.focused : undefined) }}
              {...hpoFocusProps}
            />
            <FieldHint>Enter an HPO term (e.g. HP:0001636).</FieldHint>
            <p style={styles.comingSoon}>Free text phenotype search coming soon</p>
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
