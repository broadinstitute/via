import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fetchStatus, type BigQueryStatus } from "../../api/status";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";

// The BigQuery table check, shared by the settings dialog's System status panel and the results
// page's error state: the hook fetches /api/status, and the list draws what came back.

const styles = {
  summary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  list: {
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "9px 12px",
  },
  tableName: {
    ...Style.elements.mono,
    color: colors.textBody,
    wordBreak: "break-all",
  },
  detail: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 1.4,
    color: colors.textDanger,
    wordBreak: "break-word",
  },
  state: {
    marginLeft: "auto",
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 600,
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
} as const satisfies Record<string, CSSProperties>;

const SKELETON_ROWS = 4;

export interface BigQueryStatusState {
  status: BigQueryStatus | null;
  /** Why the check itself couldn't run, as opposed to a table being unavailable. */
  error: string | null;
  loading: boolean;
}

/** Runs the table check on mount; `check` runs it again. */
export function useBigQueryStatus(): BigQueryStatusState & { check: () => void } {
  const [status, setStatus] = useState<BigQueryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(() => {
    setLoading(true);
    setError(null);
    // Each outcome clears loading in the same tick it lands, so no render shows a result under a
    // still-loading button.
    fetchStatus().then(
      (next) => {
        setStatus(next);
        setLoading(false);
      },
      (err: Error) => {
        setError(`Couldn't reach the backend: ${err.message}`);
        setLoading(false);
      },
    );
  }, []);

  useEffect(check, [check]);

  return { status, error, loading, check };
}

/** The outcome of a table check: a summary chip over one row per table, or a skeleton while it runs. */
export function BigQueryStatusList({ status, error, loading }: BigQueryStatusState) {
  if (error) {
    return (
      <div role="alert" style={styles.error}>
        {error}
      </div>
    );
  }

  if (loading || !status) {
    return (
      <div style={styles.list} aria-busy="true">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={index} style={{ ...styles.row, borderTop: index > 0 ? `1px solid ${colors.border}` : undefined }}>
            <span className="animate-skeleton-pulse" style={{ ...styles.skeletonRow, width: `${60 - index * 6}%` }} />
          </div>
        ))}
      </div>
    );
  }

  const unavailable = status.tables.filter((table) => !table.accessible).length;

  return (
    <>
      <div
        style={{
          ...styles.summary,
          background: status.accessible ? colors.bgSuccess : colors.bgDanger,
          color: status.accessible ? colors.textSuccess : colors.textDanger,
        }}
      >
        {status.accessible ? "All tables accessible" : `${unavailable} of ${status.tables.length} tables unavailable`}
      </div>
      <ul style={{ ...styles.list, listStyle: "none", margin: 0, padding: 0 }}>
        {status.tables.map((table, index) => (
          <li key={table.table} style={{ ...styles.row, borderTop: index > 0 ? `1px solid ${colors.border}` : undefined }}>
            <span
              style={{
                ...Style.colorDot(table.accessible ? colors.textSuccess : colors.textDanger, 8),
                marginTop: 4,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={styles.tableName}>{table.table}</div>
              {table.detail && <div style={styles.detail}>{table.detail}</div>}
            </div>
            <span style={{ ...styles.state, color: table.accessible ? colors.textSuccess : colors.textDanger }}>
              {table.accessible ? "Accessible" : "Unavailable"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
