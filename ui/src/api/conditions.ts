/** A condition concept matching a free-text term, as offered in the phenotype dropdown. */
export interface ConditionConcept {
  conceptId: number;
  name: string;
  /**
   * cb_criteria.est_count -- an estimate All of Us maintains, and what the ranking is based on.
   * Not the same number as the participant count /api/search returns for the same concept, and
   * null when the underlying column is null or non-numeric.
   */
  estimatedParticipantCount: number | null;
}

export interface ConditionCandidates {
  /** The term as the backend trimmed it, echoed back. See fetchConditionCandidates. */
  term: string;
  candidates: ConditionConcept[];
}

/**
 * The condition half of a /api/search response. Null there when neither a condition term nor
 * concept ids were given.
 *
 * Note the two counts are different things and will not agree: each candidate's
 * `estimatedParticipantCount` is All of Us's estimate for that concept alone, while
 * `participantCount` is a real count over `selectedConceptIds` *and all their descendants*.
 */
export interface ConditionSearch {
  term: string;
  candidates: ConditionConcept[];
  /** What participantCount was counted over. Empty when nothing qualified. */
  selectedConceptIds: number[];
  /** Null when selectedConceptIds is empty. */
  participantCount: number | null;
}

/**
 * Looks up condition concepts matching free text.
 *
 * This is the cheap half of the condition pipeline: one query against cb_criteria, with no
 * descendant expansion and no participant count, which is why a type-ahead can call it per
 * keystroke. Use fetchSearchResults with a `condition` for the count.
 *
 * Deliberately not cached, unlike fetchSearchResults: every keystroke is a distinct term, so a
 * cache would grow one entry per prefix and almost never hit.
 */
export async function fetchConditionCandidates(
  term: string,
  signal?: AbortSignal,
): Promise<ConditionCandidates> {
  const params = new URLSearchParams({ condition: term });
  const response = await fetch(`/api/condition?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<ConditionCandidates>;
}
