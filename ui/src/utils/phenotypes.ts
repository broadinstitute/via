import type { ConditionConcept } from "../api/conditions";

/**
 * How many phenotypes one search can filter by. The backend takes a single conditionConceptId,
 * so this is 1 for now; the form already holds a list, so raising it is a matter of this
 * number and the URL, not the UI.
 */
export const PHENOTYPES_LIMIT = 1;

/** What a search filters by: the first picked phenotype's concept id, until the backend takes more. */
export function searchConceptId(phenotypes: ConditionConcept[]): number | null {
  return phenotypes[0]?.conceptId ?? null;
}

/** The picked phenotypes named in one line, for a status message: "Tetralogy of Fallot, Long QT". */
export function describePhenotypes(phenotypes: ConditionConcept[]): string {
  return phenotypes.map((phenotype) => phenotype.name).join(", ");
}
