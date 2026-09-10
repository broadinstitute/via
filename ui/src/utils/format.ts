export function formatInt(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatAcAn(ac: number, an: number): string {
  return `${formatInt(ac)} / ${formatInt(an)}`;
}

export function formatAf(af: number): string {
  return af.toFixed(4);
}

// en-GB gives day-month-year order ("14 Feb 2024") without needing to hand-build the string.
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** "2024-02-14" -> "14 Feb 2024". */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
}
