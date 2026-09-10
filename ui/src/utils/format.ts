export function formatInt(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatAcAn(ac: number, an: number): string {
  return `${formatInt(ac)} / ${formatInt(an)}`;
}

export function formatAf(af: number): string {
  return af.toFixed(4);
}

/** e.g. "2024-02-14" -> "14 Feb 2024". */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
