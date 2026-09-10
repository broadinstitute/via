import type { CohortVariantRow } from "../../types/results";
import PopulationFrequenciesCard from "./PopulationFrequenciesCard";
import PredictionsCard from "./PredictionsCard";
import VariantOverviewTab from "./VariantOverviewTab";
import styles from "./VariantSidePanel.module.css";

export type VariantSidePanelTab = "overview" | "populations" | "predictions";

const TABS: Array<{ id: VariantSidePanelTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "populations", label: "Populations" },
  { id: "predictions", label: "Predictions" },
];

interface VariantSidePanelProps {
  variant: CohortVariantRow;
  activeTab: VariantSidePanelTab;
  onTabChange: (tab: VariantSidePanelTab) => void;
  onClose: () => void;
}

export default function VariantSidePanel({ variant, activeTab, onTabChange, onClose }: VariantSidePanelProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // Escape already closes the panel via the table row's own key handler when a row has focus;
    // this covers the rest of the time -- once focus has moved into the panel itself (a tab,
    // a link, etc.), that row-level handler no longer fires.
    if (event.key === "Escape") {
      onClose();
    }
  }

  return (
    <>
      {/* Hidden on wide viewports via CSS; below ~1100px the panel becomes an overlay and this
          becomes a clickable scrim that closes it. */}
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={styles.panel}
        role="region"
        aria-label={`Details for ${variant.variant}`}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerText}>
              {variant.annotated ? (
                <>
                  <div className={styles.gene}>{variant.gene ?? "—"}</div>
                  <div className={styles.proteinChange}>{variant.proteinChange ?? "—"}</div>
                </>
              ) : (
                <div className={styles.gene}>Not observed in any source</div>
              )}
            </div>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close panel">
              ✕
            </button>
          </div>
          <div className={styles.coordinate}>{variant.variant}</div>
          <div className={styles.tabs} role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.bodyWrap}>
          <div className={styles.body}>
            {!variant.annotated ? (
              <p className={styles.empty}>No data available for this variant.</p>
            ) : (
              <>
                {activeTab === "overview" && <VariantOverviewTab variant={variant} />}
                {activeTab === "populations" && <PopulationFrequenciesCard variant={variant} />}
                {activeTab === "predictions" && <PredictionsCard variant={variant} />}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
