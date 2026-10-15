import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { describeError } from "../../api/client";
import { fetchQueryUsage, type QueryUsage } from "../../api/usage";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import { formatBytes, formatInt, formatUsd } from "../../utils/format";
import Clickable from "../common/Clickable";

// What this VIA instance has spent on BigQuery since it started: the figures BigQuery reports on
// each job, added up by the backend. Four facts in a row, the cost last, with the one caveat
// that matters (the cost assumes on-demand pricing) under them.

const styles = {
  heading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  // Two by two: four facts never fit a row at the dialog's width, and a lone fourth leaves a hole.
  facts: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 1,
    margin: 0,
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    overflow: "hidden",
    background: colors.border,
  },
  fact: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "12px 14px",
    background: colors.surface2,
  },
  label: {
    ...Style.elements.eyebrow,
  },
  value: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.1,
    color: colors.textPrimary,
    fontVariantNumeric: "tabular-nums",
  },
  detail: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  note: {
    margin: "12px 0 0",
    fontSize: 11.5,
    lineHeight: 1.5,
    color: colors.textSecondary,
  },
} as const satisfies Record<string, CSSProperties>;

const SKELETON_FACTS = 4;

/** "since 3:12 PM" today, or "since Oct 14, 3:12 PM" on another day. */
function describeSince(iso: string): string {
  const since = new Date(iso);
  const today = new Date();
  const sameDay =
    since.getFullYear() === today.getFullYear() && since.getMonth() === today.getMonth() && since.getDate() === today.getDate();
  const time = since.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return sameDay ? `since ${time}` : `since ${since.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

export default function UsagePanel() {
  const [usage, setUsage] = useState<QueryUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchQueryUsage()
      .then(setUsage)
      .catch((err: unknown) => setError(`Couldn't reach the backend: ${describeError(err)}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <>
      <div style={styles.heading}>
        <h3 style={Style.elements.panelTitle}>BigQuery usage</h3>
        <Clickable
          style={Style.buttons.accent}
          hoverStyle={Style.buttons.accentHover}
          disabledStyle={Style.buttons.disabled}
          onClick={load}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Clickable>
      </div>
      <p style={Style.elements.panelIntro}>
        What this session's searches have cost in BigQuery, from BigQuery's own figures for each query
        {usage ? `, ${describeSince(usage.since)}` : ""}.
      </p>

      {error ? (
        <div role="alert" style={Style.elements.errorNote}>
          {error}
        </div>
      ) : loading || !usage ? (
        <dl style={styles.facts} aria-busy="true">
          {Array.from({ length: SKELETON_FACTS }, (_, index) => (
            <div key={index} style={styles.fact}>
              <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: 60, height: 8 }} />
              <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: 80, height: 20 }} />
            </div>
          ))}
        </dl>
      ) : (
        <>
          <dl style={styles.facts}>
            <div style={styles.fact}>
              <dt style={styles.label}>Queries</dt>
              <dd style={{ ...styles.value, margin: 0 }}>{formatInt(usage.queries)}</dd>
              <span style={styles.detail}>
                {usage.cacheHits} from cache
              </span>
            </div>
            <div style={styles.fact}>
              <dt style={styles.label}>Data billed</dt>
              <dd style={{ ...styles.value, margin: 0 }}>{formatBytes(usage.bytesBilled)}</dd>
              <span style={styles.detail}>{formatBytes(usage.bytesProcessed)} read</span>
            </div>
            <div style={styles.fact}>
              <dt style={styles.label}>Slot time</dt>
              <dd style={{ ...styles.value, margin: 0 }}>{formatSlotTime(usage.slotMilliseconds)}</dd>
              <span style={styles.detail}>what a reservation bills for</span>
            </div>
            <div style={styles.fact}>
              <dt style={styles.label}>Estimated cost</dt>
              <dd style={{ ...styles.value, margin: 0 }}>{formatUsd(usage.estimatedCostUsd)}</dd>
              <span style={styles.detail}>on-demand, $6.25 per TB</span>
            </div>
          </dl>
          <p style={styles.note}>
            Counts every query this instance has run since it started, and resets when it restarts. A query
            BigQuery answers from its cache bills nothing; any other is billed at least 10 MB. The cost is an
            estimate at on-demand pricing: a project on a reservation pays for slot time instead.
          </p>
        </>
      )}
    </>
  );
}

/** Slot time as the console shows it: milliseconds below a second, then seconds or minutes. */
export function formatSlotTime(milliseconds: number): string {
  if (milliseconds < 1000) return `${formatInt(milliseconds)} ms`;
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toLocaleString("en-US", { maximumFractionDigits: 1 })} s`;
  return `${(seconds / 60).toLocaleString("en-US", { maximumFractionDigits: 1 })} min`;
}
