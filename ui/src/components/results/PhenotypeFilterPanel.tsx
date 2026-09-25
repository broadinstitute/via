import { useState } from "react";
import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import type { ConditionSearch } from "../../api/conditions";
import type { BreakdownSegment } from "../../types/results";
import { phenotypeUnavailableCopy } from "../../utils/phenotype";
import Clickable from "../common/Clickable";
import BreakdownLegend from "./BreakdownLegend";
import CopyButton from "./CopyButton";
import PopulationDonutChart from "./PopulationDonutChart";
import PhenotypeFilterRequired from "./PhenotypeFilterRequired";
import ResultsPanel from "./ResultsPanel";

type BreakdownTab = "ancestry" | "age";

const styles = {
  body: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 14,
    overflowY: "auto",
  },
  conceptCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    background: colors.surface1,
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
  },
  conceptText: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
  },
  codeLine: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  code: {
    color: colors.textAccent,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: 600,
  },
  desc: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 500,
  },
  countBadge: {
    flexShrink: 0,
    paddingLeft: 10,
    borderLeft: `1px solid ${colors.border}`,
    textAlign: "center",
  },
  num: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
  },
  lbl: {
    width: 64,
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 1.3,
  },
  // Overrides the donut center's own uppercase micro-label treatment for the headline number.
  donutCount: {
    fontSize: 20,
    textTransform: "none",
    letterSpacing: "normal",
    marginBottom: 2,
  },
  conditionNote: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 1.45,
  },
  noMatch: {
    padding: "10px 12px",
    background: colors.surface1,
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    color: colors.textSecondary,
    fontSize: 12,
  },
  breakdownHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  breakdownTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 600,
  },
  breakdownTabs: {
    display: "inline-flex",
    gap: 2,
    padding: 2,
    background: colors.surface1,
    border: `1px solid ${colors.border}`,
    borderRadius: 999,
  },
  tab: {
    padding: "3px 10px",
    border: "none",
    borderRadius: 999,
    background: "none",
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: {
    background: colors.surface2,
    color: colors.textAccent,
    boxShadow: Style.shadows.pill,
  },
} as const satisfies Record<string, CSSProperties>;

const TABS: { id: BreakdownTab; label: string }[] = [
  { id: "ancestry", label: "Ancestry" },
  { id: "age", label: "Age" },
];

interface PhenotypeFilterPanelProps {
  /**
   * The condition cohort, when one was picked. Unlike the breakdowns, this is backed by real
   * queries rather than MockPhenotypeData.
   */
  conditionSearch: ConditionSearch | null;
  /** Mock; empty unless the picked condition was found. */
  ancestryBreakdown: BreakdownSegment[];
  ageBreakdown: BreakdownSegment[];
  onAddPhenotypeFilter: () => void;
}

export default function PhenotypeFilterPanel({
  conditionSearch,
  ancestryBreakdown,
  ageBreakdown,
  onAddPhenotypeFilter,
}: PhenotypeFilterPanelProps) {
  const [activeTab, setActiveTab] = useState<BreakdownTab>("ancestry");

  if (!conditionSearch) {
    const { message, buttonLabel } = phenotypeUnavailableCopy("", "participant breakdowns");
    return (
      <ResultsPanel title="Phenotype filter">
        <PhenotypeFilterRequired message={message} buttonLabel={buttonLabel} onAddPhenotypeFilter={onAddPhenotypeFilter} />
      </ResultsPanel>
    );
  }

  const concept = conditionSearch.concept;
  const segments = activeTab === "ancestry" ? ancestryBreakdown : ageBreakdown;
  // The mock cohort's size, taken from the breakdown itself so the donut's center always agrees
  // with its legend. It is not conditionSearch.participantCount, the real count shown above.
  const breakdownTotal = ancestryBreakdown.reduce((total, segment) => total + segment.count, 0);

  return (
    <ResultsPanel title="Phenotype filter">
      <div style={styles.body}>
        {concept ? (
          <div>
            <div style={styles.conceptCard}>
              <div style={styles.conceptText}>
                <div style={styles.codeLine}>
                  <span style={styles.code}>OMOP — {concept.conceptId}</span>
                  <CopyButton getText={() => String(concept.conceptId)} label="Copy OMOP concept ID" />
                </div>
                <span style={styles.desc}>{concept.name}</span>
              </div>
              <div style={styles.countBadge}>
                <div style={styles.num}>{conditionSearch.participantCount?.toLocaleString() ?? "—"}</div>
                <div style={styles.lbl}>participants matched</div>
              </div>
            </div>
            {/* Worth stating: the count is larger than the concept's own records, and
                larger than the estimate shown in the search dropdown. */}
            <p style={styles.conditionNote}>
              Participants recorded with this condition or any more specific form of it.
            </p>
          </div>
        ) : (
          <p style={styles.noMatch}>
            Condition concept {conditionSearch.conceptId} wasn’t found in this CDR.
          </p>
        )}

        {ancestryBreakdown.length > 0 && (
          <div>
            <div style={styles.breakdownHeader}>
              <div style={styles.breakdownTitle}>Participant breakdown</div>
              <div style={styles.breakdownTabs}>
                {TABS.map((tab) => (
                  <Clickable
                    key={tab.id}
                    style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : undefined) }}
                    hoverStyle={{ color: colors.textAccent }}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </Clickable>
                ))}
              </div>
            </div>

            {/* Keyed by tab so switching remounts the donut/legend, replaying their entrance animation. */}
            <div key={activeTab}>
              <PopulationDonutChart
                segments={segments}
                centerLabel={
                  <>
                    <div style={styles.donutCount}>{breakdownTotal.toLocaleString()}</div>
                    <div>participants</div>
                  </>
                }
              />
              <BreakdownLegend segments={segments} />
            </div>
          </div>
        )}
      </div>
    </ResultsPanel>
  );
}
