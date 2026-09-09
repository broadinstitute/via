package org.broadinstitute.variantinterpretation;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.FieldValue;
import com.google.cloud.bigquery.FieldValueList;
import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.QueryParameterValue;
import com.google.cloud.bigquery.StandardSQLTypeName;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.broadinstitute.variantinterpretation.api.SearchApi;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
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

  // Limits the selected columns to what we display to the user in the "rule it out" table.
  private static final String SELECT_COLUMNS =
      """
      SELECT vid, gene_symbol, aa_change, consequence,
             gvs_max_subpop, gvs_max_af, gvs_max_ac, gvs_max_an,
             gnomad_max_subpop, gnomad_max_af, gnomad_max_ac, gnomad_max_an,
             clinvar_classification,
             splice_ai_acceptor_gain_score, splice_ai_acceptor_loss_score,
             splice_ai_donor_gain_score, splice_ai_donor_loss_score,
             LoF
      FROM %s
      """;

  private static final String SEARCH_COHORT_VARIANTS_SQL = SELECT_COLUMNS + "WHERE vid IN UNNEST(@vids)";

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

    // SpliceAI's headline delta score is the max of its four gain/loss scores.
    Double spliceAi =
        List.of(
                "splice_ai_acceptor_gain_score",
                "splice_ai_acceptor_loss_score",
                "splice_ai_donor_gain_score",
                "splice_ai_donor_loss_score")
            .stream()
            .map(column -> doubleValue(row, column))
            .filter(Objects::nonNull)
            .max(Double::compareTo)
            .orElse(null);

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
        .gnomadSubpopulation(
            gnomadSubpop == null ? null : CohortVariant.GnomadSubpopulationEnum.fromValue(gnomadSubpop.toUpperCase()))
        .gnomadAf(bigDecimal(doubleValue(row, "gnomad_max_af")))
        .gnomadAc(intValue(row, "gnomad_max_ac"))
        .gnomadAn(intValue(row, "gnomad_max_an"))
        .gnomadUrl(inGnomad ? "https://gnomad.broadinstitute.org/variant/" + variant : null)
        .clinvarSignificance(clinvarSignificance)
        .clinvarUrl(inClinvar ? "https://www.ncbi.nlm.nih.gov/clinvar/?term=" + variant : null)
        .spliceAi(bigDecimal(spliceAi))
        .plof("HC".equals(string(row, "LoF")) ? CohortVariant.PlofEnum.HC : null);
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

  private static BigDecimal bigDecimal(Double value) {
    return value == null ? null : BigDecimal.valueOf(value);
  }

}
