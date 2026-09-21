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
 * <p>Almost none of this is real. The VAT is a variant-transcript aggregate table with no
 * participant, phenotype, ancestry, or age data in it at all -- and per the VAT design doc it never
 * will have (see docs/vat_schema_mapping.md), so the phenotype-matched panels need a genotype-level
 * data source that doesn't exist yet. Until it does, this makes those panels demo-able: every
 * supplied phenotype "matches" the same synthetic cohort of {@value #PARTICIPANT_COUNT}
 * participants, and each searched variant gets synthetic cohort stats for it.
 *
 * <p>The stats are derived from the variant's real (well, synthetic-VAT) cohort-wide AoU frequency
 * and seeded off its vid, so a given variant always comes back with the same numbers and its AF
 * ratio stays consistent with the frequency shown for it in the all-participants table.
 *
 * <p>The exception -- the one column here not invented -- is the allele number, which {@link
 * #approximateCohortAn} scales down from the variant's real cohort-wide AN by the share of the
 * cohort these participants make up. Everything else in the row is computed back from that AN, so
 * as more real data lands the invented part shrinks.
 */
public final class MockPhenotypeData {

  /** How many participants any supplied phenotype matches. There's no cohort behind the number. */
  static final int PARTICIPANT_COUNT = 214;

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
        segment("EUR", 103, "#F9C854"),
        segment("AFR", 42, "#2078B4"),
        segment("AMR", 38, "#6DACE4"),
        segment("OTH", 19, "#B3AEAD"),
        segment("EAS", 7, "#A27BD7"),
        segment("SAS", 4, "#8CCA90"),
        segment("MID", 1, "#CB2D4C"));
  }

  /** Age makeup of the same matched participants, so it totals {@link #PARTICIPANT_COUNT} too. */
  public static List<BreakdownSegment> ageBreakdown() {
    return List.of(
        segment("18–29", 17, "#B8DCEF"),
        segment("30–39", 30, "#8DC6E5"),
        segment("40–49", 46, "#5FAEDA"),
        segment("50–59", 56, "#3B8FC4"),
        segment("60–69", 47, "#2569A0"),
        segment("70+", 18, "#17456F"));
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
   * <p>A variant that isn't annotated, that the VAT has no cohort-wide AoU frequency for, or that
   * has no cohort-wide allele number to scale down, comes back as {@code hasStats: false}: having
   * no participants at all in the full cohort is the one case where inventing a phenotype-matched
   * count would contradict what the other table shows.
   */
  public static List<FilteredVariant> filteredVariants(
      List<CohortVariant> cohortVariants, int cohortParticipants) {
    List<FilteredVariant> filtered = new ArrayList<>();
    for (CohortVariant cohortVariant : cohortVariants) {
      filtered.add(filteredVariant(cohortVariant, cohortParticipants));
    }
    return filtered;
  }

  private static FilteredVariant filteredVariant(CohortVariant cohortVariant, int cohortParticipants) {
    String variant = cohortVariant.getVariant();
    if (!Boolean.TRUE.equals(cohortVariant.getAnnotated())) {
      return withoutStats(variant, null, null);
    }

    String gene = cohortVariant.getGene().orElse(null);
    String classification = cohortVariant.getClassification().orElse(null);
    BigDecimal aouAllAf = cohortVariant.getAouAllAf().orElse(null);
    Integer cohortAn = approximateCohortAn(cohortVariant, cohortParticipants);
    if (aouAllAf == null || aouAllAf.signum() <= 0 || cohortAn == null) {
      return withoutStats(variant, gene, classification);
    }

    Random random = seededRandom(variant);
    double enrichment = enrichment(random);
    double cohortAf = Math.min(aouAllAf.doubleValue() * enrichment, MAX_COHORT_AF);
    int cohortAc = (int) Math.round(cohortAf * cohortAn);
    // A variant rare enough that even an enriched frequency rounds to zero carriers would show up
    // as a 0x ratio, hiding exactly the signal this row is meant to demonstrate. Bumping it can't
    // be allowed to push AF past the cap, which for a small AN a handful of alleles would do.
    if (cohortAc == 0 && enrichment >= ELEVATED_AF_RATIO) {
      cohortAc = Math.min(1 + random.nextInt(3), (int) (MAX_COHORT_AF * cohortAn));
    }
    // Everything below is computed back from the final integer AC, so AF, the zygosity split, and
    // the ratio all agree with each other and with the AoU frequency they were derived from.
    cohortAf = (double) cohortAc / cohortAn;
    // HWE expectation over the participants actually called for this variant -- two alleles each
    // -- rather than over the whole matched cohort, so a variant with a poor call rate can't come
    // back with more carriers than it has genotypes. The lower bound is what enforces that at the
    // top of the AF range: past a point the surplus alleles have to pair up as homozygotes,
    // because there aren't enough called participants left to carry them one apiece.
    int calledParticipants = (cohortAn + 1) / 2;
    int hweHomozygotes = (int) Math.round(calledParticipants * cohortAf * cohortAf);
    int homozygotes = Math.min(Math.max(hweHomozygotes, cohortAc - calledParticipants), cohortAc / 2);
    int heterozygotes = cohortAc - 2 * homozygotes;

    return new FilteredVariant()
        .variant(variant)
        .gene(gene)
        .classification(classification)
        .hasStats(true)
        .cohortAc(cohortAc)
        .cohortAn(cohortAn)
        .cohortAf(BigDecimal.valueOf(cohortAf).setScale(6, RoundingMode.HALF_UP))
        .homozygotes(homozygotes)
        .heterozygotes(heterozygotes)
        .clinvarPlpInTrans(plpInTrans(random, heterozygotes, isPathogenic(cohortVariant)))
        .afRatio(
            BigDecimal.valueOf(cohortAf / aouAllAf.doubleValue()).setScale(2, RoundingMode.HALF_UP));
  }

  /**
   * Allele number for the phenotype-matched cohort, approximated from real VAT data rather than
   * invented: the share of the whole cohort the matched participants make up, applied to the
   * variant's real cohort-wide allele number.
   *
   * <p>The ceiling is two alleles per matched participant, which is what a variant called in every
   * participant in the cohort gets. Anything less than that is the variant's real cohort-wide call
   * rate carried across: a site no-called in a tenth of the biobank comes back with about a tenth
   * fewer alleles here too, and a hemizygous one comes back at roughly one allele per participant.
   * What it assumes is that matched participants are called at the same rate as the cohort as a
   * whole -- only genotype-level data could confirm or correct that.
   *
   * <p>Note that {@code gvs_all_sc} is no use as the denominator here: per the VAT design doc
   * (Appendix H) sample count is the number of samples <em>carrying</em> the alt allele, not the
   * number called, so for a rare variant it's a handful of participants rather than the cohort.
   * The cohort's size isn't in the VAT at all, which is why it's configured -- see {@link
   * BigQueryProperties#cohortParticipants()}.
   *
   * <p>Null when the VAT has no cohort-wide allele number for the variant, or when the matched
   * cohort is a small enough slice of the whole that scaling rounds its AN away to nothing.
   */
  private static Integer approximateCohortAn(CohortVariant cohortVariant, int cohortParticipants) {
    Integer cohortWideAn = cohortVariant.getAouAllAn().orElse(null);
    if (cohortWideAn == null || cohortWideAn <= 0 || cohortParticipants <= 0) {
      return null;
    }
    long cohortAn = Math.round((double) cohortWideAn * PARTICIPANT_COUNT / cohortParticipants);
    if (cohortAn <= 0) {
      return null;
    }
    // A cohort-wide AN above two per participant means the configured cohort size has drifted out
    // of step with the table. Clamping keeps that from surfacing as a matched cohort holding more
    // alleles than it has participants to hold them.
    return (int) Math.min(cohortAn, 2L * PARTICIPANT_COUNT);
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
