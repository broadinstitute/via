import colors from "../../libs/colors";
import DnaSpinner from "../DnaSpinner";
import ResultsPanel from "./ResultsPanel";

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
        {/* Both strands inherit `color` through the component's currentColor default. */}
        <DnaSpinner colors={[colors.textSecondary, colors.textAccent]} size={72} rungs={false} duration={2000}/>
        <span>{message}</span>
      </div>
    </ResultsPanel>
  );
}
