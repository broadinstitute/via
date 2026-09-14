import { useState } from "react";
import type { AnnotatedCohortVariant } from "../../types/results";
import {
  CLINVAR_TAG_VARIANT,
  clinvarReviewWords,
  clinvarSubmissionColor,
  clinvarSubmissionShortCode,
} from "../../utils/clinvar";
import { formatDate } from "../../utils/format";
import Tag from "./Tag";
import styles from "./ClinvarExpanderDetail.module.css";

// Cap the inline submitter list at 4; the rest collapse behind a "+N more" button.
const MAX_VISIBLE_SUBMISSIONS = 4;

interface ClinvarExpanderDetailProps {
  variant: AnnotatedCohortVariant;
}

export default function ClinvarExpanderDetail({ variant }: ClinvarExpanderDetailProps) {
  // A title-tooltip "+N more" isn't reachable by keyboard or touch, so the rest of the list is
  // hidden from those users entirely -- these track whether it's been disclosed into the DOM
  // instead (via a real, focusable button below).
  const [showAllConditions, setShowAllConditions] = useState(false);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);

  const {
    clinvarSignificance,
    clinvarSubmissions,
    clinvarStars,
    clinvarHasConflicts,
    clinvarConditions,
    clinvarLastUpdated,
    clinvarUrl,
  } = variant;

  if (clinvarSubmissions.length === 0) {
    return (
      <div className={styles.detail}>
        <div className={styles.header}>ClinVar</div>
        <p className={styles.empty}>No ClinVar submissions for this variant.</p>
      </div>
    );
  }

  const [firstCondition, ...remainingConditions] = clinvarConditions;
  const visibleSubmissions = showAllSubmissions ? clinvarSubmissions : clinvarSubmissions.slice(0, MAX_VISIBLE_SUBMISSIONS);
  const hiddenSubmissionCount = clinvarSubmissions.length - visibleSubmissions.length;

  return (
    <div className={styles.detail}>
      <div className={styles.header}>ClinVar</div>
      <div className={styles.callLine}>
        {clinvarSignificance ? (
          <Tag variant={CLINVAR_TAG_VARIANT[clinvarSignificance]}>{clinvarSignificance}</Tag>
        ) : (
          <span className={styles.noConsensus}>No consensus classification</span>
        )}
        {clinvarStars !== null && (
          <span className={styles.reviewStatus}>
            {clinvarReviewWords(clinvarStars, clinvarHasConflicts, clinvarSubmissions.length)}
          </span>
        )}
        {firstCondition && (
          <span>
            <span className={styles.factLabel}>Condition</span>
            {firstCondition}
            {remainingConditions.length > 0 &&
              (showAllConditions ? (
                `, ${remainingConditions.join(", ")}`
              ) : (
                <button
                  type="button"
                  className={styles.disclosureBtn}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowAllConditions(true);
                  }}
                >
                  +{remainingConditions.length} more
                </button>
              ))}
          </span>
        )}
        {clinvarLastUpdated && (
          <span>
            <span className={styles.factLabel}>Updated</span>
            {formatDate(clinvarLastUpdated)}
          </span>
        )}
      </div>
      <div className={styles.submitters}>
        <span className={styles.factLabel}>ClinVar records</span>{" "}
        {visibleSubmissions.map((submission, index) => (
          <span key={submission.id}>
            {index > 0 && " · "}
            {submission.id}{" "}
            <span style={{ color: clinvarSubmissionColor(submission.classification) }}>
              {clinvarSubmissionShortCode(submission.classification)}
            </span>
          </span>
        ))}
        {hiddenSubmissionCount > 0 && (
          <button
            type="button"
            className={styles.disclosureBtn}
            onClick={(event) => {
              event.stopPropagation();
              setShowAllSubmissions(true);
            }}
          >
            {" "}
            +{hiddenSubmissionCount} more
          </button>
        )}
      </div>
      {clinvarUrl && (
        <a
          className={styles.link}
          href={clinvarUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Open in ClinVar ↗
        </a>
      )}
    </div>
  );
}
