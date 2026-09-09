import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import { fetchSearchResults, type SearchResults } from "../api/searchResults";
import CohortVariantsPanel from "../components/results/CohortVariantsPanel";
import DataSourceVersionsFooter from "../components/results/DataSourceVersionsFooter";
import ParticipantMatchedVariantsPanel from "../components/results/ParticipantMatchedVariantsPanel";
import PhenotypeFilterPanel from "../components/results/PhenotypeFilterPanel";
import SearchDrawer from "../components/results/SearchDrawer";
import SectionLoadingPanel from "../components/results/SectionLoadingPanel";
import TopBar from "../components/results/TopBar";
import { parseVariantsText } from "../utils/variants";
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
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  // Re-runs whenever the URL's search criteria change -- both the initial load (e.g. arriving
  // from SearchEntryPage with ?variants=...) and a drawer re-search (which updates the URL rather
  // than fetching directly) go through this one path.
  useEffect(() => {
    setResults(null);
    setError(null);
    fetchSearchResults({
      variants: searchParams.getAll("variants"),
      hpoTerm: searchParams.get("hpoTerm") ?? "",
    })
      .then((data) => {
        setResults(data);
        setDrawerVariants(data.searchSummary.variantsRaw);
        setDrawerHpo(data.searchSummary.hpoTerm);
      })
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

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
    const variants = parseVariantsText(drawerVariants);
    const hpoTerm = drawerHpo.trim();
    const nextParams = new URLSearchParams();
    for (const variant of variants) {
      nextParams.append("variants", variant);
    }
    if (hpoTerm) {
      nextParams.set("hpoTerm", hpoTerm);
    }
    setSearchParams(nextParams);
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
              hpoTerm={results.searchSummary.hpoTerm}
              onAddPhenotypeFilter={() => setDrawerOpen(true)}
            />
          ) : (
            <SectionLoadingPanel title="Phenotype filter" message="Loading phenotype data…" />
          )}
        </div>

        {results && revealed.filtered ? (
          <ParticipantMatchedVariantsPanel
            rows={results.filteredVariants}
            participantCount={results.phenotypeCrosswalk?.participantCount ?? 0}
            hasPhenotypeFilter={results.phenotypeCrosswalk !== null}
            hpoTerm={results.searchSummary.hpoTerm}
            onAddPhenotypeFilter={() => setDrawerOpen(true)}
          />
        ) : (
          <SectionLoadingPanel
            title="Candidate variants — phenotype-matched participants only"
            message="Loading variants…"
            minHeight={346}
          />
        )}

        <DataSourceVersionsFooter />
      </main>
    </>
  );
}
