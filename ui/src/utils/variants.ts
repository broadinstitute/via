/** One variant per line, as entered in the candidate-variants textarea (e.g. "8-11708582-C-T"). */
export function parseVariantsText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
