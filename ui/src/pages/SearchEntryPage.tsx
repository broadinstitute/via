import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import FieldHint from "../components/FieldHint";
import Hero from "../components/Hero";
import RecentSearches from "../components/RecentSearches";
import StepPanel from "../components/StepPanel";
import ValueCallout from "../components/ValueCallout";
import TopBar from "../components/results/TopBar";
import styles from "./SearchEntryPage.module.css";

export default function SearchEntryPage() {
  const navigate = useNavigate();
  const [variants, setVariants] = useState("");
  const [hpoTerm, setHpoTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  function handleSearch() {
    const trimmedVariants = variants.trim();
    if (!trimmedVariants) {
      setError("Please enter at least one candidate variant.");
      return;
    }
    setError(null);
    // The results page still shows illustrative mock data until a real search
    // endpoint exists to run this query against.
    navigate("/results");
  }

  return (
    <>
      <TopBar userEmail={userEmail} />
      <Hero
        title="Variant Interpretation"
        subtitle="Rule candidate variants in or out by comparing them against All of Us's full participant cohort — no coding required."
      />
      <main className={styles.main}>
        <div className={styles.stepsRow}>
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
            <ValueCallout>
              <b>Unlock the full power of All of Us by providing a phenotype.</b> See how often each variant shows
              up specifically among All of Us participants who share this phenotype.
            </ValueCallout>
          </StepPanel>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.searchBtn} onClick={handleSearch}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Search
        </button>

        <RecentSearches />
      </main>
    </>
  );
}
