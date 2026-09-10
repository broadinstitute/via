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

// Cap the inline submitter list at 4; the rest collapse into a "+N more" whose title carries them.
const MAX_VISIBLE_SUBMISSIONS = 4;

interface ClinvarExpanderDetailProps {
  variant: AnnotatedCohortVariant;
}

export default function ClinvarExpanderDetail({ variant }: ClinvarExpanderDetailProps) {
  const {
    clinvarSignificance,
    clinvarSubmissions,
    clinvarStars,
    clinvarHasConflicts,
    clinvarConditions,
    clinvarLastEvaluated,
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
  const visibleSubmissions = clinvarSubmissions.slice(0, MAX_VISIBLE_SUBMISSIONS);
  const hiddenSubmissions = clinvarSubmissions.slice(MAX_VISIBLE_SUBMISSIONS);

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
      </div>
      <div className={styles.facts}>
        {firstCondition && (
          <span title={remainingConditions.length > 0 ? clinvarConditions.join("; ") : undefined}>
            <span className={styles.factLabel}>Condition</span> {firstCondition}
            {remainingConditions.length > 0 && ` +${remainingConditions.length} more`}
          </span>
        )}
        {clinvarLastEvaluated && (
          <span>
            <span className={styles.factLabel}>Evaluated</span> {formatDate(clinvarLastEvaluated)}
          </span>
        )}
      </div>
      <div className={styles.submitters}>
        <span className={styles.factLabel}>Submitters</span>{" "}
        {visibleSubmissions.map((submission, index) => (
          <span key={submission.id}>
            {index > 0 && " · "}
            {submission.id}{" "}
            <span style={{ color: clinvarSubmissionColor(submission.classification) }}>
              {clinvarSubmissionShortCode(submission.classification)}
            </span>
          </span>
        ))}
        {hiddenSubmissions.length > 0 && (
          <span
            className={styles.moreSubmissions}
            title={hiddenSubmissions
              .map((s) => `${s.id} ${clinvarSubmissionShortCode(s.classification)}`)
              .join(", ")}
          >
            {" "}
            +{hiddenSubmissions.length} more
          </span>
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
