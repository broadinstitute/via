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

/**
 * The favicon's navy: the tile behind the lens. It is the app's ink for titles and key figures, its
 * one interactive colour, and its brand colour, so the mark and the page it sits on agree. At 9.8:1
 * on white it carries small text with room to spare.
 */
const NAVY = "#074770";

const colors = {
  // Ink
  textPrimary: NAVY,
  textBody: "#2b2b33",
  textSecondary: "#5b5f73",
  textMuted: "#9598a6",
  textAccent: NAVY,
  textSuccess: "#3b6d11",
  textWarning: "#854f0b",
  textDanger: "#a32d2d",

  // Brand, from the logo's navy tile and green variant rung
  brandNavy: NAVY,
  brandGreen: "#5cc88d",

  // Call to action: the navy itself, so the one filled button in a view is the mark's tile. A step
  // deeper under the pointer.
  brandNavyHover: "#063a5c",

  // Surfaces, from the page backdrop (0) up to cards sitting on it (2)
  surface0: "#f6f5f2",
  surface1: "#fbfaf8",
  surface2: "#ffffff",
  border: "#e2e1dc",
  borderStrong: "#c7c6c0",
  /** borderStrong a step darker: a field's border under the pointer. */
  borderHover: "#a9a8a1",

  // Tinted fills, each paired with the ink of the same name
  bgAccent: "#e1edf4",
  bgSuccess: "#eaf3de",
  bgWarning: "#faeeda",
  bgDanger: "#fcebeb",

  white: "#ffffff",
  /** The hero's navy at its top edge, deepening into textPrimary below. */
  heroDeep: "#052f4c",
  /** The teal glow in the hero's bottom-left corner. */
  heroGlowTeal: "#1a9a86",
  /** The blue glow in the hero's top-right corner: lighter than the navy it sits on, so it shows. */
  heroGlowBlue: "#2f8fcf",

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
 * `strong` is for the variants table, where the tint separates its side-by-side column groups;
 * `soft` is for the population table nested inside an expanded row, where the same distinction
 * only needs a hint. Both share one `hover` value so a hovered row reads as a single band.
 */
export const sourceTints = {
  aou: { strong: "#eaf2f8", soft: "#f6f9fc", hover: "#e1ecf4" },
  gnomad: { strong: "#f1f0ec", soft: "#fafbfb", hover: "#e9e8e3" },
  /** The phenotype-matched column group in the merged table: the accent's own tint, a step deeper than aou's. */
  matched: { strong: "#dfeaf2", hover: "#d4e3ee" },
} as const;

/** Marks the subpopulation with the highest allele frequency in the population table. */
export const POPMAX_BACKGROUND = "#d9e6f0";

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