import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import FieldHint from "../components/FieldHint";
import { SearchIcon } from "../components/icons";
import Hero from "../components/Hero";
import RecentSearches from "../components/RecentSearches";
import StepPanel from "../components/StepPanel";
import ValueCallout from "../components/ValueCallout";
import TopBar from "../components/results/TopBar";
import { parseVariantsText } from "../utils/variants";

// .stepsRow used to collapse to one column via "@media (max-width: 720px)" in CSS; inline
// styles can't express media queries, so this mirrors it in JS the same way SearchResultsPage's
// .topRow breakpoint does.
const NARROW_LAYOUT_QUERY = "(max-width: 720px)";

export default function SearchEntryPage() {
  const navigate = useNavigate();
  const [variants, setVariants] = useState("");
  const [hpoTerm, setHpoTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(NARROW_LAYOUT_QUERY).matches,
  );
  // Inline styles can't express ":hover" either, so the search button's hover color is tracked
  // as state instead.
  const [searchBtnHovered, setSearchBtnHovered] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(NARROW_LAYOUT_QUERY);
    const handleChange = () => setIsNarrow(query.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

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
      <main style={{ maxWidth: 900, margin: "-54px auto 0", padding: "0 20px 48px", position: "relative", zIndex: 3 }}>
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
            />
            <FieldHint>One variant per line, entered as chr-pos-ref-alt (e.g. 8-11708582-C-T).</FieldHint>
          </StepPanel>

          <StepPanel stepNumber={2} title="Phenotype" tag={{ label: "Optional", variant: "optional" }}>
            <input
              type="text"
              value={hpoTerm}
              onChange={(event) => setHpoTerm(event.target.value)}
              placeholder="e.g. HP:0001636"
            />
            <FieldHint>Enter an HPO term (e.g. HP:0001636).</FieldHint>
            <p style={{ marginTop: 4, fontSize: 11.5, fontStyle: "italic", color: "var(--text-muted)" }}>
              Free text phenotype search coming soon
            </p>
            <ValueCallout>
              <b>Unlock the full power of All of Us by providing a phenotype.</b> See how often each variant shows
              up specifically among All of Us participants who share this phenotype.
            </ValueCallout>
          </StepPanel>
        </div>

        {error && (
          <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--text-danger)", fontWeight: 600 }} role="alert">
            {error}
          </p>
        )}

        <button
          onClick={handleSearch}
          onMouseEnter={() => setSearchBtnHovered(true)}
          onMouseLeave={() => setSearchBtnHovered(false)}
          style={{
            width: "100%",
            background: searchBtnHovered ? "var(--accent-orange-hover)" : "var(--accent-orange)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius)",
            padding: 13,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <SearchIcon size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          Search
        </button>

        <RecentSearches />
      </main>
    </>
  );
}
