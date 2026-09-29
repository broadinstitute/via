package org.broadinstitute.variantinterpretation.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.broadinstitute.variantinterpretation.datasource.ConditionLookupService;
import org.broadinstitute.variantinterpretation.datasource.MockPhenotypeData;
import org.broadinstitute.variantinterpretation.datasource.PhenotypeFixtures;
import org.broadinstitute.variantinterpretation.datasource.VatLookupService;
import org.broadinstitute.variantinterpretation.api.SearchApi;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
import org.broadinstitute.variantinterpretation.model.ConditionSearch;
import org.broadinstitute.variantinterpretation.model.SearchResultsResponse;
import org.broadinstitute.variantinterpretation.model.SearchSummary;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SearchResultsController implements SearchApi {

  // In early discussions we agreed on a limit of 50 candidate variants, but that could change in the future.
  private static final int VARIANTS_LIMIT = 50;

  private final VatLookupService vatLookup;
  private final ConditionLookupService conditionLookup;
  private final PhenotypeFixtures phenotypeFixtures;

  public SearchResultsController(
      VatLookupService vatLookup, ConditionLookupService conditionLookup, PhenotypeFixtures phenotypeFixtures) {
    this.vatLookup = vatLookup;
    this.conditionLookup = conditionLookup;
    this.phenotypeFixtures = phenotypeFixtures;
  }

  // cohortVariants and conditionSearch are the parts of this response backed by real queries:
  // cohortVariants against the VAT, conditionSearch against cb_criteria / concept_ancestor /
  // condition_occurrence. The VAT holds only variant-level annotation -- no phenotype,
  // participant, ancestry or age data -- so the breakdowns and filteredVariants are still served
  // from MockPhenotypeData until a genotype-level data source exists. They're scaled to the
  // picked condition's real participant count, standing in for data about those participants,
  // and left empty when it matched nobody. A demo use case's condition gets its own curated
  // breakdowns and per-variant counts instead (PhenotypeFixtures).
  @Override
  public ResponseEntity<SearchResultsResponse> searchResults(
      List<String> variants, Long conditionConceptId) {
    List<String> requested = normalizeVariants(variants);
    List<CohortVariant> cohortVariants = vatLookup.lookup(requested);
    ConditionSearch conditionSearch = conditionLookup.search(conditionConceptId);
    // Null both when no condition was picked and when the picked concept wasn't found.
    Integer participants = conditionSearch == null ? null : conditionSearch.getParticipantCount().orElse(null);
    boolean phenotypeFiltered = participants != null && participants > 0;
    SearchResultsResponse response =
        new SearchResultsResponse()
            .searchSummary(searchSummary(requested))
            .conditionSearch(conditionSearch)
            .cohortVariants(cohortVariants);
    if (!phenotypeFiltered) {
      return ResponseEntity.ok(response.ancestryBreakdown(List.of()).ageBreakdown(List.of()).filteredVariants(List.of()));
    }

    Optional<PhenotypeFixtures.UseCase> useCase = phenotypeFixtures.forCondition(conditionConceptId, participants);
    Map<String, MockPhenotypeData.CuratedCounts> curated =
        useCase.map(PhenotypeFixtures.UseCase::variants).orElse(Map.of());
    return ResponseEntity.ok(
        response
            .ancestryBreakdown(
                useCase
                    .map(u -> MockPhenotypeData.ancestryBreakdown(u.ancestry(), participants))
                    .orElseGet(() -> MockPhenotypeData.ancestryBreakdown(participants)))
            .ageBreakdown(
                useCase
                    .map(u -> MockPhenotypeData.ageBreakdown(u.age(), participants))
                    .orElseGet(() -> MockPhenotypeData.ageBreakdown(participants)))
            .filteredVariants(MockPhenotypeData.filteredVariants(cohortVariants, participants, curated)));
  }

  // Trims, drops blanks, dedupes (keeping the first occurrence's position), and caps num
  // entries at VARIANTS_LIMIT.
  private static List<String> normalizeVariants(List<String> variants) {
    if (variants == null) {
      return List.of();
    }
    return variants.stream()
        .map(String::trim)
        .filter(v -> !v.isEmpty())
        .distinct()
        .limit(VARIANTS_LIMIT)
        .toList();
  }

  private static SearchSummary searchSummary(List<String> variantsRaw) {
    return new SearchSummary()
        .variantsRaw(String.join("\n", variantsRaw))
        .variantsEnteredCount(variantsRaw.size())
        .variantsLimit(VARIANTS_LIMIT);
  }
}
