/** One variant per line, as entered in the candidate-variants textarea (e.g. "8-11708582-C-T"). */
export function parseVariantsText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Matches the backend's VARIANTS_LIMIT. Search is disabled above it, since the backend would
 * otherwise quietly drop the extras. The results page uses the limit the backend returns instead.
 */
export const VARIANTS_LIMIT = 50;

/** How many variants the text holds, and whether that's a searchable number: 1 up to the limit. */
export function variantEntryStatus(text: string, limit: number) {
  const count = parseVariantsText(text).length;
  const overLimit = count > limit;
  return { count, overLimit, canSearch: count > 0 && !overLimit };
}

/** Why search is disabled when too many variants are entered, and how many to remove. */
export function overLimitMessage(count: number, limit: number): string {
  return `${count} variants entered. Remove ${count - limit} to search (limit ${limit}).`;
}

/**
 * The results page's URL for a search: one `variants` param per variant, plus the picked
 * condition's concept id if there is one. Typed-but-unpicked condition text never gets here --
 * only a concept picked from the list filters a search.
 */
export function resultsPath(variants: string[], conditionConceptId: number | null): string {
  const params = new URLSearchParams();
  for (const variant of variants) {
    params.append("variants", variant);
  }
  if (conditionConceptId !== null) {
    params.set("conditionConceptId", String(conditionConceptId));
  }
  return `/results?${params.toString()}`;
}

/**
 * "Try an example" on the entry page. These are from the synthetic dev dataset
 * (foxtrot_synthetic), chosen to show a spread of results -- different consequences, ClinVar
 * calls, and one not observed in All of Us. Swap for real-CDR variants before this ships against one.
 */
export const EXAMPLE_VARIANTS = [
  "3-4285715-T-A",
  "18-143274802-C-A",
  "X-173948058-A-C",
  "2-122517541-C-G",
  "16-76064540-CTAC-C",
  "7-55181378-G-A",
];
