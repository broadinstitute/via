import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchDataSourceVersions, type DataSourceVersion } from "../../api/dataSourceVersions";
import { describeError } from "../../api/client";
import colors from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import AppVersion from "../elements/AppVersion";

const styles = {
  title: {
    ...Style.elements.panelTitle,
    marginBottom: 6,
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
      .catch((err: unknown) => setError(`Couldn't reach the backend: ${describeError(err)}`));
  }, []);

  const rowBorder = (index: number) => (index > 0 ? `1px solid ${colors.border}` : undefined);

  return (
    <>
      <h3 style={styles.title}>Data sources</h3>
      <p style={Style.elements.panelIntro}>The datasets and annotation releases behind VIA's results.</p>

      {error ? (
        <div role="alert" style={Style.elements.errorNote}>
          {error}
        </div>
      ) : !versions ? (
        <div style={styles.list} aria-busy="true">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div key={index} style={{ ...styles.row, borderTop: rowBorder(index) }}>
              <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: `${50 - index * 5}%` }} />
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

      <AppVersion style={{ marginTop: 14 }} />
    </>
  );
}
