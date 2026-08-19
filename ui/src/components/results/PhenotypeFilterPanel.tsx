import { useState } from "react";
import type { BreakdownSegment, PhenotypeCrosswalk } from "../../types/results";
import BreakdownLegend from "./BreakdownLegend";
import CopyButton from "./CopyButton";
import Donut from "./Donut";
import ResultsPanel from "./ResultsPanel";
import styles from "./PhenotypeFilterPanel.module.css";

type BreakdownTab = "ancestry" | "age";

interface PhenotypeFilterPanelProps {
  crosswalk: PhenotypeCrosswalk;
  ancestryBreakdown: BreakdownSegment[];
  ageBreakdown: BreakdownSegment[];
}

export default function PhenotypeFilterPanel({
  crosswalk,
  ancestryBreakdown,
  ageBreakdown,
}: PhenotypeFilterPanelProps) {
  const [activeTab, setActiveTab] = useState<BreakdownTab>("ancestry");

  const centerLabel = (
    <>
      <div className={styles.donutCount}>{crosswalk.participantCount.toLocaleString()}</div>
      <div>matched</div>
    </>
  );

  return (
    <ResultsPanel title="Phenotype filter">
      <div className={styles.body}>
        <div className={styles.crosswalkCard}>
          <div className={styles.crosswalkText}>
            <div className={styles.row}>
              <div className={styles.codeLine}>
                <span className={styles.code}>HPO — {crosswalk.hpoCode}</span>
                <CopyButton getText={() => crosswalk.hpoCode} label="Copy HPO code" />
              </div>
              <span className={styles.desc}>{crosswalk.description}</span>
            </div>
            <div className={styles.row} style={{ marginTop: 6 }}>
              <div className={styles.codeLine}>
                <span className={styles.code}>OMOP — {crosswalk.omopCode}</span>
                <CopyButton getText={() => crosswalk.omopCode} label="Copy OMOP concept ID" />
              </div>
              <span className={styles.desc}>{crosswalk.description}</span>
            </div>
          </div>
          <div className={styles.countBadge}>
            <div className={styles.num}>{crosswalk.participantCount}</div>
            <div className={styles.lbl}>participants matched</div>
          </div>
        </div>

        <div>
          <div className={styles.breakdownHeader}>
            <div className={styles.breakdownTitle}>Participant breakdown</div>
            <div className={styles.breakdownTabs}>
              <button
                type="button"
                className={activeTab === "ancestry" ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                onClick={() => setActiveTab("ancestry")}
              >
                Ancestry
              </button>
              <button
                type="button"
                className={activeTab === "age" ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                onClick={() => setActiveTab("age")}
              >
                Age
              </button>
            </div>
          </div>

          {/* Keyed by tab so switching remounts the donut/legend, replaying their entrance animation. */}
          {activeTab === "ancestry" ? (
            <div key="ancestry">
              <Donut segments={ancestryBreakdown} centerLabel={centerLabel} />
              <BreakdownLegend segments={ancestryBreakdown} />
            </div>
          ) : (
            <div key="age">
              <Donut segments={ageBreakdown} centerLabel={centerLabel} />
              <BreakdownLegend segments={ageBreakdown} />
            </div>
          )}
        </div>
      </div>
    </ResultsPanel>
  );
}
