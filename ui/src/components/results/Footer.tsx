import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import { APP_VERSION } from "../../libs/version";

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
  identity: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  version: {
    ...Style.elements.mono,
    padding: "2px 7px",
    borderRadius: 6,
    background: colors.bgAccent,
    color: colors.textAccent,
    fontSize: 11,
    fontWeight: 600,
  },
  logo: {
    height: 32,
    width: "auto",
  },
} as const satisfies Record<string, CSSProperties>;

// Data source versions live in the settings dialog's "Data sources" panel.
export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.identity}>
        <span style={styles.version} title="VIA version">
          v{APP_VERSION}
        </span>
      </div>
      <img style={styles.logo} src="/broad-logo.svg" alt="Broad Institute" />
    </footer>
  );
}
