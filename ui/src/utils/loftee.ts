// LOFTEE's filter and flag codes, in words a clinician can act on. Codes not listed here (LOFTEE
// adds them between versions) fall back to the code itself rather than disappearing.

/** Why LOFTEE downgraded a call to low confidence. */
const FILTERS: Record<string, string> = {
  END_TRUNC: "falls in the last 5% of the transcript, where truncation may leave the protein intact",
  INCOMPLETE_CDS: "the transcript's start or stop codon is undefined",
  EXON_INTRON_UNDEF: "the exon–intron boundaries around the variant are undefined",
  SMALL_INTRON: "in an intron too small to be spliced normally",
  NON_CAN_SPLICE: "at a non-canonical splice site",
  ANC_ALLELE: "the alternate allele is the ancestral allele",
  NON_DONOR_DISRUPTING: "predicted not to disrupt the splice donor site",
  NON_ACCEPTOR_DISRUPTING: "predicted not to disrupt the splice acceptor site",
  RESCUE_DONOR: "a nearby splice donor site may rescue splicing",
  RESCUE_ACCEPTOR: "a nearby splice acceptor site may rescue splicing",
  GC_TO_GT_DONOR: "turns a GC donor site into the more common GT",
  "5UTR_SPLICE": "a splice variant in the 5′ UTR",
  "3UTR_SPLICE": "a splice variant in the 3′ UTR",
};

/** Warnings LOFTEE attaches to a call, including high-confidence ones. */
const FLAGS: Record<string, string> = {
  SINGLE_EXON: "single-exon transcript, so nonsense-mediated decay is unlikely",
  NAGNAG_SITE: "acceptor site in a NAGNAG motif, where a neighbouring acceptor may rescue splicing",
  PHYLOCSF_WEAK: "the exon is only weakly conserved as protein-coding",
  PHYLOCSF_UNLIKELY_ORF: "the exon is unlikely to be protein-coding",
  NON_CAN_SPLICE_SURR: "a nearby splice site is non-canonical",
};

export interface LofteeCall {
  plof: "HC" | "LC" | null;
  plofFilters: string[];
  plofFlags: string[];
}

function describe(codes: string[], descriptions: Record<string, string>): string {
  return codes.map((code) => descriptions[code] ?? code).join("; ");
}

/** The cell's tooltip: what the call means, and anything that weakens it. */
export function lofteeTooltip({ plof, plofFilters, plofFlags }: LofteeCall): string {
  if (plof === null) {
    return "Not scored by LOFTEE, which only assesses stop-gained, frameshift and essential splice variants.";
  }
  const lines = [
    plof === "HC"
      ? "High-confidence predicted loss of function (LOFTEE)."
      : "Low-confidence predicted loss of function (LOFTEE).",
  ];
  if (plofFilters.length > 0) {
    lines.push(`Downgraded because: ${describe(plofFilters, FILTERS)}.`);
  }
  if (plofFlags.length > 0) {
    lines.push(`Flagged: ${describe(plofFlags, FLAGS)}.`);
  }
  return lines.join("\n");
}

/** Ascending sort order, most concerning first: high confidence, low confidence, not scored. */
export function lofteeRank({ plof }: LofteeCall): number {
  if (plof === "HC") return 0;
  if (plof === "LC") return 1;
  return 2;
}
