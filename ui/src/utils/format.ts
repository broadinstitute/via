export function formatInt(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatAcAn(ac: number, an: number): string {
  return `${formatInt(ac)} / ${formatInt(an)}`;
}

/** Below this, four decimals would round a real frequency down to "0.0000". */
const SMALLEST_FIXED_AF = 0.0001;

/**
 * An allele frequency to four decimals. A rare variant's (most pathogenic ones, at around 1 in
 * 100,000) reads "< 0.0001" rather than rounding to "0.0000", which would claim none were seen --
 * keeping the column narrow, with the exact figure in exactAf and the counts beside it in AC/AN.
 * A true zero stays "0.0000".
 */
export function formatAf(af: number): string {
  if (af === 0 || af >= SMALLEST_FIXED_AF) return af.toFixed(4);
  return `< ${SMALLEST_FIXED_AF.toFixed(4)}`;
}

/**
 * The exact figure behind a frequency formatAf abbreviates, for a tooltip: plain decimals to two
 * significant digits, e.g. "0.0000043". Undefined when formatAf already shows it.
 */
export function exactAf(af: number): string | undefined {
  if (af === 0 || af >= SMALLEST_FIXED_AF) return undefined;
  // Decimals up to and including the second significant digit: 0.0000043's first is in the 6th
  // place (floor(log10) = -6), so it needs 7.
  return af.toFixed(1 - Math.floor(Math.log10(af)));
}

/** e.g. "2024-02-14" -> "14 Feb 2024". */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
