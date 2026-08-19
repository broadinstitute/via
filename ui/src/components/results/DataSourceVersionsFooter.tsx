import { useEffect, useState } from "react";
import { fetchDataSourceVersions, type DataSourceVersion } from "../../api/dataSourceVersions";
import styles from "./DataSourceVersionsFooter.module.css";

const APP_VERSION = "0.0.1";

export default function DataSourceVersionsFooter() {
  const [versions, setVersions] = useState<DataSourceVersion[]>([]);

  useEffect(() => {
    fetchDataSourceVersions()
      .then(setVersions)
      .catch((err: Error) => console.error("Failed to load data source versions", err));
  }, []);

  if (versions.length === 0) return null;

  return (
    <div className={styles.footer}>
      <span className={styles.label}>Data Sources</span>
      <div className={styles.sources}>
        {versions.map((source) => (
          <div key={source.name} className={styles.source}>
            <span className={styles.name}>{source.name}</span>
            <span className={styles.versionRow}>
              <span className={styles.version}>{source.version}</span>
              {source.url && (
                <a
                  className={styles.link}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${source.name}`}
                >
                  ↗
                </a>
              )}
            </span>
          </div>
        ))}
      </div>
      <span className={styles.appVersion} title="VIA application version">
        VIA v{APP_VERSION}
      </span>
    </div>
  );
}
