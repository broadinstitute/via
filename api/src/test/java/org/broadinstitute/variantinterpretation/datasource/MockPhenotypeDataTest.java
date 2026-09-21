package org.broadinstitute.variantinterpretation.datasource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.math.BigDecimal;
import java.util.List;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
import org.broadinstitute.variantinterpretation.model.FilteredVariant;
import org.junit.jupiter.api.Test;

/**
 * Covers the one part of the phenotype-matched row that isn't invented -- the allele number
 * approximated from the variant's real cohort-wide AN -- plus the synthetic numbers derived from
 * it, which have to stay internally consistent with whatever AN comes out.
 */
class MockPhenotypeDataTest {

  private static final int MATCHED_PARTICIPANTS = MockPhenotypeData.PARTICIPANT_COUNT;

  /** Cohort size behind the synthetic VAT table: a 490,000-allele pool, so 245,000 samples. */
  private static final int COHORT_PARTICIPANTS = 245_000;

  private static CohortVariant variant(String vid, Double aouAllAf, Integer aouAllAn) {
    return new CohortVariant()
        .variant(vid)
        .annotated(true)
        .gene("BRCA1")
        .classification("Missense")
        .aouAllAf(aouAllAf == null ? null : BigDecimal.valueOf(aouAllAf))
        .aouAllAn(aouAllAn);
  }

  private static FilteredVariant filteredVariant(CohortVariant cohortVariant) {
    return filteredVariant(cohortVariant, COHORT_PARTICIPANTS);
  }

  private static FilteredVariant filteredVariant(CohortVariant cohortVariant, int cohortParticipants) {
    List<FilteredVariant> filtered =
        MockPhenotypeData.filteredVariants(List.of(cohortVariant), cohortParticipants);
    assertThat(filtered).hasSize(1);
    return filtered.getFirst();
  }

  @Test
  void cohortAn_isTwoPerMatchedParticipant_whenTheVariantIsCalledInEveryParticipant() {
    FilteredVariant filtered = filteredVariant(variant("1-100-A-G", 0.01, 2 * COHORT_PARTICIPANTS));

    assertThat(filtered.getHasStats()).isTrue();
    assertThat(filtered.getCohortAn().orElse(null)).isEqualTo(2 * MATCHED_PARTICIPANTS);
  }

  @Test
  void cohortAn_scalesDown_whenTheVariantIsNoCalledInPartOfTheCohort() {
    // Called in three quarters of the cohort, so the matched cohort's AN comes back at three
    // quarters of the two-alleles-per-participant maximum rather than at it.
    FilteredVariant filtered = filteredVariant(variant("1-200-A-G", 0.01, 2 * COHORT_PARTICIPANTS * 3 / 4));

    assertThat(filtered.getCohortAn().orElse(null))
        .isEqualTo((int) Math.round(1.5 * MATCHED_PARTICIPANTS));
  }

  @Test
  void cohortAn_isOnePerMatchedParticipant_forAHemizygousVariant() {
    FilteredVariant filtered = filteredVariant(variant("Y-300-A-G", 0.01, COHORT_PARTICIPANTS));

    assertThat(filtered.getCohortAn().orElse(null)).isEqualTo(MATCHED_PARTICIPANTS);
  }

  @Test
  void cohortAn_neverExceedsTwoPerMatchedParticipant_whenTheConfiguredCohortIsTooSmall() {
    // A cohort-wide AN that implies more than two alleles per participant means the configured
    // cohort size has drifted out of step with the table; the matched cohort can't follow it past
    // two alleles each.
    FilteredVariant filtered = filteredVariant(variant("1-350-A-G", 0.01, 490_000), 1_000);

    assertThat(filtered.getCohortAn().orElse(null)).isEqualTo(2 * MATCHED_PARTICIPANTS);
  }

  @Test
  void hasStats_isFalse_whenTheVatHasNoCohortWideAlleleNumber() {
    FilteredVariant filtered = filteredVariant(variant("1-400-A-G", 0.01, null));

    assertThat(filtered.getHasStats()).isFalse();
    assertThat(filtered.getCohortAn().orElse(null)).isNull();
    assertThat(filtered.getCohortAc().orElse(null)).isNull();
    // Annotation the VAT does have still comes through on a row with no stats.
    assertThat(filtered.getGene().orElse(null)).isEqualTo("BRCA1");
  }

  @Test
  void hasStats_isFalse_whenTheVatHasNoCohortWideFrequency() {
    assertThat(filteredVariant(variant("1-500-A-G", null, 490_000)).getHasStats()).isFalse();
  }

  @Test
  void hasStats_isFalse_whenTheMatchedCohortIsTooSmallASliceToScaleTo() {
    // Scaling a handful of called alleles down by 214/245,000 rounds away to nothing, which is a
    // row with no allele number to report rather than a row of zeroes.
    assertThat(filteredVariant(variant("1-550-A-G", 0.01, 100)).getHasStats()).isFalse();
  }

  @Test
  void hasStats_isFalse_whenTheVariantIsNotAnnotated() {
    FilteredVariant filtered = filteredVariant(new CohortVariant().variant("1-600-A-G").annotated(false));

    assertThat(filtered.getHasStats()).isFalse();
  }

  @Test
  void derivedStats_stayConsistentWithTheApproximatedAlleleNumber() {
    // Across a spread of frequencies and call rates, since the enrichment factor and the zygosity
    // split are drawn per variant: whatever AN comes out, the rest of the row has to add up to it.
    for (int i = 0; i < 200; i++) {
      double af = 0.00001 * Math.pow(10, i % 5);
      int an = (int) (2L * COHORT_PARTICIPANTS * (50 + i % 51) / 100);
      FilteredVariant filtered = filteredVariant(variant("1-" + i + "-A-G", af, an));
      if (!filtered.getHasStats()) {
        continue;
      }

      int cohortAn = filtered.getCohortAn().orElseThrow();
      int cohortAc = filtered.getCohortAc().orElseThrow();
      int homozygotes = filtered.getHomozygotes().orElseThrow();
      int heterozygotes = filtered.getHeterozygotes().orElseThrow();

      assertThat(cohortAn).isBetween(MATCHED_PARTICIPANTS, 2 * MATCHED_PARTICIPANTS);
      assertThat(cohortAc).isBetween(0, cohortAn);
      assertThat(2 * homozygotes + heterozygotes).isEqualTo(cohortAc);
      assertThat(homozygotes + heterozygotes).isLessThanOrEqualTo((cohortAn + 1) / 2);
      assertThat(filtered.getClinvarPlpInTrans().orElseThrow()).isBetween(0, heterozygotes);
      assertThat(filtered.getCohortAf().orElseThrow().doubleValue())
          .isCloseTo((double) cohortAc / cohortAn, within(1e-6));
    }
  }

  @Test
  void stats_areStableAcrossCalls_forTheSameVariant() {
    CohortVariant cohortVariant = variant("1-700-A-G", 0.02, 490_000);

    assertThat(filteredVariant(cohortVariant)).isEqualTo(filteredVariant(cohortVariant));
  }
}
