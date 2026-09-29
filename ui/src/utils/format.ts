export function formatInt(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatAcAn(ac: number, an: number): string {
  return `${formatInt(ac)} / ${formatInt(an)}`;
}

/** Below this, four decimals would round a real frequency down to "0.0000". */
const SMALLEST_FIXED_AF = 0.0001;

/**
 * An allele frequency: four decimals, or for a rare variant (most pathogenic ones, at around
 * 1 in 100,000) two significant digits in scientific notation, e.g. "1.2e-5". A true zero stays
 * "0.0000", so it still reads as "none observed" rather than as a very small number.
 */
export function formatAf(af: number): string {
  if (af === 0 || af >= SMALLEST_FIXED_AF) return af.toFixed(4);
  return af.toExponential(1);
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
