package org.broadinstitute.variantinterpretation.datasource;

import com.google.cloud.bigquery.FieldValueList;
import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.QueryParameterValue;
import com.google.cloud.bigquery.StandardSQLTypeName;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

import static org.broadinstitute.variantinterpretation.util.BigQueryValues.bigDecimal;
import static org.broadinstitute.variantinterpretation.util.BigQueryValues.doubleValue;
import static org.broadinstitute.variantinterpretation.util.BigQueryValues.intList;
import static org.broadinstitute.variantinterpretation.util.BigQueryValues.intValue;
import static org.broadinstitute.variantinterpretation.util.BigQueryValues.string;
import static org.broadinstitute.variantinterpretation.util.BigQueryValues.stringList;

import org.broadinstitute.variantinterpretation.model.ClinvarSubmission;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
import org.broadinstitute.variantinterpretation.model.PopulationFrequency;
import org.springframework.stereotype.Service;

/** Requested vids -> annotated {@link CohortVariant}s, against the configured VAT. */
@Service
public class VatLookupService {

  // Limits the selected columns to what we display to the user in the row plus its expanded view.
  private static final String SELECT_COLUMNS =
      """
      SELECT vid, gene_symbol, aa_change, consequence,
             gvs_max_subpop, gvs_max_af, gvs_max_ac, gvs_max_an,
             gvs_all_af, gvs_all_ac, gvs_all_an,
             gvs_afr_af, gvs_afr_ac, gvs_afr_an,
             gvs_amr_af, gvs_amr_ac, gvs_amr_an,
             gvs_eas_af, gvs_eas_ac, gvs_eas_an,
             gvs_eur_af, gvs_eur_ac, gvs_eur_an,
             gvs_mid_af, gvs_mid_ac, gvs_mid_an,
             gvs_oth_af, gvs_oth_ac, gvs_oth_an,
             gvs_sas_af, gvs_sas_ac, gvs_sas_an,
             gnomad_max_subpop, gnomad_max_af, gnomad_max_ac, gnomad_max_an,
             gnomad_all_af, gnomad_all_ac, gnomad_all_an,
             gnomad_afr_af, gnomad_afr_ac, gnomad_afr_an,
             gnomad_amr_af, gnomad_amr_ac, gnomad_amr_an,
             gnomad_asj_af, gnomad_asj_ac, gnomad_asj_an,
             gnomad_eas_af, gnomad_eas_ac, gnomad_eas_an,
             gnomad_fin_af, gnomad_fin_ac, gnomad_fin_an,
             gnomad_nfe_af, gnomad_nfe_ac, gnomad_nfe_an,
             gnomad_oth_af, gnomad_oth_ac, gnomad_oth_an,
             gnomad_sas_af, gnomad_sas_ac, gnomad_sas_an,
             clinvar_classification, clinvar_phenotype, clinvar_last_updated,
             clinvar_rcv_ids, clinvar_rcv_classifications, clinvar_rcv_num_stars,
             splice_ai_acceptor_gain_score, splice_ai_acceptor_loss_score,
             splice_ai_donor_gain_score, splice_ai_donor_loss_score,
             LoF
      FROM %s
      """;

  private static final String SEARCH_COHORT_VARIANTS_SQL = SELECT_COLUMNS + "WHERE vid IN UNNEST(@vids)";

  private static final List<String> AOU_POPULATIONS =
      List.of("afr", "amr", "eas", "eur", "mid", "oth", "sas");
  private static final List<String> GNOMAD_POPULATIONS =
      List.of("afr", "amr", "asj", "eas", "fin", "nfe", "oth", "sas");

  // VAT consequence terms (VEP) that map onto the simplified labels used elsewhere in this
  // table; anything else is left as an unclassified (null) row.
  private static final Map<String, String> CONSEQUENCE_LABELS =
      Map.of(
          "missense_variant", "Missense",
          "synonymous_variant", "Synonymous",
          "stop_gained", "Nonsense",
          "frameshift_variant", "Frameshift",
          "splice_donor_variant", "Splice site",
          "splice_acceptor_variant", "Splice site");

  private static final Map<String, CohortVariant.ClinvarSignificanceEnum> CLINVAR_SIGNIFICANCE =
      Map.of(
          "Pathogenic", CohortVariant.ClinvarSignificanceEnum.PATHOGENIC,
          "Likely pathogenic", CohortVariant.ClinvarSignificanceEnum.LIKELY_PATHOGENIC,
          "Benign", CohortVariant.ClinvarSignificanceEnum.BENIGN,
          "Likely benign", CohortVariant.ClinvarSignificanceEnum.LIKELY_BENIGN,
          "Uncertain significance", CohortVariant.ClinvarSignificanceEnum.VUS);

  private final BigQueryService bigQuery;
  private final BigQueryProperties properties;

  public VatLookupService(BigQueryService bigQuery, BigQueryProperties properties) {
    this.bigQuery = bigQuery;
    this.properties = properties;
  }

  /**
   * Looks up each requested vid in the configured VAT and maps what's found onto
   * CohortVariant, in the order requested; any vid with no matching row comes back as an
   * `annotated: false` placeholder instead of being silently dropped.
   */
  public List<CohortVariant> lookup(List<String> vids) {
    if (vids.isEmpty()) {
      return List.of();
    }
    var query =
        QueryJobConfiguration.newBuilder(SEARCH_COHORT_VARIANTS_SQL.formatted(properties.vatTableRef()))
            .addNamedParameter(
                "vids", QueryParameterValue.array(vids.toArray(new String[0]), StandardSQLTypeName.STRING));
    Map<String, CohortVariant> byVid = new LinkedHashMap<>();
    for (FieldValueList row : bigQuery.query(query)) {
      CohortVariant variant = vatRowToCohortVariant(row);
      byVid.put(variant.getVariant(), variant);
    }
    List<CohortVariant> variants = new ArrayList<>();
    for (String vid : vids) {
      variants.add(byVid.getOrDefault(vid, unannotatedVariant(vid)));
    }
    return variants;
  }

  private static CohortVariant unannotatedVariant(String variant) {
    return new CohortVariant().variant(variant).annotated(false);
  }

  private static CohortVariant vatRowToCohortVariant(FieldValueList row) {
    List<String> consequences = stringList(row, "consequence");
    String consequence =
        consequences.stream()
            .map(CONSEQUENCE_LABELS::get)
            .filter(Objects::nonNull)
            .findFirst()
            .orElse(null);

    String aouSubpop = string(row, "gvs_max_subpop");
    String gnomadSubpop = string(row, "gnomad_max_subpop");

    List<String> clinvarClassifications = stringList(row, "clinvar_classification");
    CohortVariant.ClinvarSignificanceEnum clinvarSignificance =
        clinvarClassifications.stream()
            .map(CLINVAR_SIGNIFICANCE::get)
            .filter(Objects::nonNull)
            .findFirst()
            .orElse(null);

    List<String> clinvarRcvIds = stringList(row, "clinvar_rcv_ids");
    List<String> clinvarRcvClassifications = stringList(row, "clinvar_rcv_classifications");
    List<Integer> clinvarRcvStars = intList(row, "clinvar_rcv_num_stars");
    // ClinVar's gold-star review status is per RCV record, not per overall classification; a
    // variant can have several (possibly conflicting) RCV submissions, so this takes the highest.
    Integer clinvarStars = clinvarRcvStars.stream().filter(Objects::nonNull).max(Integer::compareTo).orElse(null);
    // Each RCV is a variant+condition pair, not just variant. two RCVs legitimately differing
    // (e.g. pathogenic for one condition, benign for another) is not a conflict, so this can't be
    // derived from a distinct-count over clinvarRcvClassifications. clinvar_classification is
    // ClinVar's own aggregate call across all of this variant's RCVs, and carries "Conflicting
    // interpretations" itself when submitters actually disagree.
    boolean clinvarHasConflicts = clinvarClassifications.contains("Conflicting interpretations");
    String clinvarLastUpdated = string(row, "clinvar_last_updated");

    // SpliceAI's headline delta score (shown in the collapsed row) is the max of the four.
    // Stream.of (not List.of) because these are frequently null, and List.of rejects nulls.
    Double spliceAi =
        Stream.of(
                doubleValue(row, "splice_ai_acceptor_gain_score"),
                doubleValue(row, "splice_ai_acceptor_loss_score"),
                doubleValue(row, "splice_ai_donor_gain_score"),
                doubleValue(row, "splice_ai_donor_loss_score"))
            .filter(Objects::nonNull)
            .max(Double::compareTo)
            .orElse(null);

    boolean inGnomad = gnomadSubpop != null;
    // Based on whether there are ClinVar RCV records at all, not on clinvarSignificance -- a
    // variant's RCVs can all be classifications with no equivalent in ClinvarSignificanceEnum
    // (e.g. "Conflicting interpretations", "not provided"), which still means there's a real
    // ClinVar record to view even though there's no clean aggregate call for the row.
    boolean inClinvar = !clinvarRcvIds.isEmpty();
    String variant = string(row, "vid");
    return new CohortVariant()
        .variant(variant)
        .gene(string(row, "gene_symbol"))
        .annotated(true)
        .consequence(consequence)
        .proteinChange(string(row, "aa_change"))
        .aouSubpopulation(
            aouSubpop == null ? null : CohortVariant.AouSubpopulationEnum.fromValue(aouSubpop.toUpperCase()))
        .aouAf(bigDecimal(doubleValue(row, "gvs_max_af")))
        .aouAc(intValue(row, "gvs_max_ac"))
        .aouAn(intValue(row, "gvs_max_an"))
        .aouPopulations(populationFrequencies(row, "gvs", AOU_POPULATIONS))
        .aouAllAf(bigDecimal(doubleValue(row, "gvs_all_af")))
        .aouAllAc(intValue(row, "gvs_all_ac"))
        .aouAllAn(intValue(row, "gvs_all_an"))
        .gnomadSubpopulation(
            gnomadSubpop == null ? null : CohortVariant.GnomadSubpopulationEnum.fromValue(gnomadSubpop.toUpperCase()))
        .gnomadAf(bigDecimal(doubleValue(row, "gnomad_max_af")))
        .gnomadAc(intValue(row, "gnomad_max_ac"))
        .gnomadAn(intValue(row, "gnomad_max_an"))
        .gnomadUrl(inGnomad ? "https://gnomad.broadinstitute.org/variant/" + variant : null)
        .gnomadPopulations(populationFrequencies(row, "gnomad", GNOMAD_POPULATIONS))
        .gnomadAllAf(bigDecimal(doubleValue(row, "gnomad_all_af")))
        .gnomadAllAc(intValue(row, "gnomad_all_ac"))
        .gnomadAllAn(intValue(row, "gnomad_all_an"))
        .clinvarSignificance(clinvarSignificance)
        .clinvarUrl(inClinvar ? "https://www.ncbi.nlm.nih.gov/clinvar/?term=" + variant : null)
        .clinvarStars(clinvarStars)
        .clinvarHasConflicts(clinvarHasConflicts)
        .clinvarConditions(stringList(row, "clinvar_phenotype"))
        .clinvarLastUpdated(clinvarLastUpdated == null ? null : LocalDate.parse(clinvarLastUpdated))
        .clinvarSubmissions(clinvarSubmissions(clinvarRcvIds, clinvarRcvClassifications, clinvarRcvStars))
        .spliceAi(bigDecimal(spliceAi))
        .plof(plof(string(row, "LoF")));
  }

  private static List<PopulationFrequency> populationFrequencies(
      FieldValueList row, String columnPrefix, List<String> populations) {
    List<PopulationFrequency> frequencies = new ArrayList<>();
    for (String population : populations) {
      frequencies.add(
          new PopulationFrequency()
              .population(population.toUpperCase())
              .af(bigDecimal(doubleValue(row, columnPrefix + "_" + population + "_af")))
              .ac(intValue(row, columnPrefix + "_" + population + "_ac"))
              .an(intValue(row, columnPrefix + "_" + population + "_an")));
    }
    return frequencies;
  }

  // clinvar_rcv_ids, clinvar_rcv_classifications, and clinvar_rcv_num_stars are parallel arrays
  // (index i describes the same RCV record); there's no submitter identity in the VAT, so each
  // submission is keyed by its RCV accession instead of a lab/submitter name.
  private static List<ClinvarSubmission> clinvarSubmissions(
      List<String> ids, List<String> classifications, List<Integer> stars) {
    List<ClinvarSubmission> submissions = new ArrayList<>();
    for (int i = 0; i < ids.size(); i++) {
      submissions.add(
          new ClinvarSubmission()
              .id(ids.get(i))
              .classification(i < classifications.size() ? classifications.get(i) : null)
              .stars(i < stars.size() ? stars.get(i) : null));
    }
    return submissions;
  }

  // Other LOFTEE values (e.g. OS, "other splice") aren't a call the UI shows, so they read as
  // unscored, like a null.
  private static CohortVariant.PlofEnum plof(String lof) {
    if ("HC".equals(lof)) return CohortVariant.PlofEnum.HC;
    if ("LC".equals(lof)) return CohortVariant.PlofEnum.LC;
    return null;
  }
}
