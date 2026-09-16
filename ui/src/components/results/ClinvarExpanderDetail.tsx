import { useState } from "react";
import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import { useHover } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { AnnotatedCohortVariant } from "../../types/results";
import { clinvarReviewWords, clinvarSubmissionColor, clinvarSubmissionShortCode } from "../../utils/clinvar";
import { formatDate } from "../../utils/format";
import Clickable from "../common/Clickable";
import ClinvarBadge from "../elements/ClinvarBadge";

// Cap the inline submitter list at 4; the rest collapse behind a "+N more" button.
const MAX_VISIBLE_SUBMISSIONS = 4;

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  sectionTitle: {
    ...Style.elements.eyebrow,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  fieldLabel: {
    ...Style.elements.eyebrow,
    marginRight: 4,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontStyle: "italic",
  },
  summary: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "4px 10px",
    fontSize: 11.5,
    lineHeight: 1.45,
    color: colors.textBody,
  },
  submissions: {
    fontSize: 11.5,
    lineHeight: 1.45,
    color: colors.textBody,
  },
  /** "+N more" -- reads as body text with an underline rather than as a button. */
  disclosure: {
    font: "inherit",
    padding: 0,
    border: "none",
    background: "none",
    color: colors.textAccent,
    cursor: "pointer",
    textDecorationLine: "underline",
    textDecorationColor: colors.borderStrong,
  },
  clinvarLink: {
    alignSelf: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    background: colors.surface1,
    border: `1px solid ${colors.border}`,
    borderRadius: 5,
    color: colors.textAccent,
    fontSize: 11,
    fontWeight: 600,
    textDecoration: "none",
  },
} as const satisfies Record<string, CSSProperties>;

const DISCLOSURE_HOVER: CSSProperties = { textDecorationColor: colors.textAccent };

interface ClinvarExpanderDetailProps {
  variant: AnnotatedCohortVariant;
}

export default function ClinvarExpanderDetail({ variant }: ClinvarExpanderDetailProps) {
  const [showAllConditions, setShowAllConditions] = useState(false);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const { hovered: linkHovered, hoverProps: linkHoverProps } = useHover();

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
      <div style={styles.container}>
        <div style={styles.sectionTitle}>ClinVar</div>
        <p style={styles.empty}>No ClinVar submissions for this variant.</p>
      </div>
    );
  }

  const [firstCondition, ...remainingConditions] = clinvarConditions;
  const visibleSubmissions = showAllSubmissions ? clinvarSubmissions : clinvarSubmissions.slice(0, MAX_VISIBLE_SUBMISSIONS);
  const hiddenSubmissionCount = clinvarSubmissions.length - visibleSubmissions.length;

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>ClinVar</div>
      <div style={styles.summary}>
        {clinvarSignificance ? (
          <ClinvarBadge significance={clinvarSignificance} mode="tag" />
        ) : (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.textMuted }}>
            No consensus classification
          </span>
        )}
        {clinvarStars !== null && (
          <span style={{ color: colors.textSecondary }}>
            {clinvarReviewWords(clinvarStars, clinvarHasConflicts, clinvarSubmissions.length)}
          </span>
        )}
        {firstCondition && (
          <span>
            <span style={styles.fieldLabel}>Condition</span>
            {firstCondition}
            {remainingConditions.length > 0 &&
              (showAllConditions ? (
                `, ${remainingConditions.join(", ")}`
              ) : (
                <Clickable
                  style={styles.disclosure}
                  hoverStyle={DISCLOSURE_HOVER}
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowAllConditions(true);
                  }}
                >
                  +{remainingConditions.length} more
                </Clickable>
              ))}
          </span>
        )}
        {clinvarLastUpdated && (
          <span>
            <span style={styles.fieldLabel}>Updated</span>
            {formatDate(clinvarLastUpdated)}
          </span>
        )}
      </div>
      <div style={styles.submissions}>
        <span style={styles.fieldLabel}>ClinVar records</span>{" "}
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
          <Clickable
            style={styles.disclosure}
            hoverStyle={DISCLOSURE_HOVER}
            onClick={(event) => {
              event.stopPropagation();
              setShowAllSubmissions(true);
            }}
          >
            {" "}
            +{hiddenSubmissionCount} more
          </Clickable>
        )}
      </div>
      {clinvarUrl && (
        <a
          style={{
            ...styles.clinvarLink,
            ...(linkHovered ? { background: colors.surface2, borderColor: colors.textAccent } : undefined),
          }}
          href={clinvarUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          {...linkHoverProps}
        >
          Open in ClinVar ↗
        </a>
      )}
    </div>
  );
}
