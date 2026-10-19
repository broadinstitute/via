import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchSearchResults, type SearchResults } from "../api/searchResults";
import { describeError } from "../api/client";
import colors from "../libs/colors";
import * as Style from "../libs/style";
import Clickable from "../components/common/Clickable";
import { StarIcon } from "../components/icons";
import Footer from "../components/results/Footer";
import PhenotypeSummaryStrip from "../components/results/PhenotypeSummaryStrip";
import ReviewView from "../components/results/ReviewView";
import SearchBox from "../components/results/SearchBox";
import SearchPopover from "../components/results/SearchPopover";
import SectionLoadingPanel from "../components/results/SectionLoadingPanel";
import VariantsPanel, { VARIANTS_TABLE_MIN_HEIGHT } from "../components/results/VariantsPanel";
import type { ResultsView } from "../components/results/ViewSwitcher";
import SaveSearchDialog from "../components/shell/SaveSearchDialog";
import { useShell } from "../components/shell/ShellContext";
import TopBar from "../components/shell/TopBar";
import type { ConditionConcept } from "../api/conditions";
import { searchConceptIds } from "../utils/phenotypes";
import { recordRecentSearch } from "../utils/recentSearches";
import { recordSavedSearchRun, useSavedSearch } from "../utils/savedSearches";
import { parseVariantsText } from "../utils/variants";

/** The URL parameter naming the saved search a results page was run from, so the run is logged to it. */
export const SAVED_PARAM = "saved";

export default function SearchResultsPage() {
  const { requestCompactRail } = useShell();
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Table or Review, chosen from the summary strip. Review opens on reviewVariant when a row asked
  // for it, otherwise on the best-supported signal.
  const [view, setView] = useState<ResultsView>("table");
  const [reviewVariant, setReviewVariant] = useState<string | undefined>(undefined);
  const [drawerVariants, setDrawerVariants] = useState("");
  // The phenotypes the search was run with, as the drawer's starting point; only picked
  // concepts are ever here, so re-running filters by exactly what the user chose.
  const [drawerPhenotypes, setDrawerPhenotypes] = useState<ConditionConcept[]>([]);
  // Remounts the popover on cancel, so anything typed into its condition field is dropped
  // along with the rest of the edit.
  const [drawerKey, setDrawerKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const savedId = searchParams.get(SAVED_PARAM) ?? undefined;
  const savedSearch = useSavedSearch(savedId);

  // Keyed on just the search criteria, not the whole URL -- other params unrelated to what to
  // fetch could otherwise end up in the URL (e.g. UI state some other component tracks there).
  // Depending on searchParams.toString() would re-run this on every such change, wiping results
  // and flashing every section's loading state for a fetch that's a cache hit anyway.
  const variantsKey = searchParams.getAll("variants").join("\n");
  const conditionConceptIdsKey = searchParams.getAll("conditionConceptIds").join("\n");

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
      conditionConceptIds: conditionConceptIdsKey ? conditionConceptIdsKey.split("\n").map(Number) : undefined,
    })
      .then((data) => {
        setResults(data);
        resetDrawer(data);
        // Only searches that actually loaded go into the rail's history, and only the concepts
        // that resolved: an id the CDR doesn't have isn't worth re-running.
        recordRecentSearch({
          variants: parseVariantsText(data.searchSummary.variantsRaw),
          conditions: (data.conditionSearch?.concepts ?? []).map(({ conceptId, name }) => ({ conceptId, name })),
        });
        // A saved search keeps a log of its runs with the matched count, so a change between
        // releases shows on its page.
        if (savedId) recordSavedSearchRun(savedId, data.conditionSearch?.participantCount ?? null);
      })
      .catch((err: unknown) => setError(describeError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsKey, conditionConceptIdsKey]);

  // Review has a left rail of its own; two rails side by side read badly, so the app rail folds
  // while Review is showing.
  useEffect(() => {
    requestCompactRail(view === "review");
    return () => requestCompactRail(false);
  }, [view, requestCompactRail]);

  function resetDrawer(data: SearchResults) {
    setDrawerVariants(data.searchSummary.variantsRaw);
    setDrawerPhenotypes(data.conditionSearch?.concepts ?? []);
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
    for (const conceptId of searchConceptIds(drawerPhenotypes)) {
      nextParams.append("conditionConceptIds", String(conceptId));
    }
    // An edited search is a different search from the saved one it started as.
    setSearchParams(nextParams);
    setDrawerOpen(false);
  }

  // One rule for "there are matched participants to compare with": it shows the table's matched
  // columns, enables Review in the strip, and offers each row's Review button.
  const hasPhenotypeFilter = (results?.ancestryBreakdown.length ?? 0) > 0;
  // The resolved conditions' names, for every line that says who the matched participants are.
  // Empty when no phenotype was picked, and when none of the picked ids was found.
  const phenotypeNames = (results?.conditionSearch?.concepts ?? []).map((concept) => concept.name);

  function openReview(variant?: string) {
    setReviewVariant(variant);
    setView("review");
  }

  if (error) {
    return (
      <>
        <TopBar title="Results" />
        <p style={{ padding: "32px 20px", textAlign: "center", color: colors.textSecondary, fontSize: 13 }}>
          Failed to load search results: {error}
        </p>
      </>
    );
  }

  return (
    <>
      <TopBar
        actions={
          savedSearch ? (
            <Link
              to={`/saved/${savedSearch.id}`}
              style={{ ...Style.buttons.accent, textDecoration: "none" }}
              title="Open the saved search"
            >
              <StarIcon size={13} filled strokeWidth={1.5} aria-hidden="true" />
              {savedSearch.name}
            </Link>
          ) : (
            <Clickable
              style={Style.buttons.accent}
              hoverStyle={Style.buttons.accentHover}
              disabledStyle={Style.buttons.disabled}
              disabled={!results}
              onClick={() => setSaving(true)}
              aria-haspopup="dialog"
            >
              <StarIcon size={13} strokeWidth={2.2} aria-hidden="true" />
              Save search
            </Clickable>
          )
        }
      >
        <SearchBox
          loading={!results}
          variantsEnteredCount={results?.searchSummary.variantsEnteredCount ?? 0}
          phenotypes={phenotypeNames}
          onModifySearch={() => setDrawerOpen((open) => !open)}
          modifyOpen={drawerOpen}
          editSearchPanel={
            results && (
              <SearchPopover
                key={drawerKey}
                open={drawerOpen}
                variantsText={drawerVariants}
                phenotypes={drawerPhenotypes}
                variantsLimit={results.searchSummary.variantsLimit}
                onVariantsChange={setDrawerVariants}
                onPhenotypesChange={setDrawerPhenotypes}
                onCancel={handleCancelDrawer}
                onSearch={handleRerunSearch}
              />
            )
          }
        />
      </TopBar>

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
            phenotypes={phenotypeNames}
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
                phenotypes={phenotypeNames}
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
      {saving && results && (
        <SaveSearchDialog
          variants={parseVariantsText(results.searchSummary.variantsRaw)}
          phenotypes={results.conditionSearch?.concepts ?? []}
          onClose={() => setSaving(false)}
          onSaved={(search) => {
            setSaving(false);
            // The page becomes that saved search's results, so the bar names it and its runs log this one.
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set(SAVED_PARAM, search.id);
            setSearchParams(nextParams, { replace: true });
            recordSavedSearchRun(search.id, results.conditionSearch?.participantCount ?? null);
          }}
        />
      )}
    </>
  );
}
