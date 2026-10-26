import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import AppVersion from "../elements/AppVersion";

// The page's last line, edge to edge like the top bar: the app's version and the Broad logo. The
// brand mark stays in the top bar alone, so it isn't on screen twice. The same bar on every page,
// pinned to the bottom of the window when the page is shorter than it (the pages lay out as a
// column with the main content growing).
const styles = {
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    minHeight: 58,
    padding: "10px 20px",
    background: colors.surface2,
    borderTop: `1px solid ${colors.border}`,
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
