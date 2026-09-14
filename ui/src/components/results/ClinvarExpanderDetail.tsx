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

// Cap the inline submitter list at 4; the rest collapse behind a "+N more" button.
const MAX_VISIBLE_SUBMISSIONS = 4;

interface ClinvarExpanderDetailProps {
  variant: AnnotatedCohortVariant;
}

export default function ClinvarExpanderDetail({ variant }: ClinvarExpanderDetailProps) {
  const [showAllConditions, setShowAllConditions] = useState(false);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [linkHovered, setLinkHovered] = useState(false);

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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          ClinVar
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
          No ClinVar submissions for this variant.
        </p>
      </div>
    );
  }

  const [firstCondition, ...remainingConditions] = clinvarConditions;
  const visibleSubmissions = showAllSubmissions ? clinvarSubmissions : clinvarSubmissions.slice(0, MAX_VISIBLE_SUBMISSIONS);
  const hiddenSubmissionCount = clinvarSubmissions.length - visibleSubmissions.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`
        .clinvar-disclosure-btn { text-decoration-color: var(--border-strong); }
        .clinvar-disclosure-btn:hover { text-decoration-color: var(--text-accent); }
      `}</style>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        ClinVar
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "4px 10px",
          fontSize: 11.5,
          lineHeight: 1.45,
          color: "var(--text-body)",
        }}
      >
        {clinvarSignificance ? (
          <Tag variant={CLINVAR_TAG_VARIANT[clinvarSignificance]}>{clinvarSignificance}</Tag>
        ) : (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>No consensus classification</span>
        )}
        {clinvarStars !== null && (
          <span style={{ color: "var(--text-secondary)" }}>
            {clinvarReviewWords(clinvarStars, clinvarHasConflicts, clinvarSubmissions.length)}
          </span>
        )}
        {firstCondition && (
          <span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: 0.3,
                marginRight: 4,
              }}
            >
              Condition
            </span>
            {firstCondition}
            {remainingConditions.length > 0 &&
              (showAllConditions ? (
                `, ${remainingConditions.join(", ")}`
              ) : (
                <button
                  type="button"
                  className="clinvar-disclosure-btn"
                  style={{
                    font: "inherit",
                    color: "var(--text-accent)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textDecorationLine: "underline",
                  }}
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
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: 0.3,
                marginRight: 4,
              }}
            >
              Updated
            </span>
            {formatDate(clinvarLastUpdated)}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.45, color: "var(--text-body)" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.3,
            marginRight: 4,
          }}
        >
          ClinVar records
        </span>{" "}
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
            className="clinvar-disclosure-btn"
            style={{
              font: "inherit",
              color: "var(--text-accent)",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              textDecoration: "underline",
            }}
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
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-accent)",
            background: linkHovered ? "var(--surface-2)" : "var(--surface-1)",
            border: `1px solid ${linkHovered ? "var(--text-accent)" : "var(--border)"}`,
            borderRadius: 5,
            padding: "4px 10px",
            textDecoration: "none",
          }}
          href={clinvarUrl}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setLinkHovered(true)}
          onMouseLeave={() => setLinkHovered(false)}
          onClick={(event) => event.stopPropagation()}
        >
          Open in ClinVar ↗
        </a>
      )}
    </div>
  );
}
