export function formatInt(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatAcAn(ac: number, an: number): string {
  return `${formatInt(ac)} / ${formatInt(an)}`;
}

export function formatAf(af: number): string {
  return af.toFixed(4);
}
