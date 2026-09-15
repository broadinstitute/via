package org.broadinstitute.variantinterpretation.datasource;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.broadinstitute.variantinterpretation.model.BreakdownSegment;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
import org.broadinstitute.variantinterpretation.model.FilteredVariant;
import org.broadinstitute.variantinterpretation.model.PhenotypeCrosswalk;

/**
 * Stand-in phenotype/participant data for the phenotype-matched half of the search results.
 *
 * <p>None of this is real. The VAT is a variant-transcript aggregate table with no participant,
 * phenotype, ancestry, or age data in it at all -- and per the VAT design doc it never will have
 * (see docs/vat_schema_mapping.md), so the phenotype-matched panels need a genotype-level data
 * source that doesn't exist yet. Until it does, this makes those panels demo-able: every supplied
 * phenotype "matches" the same synthetic cohort of {@value #PARTICIPANT_COUNT} participants, and
 * each searched variant gets synthetic cohort stats for it.
 *
 * <p>The stats are derived from the variant's real (well, synthetic-VAT) cohort-wide AoU frequency
 * and seeded off its vid, so a given variant always comes back with the same numbers and its AF
 * ratio stays consistent with the frequency shown for it in the all-participants table.
 */
public final class MockPhenotypeData {

  /** How many participants any supplied phenotype matches. There's no cohort behind the number. */
  static final int PARTICIPANT_COUNT = 978;

  // Two alleles per participant, and mock data has no missing calls, so every variant with stats
  // reports this same cohort AN.
  private static final int COHORT_AN = 2 * PARTICIPANT_COUNT;

  // An AF ratio at or above this is what the UI flags as an enrichment worth a look, so the
  // generated data deliberately puts some variants over the line and keeps the rest under it.
  private static final double ELEVATED_AF_RATIO = 2.0;

  // Leaves room for a reference allele or two even in the most enriched case -- an AF of exactly
  // 1.0 in the phenotype-matched cohort would read as a data error rather than a signal.
  private static final double MAX_COHORT_AF = 0.98;

  private record KnownPhenotype(String omopCode, String description) {}

  // Enough of a crosswalk to cover the terms a demo is likely to type -- HP:0001636 is the one the
  // search form suggests. The OMOP concept ids are illustrative rather than looked up, except
  // HP:0001636 -> 313867, which came from the real crosswalk.
  private static final Map<String, KnownPhenotype> KNOWN_PHENOTYPES =
      Map.of(
          "HP:0001636", new KnownPhenotype("313867", "Tetralogy of Fallot"),
          "HP:0001631", new KnownPhenotype("314054", "Atrial septal defect"),
          "HP:0001629", new KnownPhenotype("4184582", "Ventricular septal defect"),
          "HP:0001644", new KnownPhenotype("316139", "Dilated cardiomyopathy"),
          "HP:0001250", new KnownPhenotype("377091", "Seizure"),
          "HP:0000822", new KnownPhenotype("316866", "Hypertension"),
          "HP:0003002", new KnownPhenotype("4112853", "Breast carcinoma"),
          "HP:0001166", new KnownPhenotype("4048228", "Arachnodactyly"));

  private MockPhenotypeData() {}

  /**
   * The HPO -> OMOP crosswalk for a supplied term. Terms outside {@link #KNOWN_PHENOTYPES} still
   * get a crosswalk -- the point is that every phenotype matches -- with a description that says
   * so and an OMOP code derived from the term.
   */
  public static PhenotypeCrosswalk crosswalk(String hpoTerm) {
    KnownPhenotype known = KNOWN_PHENOTYPES.get(hpoTerm.toUpperCase());
    return new PhenotypeCrosswalk()
        .hpoCode(hpoTerm)
        .omopCode(known == null ? derivedOmopCode(hpoTerm) : known.omopCode())
        .description(known == null ? "Mock phenotype (not in demo crosswalk)" : known.description())
        .participantCount(PARTICIPANT_COUNT);
  }

  // Stable per term, and in the 6-digit range real OMOP condition concept ids fall in, so an
  // unmapped term at least looks like it was crosswalked to something.
  private static String derivedOmopCode(String hpoTerm) {
    return Integer.toString(300_000 + Math.floorMod(hpoTerm.hashCode(), 700_000));
  }

  /**
   * Ancestry makeup of the matched participants. Proportions are the ones from the design
   * mock-ups, rescaled to {@link #PARTICIPANT_COUNT}.
   */
  public static List<BreakdownSegment> ancestryBreakdown() {
    return List.of(
        segment("EUR", 469, "#F9C854"),
        segment("AFR", 192, "#2078B4"),
        segment("AMR", 174, "#6DACE4"),
        segment("OTH", 87, "#B3AEAD"),
        segment("EAS", 32, "#A27BD7"),
        segment("SAS", 19, "#8CCA90"),
        segment("MID", 5, "#CB2D4C"));
  }

  /** Age makeup of the same matched participants, so it totals {@link #PARTICIPANT_COUNT} too. */
  public static List<BreakdownSegment> ageBreakdown() {
    return List.of(
        segment("18–29", 78, "#B8DCEF"),
        segment("30–39", 137, "#8DC6E5"),
        segment("40–49", 210, "#5FAEDA"),
        segment("50–59", 256, "#3B8FC4"),
        segment("60–69", 215, "#2569A0"),
        segment("70+", 82, "#17456F"));
  }

  // Counts are what's authored (they have to sum to PARTICIPANT_COUNT); percent is derived from
  // the count rather than authored alongside it, so the donut and its legend can't disagree.
  private static BreakdownSegment segment(String label, int count, String color) {
    BigDecimal percent =
        BigDecimal.valueOf(100L * count).divide(BigDecimal.valueOf(PARTICIPANT_COUNT), 1, RoundingMode.HALF_UP);
    return new BreakdownSegment().label(label).count(count).percent(percent).color(color);
  }

  /**
   * Synthetic phenotype-matched stats for each searched variant, in the order searched -- one
   * FilteredVariant per CohortVariant, so the two tables line up row for row.
   *
   * <p>A variant that isn't annotated, or that the VAT has no cohort-wide AoU frequency for, comes
   * back as {@code hasStats: false}: having no participants at all in the full cohort is the one
   * case where inventing a phenotype-matched count would contradict what the other table shows.
   */
  public static List<FilteredVariant> filteredVariants(List<CohortVariant> cohortVariants) {
    List<FilteredVariant> filtered = new ArrayList<>();
    for (CohortVariant cohortVariant : cohortVariants) {
      filtered.add(filteredVariant(cohortVariant));
    }
    return filtered;
  }

  private static FilteredVariant filteredVariant(CohortVariant cohortVariant) {
    String variant = cohortVariant.getVariant();
    if (!Boolean.TRUE.equals(cohortVariant.getAnnotated())) {
      return withoutStats(variant, null, null);
    }

    String gene = cohortVariant.getGene().orElse(null);
    String classification = cohortVariant.getClassification().orElse(null);
    BigDecimal aouAllAf = cohortVariant.getAouAllAf().orElse(null);
    if (aouAllAf == null || aouAllAf.signum() <= 0) {
      return withoutStats(variant, gene, classification);
    }

    Random random = seededRandom(variant);
    double enrichment = enrichment(random);
    double cohortAf = Math.min(aouAllAf.doubleValue() * enrichment, MAX_COHORT_AF);
    int cohortAc = (int) Math.round(cohortAf * COHORT_AN);
    // A variant rare enough that even an enriched frequency rounds to zero carriers would show up
    // as a 0x ratio, hiding exactly the signal this row is meant to demonstrate.
    if (cohortAc == 0 && enrichment >= ELEVATED_AF_RATIO) {
      cohortAc = 1 + random.nextInt(3);
    }
    // Everything below is computed back from the final integer AC, so AF, the zygosity split, and
    // the ratio all agree with each other and with the AoU frequency they were derived from.
    cohortAf = (double) cohortAc / COHORT_AN;
    int homozygotes = Math.min((int) Math.round(PARTICIPANT_COUNT * cohortAf * cohortAf), cohortAc / 2);
    int heterozygotes = cohortAc - 2 * homozygotes;

    return new FilteredVariant()
        .variant(variant)
        .gene(gene)
        .classification(classification)
        .hasStats(true)
        .cohortAc(cohortAc)
        .cohortAn(COHORT_AN)
        .cohortAf(BigDecimal.valueOf(cohortAf).setScale(6, RoundingMode.HALF_UP))
        .homozygotes(homozygotes)
        .heterozygotes(heterozygotes)
        .clinvarPlpInTrans(plpInTrans(random, heterozygotes, isPathogenic(cohortVariant)))
        .afRatio(
            BigDecimal.valueOf(cohortAf / aouAllAf.doubleValue()).setScale(2, RoundingMode.HALF_UP));
  }

  private static FilteredVariant withoutStats(String variant, String gene, String classification) {
    return new FilteredVariant()
        .variant(variant)
        .gene(gene)
        .classification(classification)
        .hasStats(false)
        .cohortAc(null)
        .cohortAn(null)
        .cohortAf(null)
        .homozygotes(null)
        .heterozygotes(null)
        .clinvarPlpInTrans(null)
        .afRatio(null);
  }

  // Seeded off the vid so a variant's stats are stable across requests (and across restarts) --
  // the same search has to keep returning the same numbers. String.hashCode is specified, so it's
  // stable across JVMs, but nearby seeds leave java.util.Random's first draws correlated, and vids
  // of neighbouring variants are near-identical strings; the splitmix-style mix decorrelates them.
  private static Random seededRandom(String variant) {
    long seed = variant.hashCode() * 0x9E3779B97F4A7C15L;
    seed = (seed ^ (seed >>> 30)) * 0xBF58476D1CE4E5B9L;
    return new Random(seed ^ (seed >>> 27));
  }

  // How much more common this variant is among phenotype-matched participants than in the cohort
  // as a whole. Most variants sit around 1x (background noise), and roughly one in five is
  // strongly enriched, which is the case the phenotype-matched table exists to surface.
  private static double enrichment(Random random) {
    return random.nextInt(5) == 0
        ? ELEVATED_AF_RATIO + 1 + random.nextDouble() * 22
        : 0.5 + random.nextDouble() * 1.4;
  }

  // Participants carrying a ClinVar P/LP variant on the other allele. Only het carriers can have
  // one, and a variant that's itself P/LP is likelier to turn up as half of a compound het.
  private static int plpInTrans(Random random, int heterozygotes, boolean pathogenic) {
    if (heterozygotes == 0 || random.nextInt(pathogenic ? 2 : 3) != 0) {
      return 0;
    }
    return 1 + random.nextInt(Math.min(heterozygotes, 3));
  }

  private static boolean isPathogenic(CohortVariant cohortVariant) {
    CohortVariant.ClinvarSignificanceEnum significance = cohortVariant.getClinvarSignificance().orElse(null);
    return significance == CohortVariant.ClinvarSignificanceEnum.PATHOGENIC
        || significance == CohortVariant.ClinvarSignificanceEnum.LIKELY_PATHOGENIC;
  }
}
