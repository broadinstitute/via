package org.broadinstitute.variantinterpretation.datasource;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Covers the two pieces of the lookup that don't need BigQuery: how free text becomes match
 * terms, and how those terms become LIKE patterns. The query behaviour itself is exercised
 * against the synthetic fixture in the dev dataset -- see data/README.md.
 */
class ConditionLookupServiceTest {

  @Test
  void matchTerms_lowercasesAndStripsPunctuation() {
    assertThat(ConditionLookupService.matchTerms("Tetralogy of Fallot,"))
        .containsExactly("tetralogy", "fallot");
  }

  /**
   * The stopword regression. Requiring the literal token "of" would exclude the inverted
   * synonym "Fallot tetralogy" -- exactly the word-order case this matching exists to catch.
   * If someone deletes STOP_WORDS as cosmetic, this is what should fail.
   */
  @Test
  void matchTerms_dropsConnectives() {
    assertThat(ConditionLookupService.matchTerms("tetralogy of fallot")).doesNotContain("of");
    assertThat(ConditionLookupService.matchTerms("diabetes with renal complications"))
        .containsExactly("diabetes", "renal", "complications");
  }

  /** Single characters carry no signal and match nearly everything as a substring. */
  @Test
  void matchTerms_dropsSingleCharacterTokens() {
    assertThat(ConditionLookupService.matchTerms("type 2 diabetes"))
        .containsExactly("type", "diabetes");
  }

  /**
   * A query of nothing but connectives falls back to the unfiltered tokens, so it searches
   * for something rather than reducing to an empty predicate that matches every row.
   */
  @Test
  void matchTerms_fallsBackWhenEveryTokenIsAStopWord() {
    assertThat(ConditionLookupService.matchTerms("of the")).containsExactly("of", "the");
  }

  @Test
  void matchTerms_isEmptyForTextWithNoUsableTokens() {
    assertThat(ConditionLookupService.matchTerms("a ( )")).isEmpty();
  }

  @Test
  void likePattern_wrapsInWildcards() {
    assertThat(ConditionLookupService.likePattern("fallot")).isEqualTo("%fallot%");
  }

  /**
   * "%" and "_" typed by a user are LIKE wildcards. Escaping them is not about injection --
   * the term is a bound parameter either way -- but about "type_2" not also matching
   * "type 2". Verified against BigQuery: an escaped underscore matches literally.
   */
  @Test
  void likePattern_escapesWildcardsInUserInput() {
    assertThat(ConditionLookupService.likePattern("type_2")).isEqualTo("%type\\_2%");
    assertThat(ConditionLookupService.likePattern("50%")).isEqualTo("%50\\%%");
    assertThat(ConditionLookupService.likePattern("a\\b")).isEqualTo("%a\\\\b%");
  }

  @Test
  void likePattern_leavesOrdinaryPunctuationAlone() {
    assertThat(ConditionLookupService.likePattern("fallot's")).isEqualTo("%fallot's%");
  }

  /** Nothing picked means no query, and leaves the response field null. */
  @Test
  void search_returnsNullWhenNoConceptWasPicked() {
    // A null BigQuery client is the assertion: touching it would NPE.
    ConditionLookupService service = new ConditionLookupService(null, null);
    assertThat(service.search(null)).isNull();
  }

  /**
   * The dropdown calls this on every keystroke, including when the box is emptied. A blank
   * term must not run a query -- a null BigQuery client is the assertion -- and must not come
   * back as an error the UI has to handle.
   */
  @Test
  void candidates_returnsEmptyForBlankTerm() {
    ConditionLookupService service = new ConditionLookupService(null, null);

    for (String blank : new String[] {null, "", "   "}) {
      var result = service.candidates(blank);
      assertThat(result).isNotNull();
      assertThat(result.getTerm()).isEmpty();
      assertThat(result.getCandidates()).isEmpty();
    }
  }

  /** Echoed back trimmed, so a type-ahead can match a response to the keystroke it came from. */
  @Test
  void candidates_echoesTheTrimmedTerm() {
    ConditionLookupService service = new ConditionLookupService(null, null);
    assertThat(service.candidates("  ( )  ").getTerm()).isEqualTo("( )");
  }

  @Test
  void candidates_returnsEmptyWhenNoUsableTerms() {
    ConditionLookupService service = new ConditionLookupService(null, null);
    assertThat(service.candidates("( )").getCandidates()).isEmpty();
  }

  @Test
  void matchTerms_keepsTermsThatAreOnlyPartialWords() {
    // Substring matching is the point of choosing LIKE over SEARCH(): "diabet" has to survive
    // tokenization to be able to match "diabetes" in the query.
    assertThat(ConditionLookupService.matchTerms("diabet")).containsExactly("diabet");
    assertThat(List.of(ConditionLookupService.likePattern("diabet"))).containsExactly("%diabet%");
  }
}
