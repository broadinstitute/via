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
import org.broadinstitute.variantinterpretation.api.SearchResultsApi;
import org.broadinstitute.variantinterpretation.model.BreakdownSegment;
import org.broadinstitute.variantinterpretation.model.CohortVariant;
import org.broadinstitute.variantinterpretation.model.FilteredVariant;
import org.broadinstitute.variantinterpretation.model.PhenotypeCrosswalk;
import org.broadinstitute.variantinterpretation.model.SearchResultsResponse;
import org.broadinstitute.variantinterpretation.model.SearchSummary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SearchResultsController implements SearchResultsApi {

  private static final Logger log = LoggerFactory.getLogger(SearchResultsController.class);

  // The configured table is ~1,000 synthetic rows (a few MB) -- this caps what BigQuery is
  // allowed to bill for the query so that pointing this at a much larger table by mistake fails
  // loudly instead of quietly running up cost.
  private static final long MAXIMUM_BYTES_BILLED = 100L * 1024 * 1024;

  // Arbitrary, just to keep the browse listing (no variants submitted) a reasonable size.
  private static final int BROWSE_LIMIT = 20;

  // Matches the "limit 50" the UI already advertises for how many variants can be entered;
  // enforced again here since a request isn't bound by what the UI happens to allow client-side.
  private static final int VARIANTS_LIMIT = 50;

  // Default HPO term shown until a real phenotype search is wired up -- keeps the landing
  // experience (and phenotypeCrosswalk(), which is hardcoded to this same term) consistent
  // when the caller hasn't entered one yet.
  private static final String DEFAULT_HPO_TERM = "HP:0001636";

  // Only the columns the CohortVariant mapping below actually reads -- selecting the rest of the
  // VAT's ~114 columns would cost nothing extra on a table this small, but there's no reason to.
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

  private static final String BROWSE_COHORT_VARIANTS_SQL = SELECT_COLUMNS + "ORDER BY vid LIMIT %d";

  private static final String SEARCH_COHORT_VARIANTS_SQL = SELECT_COLUMNS + "WHERE vid IN UNNEST(@vids)";

  // VAT consequence terms (VEP) that map onto the simplified labels used elsewhere in this
  // table; anything else is left as an unclassified (null) row rather than guessed at.
  private static final Map<String, String> CONSEQUENCE_TO_CLASSIFICATION =
      Map.of(
          "missense_variant", "Missense",
          "synonymous_variant", "Synonymous",
          "stop_gained", "Nonsense",
          "frameshift_variant", "Frameshift",
          "splice_donor_variant", "Splice site",
          "splice_acceptor_variant", "Splice site");

  // Only classifications with an unambiguous match in ClinvarSignificanceEnum; "Likely
  // pathogenic", "Conflicting interpretations", etc. have no equivalent and are left null.
  private static final Map<String, CohortVariant.ClinvarSignificanceEnum> CLINVAR_SIGNIFICANCE =
      Map.of(
          "Pathogenic", CohortVariant.ClinvarSignificanceEnum.PATHOGENIC,
          "Benign", CohortVariant.ClinvarSignificanceEnum.BENIGN,
          "Uncertain significance", CohortVariant.ClinvarSignificanceEnum.VUS);

  private final BigQuery bigQuery;
  private final BigQueryProperties properties;

  public SearchResultsController(BigQuery bigQuery, BigQueryProperties properties) {
    this.bigQuery = bigQuery;
    this.properties = properties;
  }

  @Override
  public ResponseEntity<SearchResultsResponse> searchResults(List<String> variants, String hpoTerm) {
    List<String> requested = normalizeVariants(variants);
    List<CohortVariant> cohortVariants =
        requested.isEmpty() ? fetchBrowseCohortVariants() : fetchSearchedCohortVariants(requested);
    // In browse mode, echo back whatever ended up on screen rather than what was requested (i.e.
    // nothing), so the drawer reopens showing the listing that's actually displayed.
    List<String> variantsRaw =
        requested.isEmpty() ? cohortVariants.stream().map(CohortVariant::getVariant).toList() : requested;
    String effectiveHpoTerm = hpoTerm == null || hpoTerm.isBlank() ? DEFAULT_HPO_TERM : hpoTerm.trim();

    return ResponseEntity.ok(
        new SearchResultsResponse()
            .searchSummary(searchSummary(variantsRaw, effectiveHpoTerm))
            .phenotypeCrosswalk(phenotypeCrosswalk())
            .ancestryBreakdown(ancestryBreakdown())
            .ageBreakdown(ageBreakdown())
            .cohortVariants(cohortVariants)
            .filteredVariants(filteredVariants()));
  }

  // Trims, drops blanks, and caps at VARIANTS_LIMIT -- a request isn't bound by whatever the UI
  // happens to enforce client-side.
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

  private static PhenotypeCrosswalk phenotypeCrosswalk() {
    return new PhenotypeCrosswalk()
        .hpoCode("HP:0001636")
        .omopCode("313867")
        .description("Tetralogy of Fallot")
        .participantCount(214);
  }

  // Counts sum to phenotypeCrosswalk().participantCount (214); percent is each count's
  // share of that total, rounded to 1 decimal, so the two stay consistent with each other.
  private static List<BreakdownSegment> ancestryBreakdown() {
    return List.of(
        segment("EUR", 103, 48.1, "#F9C854"),
        segment("AFR", 42, 19.6, "#2078B4"),
        segment("AMR", 38, 17.8, "#6DACE4"),
        segment("OTH", 19, 8.9, "#B3AEAD"),
        segment("EAS", 7, 3.3, "#A27BD7"),
        segment("SAS", 4, 1.9, "#8CCA90"),
        segment("MID", 1, 0.5, "#CB2D4C"));
  }

  private static List<BreakdownSegment> ageBreakdown() {
    return List.of(
        segment("18–29", 17, 7.9, "#B8DCEF"),
        segment("30–39", 30, 14.0, "#8DC6E5"),
        segment("40–49", 46, 21.5, "#5FAEDA"),
        segment("50–59", 56, 26.2, "#3B8FC4"),
        segment("60–69", 47, 22.0, "#2569A0"),
        segment("70+", 18, 8.4, "#17456F"));
  }

  private static BreakdownSegment segment(String label, int count, double percent, String color) {
    return new BreakdownSegment().label(label).count(count).percent(BigDecimal.valueOf(percent)).color(color);
  }

  /**
   * No variants were requested -- queries the configured VAT table for its first BROWSE_LIMIT
   * rows (by vid) and maps each onto CohortVariant. Just a default listing, not a search result.
   */
  private List<CohortVariant> fetchBrowseCohortVariants() {
    var configuration =
        QueryJobConfiguration.newBuilder(
                BROWSE_COHORT_VARIANTS_SQL.formatted(properties.tableRef(), BROWSE_LIMIT))
            .setMaximumBytesBilled(MAXIMUM_BYTES_BILLED)
            .build();
    List<CohortVariant> variants = new ArrayList<>();
    for (FieldValueList row : runQuery(configuration)) {
      variants.add(vatRowToCohortVariant(row));
    }
    return variants;
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

  private static List<FilteredVariant> filteredVariants() {
    return List.of(
        filteredVariantWithStats("8-11708582-C-T", "Missense", 1, 428, 0.0023, 0, 1, 0, 0.7),
        filteredVariantWithStats("8-11708590-G-GAA", "Frameshift", 32, 428, 0.0748, 4, 24, 2, 40.7),
        filteredVariantWithStats("8-11708598-T-C", "Synonymous", 21, 428, 0.0491, 1, 19, 0, 1.0),
        filteredVariantWithStats("8-11708605-A-G", "Missense", 3, 428, 0.007, 0, 3, 0, 1.1),
        filteredVariantWithStats("8-11708613-C-T", "Nonsense", 0, 428, 0.0, 0, 0, 0, 0.0),
        filteredVariantWithStats("8-11708621-G-T", "Splice site", 2, 428, 0.0047, 0, 2, 0, 1.2),
        // Absent from AoU entirely, so there are no phenotype-matched cohort stats either.
        unfilteredVariant("8-11708629-T-A", null),
        filteredVariantWithStats("8-11708637-A-C", "Missense", 31, 428, 0.0724, 1, 29, 0, 1.0),
        filteredVariantWithStats("8-11708645-CGGGG-C", "Frameshift", 2, 428, 0.0047, 0, 2, 1, 0.9),
        filteredVariantWithStats("8-11708653-A-G", "Nonsense", 0, 428, 0.0, 0, 0, 0, 0.0),
        filteredVariantWithStats("8-11708661-C-T", "Missense", 2, 428, 0.0047, 0, 2, 0, 1.0),
        filteredVariantWithStats("8-11708669-G-A", "Nonsense", 1, 428, 0.0023, 0, 1, 1, 2.9),
        filteredVariantWithStats("8-11708677-T-C", "Synonymous", 26, 428, 0.0607, 1, 24, 0, 1.0),
        filteredVariantWithStats("8-11708685-A-T", "Missense", 3, 428, 0.007, 0, 3, 0, 1.0),
        filteredVariantWithStats("8-11708693-C-G", "Frameshift", 4, 428, 0.0093, 0, 4, 2, 3.9),
        filteredVariantWithStats("8-11708701-G-T", "Splice site", 1, 428, 0.0023, 0, 1, 0, 0.8),
        filteredVariantWithStats("8-11708709-A-C", "Missense", 17, 428, 0.0397, 0, 17, 0, 1.0),
        filteredVariantWithStats("8-11708717-T-G", "Nonsense", 0, 428, 0.0, 0, 0, 0, 0.0),
        filteredVariantWithStats("8-11708725-C-A", "Synonymous", 23, 428, 0.0537, 1, 21, 0, 1.0),
        filteredVariantWithStats("8-11708733-G-C", "Missense", 3, 428, 0.007, 0, 3, 0, 1.0),
        filteredVariantWithStats("8-11708741-A-G", "Frameshift", 3, 428, 0.007, 0, 3, 1, 17.5));
  }

  private static FilteredVariant filteredVariantWithStats(
      String variant,
      String classification,
      int cohortAc,
      int cohortAn,
      double cohortAf,
      int homozygotes,
      int heterozygotes,
      int clinvarPlpInTrans,
      double afRatio) {
    return new FilteredVariant()
        .variant(variant)
        .gene("GATA4")
        .classification(classification)
        .hasStats(true)
        .cohortAc(cohortAc)
        .cohortAn(cohortAn)
        .cohortAf(BigDecimal.valueOf(cohortAf))
        .homozygotes(homozygotes)
        .heterozygotes(heterozygotes)
        .clinvarPlpInTrans(clinvarPlpInTrans)
        .afRatio(BigDecimal.valueOf(afRatio));
  }

  private static FilteredVariant unfilteredVariant(String variant, String classification) {
    return new FilteredVariant()
        .variant(variant)
        .gene(null)
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
}
