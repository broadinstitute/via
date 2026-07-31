import { useEffect, useState } from "react";
import { fetchProfile } from "../api/profile";
import { fetchSearchResults, type SearchResults } from "../api/searchResults";
import CohortVariantsPanel from "../components/results/CohortVariantsPanel";
import ParticipantMatchedVariantsPanel from "../components/results/ParticipantMatchedVariantsPanel";
import PhenotypeFilterPanel from "../components/results/PhenotypeFilterPanel";
import SearchDrawer from "../components/results/SearchDrawer";
import SectionLoadingPanel from "../components/results/SectionLoadingPanel";
import TopBar from "../components/results/TopBar";
import styles from "./SearchResultsPage.module.css";

interface RevealedSections {
  cohort: boolean;
  phenotype: boolean;
  filtered: boolean;
}

const NOT_REVEALED: RevealedSections = { cohort: false, phenotype: false, filtered: false };

export default function SearchResultsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedSections>(NOT_REVEALED);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariants, setDrawerVariants] = useState("");
  const [drawerHpo, setDrawerHpo] = useState("");

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  useEffect(() => {
    fetchSearchResults()
      .then((data) => {
        setResults(data);
        setDrawerVariants(data.searchSummary.variantsRaw);
        setDrawerHpo(data.searchSummary.hpoTerm);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  // Once data arrives, reveal each section in quick, slightly jittered succession
  // rather than all at once, so the page doesn't feel like it's snapping into place.
  useEffect(() => {
    if (!results) return;
    setRevealed(NOT_REVEALED);
    const sections: Array<keyof RevealedSections> = ["cohort", "phenotype", "filtered"];
    let delay = 0;
    const timers = sections.map((section) => {
      delay += 90 + Math.random() * 140;
      return window.setTimeout(() => {
        setRevealed((prev) => ({ ...prev, [section]: true }));
      }, delay);
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [results]);

  function handleCancelDrawer() {
    if (results) {
      setDrawerVariants(results.searchSummary.variantsRaw);
      setDrawerHpo(results.searchSummary.hpoTerm);
    }
    setDrawerOpen(false);
  }

  function handleRerunSearch() {
    // TODO: wire up to a real re-query once the backend search endpoint accepts search terms.
    console.log("Re-run search submitted", {
      variants: drawerVariants
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      hpoTerm: drawerHpo.trim(),
    });
    setDrawerOpen(false);
  }

  if (error) {
    return <p className={styles.status}>Failed to load search results: {error}</p>;
  }

  return (
    <>
      <TopBar
        loading={!results}
        variantsEnteredCount={results?.searchSummary.variantsEnteredCount ?? 0}
        hpoTerm={results?.searchSummary.hpoTerm ?? ""}
        userEmail={userEmail}
        onModifySearch={() => setDrawerOpen((open) => !open)}
      />

      {results && (
        <SearchDrawer
          open={drawerOpen}
          variantsText={drawerVariants}
          hpoText={drawerHpo}
          variantsLimit={results.searchSummary.variantsLimit}
          onVariantsChange={setDrawerVariants}
          onHpoChange={setDrawerHpo}
          onCancel={handleCancelDrawer}
          onSearch={handleRerunSearch}
        />
      )}

      <main className={styles.main}>
        <div className={styles.topRow}>
          {results && revealed.cohort ? (
            <CohortVariantsPanel rows={results.cohortVariants} />
          ) : (
            <SectionLoadingPanel
              title="Candidate variants — all participants"
              message="Loading variants…"
              minHeight={425}
            />
          )}

          {results && revealed.phenotype ? (
            <PhenotypeFilterPanel
              crosswalk={results.phenotypeCrosswalk}
              ancestryBreakdown={results.ancestryBreakdown}
              ageBreakdown={results.ageBreakdown}
            />
          ) : (
            <SectionLoadingPanel title="Phenotype filter" message="Loading phenotype data…" />
          )}
        </div>

        {results && revealed.filtered ? (
          <ParticipantMatchedVariantsPanel
            rows={results.filteredVariants}
            participantCount={results.phenotypeCrosswalk.participantCount}
          />
        ) : (
          <SectionLoadingPanel
            title="Candidate variants — phenotype-matched participants only"
            message="Loading variants…"
            minHeight={346}
          />
        )}
      </main>
    </>
  );
}
