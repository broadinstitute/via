import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import { fetchSearchResults, type SearchResults } from "../api/searchResults";
import { useMediaQuery } from "../libs/hooks";
import CohortVariantsPanel, { COHORT_TABLE_MIN_HEIGHT } from "../components/results/CohortVariantsPanel";
import Footer from "../components/results/Footer";
import ParticipantMatchedVariantsPanel, { MATCHED_TABLE_HEIGHT } from "../components/results/ParticipantMatchedVariantsPanel";
import PhenotypeFilterPanel from "../components/results/PhenotypeFilterPanel";
import { ScopeChip } from "../components/results/ResultsPanel";
import SearchPopover from "../components/results/SearchPopover";
import SearchResultsError from "../components/results/SearchResultsError";
import SectionLoadingPanel from "../components/results/SectionLoadingPanel";
import TopBar, { TOP_BAR_HEIGHT } from "../components/results/TopBar";
import { UserIcon } from "../components/icons";
import { useDataViewOptions } from "../utils/dataViewOptions";
import { recordRecentSearch } from "../utils/recentSearches";
import { parseVariantsText } from "../utils/variants";

interface RevealedSections {
  cohort: boolean;
  phenotype: boolean;
  filtered: boolean;
}

const NOT_REVEALED: RevealedSections = { cohort: false, phenotype: false, filtered: false };

// Below this the variants table and the phenotype panel no longer fit side by side, so they stack.
const NARROW_LAYOUT_QUERY = "(max-width: 900px)";

export default function SearchResultsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by the error page's "Try again", so a failed search re-runs without a URL change.
  const [attempt, setAttempt] = useState(0);
  const [revealed, setRevealed] = useState<RevealedSections>(NOT_REVEALED);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariants, setDrawerVariants] = useState("");
  const [drawerCondition, setDrawerCondition] = useState("");
  // The concept behind drawerCondition while it's still a pick; cleared by any edit, as on the
  // entry page, so re-running only filters by a condition the user actually chose.
  const [drawerConceptId, setDrawerConceptId] = useState<number | null>(null);
  // Remounts the popover on cancel, so its condition field goes back to showing the searched
  // concept as picked instead of re-querying the restored name.
  const [drawerKey, setDrawerKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const isNarrow = useMediaQuery(NARROW_LAYOUT_QUERY);
  const { showAllRows } = useDataViewOptions();

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  // Keyed on just the search criteria, not the whole URL -- other params unrelated to what to
  // fetch could otherwise end up in the URL (e.g. UI state some other component tracks there).
  // Depending on searchParams.toString() would re-run this on every such change, wiping results
  // and flashing every section's loading state for a fetch that's a cache hit anyway.
  const variantsKey = searchParams.getAll("variants").join("\n");
  const conditionConceptIdKey = searchParams.get("conditionConceptId") ?? "";

  // Re-runs whenever the URL's search criteria change -- both the initial load (e.g. arriving
  // from SearchEntryPage with ?variants=...) and an edit-search re-search (which updates the URL rather
  // than fetching directly) go through this one path -- and on a retry after a failure.
  useEffect(() => {
    setResults(null);
    setError(null);
    fetchSearchResults({
      variants: variantsKey ? variantsKey.split("\n") : [],
      conditionConceptId: conditionConceptIdKey ? Number(conditionConceptIdKey) : undefined,
    })
      .then((data) => {
        setResults(data);
        resetDrawer(data);
        // Only searches that actually loaded go into the entry page's history
        const concept = data.conditionSearch?.concept;
        recordRecentSearch({
          variants: parseVariantsText(data.searchSummary.variantsRaw),
          condition: concept ? { conceptId: concept.conceptId, name: concept.name } : null,
        });
      })
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsKey, conditionConceptIdKey, attempt]);

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

  function resetDrawer(data: SearchResults) {
    setDrawerVariants(data.searchSummary.variantsRaw);
    setDrawerCondition(data.conditionSearch?.concept?.name ?? "");
    setDrawerConceptId(data.conditionSearch?.concept?.conceptId ?? null);
    setDrawerKey((key) => key + 1);
  }

  function handleCancelDrawer() {
    if (results) {
      resetDrawer(results);
    }
    setDrawerOpen(false);
  }

  function handleRerunSearch() {
    const variants = parseVariantsText(drawerVariants);
    const nextParams = new URLSearchParams();
    for (const variant of variants) {
      nextParams.append("variants", variant);
    }
    if (drawerConceptId !== null) {
      nextParams.set("conditionConceptId", String(drawerConceptId));
    }
    setSearchParams(nextParams);
    setDrawerOpen(false);
  }

  if (error) {
    // The bar stays so the user can still get home and open settings, but without its search
    // box: there's no loaded search for the edit popover to start from.
    return (
      <>
        <TopBar userEmail={userEmail} />
        <main
          style={{
            // Fills the window below the bar so the footer sits at the bottom, as on a loaded page.
            minHeight: `calc(100vh - ${TOP_BAR_HEIGHT}px)`,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <SearchResultsError message={error} onRetry={() => setAttempt((count) => count + 1)} />
          <Footer style={{ marginTop: "auto" }} />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar
        loading={!results}
        variantsEnteredCount={results?.searchSummary.variantsEnteredCount ?? 0}
        condition={results?.conditionSearch?.concept?.name ?? ""}
        userEmail={userEmail}
        onModifySearch={() => setDrawerOpen((open) => !open)}
        modifyOpen={drawerOpen}
        editSearchPanel={
          results && (
            <SearchPopover
              key={drawerKey}
              open={drawerOpen}
              variantsText={drawerVariants}
              conditionText={drawerCondition}
              initialCondition={results.conditionSearch?.concept ?? null}
              variantsLimit={results.searchSummary.variantsLimit}
              onVariantsChange={setDrawerVariants}
              onConditionChange={(value) => {
                setDrawerCondition(value);
                setDrawerConceptId(null);
              }}
              onConditionSelect={(concept) => setDrawerConceptId(concept.conceptId)}
              onCancel={handleCancelDrawer}
              onSearch={handleRerunSearch}
            />
          )
        }
      />


      <main style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 300px",
            gap: 16,
            // Normally the two panels share a height. With every row shown, the variants table
            // can run for screens, and the phenotype panel shouldn't stretch to match.
            alignItems: showAllRows ? "start" : "stretch",
          }}
        >
          {results && revealed.cohort ? (
            <CohortVariantsPanel rows={results.cohortVariants} />
          ) : (
            <SectionLoadingPanel
              title="Candidate variants"
              scope={<ScopeChip>All participants</ScopeChip>}
              message="Loading variants…"
              minHeight={COHORT_TABLE_MIN_HEIGHT}
            />
          )}

          {results && revealed.phenotype ? (
            <PhenotypeFilterPanel
              conditionSearch={results.conditionSearch}
              ancestryBreakdown={results.ancestryBreakdown}
              ageBreakdown={results.ageBreakdown}
              onAddPhenotypeFilter={() => setDrawerOpen(true)}
            />
          ) : (
            <SectionLoadingPanel title="Phenotype filter" message="Loading phenotype data…" />
          )}
        </div>

        {results && revealed.filtered ? (
          <ParticipantMatchedVariantsPanel
            rows={results.filteredVariants}
            participantCount={results.conditionSearch?.participantCount ?? 0}
            hasPhenotypeFilter={results.ancestryBreakdown.length > 0}
            condition={
              results.conditionSearch
                ? (results.conditionSearch.concept?.name ?? `concept ${results.conditionSearch.conceptId}`)
                : ""
            }
            onAddPhenotypeFilter={() => setDrawerOpen(true)}
          />
        ) : (
          <SectionLoadingPanel
            title="Candidate variants"
            scope={
              conditionConceptIdKey ? (
                <ScopeChip tone="accent" icon={<UserIcon size={12} strokeWidth={2.5} aria-hidden="true" />} loading>
                  Loading participant count
                </ScopeChip>
              ) : (
                <ScopeChip>Phenotype-matched participants</ScopeChip>
              )
            }
            message="Loading variants…"
            minHeight={MATCHED_TABLE_HEIGHT}
          />
        )}

        <Footer />
      </main>
    </>
  );
}
