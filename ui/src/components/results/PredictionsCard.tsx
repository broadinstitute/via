import type { AnnotatedCohortVariant } from "../../types/results";
import styles from "./PredictionsCard.module.css";

const SPLICE_AI_HIGH_THRESHOLD = 0.8;
const SPLICE_AI_MODERATE_THRESHOLD = 0.5;

interface DeltaProps {
  label: string;
  score: number | null;
}

function Delta({ label, score }: DeltaProps) {
  if (score === null) return null;
  return (
    <div className={styles.delta}>
      <span className={styles.deltaLabel}>{label}</span>
      <span className={styles.deltaValue}>{score.toFixed(4)}</span>
      <span className={styles.deltaBarTrack}>
        <span className={styles.deltaBarFill} style={{ width: `${Math.min(score, 1) * 100}%` }} />
      </span>
    </div>
  );
}

interface PredictionsCardProps {
  variant: AnnotatedCohortVariant;
}

export default function PredictionsCard({ variant }: PredictionsCardProps) {
  const {
    spliceAi,
    spliceAiAcceptorGain,
    spliceAiAcceptorLoss,
    spliceAiDonorGain,
    spliceAiDonorLoss,
    plofConfidence,
    classification,
    lofFlags,
    transcript,
    exonNumber,
  } = variant;

  const hasSpliceAi = spliceAi !== null;
  const hasPlof = plofConfidence !== null;

  if (!hasSpliceAi && !hasPlof) {
    return (
      <div className={styles.card}>
        <div className={styles.heading}>Predictions</div>
        <p className={styles.empty}>No predictions available for this variant.</p>
      </div>
    );
  }

  const maxColorClass =
    spliceAi !== null && spliceAi >= SPLICE_AI_HIGH_THRESHOLD
      ? styles.high
      : spliceAi !== null && spliceAi >= SPLICE_AI_MODERATE_THRESHOLD
        ? styles.moderate
        : "";

  return (
    <div className={styles.card}>
      <div className={styles.heading}>Predictions</div>
      <div className={styles.panels}>
        {hasSpliceAi && (
          <div className={styles.panel}>
            <div className={styles.panelName}>SpliceAI</div>
            <div className={`${styles.maxScore} ${maxColorClass}`}>{spliceAi!.toFixed(4)}</div>
            <div className={styles.maxCaption}>max Δ score</div>
            <div className={styles.deltas}>
              <Delta label="Acceptor gain" score={spliceAiAcceptorGain} />
              <Delta label="Acceptor loss" score={spliceAiAcceptorLoss} />
              <Delta label="Donor gain" score={spliceAiDonorGain} />
              <Delta label="Donor loss" score={spliceAiDonorLoss} />
            </div>
            <p className={styles.thresholdCaption}>
              {spliceAi! >= SPLICE_AI_MODERATE_THRESHOLD
                ? "At or above the 0.5 threshold — a splice effect is predicted."
                : "Below the 0.5 threshold — no splice effect predicted."}
            </p>
          </div>
        )}
        {hasPlof && (
          <div className={styles.panel}>
            <div className={styles.panelName}>pLOF</div>
            <div className={plofConfidence === "HC" ? styles.verdictHc : styles.verdictLc}>
              {plofConfidence === "HC" ? "High confidence" : "Low confidence"}
            </div>
            <dl className={styles.definitionList}>
              {classification && (
                <div className={styles.row}>
                  <dt className={styles.label}>Consequence</dt>
                  <dd className={styles.value}>{classification}</dd>
                </div>
              )}
              <div className={styles.row}>
                <dt className={styles.label}>LOFTEE flags</dt>
                <dd className={styles.value}>{lofFlags.length > 0 ? lofFlags.join(", ") : "None"}</dd>
              </div>
              {transcript && (
                <div className={styles.row}>
                  <dt className={styles.label}>Transcript</dt>
                  <dd className={`${styles.value} ${styles.mono}`}>{transcript}</dd>
                </div>
              )}
              {exonNumber && (
                <div className={styles.row}>
                  <dt className={styles.label}>Exon</dt>
                  <dd className={styles.value}>{exonNumber.replace("/", " of ")}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
