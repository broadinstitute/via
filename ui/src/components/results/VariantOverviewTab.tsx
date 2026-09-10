import type { AnnotatedCohortVariant } from "../../types/results";
import { clinvarColorTier, clinvarLabel } from "../../utils/clinvar";
import { formatAf } from "../../utils/format";
import ClinvarDetailCard from "./ClinvarDetailCard";
import styles from "./VariantOverviewTab.module.css";

interface MaxAf {
  af: number;
  source: string;
  population: string;
}

function maxAfSource(variant: AnnotatedCohortVariant): MaxAf | null {
  const candidates: MaxAf[] = [];
  if (variant.aouAf !== null && variant.aouSubpopulation) {
    candidates.push({ af: variant.aouAf, source: "AoU", population: variant.aouSubpopulation });
  }
  if (variant.gnomadAf !== null && variant.gnomadSubpopulation) {
    candidates.push({ af: variant.gnomadAf, source: "gnomAD", population: variant.gnomadSubpopulation });
  }
  if (candidates.length === 0) return null;
  return candidates.reduce((max, candidate) => (candidate.af > max.af ? candidate : max));
}

interface VariantOverviewTabProps {
  variant: AnnotatedCohortVariant;
}

export default function VariantOverviewTab({ variant }: VariantOverviewTabProps) {
  const maxAf = maxAfSource(variant);

  return (
    <div>
      <dl className={styles.summary}>
        <div className={styles.row}>
          <dt className={styles.label}>ClinVar</dt>
          <dd className={styles.value}>
            {variant.clinvarSignificance ? (
              <>
                <span className={styles[clinvarColorTier(variant.clinvarSignificance)]}>
                  {clinvarLabel(variant.clinvarSignificance)}
                </span>
                {variant.clinvarStars !== null && ` · ${variant.clinvarStars}★`}
              </>
            ) : (
              "No submissions"
            )}
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Consequence</dt>
          <dd className={styles.value}>{variant.classification ?? "—"}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Max AF</dt>
          <dd className={styles.value}>
            {maxAf ? (
              <>
                <span className={styles.mono}>{formatAf(maxAf.af)}</span>{" "}
                <span className={styles.caption}>
                  {maxAf.source} {maxAf.population}
                </span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>SpliceAI</dt>
          <dd className={`${styles.value} ${styles.mono}`}>
            {variant.spliceAi !== null ? variant.spliceAi.toFixed(4) : "—"}
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>pLOF</dt>
          <dd className={styles.value}>
            {variant.plofConfidence === "HC" ? "High confidence" : variant.plofConfidence === "LC" ? "Low confidence" : "—"}
          </dd>
        </div>
      </dl>

      <div className={styles.divider} />

      <ClinvarDetailCard variant={variant} />
    </div>
  );
}
