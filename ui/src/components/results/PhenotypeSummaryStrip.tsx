import { useState } from "react";
import type { CSSProperties } from "react";
import type { ConditionSearch } from "../../api/conditions";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import type { BreakdownSegment } from "../../types/results";
import { formatInt } from "../../utils/format";
import Clickable from "../common/Clickable";
import InfoTooltip from "../common/InfoTooltip";
import { PlusIcon } from "../icons";
import BreakdownBar from "./BreakdownBar";
import CopyButton from "./CopyButton";
import ViewSwitcher, { type ResultsView } from "./ViewSwitcher";

// A full-width band between the top bar and the results. Four blocks with one
// anatomy -- a small uppercase label over its content -- divided by hairlines the way the top bar
// divides its parts: what the phenotype filter is, how many it matched, how they break down, and
// which view is showing. Being a band rather than a side panel, it leaves the table the full width.
// A filter of several conditions becomes a small table in the first block: each condition with its
// code trailing and its own matched count in a column, under a "participants" label at the end of
// the block's label row. The column is what makes the overlap visible: the counts plainly add up
// to more than the total beside them.
const BLOCK_GAP = 20;

const styles = {
  strip: {
    ...Style.elements.panel,
    display: "grid",
    gridTemplateColumns: "auto auto minmax(0, 1fr) auto",
    alignItems: "stretch",
    padding: "10px 18px",
    boxShadow: Style.shadows.panel,
  },
  block: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
    paddingRight: BLOCK_GAP,
  },
  blockDivided: {
    paddingLeft: BLOCK_GAP,
    borderLeft: `1px solid ${colors.border}`,
  },
  // The label row: the eyebrow, and for the breakdown its toggle, kept to one height so the
  // content rows beneath start level.
  blockLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 20,
  },
  eyebrow: {
    ...Style.elements.eyebrow,
    display: "inline-flex",
    alignItems: "center",
  },
  blockContent: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 30,
    minWidth: 0,
  },
  conditionName: {
    fontSize: 13.5,
    fontWeight: 600,
    lineHeight: 1.2,
    color: colors.textPrimary,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 320,
  },
  // One condition: its name over its OMOP code.
  conditionText: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  // Several: a two-column list, name (code trailing) and that condition's own matched count.
  conditionList: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "baseline",
    gap: "3px 16px",
    margin: 0,
    padding: 0,
    listStyle: "none",
    minWidth: 0,
  },
  conditionRow: {
    display: "contents",
  },
  // A flex row, so the copy button (itself a flex box) sits inline after the code.
  conditionRowName: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    minWidth: 0,
    maxWidth: 300,
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.textPrimary,
  },
  conditionRowText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // The code after the name, quieter than on its own line; still copyable.
  trailingCode: {
    flexShrink: 0,
    marginLeft: 6,
    color: colors.textMuted,
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: 500,
  },
  conditionCount: {
    fontSize: 12.5,
    fontWeight: 600,
    color: colors.textPrimary,
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
  },
  // Qualifiers in the label row: "any of" after the eyebrow, "participants" over the count column.
  labelQualifier: {
    fontWeight: 500,
    letterSpacing: 0,
    textTransform: "none",
    color: colors.textMuted,
  },
  labelRowSplit: {
    justifyContent: "space-between",
  },
  codeLine: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
  },
  code: {
    ...Style.elements.trimmedText,
    color: colors.textAccent,
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: 600,
  },
  count: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
    color: colors.textPrimary,
    fontVariantNumeric: "tabular-nums",
  },
  countUnit: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // The Ancestry/Age toggle in the label row, the same pill as the view switcher one size down.
  tabs: {
    display: "inline-flex",
    gap: 2,
    padding: 2,
    background: colors.surface1,
    border: `1px solid ${colors.border}`,
    borderRadius: 999,
  },
  tab: {
    padding: "1px 8px",
    border: "none",
    borderRadius: 999,
    background: "none",
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: {
    background: colors.surface2,
    color: colors.textAccent,
    boxShadow: Style.shadows.pill,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  emptyMessage: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noMatch: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
} as const satisfies Record<string, CSSProperties>;

type BreakdownTab = "ancestry" | "age";

const TABS: { id: BreakdownTab; label: string }[] = [
  { id: "ancestry", label: "Ancestry" },
  { id: "age", label: "Age" },
];

interface PhenotypeSummaryStripProps {
  /** Null while results are loading: the strip shows a skeleton. */
  conditionSearch: ConditionSearch | null | undefined;
  ancestryBreakdown: BreakdownSegment[];
  ageBreakdown: BreakdownSegment[];
  onAddPhenotypeFilter: () => void;
  view: ResultsView;
  onViewChange: (view: ResultsView) => void;
  /** Whether Review has anything to compare: a phenotype filter that matched participants. */
  canReview: boolean;
  loading?: boolean;
}

export default function PhenotypeSummaryStrip({
  conditionSearch,
  ancestryBreakdown,
  ageBreakdown,
  onAddPhenotypeFilter,
  view,
  onViewChange,
  canReview,
  loading = false,
}: PhenotypeSummaryStripProps) {
  const [activeTab, setActiveTab] = useState<BreakdownTab>("ancestry");
  const switcher = (
    <ViewSwitcher
      value={view}
      onChange={onViewChange}
      reviewUnavailableReason={
        canReview ? undefined : "Review compares matched participants with the cohort. Add a phenotype filter to enable it."
      }
    />
  );
  const viewBlock = (
    <div style={{ ...styles.block, ...styles.blockDivided, paddingRight: 0 }}>
      <div style={styles.blockLabel}>
        <span style={styles.eyebrow}>View</span>
      </div>
      <div style={styles.blockContent}>{switcher}</div>
    </div>
  );

  if (loading) {
    return (
      <div style={styles.strip} aria-busy="true">
        {[220, 90, 320].map((width, index) => (
          <div key={index} style={{ ...styles.block, ...(index > 0 ? styles.blockDivided : undefined) }}>
            <div style={styles.blockLabel}>
              <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: 60, height: 8 }} />
            </div>
            <div style={styles.blockContent}>
              <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width, height: 18 }} />
            </div>
          </div>
        ))}
        <div style={{ ...styles.block, ...styles.blockDivided, paddingRight: 0 }}>
          <div style={styles.blockLabel}>
            <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: 30, height: 8 }} />
          </div>
          <div style={styles.blockContent}>
            <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: 150, height: 28, borderRadius: 999 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!conditionSearch) {
    return (
      <div style={{ ...styles.strip, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
        <div style={styles.block}>
          <div style={styles.blockLabel}>
            <span style={styles.eyebrow}>Phenotype</span>
          </div>
          <div style={{ ...styles.blockContent, gap: 16 }}>
            <span style={styles.emptyTitle}>No phenotype filter</span>
            <span style={styles.emptyMessage}>Add a phenotype filter to see participant breakdowns and Review.</span>
            <Clickable style={Style.buttons.accent} hoverStyle={Style.buttons.accentHover} onClick={onAddPhenotypeFilter}>
              <PlusIcon size={12} strokeWidth={2.5} />
              Add phenotype filter
            </Clickable>
          </div>
        </div>
        {viewBlock}
      </div>
    );
  }

  const concepts = conditionSearch.concepts;
  const participantCount = conditionSearch.participantCount ?? 0;
  const hasBreakdown = ancestryBreakdown.length > 0;
  // The union counts a participant once however many of the conditions they have, so the
  // per-condition counts beside the names can sum to more than it.
  const countTooltip =
    concepts.length > 1
      ? participantCount
        ? "Participants recorded with any of these conditions, or a more specific form of one. " +
          "A participant with more than one is counted once here, so the counts beside the conditions may add up to more than this total."
        : "No participants are recorded with any of these conditions or a more specific form of one."
      : participantCount
        ? "Participant counts include anyone recorded with this condition or any more specific form of it."
        : "No participants are recorded with this condition or any more specific form of it.";

  return (
    <div style={styles.strip}>
      <div style={styles.block}>
        <div style={{ ...styles.blockLabel, ...(concepts.length > 1 ? styles.labelRowSplit : undefined) }}>
          <span style={styles.eyebrow}>
            Phenotype
            {concepts.length > 1 && <span style={styles.labelQualifier}>&nbsp;· any of</span>}
          </span>
          {concepts.length > 1 && (
            <span style={{ ...styles.eyebrow, ...styles.labelQualifier }} aria-hidden="true">
              participants
            </span>
          )}
        </div>
        <div style={styles.blockContent}>
          {concepts.length > 1 ? (
            <ul style={styles.conditionList} aria-label="Conditions, any of, with participants matched by each">
              {concepts.map((concept) => (
                <li key={concept.conceptId} style={styles.conditionRow}>
                  <span style={styles.conditionRowName} title={`${concept.name} · OMOP ${concept.conceptId}`}>
                    <span style={styles.conditionRowText}>{concept.name}</span>
                    <span style={styles.trailingCode}>{concept.conceptId}</span>
                    <CopyButton getText={() => String(concept.conceptId)} label={`Copy OMOP concept ID ${concept.conceptId}`} />
                  </span>
                  <span style={styles.conditionCount} aria-label={`${formatInt(concept.participantCount)} participants`}>
                    {formatInt(concept.participantCount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : concepts.length === 1 ? (
            <div style={styles.conditionText}>
              <span style={styles.conditionName} title={concepts[0].name}>
                {concepts[0].name}
              </span>
              <span style={styles.codeLine}>
                <span style={styles.code}>OMOP — {concepts[0].conceptId}</span>
                <CopyButton getText={() => String(concepts[0].conceptId)} label="Copy OMOP concept ID" />
              </span>
            </div>
          ) : (
            <span style={styles.noMatch}>
              Condition concept{conditionSearch.conceptIds.length === 1 ? "" : "s"}{" "}
              {conditionSearch.conceptIds.join(", ")} {conditionSearch.conceptIds.length === 1 ? "wasn’t" : "weren’t"}{" "}
              found in this CDR.
            </span>
          )}
        </div>
      </div>

      <div style={{ ...styles.block, ...styles.blockDivided }}>
        <div style={styles.blockLabel}>
          <span style={styles.eyebrow}>
            Participants
            <InfoTooltip text={countTooltip} style={{ marginTop: -4, marginBottom: -4 }} />
          </span>
        </div>
        <div style={styles.blockContent}>
          <span style={styles.count}>{formatInt(participantCount)}</span>
          <span style={styles.countUnit}>matched</span>
        </div>
      </div>

      <div style={{ ...styles.block, ...styles.blockDivided }}>
        <div style={styles.blockLabel}>
          <span style={styles.eyebrow}>Breakdown</span>
          {hasBreakdown && (
            <div style={styles.tabs} role="group" aria-label="Participant breakdown">
              {TABS.map((tab) => (
                <Clickable
                  key={tab.id}
                  aria-pressed={activeTab === tab.id}
                  style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : undefined) }}
                  hoverStyle={{ color: colors.textAccent }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Clickable>
              ))}
            </div>
          )}
        </div>
        <div style={{ ...styles.blockContent, alignItems: "stretch" }}>
          {hasBreakdown ? (
            // Keyed by tab so switching remounts the bar, replaying its entrance.
            <BreakdownBar
              key={activeTab}
              segments={activeTab === "ancestry" ? ancestryBreakdown : ageBreakdown}
              label={activeTab === "ancestry" ? "Ancestry" : "Age"}
            />
          ) : (
            <span style={styles.emptyMessage}>No participants to break down.</span>
          )}
        </div>
      </div>

      {viewBlock}
    </div>
  );
}
