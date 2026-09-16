// Every color the UI uses, in one place.
//
// These live in TypeScript rather than as CSS custom properties so that inline style objects can
// use them directly (with autocomplete, and a compile error on a typo) and so derived values can
// be computed from them -- see alpha() below, which is where every rgba() shadow and scrim in the
// app comes from. The only colors still written as literals are the two on <body> in style.css,
// which a stylesheet can't read from here.
//
// Names map 1:1 onto the CSS variables these replaced (--text-accent -> textAccent, etc.). Unlike
// Terra UI's colors.js there are no intensity functions (colors.primary(0.5)): VIA's palette is a
// fixed set of semantic ink/surface pairs rather than a brand color to derive shades from, so a
// call on every reference would be noise.

const colors = {
  // Ink
  textPrimary: "#22245b",
  textBody: "#2b2b33",
  textSecondary: "#5b5f73",
  textMuted: "#9598a6",
  textAccent: "#3b7dbf",
  textSuccess: "#3b6d11",
  textWarning: "#854f0b",
  textDanger: "#a32d2d",

  // Call-to-action
  accentOrange: "#e8834e",
  accentOrangeHover: "#d9723d",

  // Surfaces, from the page backdrop (0) up to cards sitting on it (2)
  surface0: "#f6f5f2",
  surface1: "#fbfaf8",
  surface2: "#ffffff",
  border: "#e2e1dc",
  borderStrong: "#c7c6c0",

  // Tinted fills, each paired with the ink of the same name
  bgAccent: "#d8e6ee",
  bgSuccess: "#eaf3de",
  bgWarning: "#faeeda",
  bgDanger: "#fcebeb",

  white: "#ffffff",
  black: "#000000",
  /** Darkens the hero photo enough for white text to stay legible over it. */
  heroScrim: "#0f1432",

  subpopEur: "#F9C854",
  subpopAfr: "#2078B4",
  subpopAmr: "#6DACE4",
  subpopEas: "#A27BD7",
  subpopSas: "#8CCA90",
  subpopMid: "#CB2D4C",
  subpopOth: "#B3AEAD",
  subpopFin: "#6B4226",
  subpopNfe: "#E67E22",
  subpopAsj: "#7B2D8E",
} as const;

export default colors;

/**
 * Background tints that mark which source a table's column group reports -- All of Us or gnomAD.
 *
 * `strong` is for the cohort table, where the tint separates two side-by-side column groups;
 * `soft` is for the population table nested inside an expanded row, where the same distinction
 * only needs a hint. Both share one `hover` value so a hovered row reads as a single band.
 */
export const sourceTints = {
  aou: { strong: "#ebf3fa", soft: "#f7fafd", hover: "#e3edf6" },
  gnomad: { strong: "#f1f0ec", soft: "#fafbfb", hover: "#e9e8e3" },
} as const;

/** Marks the subpopulation with the highest allele frequency in the population table. */
export const POPMAX_BACKGROUND = "#e8f1fa";

/** The same color at partial opacity -- e.g. alpha(colors.textPrimary, 0.14) for a panel shadow. */
export function alpha(hex: string, opacity: number): string {
  const digits = hex.replace("#", "");
  const pairs =
    digits.length === 3
      ? [...digits].map((digit) => digit + digit)
      : [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)];
  const [red, green, blue] = pairs.map((pair) => parseInt(pair, 16));
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}