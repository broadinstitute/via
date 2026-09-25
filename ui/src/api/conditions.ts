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
 * The condition half of a /api/search response. Null there when no concept was picked.
 *
 * Note the two counts are different things and will not agree: the concept's
 * `estimatedParticipantCount` is All of Us's estimate for that concept alone, while
 * `participantCount` is a real count over the concept *and all its descendants*.
 */
export interface ConditionSearch {
  /** The concept ID that was requested. */
  conceptId: number;
  /** Null when conceptId isn't a standard condition concept in this CDR. */
  concept: ConditionConcept | null;
  /** Null when concept is null. */
  participantCount: number | null;
}

/**
 * Looks up condition concepts matching free text.
 *
 * This is the cheap half of the condition pipeline: one query against cb_criteria, with no
 * descendant expansion and no participant count, which is why a type-ahead can call it per
 * keystroke. Use fetchSearchResults with a `conditionConceptId` for the count.
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
