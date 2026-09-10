package org.broadinstitute.variantinterpretation;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.FieldValue;
import com.google.cloud.bigquery.FieldValueList;
import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.QueryParameterValue;
import com.google.cloud.bigquery.StandardSQLTypeName;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.broadinstitute.variantinterpretation.api.SearchApi;
import org.broadinstitute.variantinterpretation.model.ClinvarSubmission;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
import org.broadinstitute.variantinterpretation.model.PopulationFrequency;
import org.broadinstitute.variantinterpretation.model.SearchResultsResponse;
import org.broadinstitute.variantinterpretation.model.SearchSummary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SearchResultsController implements SearchApi {

  private static final Logger log = LoggerFactory.getLogger(SearchResultsController.class);

  // Right now this is a small limit to keep development costs low and prevent accidental
  // full-table scan. When using the real VAT we'll need to use a more realistic value. See VIA-50
  private static final long MAXIMUM_BYTES_BILLED = 100L * 1024 * 1024;

  // In early discussions we agreed on a limit of 50 candidate variants, but that could change in the future.
  private static final int VARIANTS_LIMIT = 50;

  // Limits the selected columns to what we display to the user in the row plus its expanded view.
  private static final String SELECT_COLUMNS =
      """
      SELECT vid, gene_symbol, aa_change, consequence, transcript, exon_number,
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
             LoF, LoF_flags
      FROM %s
      """;

  private static final String SEARCH_COHORT_VARIANTS_SQL = SELECT_COLUMNS + "WHERE vid IN UNNEST(@vids)";

  // Matches the codes the gvs_<pop>_* / gnomad_<pop>_* columns are named after.
  private static final List<String> AOU_POPULATIONS = List.of("afr", "amr", "eas", "eur", "mid", "oth", "sas");
  private static final List<String> GNOMAD_POPULATIONS =
      List.of("afr", "amr", "asj", "eas", "fin", "nfe", "oth", "sas");

  // VAT consequence terms (VEP) that map onto the simplified labels used elsewhere in this
  // table; anything else is left as an unclassified (null) row.
  private static final Map<String, String> CONSEQUENCE_TO_CLASSIFICATION =
      Map.of(
          "missense_variant", "Missense",
          "synonymous_variant", "Synonymous",
          "stop_gained", "Nonsense",
          "frameshift_variant", "Frameshift",
          "splice_donor_variant", "Splice site",
          "splice_acceptor_variant", "Splice site");

  // Only classifications with an unambiguous match in ClinvarSignificanceEnum;
  // "Conflicting interpretations", etc. have no equivalent and are left null.
  private static final Map<String, CohortVariant.ClinvarSignificanceEnum> CLINVAR_SIGNIFICANCE =
      Map.of(
          "Pathogenic", CohortVariant.ClinvarSignificanceEnum.PATHOGENIC,
          "Likely pathogenic", CohortVariant.ClinvarSignificanceEnum.LIKELY_PATHOGENIC,
          "Benign", CohortVariant.ClinvarSignificanceEnum.BENIGN,
          "Likely benign", CohortVariant.ClinvarSignificanceEnum.LIKELY_BENIGN,
          "Uncertain significance", CohortVariant.ClinvarSignificanceEnum.VUS);

  private final BigQuery bigQuery;
  private final BigQueryProperties properties;

  public SearchResultsController(BigQuery bigQuery, BigQueryProperties properties) {
    this.bigQuery = bigQuery;
    this.properties = properties;
  }

  // The VAT table backing this endpoint has no phenotype, participant, ancestry, or age data --
  // only variant-level annotation. So phenotypeCrosswalk, the breakdowns, and filteredVariants
  // have no real data source to power them and stay empty/null unconditionally, regardless of
  // whether an HPO term was given, until a real phenotype/participant data source exists.
  @Override
  public ResponseEntity<SearchResultsResponse> searchResults(List<String> variants, String hpoTerm) {
    List<String> requested = normalizeVariants(variants);
    List<CohortVariant> cohortVariants =
        requested.isEmpty() ? List.of() : fetchSearchedCohortVariants(requested);
    String effectiveHpoTerm = hpoTerm == null ? "" : hpoTerm.trim();

    return ResponseEntity.ok(
        new SearchResultsResponse()
            .searchSummary(searchSummary(requested, effectiveHpoTerm))
            .phenotypeCrosswalk(null)
            .ancestryBreakdown(List.of())
            .ageBreakdown(List.of())
            .cohortVariants(cohortVariants)
            .filteredVariants(List.of()));
  }

  // Trims, drops blanks, and caps num entries at VARIANTS_LIMIT.
  private static List<String> normalizeVariants(List<String> variants) {
    if (variants == null) {
      return List.of();
    }
    return variants.stream().map(String::trim).filter(v -> !v.isEmpty()).limit(VARIANTS_LIMIT).toList();
  }

  private static SearchSummary searchSummary(List<String> variantsRaw, String hpoTerm) {
    return new SearchSummary()
        .variantsRaw(String.join("\n", variantsRaw))
        .variantsEnteredCount(variantsRaw.size())
        .variantsLimit(VARIANTS_LIMIT)
        .hpoTerm(hpoTerm);
  }

  /**
   * Looks up each requested vid in the configured VAT table and maps what's found onto
   * CohortVariant, in the order requested; any vid with no matching row comes back as an
   * `annotated: false` placeholder instead of being silently dropped.
   */
  private List<CohortVariant> fetchSearchedCohortVariants(List<String> vids) {
    var configuration =
        QueryJobConfiguration.newBuilder(SEARCH_COHORT_VARIANTS_SQL.formatted(properties.tableRef()))
            .addNamedParameter(
                "vids", QueryParameterValue.array(vids.toArray(new String[0]), StandardSQLTypeName.STRING))
            .setMaximumBytesBilled(MAXIMUM_BYTES_BILLED)
            .build();
    Map<String, CohortVariant> byVid = new LinkedHashMap<>();
    for (FieldValueList row : runQuery(configuration)) {
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

  private Iterable<FieldValueList> runQuery(QueryJobConfiguration configuration) {
    log.info("Running BigQuery query: {}", configuration.getQuery());
    try {
      return bigQuery.query(configuration).iterateAll();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while querying BigQuery", e);
    }
  }

  private static CohortVariant vatRowToCohortVariant(FieldValueList row) {
    List<String> consequences = stringList(row, "consequence");
    String classification =
        consequences.stream()
            .map(CONSEQUENCE_TO_CLASSIFICATION::get)
            .filter(Objects::nonNull)
            .findFirst()
            .orElse(null);

    String aouSubpop = string(row, "gvs_max_subpop");
    String gnomadSubpop = string(row, "gnomad_max_subpop");

    CohortVariant.ClinvarSignificanceEnum clinvarSignificance =
        stringList(row, "clinvar_classification").stream()
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
    // "Conflicting" means this variant's own RCV submissions disagree with each other, not that
    // its classification differs from some other source.
    boolean clinvarHasConflicts = clinvarRcvClassifications.stream().distinct().count() > 1;

    Double spliceAiAcceptorGain = doubleValue(row, "splice_ai_acceptor_gain_score");
    Double spliceAiAcceptorLoss = doubleValue(row, "splice_ai_acceptor_loss_score");
    Double spliceAiDonorGain = doubleValue(row, "splice_ai_donor_gain_score");
    Double spliceAiDonorLoss = doubleValue(row, "splice_ai_donor_loss_score");
    // SpliceAI's headline delta score (shown in the collapsed row) is the max of the four.
    // Stream.of (not List.of) because these are frequently null, and List.of rejects nulls.
    Double spliceAi =
        Stream.of(spliceAiAcceptorGain, spliceAiAcceptorLoss, spliceAiDonorGain, spliceAiDonorLoss)
            .filter(Objects::nonNull)
            .max(Double::compareTo)
            .orElse(null);

    String rawLof = string(row, "LoF");
    String clinvarLastUpdated = string(row, "clinvar_last_updated");

    boolean inGnomad = gnomadSubpop != null;
    boolean inClinvar = clinvarSignificance != null;
    String variant = string(row, "vid");
    return new CohortVariant()
        .variant(variant)
        .gene(string(row, "gene_symbol"))
        .annotated(true)
        .classification(classification)
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
        .clinvarLastEvaluated(clinvarLastUpdated == null ? null : LocalDate.parse(clinvarLastUpdated))
        .clinvarSubmissions(clinvarSubmissions(clinvarRcvIds, clinvarRcvClassifications, clinvarRcvStars))
        .spliceAi(bigDecimal(spliceAi))
        .spliceAiAcceptorGain(bigDecimal(spliceAiAcceptorGain))
        .spliceAiAcceptorLoss(bigDecimal(spliceAiAcceptorLoss))
        .spliceAiDonorGain(bigDecimal(spliceAiDonorGain))
        .spliceAiDonorLoss(bigDecimal(spliceAiDonorLoss))
        .plof("HC".equals(rawLof) ? CohortVariant.PlofEnum.HC : null)
        .plofConfidence(rawLof == null ? null : CohortVariant.PlofConfidenceEnum.fromValue(rawLof))
        .lofFlags(stringList(row, "LoF_flags"))
        .transcript(string(row, "transcript"))
        .exonNumber(string(row, "exon_number"));
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

  private static String string(FieldValueList row, String column) {
    FieldValue value = row.get(column);
    return value.isNull() ? null : value.getStringValue();
  }

  private static Double doubleValue(FieldValueList row, String column) {
    FieldValue value = row.get(column);
    return value.isNull() ? null : value.getDoubleValue();
  }

  private static Integer intValue(FieldValueList row, String column) {
    FieldValue value = row.get(column);
    return value.isNull() ? null : (int) value.getLongValue();
  }

  private static List<String> stringList(FieldValueList row, String column) {
    FieldValue value = row.get(column);
    return value.isNull()
        ? List.of()
        : value.getRepeatedValue().stream().map(FieldValue::getStringValue).toList();
  }

  // Collectors.toList() (not Stream.toList()) because an element of clinvar_rcv_num_stars can
  // itself be null, and Stream.toList() -- like List.of() -- rejects nulls. (stringList doesn't
  // need this: its callers map results through Map.of(...)::get, which throws on a null key.)
  private static List<Integer> intList(FieldValueList row, String column) {
    FieldValue value = row.get(column);
    return value.isNull()
        ? List.of()
        : value.getRepeatedValue().stream()
            .map(v -> v.isNull() ? null : (int) v.getLongValue())
            .collect(Collectors.toList());
  }

  private static BigDecimal bigDecimal(Double value) {
    return value == null ? null : BigDecimal.valueOf(value);
  }
}
