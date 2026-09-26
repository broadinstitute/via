import type { CSSProperties } from "react";
import * as Style from "../../libs/style";
import AppVersion from "../elements/AppVersion";

const styles = {
  footer: {
    ...Style.elements.panel,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    padding: "12px 18px",
    boxShadow: Style.shadows.panel,
  },
  logo: {
    height: 32,
    width: "auto",
  },
} as const satisfies Record<string, CSSProperties>;

interface FooterProps {
  style?: CSSProperties;
}

export default function Footer({ style }: FooterProps) {
  return (
    <footer style={{ ...styles.footer, ...style }}>
      <AppVersion />
      <img style={styles.logo} src="/broad-logo.svg" alt="Broad Institute" />
    </footer>
  );
}
