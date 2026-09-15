import type { CSSProperties, ReactNode } from "react";
import * as Style from "../../libs/style";

const styles = {
  panel: {
    ...Style.elements.panel,
    display: "flex",
    flexDirection: "column",
    boxShadow: Style.shadows.panel,
  },
  header: {
    ...Style.elements.panelHeader,
    justifyContent: "space-between",
  },
} as const satisfies Record<string, CSSProperties>;

interface ResultsPanelProps {
  title: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

export default function ResultsPanel({ title, headerRight, children, style }: ResultsPanelProps) {
  return (
    <div style={{ ...styles.panel, ...style }}>
      <div style={styles.header}>
        <h2 style={Style.elements.panelTitle}>{title}</h2>
        {headerRight}
      </div>
      {children}
    </div>
  );
}
