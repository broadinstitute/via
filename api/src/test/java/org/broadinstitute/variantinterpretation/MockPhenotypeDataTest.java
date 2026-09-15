package org.broadinstitute.variantinterpretation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.math.BigDecimal;
import java.util.List;
import org.broadinstitute.variantinterpretation.model.BreakdownSegment;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
import org.broadinstitute.variantinterpretation.model.FilteredVariant;
import org.junit.jupiter.api.Test;

class MockPhenotypeDataTest {

  private static CohortVariant annotated(String variant, double aouAllAf) {
    return new CohortVariant()
        .variant(variant)
        .annotated(true)
        .gene("GATA4")
        .classification("Missense")
        .aouAllAf(BigDecimal.valueOf(aouAllAf));
  }

  @Test
  void crosswalk_usesTheKnownOmopMapping_forAMappedTerm() {
    var crosswalk = MockPhenotypeData.crosswalk("HP:0001636");

    assertThat(crosswalk.getHpoCode()).isEqualTo("HP:0001636");
    assertThat(crosswalk.getOmopCode()).isEqualTo("313867");
    assertThat(crosswalk.getDescription()).isEqualTo("Tetralogy of Fallot");
    assertThat(crosswalk.getParticipantCount()).isEqualTo(MockPhenotypeData.PARTICIPANT_COUNT);
  }

  @Test
  void crosswalk_stillMatchesTheSameParticipants_forAnUnmappedTerm() {
    var crosswalk = MockPhenotypeData.crosswalk("HP:9999999");

    assertThat(crosswalk.getHpoCode()).isEqualTo("HP:9999999");
    assertThat(crosswalk.getOmopCode()).hasSize(6).containsOnlyDigits();
    assertThat(crosswalk.getParticipantCount()).isEqualTo(MockPhenotypeData.PARTICIPANT_COUNT);
    assertThat(crosswalk.getOmopCode()).isEqualTo(MockPhenotypeData.crosswalk("HP:9999999").getOmopCode());
  }

  // The donut renders segments by percent but labels them by count, so the two have to agree --
  // and both have to add up to the participant count the crosswalk reports.
  @Test
  void breakdowns_eachTotalTheParticipantCount() {
    for (List<BreakdownSegment> breakdown :
        List.of(MockPhenotypeData.ancestryBreakdown(), MockPhenotypeData.ageBreakdown())) {
      assertThat(breakdown.stream().mapToInt(BreakdownSegment::getCount).sum())
          .isEqualTo(MockPhenotypeData.PARTICIPANT_COUNT);
      for (BreakdownSegment segment : breakdown) {
        assertThat(segment.getPercent().doubleValue())
            .isCloseTo(100.0 * segment.getCount() / MockPhenotypeData.PARTICIPANT_COUNT, within(0.05));
      }
    }
  }

  @Test
  void filteredVariants_areInternallyConsistent_andLineUpWithTheCohortVariants() {
    List<CohortVariant> cohortVariants =
        List.of(
            annotated("8-11708582-C-T", 0.0031),
            annotated("8-11708590-G-GAA", 0.21),
            annotated("8-11708598-T-C", 0.000018),
            new CohortVariant().variant("8-11708629-T-A").annotated(false));

    List<FilteredVariant> filtered = MockPhenotypeData.filteredVariants(cohortVariants);

    assertThat(filtered).extracting(FilteredVariant::getVariant)
        .containsExactly("8-11708582-C-T", "8-11708590-G-GAA", "8-11708598-T-C", "8-11708629-T-A");
    for (int i = 0; i < 3; i++) {
      FilteredVariant variant = filtered.get(i);
      int cohortAc = variant.getCohortAc().orElseThrow();
      int cohortAn = variant.getCohortAn().orElseThrow();
      assertThat(variant.getHasStats()).isTrue();
      assertThat(cohortAn).isEqualTo(2 * MockPhenotypeData.PARTICIPANT_COUNT);
      assertThat(cohortAc).isBetween(0, cohortAn);
      assertThat(variant.getCohortAf().orElseThrow().doubleValue())
          .isCloseTo((double) cohortAc / cohortAn, within(0.000001));
      // The zygosity split has to account for exactly the alleles counted, and a P/LP in trans
      // needs a second allele free to sit on, so only het carriers can have one.
      int heterozygotes = variant.getHeterozygotes().orElseThrow();
      assertThat(2 * variant.getHomozygotes().orElseThrow() + heterozygotes).isEqualTo(cohortAc);
      assertThat(variant.getClinvarPlpInTrans().orElseThrow()).isBetween(0, heterozygotes);
    }
  }

  // A variant nobody in All of Us carries can't have phenotype-matched carriers either -- that
  // would contradict the frequency the all-participants table shows for it.
  @Test
  void filteredVariants_haveNoStats_withoutACohortWideFrequency() {
    List<FilteredVariant> filtered =
        MockPhenotypeData.filteredVariants(
            List.of(
                new CohortVariant().variant("8-11708629-T-A").annotated(false),
                new CohortVariant().variant("8-11708637-A-C").annotated(true).gene("GATA4"),
                annotated("8-11708645-CGGGG-C", 0.0)));

    assertThat(filtered).allSatisfy(variant -> assertThat(variant.getHasStats()).isFalse());
    assertThat(filtered).allSatisfy(variant -> assertThat(variant.getCohortAc().orElse(null)).isNull());
    // Annotation still comes through for a variant that has it, stats or no stats.
    assertThat(filtered.get(1).getGene().orElseThrow()).isEqualTo("GATA4");
  }

  @Test
  void filteredVariants_areStableForTheSameVariant() {
    List<CohortVariant> cohortVariants = List.of(annotated("8-11708582-C-T", 0.0031));

    assertThat(MockPhenotypeData.filteredVariants(cohortVariants))
        .isEqualTo(MockPhenotypeData.filteredVariants(cohortVariants));
  }
}
