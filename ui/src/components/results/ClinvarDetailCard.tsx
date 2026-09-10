import { useState } from "react";
import type { AnnotatedCohortVariant } from "../../types/results";
import { clinvarColorTier, clinvarLabel, clinvarReviewWords } from "../../utils/clinvar";
import { formatDate } from "../../utils/format";
import styles from "./ClinvarDetailCard.module.css";

// Beyond this many submissions, collapse to a "Show all N" disclosure.
const SUBMISSIONS_VISIBLE_CAP = 6;
const SUBMISSIONS_COLLAPSED_COUNT = 5;

interface ClinvarDetailCardProps {
  variant: AnnotatedCohortVariant;
}

export default function ClinvarDetailCard({ variant }: ClinvarDetailCardProps) {
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const {
    clinvarSignificance,
    clinvarStars,
    clinvarHasConflicts,
    clinvarConditions,
    clinvarLastEvaluated,
    clinvarSubmissions,
    clinvarUrl,
  } = variant;

  // No ClinVar record at all -- keep the card (and its heading) so the expander's layout
  // doesn't shift between rows depending on whether ClinVar has data.
  if (!clinvarSignificance) {
    return (
      <div className={styles.card}>
        <div className={styles.heading}>ClinVar</div>
        <p className={styles.empty}>No submissions for this variant.</p>
      </div>
    );
  }

  const submissionCount = clinvarSubmissions.length;
  const isCollapsed = !showAllSubmissions && submissionCount > SUBMISSIONS_VISIBLE_CAP;
  const visibleSubmissions = isCollapsed
    ? clinvarSubmissions.slice(0, SUBMISSIONS_COLLAPSED_COUNT)
    : clinvarSubmissions;

  return (
    <div className={styles.card}>
      <div className={styles.heading}>ClinVar</div>

      <div className={`${styles.aggregateWord} ${styles[clinvarColorTier(clinvarSignificance)]}`}>
        {clinvarLabel(clinvarSignificance)}
      </div>
      {submissionCount > 0 && (
        <div className={styles.aggregateSub}>
          aggregate of {submissionCount} submission{submissionCount === 1 ? "" : "s"}
        </div>
      )}

      <dl className={styles.definitionList}>
        {clinvarStars !== null && (
          <div className={styles.row}>
            <dt className={styles.label}>Review status</dt>
            <dd className={styles.value}>
              {clinvarStars}★ {clinvarReviewWords({ stars: clinvarStars, hasConflicts: clinvarHasConflicts })}
            </dd>
          </div>
        )}
        {clinvarConditions.length > 0 && (
          <div className={styles.row}>
            <dt className={styles.label}>Condition</dt>
            <dd className={styles.value}>{clinvarConditions.join("; ")}</dd>
          </div>
        )}
        {clinvarLastEvaluated && (
          <div className={styles.row}>
            <dt className={styles.label}>Last evaluated</dt>
            <dd className={styles.value}>{formatDate(clinvarLastEvaluated)}</dd>
          </div>
        )}
      </dl>

      {submissionCount > 0 && (
        <>
          <div className={styles.divider} />
          <div className={styles.heading}>Submissions</div>
          <ul className={styles.submissionList}>
            {visibleSubmissions.map((submission) => (
              <li key={submission.id} className={styles.submissionRow}>
                <span className={styles.submissionId}>{submission.id}</span>
                <span
                  className={`${styles.submissionClassification} ${styles[clinvarColorTier(submission.classification)]}`}
                >
                  {submission.classification ?? "—"}
                </span>
              </li>
            ))}
          </ul>
          {isCollapsed && (
            <button
              type="button"
              className={styles.showAllBtn}
              onClick={(event) => {
                event.stopPropagation();
                setShowAllSubmissions(true);
              }}
            >
              Show all {submissionCount}
            </button>
          )}
        </>
      )}

      {clinvarUrl && (
        <a
          className={styles.openBtn}
          href={clinvarUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Open ${variant.variant} in ClinVar (opens in new tab)`}
        >
          Open in ClinVar ↗
        </a>
      )}
    </div>
  );
}
