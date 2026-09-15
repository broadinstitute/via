import colors from "../../libs/colors";
import ResultsPanel from "./ResultsPanel";
import Spinner from "./Spinner";

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
      <div
        // minHeight comes from the caller so this placeholder occupies roughly the same
        // footprint as the panel it stands in for.
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "56px 20px",
          color: colors.textSecondary,
          fontSize: 12.5,
          minHeight,
        }}
      >
        <Spinner />
        <span>{message}</span>
      </div>
    </ResultsPanel>
  );
}
