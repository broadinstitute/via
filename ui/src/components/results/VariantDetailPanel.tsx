import type { AnnotatedCohortVariant } from "../../types/results";
import ClinvarDetailCard from "./ClinvarDetailCard";
import PopulationFrequenciesCard from "./PopulationFrequenciesCard";
import PredictionsCard from "./PredictionsCard";
import styles from "./VariantDetailPanel.module.css";

interface VariantDetailPanelProps {
  variant: AnnotatedCohortVariant;
}

export default function VariantDetailPanel({ variant }: VariantDetailPanelProps) {
  return (
    <div className={styles.grid}>
      <ClinvarDetailCard variant={variant} />
      <div className={styles.rightColumn}>
        <PopulationFrequenciesCard variant={variant} />
        <PredictionsCard variant={variant} />
      </div>
    </div>
  );
}
