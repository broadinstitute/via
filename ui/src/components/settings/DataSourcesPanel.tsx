import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchDataSourceVersions, type DataSourceVersion } from "../../api/dataSourceVersions";
import colors from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import { APP_VERSION } from "../../libs/version";

const styles = {
  title: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  intro: {
    marginBottom: 14,
    fontSize: 12,
    lineHeight: 1.5,
    color: colors.textSecondary,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "baseline",
    gap: 10,
    padding: "9px 12px",
  },
  name: {
    minWidth: 90,
    color: colors.textBody,
    fontSize: 12.5,
    fontWeight: 600,
  },
  version: {
    ...Style.elements.mono,
    color: colors.textPrimary,
    fontWeight: 700,
  },
  link: {
    marginLeft: "auto",
    color: colors.textSecondary,
    fontSize: 11.5,
    textDecoration: "none",
    wordBreak: "break-all",
  },
  skeletonRow: {
    height: 14,
    borderRadius: 4,
    background: colors.border,
  },
  error: {
    padding: "10px 12px",
    borderRadius: Style.radius,
    background: colors.bgDanger,
    color: colors.textDanger,
    fontSize: 12,
  },
  appVersion: {
    ...Style.elements.mono,
    display: "block",
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 600,
  },
} as const satisfies Record<string, CSSProperties>;

const SKELETON_ROWS = 5;

/** The link text: just the site, since the full URL is in the href. */
function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function DataSourcesPanel() {
  const [versions, setVersions] = useState<DataSourceVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { hoveredKey: hoveredLink, hoverProps: linkHoverProps } = useHoveredKey<string>();

  useEffect(() => {
    fetchDataSourceVersions()
      .then(setVersions)
      .catch((err: Error) => setError(`Couldn't reach the backend: ${err.message}`));
  }, []);

  const rowBorder = (index: number) => (index > 0 ? `1px solid ${colors.border}` : undefined);

  return (
    <>
      <h3 style={styles.title}>Data sources</h3>
      <p style={styles.intro}>The datasets and annotation releases behind VIA's results.</p>

      {error ? (
        <div role="alert" style={styles.error}>
          {error}
        </div>
      ) : !versions ? (
        <div style={styles.list} aria-busy="true">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div key={index} style={{ ...styles.row, borderTop: rowBorder(index) }}>
              <span className="animate-skeleton-pulse" style={{ ...styles.skeletonRow, width: `${50 - index * 5}%` }} />
            </div>
          ))}
        </div>
      ) : (
        <ul style={styles.list}>
          {versions.map((source, index) => (
            <li key={source.name} style={{ ...styles.row, borderTop: rowBorder(index) }}>
              <span style={styles.name}>{source.name}</span>
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
                  {hostname(source.url)} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <span style={styles.appVersion} title="VIA application version">
        VIA v{APP_VERSION}
      </span>
    </>
  );
}
