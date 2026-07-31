import ResultsPanel from "./ResultsPanel";
import Spinner from "./Spinner";
import styles from "./SectionLoadingPanel.module.css";

interface SectionLoadingPanelProps {
  title: string;
  message?: string;
  minHeight?: number;
}

export default function SectionLoadingPanel({
  title,
  message = "Loading…",
  minHeight,
}: SectionLoadingPanelProps) {
  return (
    <ResultsPanel title={title}>
      <div className={styles.body} style={minHeight ? { minHeight } : undefined}>
        <Spinner />
        <span>{message}</span>
      </div>
    </ResultsPanel>
  );
}
