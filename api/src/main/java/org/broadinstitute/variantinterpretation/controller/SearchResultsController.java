package org.broadinstitute.variantinterpretation.controller;

import java.util.List;

import org.broadinstitute.variantinterpretation.datasource.ConditionLookupService;
import org.broadinstitute.variantinterpretation.datasource.MockPhenotypeData;
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

  public SearchResultsController(VatLookupService vatLookup, ConditionLookupService conditionLookup) {
    this.vatLookup = vatLookup;
    this.conditionLookup = conditionLookup;
  }

  // cohortVariants and conditionSearch are the parts of this response backed by real queries:
  // cohortVariants against the VAT, conditionSearch against cb_criteria / concept_ancestor /
  // condition_occurrence. The VAT holds only variant-level annotation -- no phenotype,
  // participant, ancestry or age data -- so the breakdowns and filteredVariants are still served
  // from MockPhenotypeData until a genotype-level data source exists. They're scaled to the
  // picked condition's real participant count, standing in for data about those participants,
  // and left empty when it matched nobody.
  @Override
  public ResponseEntity<SearchResultsResponse> searchResults(
      List<String> variants, Long conditionConceptId) {
    List<String> requested = normalizeVariants(variants);
    List<CohortVariant> cohortVariants = vatLookup.lookup(requested);
    ConditionSearch conditionSearch = conditionLookup.search(conditionConceptId);
    // Null both when no condition was picked and when the picked concept wasn't found.
    Integer participants = conditionSearch == null ? null : conditionSearch.getParticipantCount().orElse(null);
    boolean phenotypeFiltered = participants != null && participants > 0;

    return ResponseEntity.ok(
        new SearchResultsResponse()
            .searchSummary(searchSummary(requested))
            .conditionSearch(conditionSearch)
            .ancestryBreakdown(phenotypeFiltered ? MockPhenotypeData.ancestryBreakdown(participants) : List.of())
            .ageBreakdown(phenotypeFiltered ? MockPhenotypeData.ageBreakdown(participants) : List.of())
            .cohortVariants(cohortVariants)
            .filteredVariants(
                phenotypeFiltered ? MockPhenotypeData.filteredVariants(cohortVariants, participants) : List.of()));
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
