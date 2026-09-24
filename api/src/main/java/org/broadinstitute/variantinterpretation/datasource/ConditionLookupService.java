package org.broadinstitute.variantinterpretation.datasource;

import com.google.cloud.bigquery.BigQuery;
import com.google.cloud.bigquery.FieldValue;
import com.google.cloud.bigquery.FieldValueList;
import com.google.cloud.bigquery.QueryJobConfiguration;
import com.google.cloud.bigquery.QueryParameterValue;
import com.google.cloud.bigquery.StandardSQLTypeName;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Stream;

import org.broadinstitute.variantinterpretation.model.ConditionCandidates;
import org.broadinstitute.variantinterpretation.model.ConditionConcept;
import org.broadinstitute.variantinterpretation.model.ConditionSearch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Free text -> condition concept_id -> participant count, against the All of Us
 * {@code cb_criteria}, {@code concept_ancestor} and {@code condition_occurrence} tables.
 *
 * <p>Condition domain only. A term that maps onto a drug, measurement or procedure concept
 * comes back with no candidates rather than being routed elsewhere, which is a visible
 * failure; the other domains get added when something actually needs them.
 *
 * <p>Two things here are load-bearing and shouldn't be simplified away:
 *
 * <ul>
 *   <li><b>Descendant expansion through {@code concept_ancestor}.</b> EHR data lands on
 *       specific leaf concepts, not the parent that was searched for, so matching the seed
 *       concept alone undercounts — silently. Against the synthetic fixture, seeding on
 *       Tetralogy of Fallot returns 49 participants expanded and 40 unexpanded.
 *   <li><b>Ranking by {@code est_count}.</b> The only reason to use {@code cb_criteria}
 *       instead of the plain vocabulary tables. A concept can be perfectly named, perfectly
 *       standard, and have zero participants in this CDR — which is invisible in
 *       {@code concept}. Count ranking is what makes auto-selecting a top candidate
 *       defensible at all.
 * </ul>
 */
@Service
public class ConditionLookupService {

  private static final Logger log = LoggerFactory.getLogger(ConditionLookupService.class);

  // Fixed CDR table names; only the dataset varies. See BigQueryProperties#cdrTable(String).
  private static final String CB_CRITERIA = "cb_criteria";
  private static final String CONCEPT_ANCESTOR = "concept_ancestor";
  private static final String CONDITION_OCCURRENCE = "condition_occurrence";

  /** Every CDR table this service queries, for the access check in SystemController. */
  public static final List<String> CDR_TABLES =
      List.of(CB_CRITERIA, CONCEPT_ANCESTOR, CONDITION_OCCURRENCE);

  // Matches SearchResultsController: keeps development cost down and turns an accidental
  // full-table scan of condition_occurrence into an error rather than a bill. See VIA-50.
  private static final long MAXIMUM_BYTES_BILLED = 100L * 1024 * 1024;

  private static final int CANDIDATES_LIMIT = 50;

  /**
   * Connectives, dropped from the required terms. This is load-bearing rather than tidiness:
   * requiring the literal token "of" would exclude the synonym "Fallot tetralogy", which is
   * exactly the inverted-word-order case this matching exists to catch.
   */
  private static final Set<String> STOP_WORDS =
      Set.of("of", "the", "and", "or", "with", "in", "to", "for", "by", "on", "at", "as");

  /**
   * Substring matching, not whole-token matching. BigQuery's {@code SEARCH()} works on this
   * table and would avoid spurious substring hits, but it matches whole tokens only, so
   * "diabet" finds nothing — a bad trade for a search box someone types into. If the enclave
   * turns out to need token semantics, this predicate is the only thing that changes.
   *
   * <p>{@code est_count} is SAFE_CAST rather than read as an INT64 because the column has been
   * seen typed STRING in some CDR releases, and carries -1 as well as NULL.
   */
  private static final String SEARCH_CONCEPTS_SQL =
      """
      SELECT DISTINCT
          concept_id,
          name,
          SAFE_CAST(est_count AS INT64) AS est_count
      FROM %s
      WHERE is_standard = 1
        AND concept_id IS NOT NULL
        AND domain_id = "CONDITION"
        AND %s
      ORDER BY LOWER(TRIM(name)) = @exactName DESC, est_count DESC NULLS LAST
      LIMIT %d
      """;

  /**
   * Resolves concepts the user actually picked. Filtered to standard condition concepts on
   * purpose: an id that isn't one is dropped rather than seeded on, so a stale or hand-edited
   * URL can't produce a cohort counted over something that isn't a condition.
   */
  private static final String RESOLVE_CONCEPTS_SQL =
      """
      SELECT DISTINCT
          concept_id,
          name,
          SAFE_CAST(est_count AS INT64) AS est_count
      FROM %s
      WHERE is_standard = 1
        AND domain_id = "CONDITION"
        AND concept_id IN UNNEST(@conceptIds)
      ORDER BY est_count DESC NULLS LAST
      """;

  private static final String COHORT_COUNT_SQL =
      """
      SELECT COUNT(DISTINCT co.person_id) AS participants
      FROM %s co
      WHERE co.condition_concept_id IN (
          SELECT descendant_concept_id
          FROM %s
          WHERE ancestor_concept_id IN UNNEST(@seeds)
      )
      """;

  private final BigQuery bigQuery;
  private final BigQueryProperties properties;

  public ConditionLookupService(BigQuery bigQuery, BigQueryProperties properties) {
    this.bigQuery = bigQuery;
    this.properties = properties;
  }

  /**
   * Stage one on its own: text to ranked candidates, no expansion and no participant count.
   * This is what the phenotype search box's dropdown runs on every keystroke, so it stays one
   * query against {@code cb_criteria}.
   *
   * <p>A blank term yields no candidates rather than an error or a match-everything query, so
   * a type-ahead doesn't have to special-case the empty box.
   */
  public ConditionCandidates candidates(String term) {
    String trimmed = term == null ? "" : term.trim();
    return new ConditionCandidates().term(trimmed).candidates(findRankedCandidates(trimmed));
  }

  /**
   * Both stages: concepts, then a participant count over them.
   *
   * <p>Two ways in. When {@code conceptIds} is given the user picked something explicitly, so
   * those concepts are resolved and counted directly. Otherwise the free text is searched and
   * the best candidate auto-selected. Returns null when neither is supplied, so the response
   * field stays null when no condition was asked for.
   */
  public ConditionSearch search(String term, List<Long> conceptIds) {
    String trimmed = term == null ? "" : term.trim();
    List<Long> requested = conceptIds == null ? List.of() : conceptIds;
    if (trimmed.isEmpty() && requested.isEmpty()) {
      return null;
    }

    List<ConditionConcept> candidates =
        requested.isEmpty() ? findRankedCandidates(trimmed) : resolveConcepts(requested);
    List<Long> selected =
        requested.isEmpty() ? autoSelect(candidates) : candidates.stream().map(ConditionConcept::getConceptId).toList();

    return new ConditionSearch()
        .term(trimmed)
        .candidates(candidates)
        .selectedConceptIds(selected)
        .participantCount(selected.isEmpty() ? null : countParticipants(selected));
  }

  /**
   * The best candidate with at least one estimated participant.
   *
   * <p>The estimate floor is why an explicit selection has to be a separate path: a concept
   * with est_count 0 is real in the vocabulary and absent from the data, so auto-selecting it
   * would return an empty cohort that reads as a bug. When the user picks that concept
   * deliberately, an empty cohort is the answer they asked for.
   */
  private static List<Long> autoSelect(List<ConditionConcept> candidates) {
    // getEstimatedParticipantCount() is JsonNullable, and its value can itself be null (the
    // column is nullable), so this unwraps both layers before comparing.
    return candidates.stream()
        .filter(c -> {
          Integer estimate = c.getEstimatedParticipantCount().orElse(null);
          return estimate != null && estimate >= 1;
        })
        .findFirst()
        .map(c -> List.of(c.getConceptId()))
        .orElseGet(List::of);
  }

  private List<ConditionConcept> resolveConcepts(List<Long> conceptIds) {
    var configuration =
        QueryJobConfiguration.newBuilder(
                RESOLVE_CONCEPTS_SQL.formatted(properties.cdrTableRef(CB_CRITERIA)))
            .addNamedParameter(
                "conceptIds",
                QueryParameterValue.array(conceptIds.toArray(new Long[0]), StandardSQLTypeName.INT64))
            .setMaximumBytesBilled(MAXIMUM_BYTES_BILLED)
            .build();
    return toConcepts(runQuery(configuration));
  }

  /** Stage one, shared by both entry points. Empty for a term with no usable tokens. */
  private List<ConditionConcept> findRankedCandidates(String trimmedTerm) {
    if (trimmedTerm.isEmpty()) {
      return List.of();
    }
    List<String> terms = matchTerms(trimmedTerm);
    return terms.isEmpty() ? List.of() : findCandidates(trimmedTerm, terms);
  }

  /**
   * Tokenizes the query the way the matching needs it: lowercased, punctuation stripped,
   * single characters and connectives dropped.
   *
   * <p>Falls back to the unfiltered tokens when every one of them is a stop word, so that
   * searching "in the" is a search for something rather than a match against everything.
   */
  static List<String> matchTerms(String text) {
    List<String> tokens =
        Stream.of(text.toLowerCase(Locale.ROOT).split("\\s+"))
            .map(t -> t.replaceAll("^[,.;:()]+|[,.;:()]+$", ""))
            .filter(t -> t.length() > 1)
            .toList();
    List<String> kept = tokens.stream().filter(t -> !STOP_WORDS.contains(t)).toList();
    return kept.isEmpty() ? tokens : kept;
  }

  /**
   * Escapes a term for use inside a LIKE pattern. The term is already a bound parameter, so
   * this isn't about injection: it's that "%" and "_" in what someone typed are LIKE
   * wildcards, and a search for "type_2" should not also match "type 2".
   */
  static String likePattern(String term) {
    String escaped =
        term.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_");
    return "%" + escaped + "%";
  }

  private List<ConditionConcept> findCandidates(String rawTerm, List<String> terms) {
    // One bound parameter per term, ANDed: every term must appear somewhere in full_text,
    // which is the concept name and its synonyms concatenated.
    List<String> predicates = new ArrayList<>();
    for (int i = 0; i < terms.size(); i++) {
      predicates.add("LOWER(full_text) LIKE @term" + i);
    }

    var builder =
        QueryJobConfiguration.newBuilder(
                SEARCH_CONCEPTS_SQL.formatted(
                    properties.cdrTableRef(CB_CRITERIA),
                    String.join(" AND ", predicates),
                    CANDIDATES_LIMIT))
            .addNamedParameter("exactName", QueryParameterValue.string(rawTerm.toLowerCase(Locale.ROOT)))
            .setMaximumBytesBilled(MAXIMUM_BYTES_BILLED);
    for (int i = 0; i < terms.size(); i++) {
      builder.addNamedParameter("term" + i, QueryParameterValue.string(likePattern(terms.get(i))));
    }

    return toConcepts(runQuery(builder.build()));
  }

  private static List<ConditionConcept> toConcepts(Iterable<FieldValueList> rows) {
    List<ConditionConcept> concepts = new ArrayList<>();
    for (FieldValueList row : rows) {
      concepts.add(
          new ConditionConcept()
              .conceptId(row.get("concept_id").getLongValue())
              .name(row.get("name").getStringValue())
              .estimatedParticipantCount(intOrNull(row, "est_count")));
    }
    return concepts;
  }

  private Integer countParticipants(List<Long> seedConceptIds) {
    var configuration =
        QueryJobConfiguration.newBuilder(
                COHORT_COUNT_SQL.formatted(
                    properties.cdrTableRef(CONDITION_OCCURRENCE),
                    properties.cdrTableRef(CONCEPT_ANCESTOR)))
            .addNamedParameter(
                "seeds",
                QueryParameterValue.array(seedConceptIds.toArray(new Long[0]), StandardSQLTypeName.INT64))
            .setMaximumBytesBilled(MAXIMUM_BYTES_BILLED)
            .build();
    for (FieldValueList row : runQuery(configuration)) {
      return (int) row.get("participants").getLongValue();
    }
    return 0;
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

  private static Integer intOrNull(FieldValueList row, String column) {
    FieldValue value = row.get(column);
    return value.isNull() ? null : (int) value.getLongValue();
  }
}
