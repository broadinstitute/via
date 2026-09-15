import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchDataSourceVersions, type DataSourceVersion } from "../../api/dataSourceVersions";
import colors from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";

const APP_VERSION = "0.0.1";

const styles = {
  footer: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    padding: "10px 14px",
    background: colors.surface1,
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
  },
  label: {
    flexShrink: 0,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  sources: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  source: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    padding: "5px 10px",
    background: colors.surface2,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
  },
  name: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.2,
  },
  versionRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },
  version: {
    ...Style.elements.mono,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 700,
  },
  link: {
    color: colors.textSecondary,
    fontSize: 11,
    textDecoration: "none",
  },
  appVersion: {
    ...Style.elements.mono,
    flexShrink: 0,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 600,
  },
  logo: {
    flexShrink: 0,
    height: 40,
    width: "auto",
  },
} as const satisfies Record<string, CSSProperties>;

export default function DataSourceVersionsFooter() {
  const [versions, setVersions] = useState<DataSourceVersion[]>([]);
  const { hoveredKey: hoveredLink, hoverProps: linkHoverProps } = useHoveredKey<string>();

  useEffect(() => {
    fetchDataSourceVersions()
      .then(setVersions)
      .catch((err: Error) => console.error("Failed to load data source versions", err));
  }, []);

  if (versions.length === 0) return null;

  return (
    <div style={styles.footer}>
      <span style={styles.label}>Sources</span>
      <div style={styles.sources}>
        {versions.map((source) => (
          <div key={source.name} style={styles.source}>
            <span style={styles.name}>{source.name}</span>
            <span style={styles.versionRow}>
              <span style={styles.version}>{source.version}</span>
              {source.url && (
                <a
                  style={{
                    ...styles.link,
                    ...(hoveredLink === source.name ? { color: colors.textAccent } : undefined),
                  }}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${source.name}`}
                  {...linkHoverProps(source.name)}
                >
                  ↗
                </a>
              )}
            </span>
          </div>
        ))}
      </div>
      <span style={styles.appVersion} title="VIA application version">
        VIA v{APP_VERSION}
      </span>
      <img style={styles.logo} src="/broad-logo.svg" alt="Broad Institute" />
    </div>
  );
}
