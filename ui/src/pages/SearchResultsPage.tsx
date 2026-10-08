import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import { fetchSearchResults, type SearchResults } from "../api/searchResults";
import { describeError } from "../api/client";
import colors from "../libs/colors";
import Footer from "../components/results/Footer";
import PhenotypeSummaryStrip from "../components/results/PhenotypeSummaryStrip";
import ReviewView from "../components/results/ReviewView";
import SearchPopover from "../components/results/SearchPopover";
import SectionLoadingPanel from "../components/results/SectionLoadingPanel";
import TopBar from "../components/results/TopBar";
import VariantsPanel, { VARIANTS_TABLE_MIN_HEIGHT } from "../components/results/VariantsPanel";
import type { ResultsView } from "../components/results/ViewSwitcher";
import { recordRecentSearch } from "../utils/recentSearches";
import { parseVariantsText } from "../utils/variants";

export default function SearchResultsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Table or Review, chosen from the summary strip. Review opens on reviewVariant when a row asked
  // for it, otherwise on the best-supported signal.
  const [view, setView] = useState<ResultsView>("table");
  const [reviewVariant, setReviewVariant] = useState<string | undefined>(undefined);
  const [drawerVariants, setDrawerVariants] = useState("");
  const [drawerCondition, setDrawerCondition] = useState("");
  // The concept behind drawerCondition while it's still a pick; cleared by any edit, as on the
  // entry page, so re-running only filters by a condition the user actually chose.
  const [drawerConceptId, setDrawerConceptId] = useState<number | null>(null);
  // Remounts the popover on cancel, so its condition field goes back to showing the searched
  // concept as picked instead of re-querying the restored name.
  const [drawerKey, setDrawerKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

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
  // than fetching directly) go through this one path.
  useEffect(() => {
    setResults(null);
    setError(null);
    setView("table");
    setReviewVariant(undefined);
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
      .catch((err: unknown) => setError(describeError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsKey, conditionConceptIdKey]);

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

  // One rule for "there are matched participants to compare with": it shows the table's matched
  // columns, enables Review in the strip, and offers each row's Review button.
  const hasPhenotypeFilter = (results?.ancestryBreakdown.length ?? 0) > 0;
  const conditionName = results?.conditionSearch
    ? (results.conditionSearch.concept?.name ?? `concept ${results.conditionSearch.conceptId}`)
    : "";

  function openReview(variant?: string) {
    setReviewVariant(variant);
    setView("review");
  }

  if (error) {
    return (
      <p style={{ padding: "32px 20px", textAlign: "center", color: colors.textSecondary, fontSize: 13 }}>
        Failed to load search results: {error}
      </p>
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
        <PhenotypeSummaryStrip
          loading={!results}
          conditionSearch={results?.conditionSearch}
          ancestryBreakdown={results?.ancestryBreakdown ?? []}
          ageBreakdown={results?.ageBreakdown ?? []}
          onAddPhenotypeFilter={() => setDrawerOpen(true)}
          view={view}
          onViewChange={(next) => (next === "review" ? openReview() : setView("table"))}
          canReview={hasPhenotypeFilter}
        />

        {view === "review" && results?.conditionSearch && hasPhenotypeFilter ? (
          <ReviewView
            initialVariant={reviewVariant}
            cohortVariants={results.cohortVariants}
            filteredVariants={results.filteredVariants}
            condition={conditionName}
            participantCount={results.conditionSearch.participantCount ?? 0}
            ancestryBreakdown={results.ancestryBreakdown}
          />
        ) : (
          <>
            {results ? (
              <VariantsPanel
                cohortVariants={results.cohortVariants}
                filteredVariants={results.filteredVariants}
                hasPhenotypeFilter={hasPhenotypeFilter}
                participantCount={results.conditionSearch?.participantCount ?? 0}
                condition={conditionName}
                onReview={hasPhenotypeFilter ? openReview : undefined}
                onAddPhenotypeFilter={() => setDrawerOpen(true)}
              />
            ) : (
              <SectionLoadingPanel
                title="Candidate variants"
                message="Loading variants…"
                minHeight={VARIANTS_TABLE_MIN_HEIGHT}
              />
            )}
          </>
        )}

        <Footer />
      </main>
    </>
  );
}
