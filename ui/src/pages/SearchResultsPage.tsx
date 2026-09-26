import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProfile } from "../api/profile";
import { fetchSearchResults, type SearchResults } from "../api/searchResults";
import colors from "../libs/colors";
import { useMediaQuery } from "../libs/hooks";
import CohortVariantsPanel from "../components/results/CohortVariantsPanel";
import Footer from "../components/results/Footer";
import ParticipantMatchedVariantsPanel from "../components/results/ParticipantMatchedVariantsPanel";
import PhenotypeFilterPanel from "../components/results/PhenotypeFilterPanel";
import SearchDrawer from "../components/results/SearchDrawer";
import SectionLoadingPanel from "../components/results/SectionLoadingPanel";
import TopBar from "../components/results/TopBar";
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
  const [revealed, setRevealed] = useState<RevealedSections>(NOT_REVEALED);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariants, setDrawerVariants] = useState("");
  const [drawerCondition, setDrawerCondition] = useState("");
  // The concept behind drawerCondition while it's still a pick; cleared by any edit, as on the
  // entry page, so re-running only filters by a condition the user actually chose.
  const [drawerConceptId, setDrawerConceptId] = useState<number | null>(null);
  // Remounts the drawer on cancel, so its condition field goes back to showing the searched
  // concept as picked instead of re-querying the restored name.
  const [drawerKey, setDrawerKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const isNarrow = useMediaQuery(NARROW_LAYOUT_QUERY);

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
  // from SearchEntryPage with ?variants=...) and a drawer re-search (which updates the URL rather
  // than fetching directly) go through this one path.
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
      })
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsKey, conditionConceptIdKey]);

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
      />

      {results && (
        <SearchDrawer
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
      )}

      <main style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 300px",
            gap: 16,
            alignItems: "stretch",
          }}
        >
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
            title="Candidate variants — phenotype-matched participants only"
            message="Loading variants…"
            minHeight={346}
          />
        )}

        <Footer />
      </main>
    </>
  );
}
