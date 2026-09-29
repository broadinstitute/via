import { useState } from "react";
import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import { useHover } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { AnnotatedCohortVariant } from "../../types/results";
import {
  CLINVAR_MAX_STARS,
  clinvarReviewDescription,
  clinvarSubmissionColor,
  clinvarSubmissionLabel,
} from "../../utils/clinvar";
import { formatDate } from "../../utils/format";
import Clickable from "../common/Clickable";
import ClinvarBadge from "../elements/ClinvarBadge";

// Past these, the rest collapse behind a "+N more" button.
const MAX_VISIBLE_CONDITIONS = 2;
const MAX_VISIBLE_SUBMISSIONS = 4;

// Laid out as a stack of labelled blocks -- the consensus classification, then its details as
// label/value rows, then the individual records as an aligned list -- rather than one wrapping
// run of fields, which broke wherever the column's width happened to fall.
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    fontSize: 11.5,
    lineHeight: 1.45,
    color: colors.textBody,
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    ...Style.elements.eyebrow,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },
  link: {
    color: colors.textAccent,
    fontSize: 11,
    fontWeight: 600,
    textDecoration: "none",
  },
  linkHover: {
    textDecoration: "underline",
  },
  classification: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 5,
  },
  noConsensus: {
    fontWeight: 600,
    color: colors.textMuted,
  },
  review: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    color: colors.textSecondary,
  },
  stars: {
    flexShrink: 0,
    color: colors.textWarning,
    fontSize: 11,
    letterSpacing: 1,
  },
  emptyStars: {
    color: colors.borderStrong,
  },
  // Label column sized to its longest label, so values start on one line down the block.
  details: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    alignItems: "baseline",
    gap: "6px 12px",
    margin: 0,
  },
  label: {
    ...Style.elements.eyebrow,
    whiteSpace: "nowrap",
  },
  value: {
    margin: 0,
    minWidth: 0,
  },
  recordsTitle: {
    ...Style.elements.eyebrow,
    paddingBottom: 4,
    textAlign: "left",
  },
  records: {
    width: "100%",
    borderCollapse: "collapse",
  },
  recordCell: {
    padding: "4px 0",
    borderTop: `1px solid ${colors.border}`,
    verticalAlign: "baseline",
    whiteSpace: "nowrap",
  },
  recordId: {
    ...Style.elements.mono,
    paddingRight: 10,
    color: colors.textBody,
  },
  // Takes the leftover width and truncates within it: maxWidth 0 stops the text from widening
  // the column instead.
  recordClassification: {
    width: "100%",
    maxWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontWeight: 600,
  },
  recordStars: {
    paddingLeft: 10,
    textAlign: "right",
  },
  empty: {
    color: colors.textMuted,
    fontStyle: "italic",
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
} as const satisfies Record<string, CSSProperties>;

const DISCLOSURE_HOVER: CSSProperties = { textDecorationColor: colors.textAccent };

/** ClinVar's review status as filled and empty stars out of four. */
function Stars({ count }: { count: number }) {
  const filled = Math.max(0, Math.min(CLINVAR_MAX_STARS, count));
  return (
    <span style={styles.stars} role="img" aria-label={`${count} of ${CLINVAR_MAX_STARS} stars`}>
      {"★".repeat(filled)}
      <span style={styles.emptyStars}>{"★".repeat(CLINVAR_MAX_STARS - filled)}</span>
    </span>
  );
}

function MoreButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <Clickable
      style={styles.disclosure}
      hoverStyle={DISCLOSURE_HOVER}
      onClick={(event) => {
        // The row this sits in toggles on click.
        event.stopPropagation();
        onClick();
      }}
    >
      +{count} more
    </Clickable>
  );
}

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

  const header = (
    <div style={styles.header}>
      <div style={styles.sectionTitle}>ClinVar</div>
      {clinvarUrl && clinvarSubmissions.length > 0 && (
        <a
          style={{ ...styles.link, ...(linkHovered ? styles.linkHover : undefined) }}
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

  if (clinvarSubmissions.length === 0) {
    return (
      <div style={styles.container}>
        {header}
        <p style={styles.empty}>No ClinVar submissions for this variant.</p>
      </div>
    );
  }

  const visibleConditions = showAllConditions ? clinvarConditions : clinvarConditions.slice(0, MAX_VISIBLE_CONDITIONS);
  const hiddenConditionCount = clinvarConditions.length - visibleConditions.length;
  const visibleSubmissions = showAllSubmissions ? clinvarSubmissions : clinvarSubmissions.slice(0, MAX_VISIBLE_SUBMISSIONS);
  const hiddenSubmissionCount = clinvarSubmissions.length - visibleSubmissions.length;

  return (
    <div style={styles.container}>
      {header}

      <div style={styles.classification}>
        {clinvarSignificance ? (
          <ClinvarBadge significance={clinvarSignificance} mode="tag" />
        ) : (
          <span style={styles.noConsensus}>No consensus classification</span>
        )}
        {clinvarStars !== null && (
          <div style={styles.review}>
            <Stars count={clinvarStars} />
            <span>{clinvarReviewDescription(clinvarStars, clinvarHasConflicts)}</span>
          </div>
        )}
      </div>

      {(clinvarConditions.length > 0 || clinvarLastUpdated) && (
        <dl style={styles.details}>
          {clinvarConditions.length > 0 && (
            <>
              <dt style={styles.label}>{clinvarConditions.length === 1 ? "Condition" : "Conditions"}</dt>
              <dd style={styles.value}>
                {visibleConditions.map((condition) => (
                  <div key={condition}>{condition}</div>
                ))}
                {hiddenConditionCount > 0 && (
                  <MoreButton count={hiddenConditionCount} onClick={() => setShowAllConditions(true)} />
                )}
              </dd>
            </>
          )}
          {clinvarLastUpdated && (
            <>
              <dt style={styles.label}>Updated</dt>
              <dd style={styles.value}>{formatDate(clinvarLastUpdated)}</dd>
            </>
          )}
        </dl>
      )}

      {/*Hiding these records for now. The VAT appears to support them but we don't want to overcommit*/}

      {/*<div>*/}
      {/*  <table style={styles.records}>*/}
      {/*    <caption style={styles.recordsTitle}>Records ({clinvarSubmissions.length})</caption>*/}
      {/*    <thead style={Style.elements.visuallyHidden}>*/}
      {/*      <tr>*/}
      {/*        <th scope="col">Record</th>*/}
      {/*        <th scope="col">Classification</th>*/}
      {/*        <th scope="col">Review status</th>*/}
      {/*      </tr>*/}
      {/*    </thead>*/}
      {/*    <tbody>*/}
      {/*      {visibleSubmissions.map((submission) => (*/}
      {/*        <tr key={submission.id}>*/}
      {/*          <td style={{ ...styles.recordCell, ...styles.recordId }}>{submission.id}</td>*/}
      {/*          <td*/}
      {/*            style={{*/}
      {/*              ...styles.recordCell,*/}
      {/*              ...styles.recordClassification,*/}
      {/*              color: clinvarSubmissionColor(submission.classification),*/}
      {/*            }}*/}
      {/*            title={submission.classification ?? undefined}*/}
      {/*          >*/}
      {/*            {clinvarSubmissionLabel(submission.classification)}*/}
      {/*          </td>*/}
      {/*          <td style={{ ...styles.recordCell, ...styles.recordStars }}>*/}
      {/*            {submission.stars !== null && <Stars count={submission.stars} />}*/}
      {/*          </td>*/}
      {/*        </tr>*/}
      {/*      ))}*/}
      {/*    </tbody>*/}
      {/*  </table>*/}
      {/*  {hiddenSubmissionCount > 0 && (*/}
      {/*    <MoreButton count={hiddenSubmissionCount} onClick={() => setShowAllSubmissions(true)} />*/}
      {/*  )}*/}
      {/*</div>*/}
    </div>
  );
}
