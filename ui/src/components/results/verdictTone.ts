import colors from "../../libs/colors";
import { SIMILARITY_FOLD, type Enrichment, type Verdict } from "../../utils/comparison";

// How each Review verdict looks, in one place: the detail's verdict strip, the rail's dots and
// ratios, and the rail's legend all read from here, so they can't drift apart.

export interface VerdictTone {
  ink: string;
  fill: string;
  word: string;
  /** The rule behind the verdict, for the rail's legend. */
  rule: string;
}

export const VERDICT_TONE: Record<Verdict, VerdictTone> = {
  enriched: { ink: colors.textDanger, fill: colors.bgDanger, word: "Enriched", rule: "interval above 1" },
  depleted: { ink: colors.textAccent, fill: colors.bgAccent, word: "Depleted", rule: "interval below 1" },
  similar: {
    ink: colors.textSecondary,
    fill: colors.surface1,
    word: "Similar frequency",
    rule: `within ${1 / SIMILARITY_FOLD}×–${SIMILARITY_FOLD}×`,
  },
  inconclusive: { ink: colors.textMuted, fill: colors.surface1, word: "Inconclusive", rule: "too few alleles" },
};

const NO_COMPARISON: VerdictTone = { ink: colors.textMuted, fill: colors.surface1, word: "No comparison", rule: "" };

/** The tone for a comparison's verdict, or for a variant with nothing to compare. */
export function verdictTone(enrichment: Enrichment | null): VerdictTone {
  return enrichment ? VERDICT_TONE[enrichment.verdict] : NO_COMPARISON;
}
