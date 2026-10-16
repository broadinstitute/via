import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { describeError } from "../../api/client";
import { fetchQueryUsage, type QueryUsage, type SearchUsage } from "../../api/usage";
import colors from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import { formatBytes, formatInt, formatUsd } from "../../utils/format";
import { describeAlternatives } from "../../utils/phenotypes";
import { usePreference } from "../../utils/preferences";
import Clickable from "../common/Clickable";
import { ArrowLeftIcon, ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, UserIcon } from "../icons";

// What this VIA instance has spent on BigQuery since it started, as a receipt: the totals as a
// strip of four labelled stats, then the last requests newest first (searches, and the phenotype
// type-ahead's lookups, which bill too), each a row that opens into the queries it ran. The
// per-query rows are where the two things worth knowing show up: a repeated search is answered
// from BigQuery's cache for nothing, and anything else is billed at least 10 MB per table it reads
// (so the two-table overlap query bills 20 MB on an empty read; see "On-demand compute pricing" at
// cloud.google.com/bigquery/pricing). Every search starts closed. Ten searches to a page, with the rest behind a pager, so
// the dialog doesn't grow with the log.

const styles = {
  heading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  // The one setting here: whether the top bar carries the meter. A checkbox with its label, in
  // the intro's slot under the title.
  option: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    fontSize: 12,
    color: colors.textBody,
    cursor: "pointer",
  },
  optionBox: {
    margin: 0,
    accentColor: colors.textAccent,
    cursor: "pointer",
  },
  // The session's totals, one labelled cell each, in a bar.
  strip: {
    display: "flex",
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    background: colors.surface1,
    overflow: "hidden",
  },
  stat: {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    borderLeft: `1px solid ${colors.border}`,
  },
  statFirst: {
    borderLeft: "none",
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.3,
    color: colors.textPrimary,
    fontVariantNumeric: "tabular-nums",
  },
  statSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // Over the list: what it holds, and since when.
  caption: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    margin: "16px 0 6px",
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  captionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textBody,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    overflow: "hidden",
  },
  // A search's row: the toggle, when, what, and its cost at the right.
  search: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 10px",
    border: "none",
    borderTop: `1px solid ${colors.border}`,
    background: "none",
    color: colors.textPrimary,
    font: "inherit",
    textAlign: "left",
    cursor: "pointer",
  },
  searchFirst: {
    borderTop: "none",
  },
  searchHovered: {
    background: colors.surface1,
  },
  chevron: {
    flexShrink: 0,
    color: colors.textMuted,
  },
  when: {
    flexShrink: 0,
    width: 62,
    fontSize: 11.5,
    color: colors.textSecondary,
    fontVariantNumeric: "tabular-nums",
  },
  what: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  variants: {
    ...Style.elements.mono,
    overflow: "hidden",
    fontSize: 11,
    color: colors.textBody,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  // A type-ahead lookup: what it is, then the typed text in quotes.
  lookup: {
    overflow: "hidden",
    fontSize: 12,
    color: colors.textSecondary,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  lookupTerm: {
    color: colors.textBody,
    fontWeight: 600,
  },
  phenotype: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    maxWidth: 180,
    padding: "1px 7px",
    borderRadius: 6,
    background: colors.bgAccent,
    color: colors.textAccent,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cost: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11.5,
    color: colors.textSecondary,
    fontVariantNumeric: "tabular-nums",
  },
  costBilled: {
    fontWeight: 600,
    color: colors.textPrimary,
  },
  tag: {
    padding: "1px 7px",
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 600,
  },
  tagCached: {
    background: colors.bgSuccess,
    color: colors.textSuccess,
  },
  tagBilled: {
    background: colors.bgAccent,
    color: colors.textAccent,
  },
  // The opened search's queries, a small table in the panel's tint.
  jobs: {
    width: "100%",
    borderCollapse: "collapse",
    background: colors.surface1,
    borderTop: `1px solid ${colors.border}`,
    fontSize: 11.5,
  },
  jobsHead: {
    padding: "5px 10px 5px 40px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  jobCell: {
    padding: "5px 10px 5px 40px",
    borderTop: `1px solid ${colors.border}`,
    color: colors.textBody,
    verticalAlign: "middle",
  },
  jobCellRight: {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    paddingLeft: 10,
  },
  empty: {
    padding: "14px 12px",
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  // Which searches are showing, and the arrows to the ones before and after.
  pager: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 8,
    fontSize: 11.5,
    color: colors.textSecondary,
    fontVariantNumeric: "tabular-nums",
  },
  pagerRange: {
    marginRight: 6,
  },
} as const satisfies Record<string, CSSProperties>;

const SKELETON_ROWS = 3;
const STATS = 4;

function Stat({ label, value, sub, first }: { label: string; value: string; sub?: string; first?: boolean }) {
  return (
    <div style={{ ...styles.stat, ...(first ? styles.statFirst : undefined) }}>
      <dt style={styles.statLabel}>{label}</dt>
      <dd style={{ margin: 0 }}>
        <div style={styles.statValue}>{value}</div>
        {sub && <div style={styles.statSub}>{sub}</div>}
      </dd>
    </div>
  );
}
/** Searches shown at once; the pager steps through the rest. */
export const SEARCHES_PER_PAGE = 10;
/** Variant IDs shown in a search's row before the rest are summarised as "+N more". */
const PREVIEW_VARIANTS = 2;

/** "since 3:12 PM" today, or "since Oct 14, 3:12 PM" on another day. */
export function describeSince(iso: string, now = new Date()): string {
  const since = new Date(iso);
  const sameDay =
    since.getFullYear() === now.getFullYear() && since.getMonth() === now.getMonth() && since.getDate() === now.getDate();
  const time = since.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return sameDay ? `since ${time}` : `since ${since.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

/** Slot time as the console shows it: milliseconds below a second, then seconds or minutes. */
export function formatSlotTime(milliseconds: number): string {
  if (milliseconds < 1000) return `${formatInt(milliseconds)} ms`;
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toLocaleString("en-US", { maximumFractionDigits: 1 })} s`;
  return `${(seconds / 60).toLocaleString("en-US", { maximumFractionDigits: 1 })} min`;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const clockSeconds = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

function previewVariants(variants: string[]): string {
  const shown = variants.slice(0, PREVIEW_VARIANTS).join(", ");
  const rest = variants.length - PREVIEW_VARIANTS;
  return rest > 0 ? `${shown} +${rest} more` : shown;
}

/** "cached" when every query came from the cache (a repeat), else "billed". */
function CostTag({ search }: { search: SearchUsage }) {
  const cached = search.queries.length > 0 && search.cacheHits === search.queries.length;
  return (
    <span style={{ ...styles.tag, ...(cached ? styles.tagCached : styles.tagBilled) }}>{cached ? "cached" : "billed"}</span>
  );
}

export default function UsagePanel() {
  const [usage, setUsage] = useState<QueryUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Which searches are open, by id. All start closed.
  const [open, setOpen] = useState<Set<number>>(new Set());
  // Zero-based; clamped below so a refresh that shortens the log can't leave it past the end.
  const [page, setPage] = useState(0);
  const { hoveredKey, hoverProps } = useHoveredKey<number>();
  const [showMeter, setShowMeter] = usePreference("showUsageMeter");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchQueryUsage()
      .then(setUsage)
      .catch((err: unknown) => setError(`Couldn't reach the backend: ${describeError(err)}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const pageCount = usage ? Math.max(1, Math.ceil(usage.searches.length / SEARCHES_PER_PAGE)) : 1;
  const currentPage = Math.min(page, pageCount - 1);
  const first = currentPage * SEARCHES_PER_PAGE;
  const shown = usage ? usage.searches.slice(first, first + SEARCHES_PER_PAGE) : [];

  function toggle(id: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      <label style={styles.option}>
        <input
          type="checkbox"
          style={styles.optionBox}
          checked={showMeter}
          onChange={(event) => setShowMeter(event.target.checked)}
        />
        <span>Show usage in the top bar</span>
      </label>

      {error ? (
        <div role="alert" style={Style.elements.errorNote}>
          {error}
        </div>
      ) : loading || !usage ? (
        <>
          <div style={styles.strip} aria-busy="true">
            {Array.from({ length: STATS }, (_, index) => (
              <div key={index} style={{ ...styles.stat, ...(index === 0 ? styles.statFirst : undefined) }}>
                <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: "60%", height: 10 }} />
              </div>
            ))}
          </div>
          <div style={styles.caption}>
            <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: 120, height: 10 }} />
          </div>
          <div style={styles.list} aria-busy="true">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <div key={index} style={{ ...styles.search, ...(index === 0 ? styles.searchFirst : undefined), cursor: "default" }}>
                <span className="animate-skeleton-pulse" style={{ ...Style.elements.skeleton, width: `${70 - index * 8}%` }} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <dl role="group" style={styles.strip} aria-label="This session's totals">
            <Stat first label="Billed" value={formatBytes(usage.bytesBilled)} />
            <Stat label="Est. cost" value={formatUsd(usage.estimatedCostUsd)} sub="on-demand" />
            <Stat label="Queries" value={formatInt(usage.queries)} sub={`${formatInt(usage.cacheHits)} from cache`} />
            <Stat label="Slot time" value={formatSlotTime(usage.slotMilliseconds)} />
          </dl>
          <div style={styles.caption}>
            <span style={styles.captionTitle}>Recent requests</span>
            <span>Searches and phenotype lookups {describeSince(usage.since)}, newest first</span>
          </div>
          {usage.searches.length === 0 ? (
            <div style={{ ...styles.list, ...styles.empty }}>Nothing has queried BigQuery yet this session.</div>
          ) : (
            <ul style={styles.list} aria-label="Requests this session, newest first">
              {shown.map((search, index) => {
                const expanded = open.has(search.id);
                const jobsId = `usage-search-${search.id}`;
                return (
                  <li key={search.id}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={jobsId}
                      onClick={() => toggle(search.id)}
                      {...hoverProps(search.id)}
                      style={{
                        ...styles.search,
                        ...(index === 0 ? styles.searchFirst : undefined),
                        ...(hoveredKey === search.id ? styles.searchHovered : undefined),
                      }}
                    >
                      {expanded ? (
                        <ChevronDownIcon size={12} strokeWidth={2.5} style={styles.chevron} aria-hidden="true" />
                      ) : (
                        <ChevronRightIcon size={12} strokeWidth={2.5} style={styles.chevron} aria-hidden="true" />
                      )}
                      <span style={styles.when}>{clock(search.at)}</span>
                      <span style={styles.what}>
                        {search.kind === "condition" ? (
                          <span style={styles.lookup}>
                            Condition lookup <span style={styles.lookupTerm}>“{search.term}”</span>
                          </span>
                        ) : (
                          <>
                            <span style={styles.variants} title={search.variants.join("\n")}>
                              {previewVariants(search.variants)}
                            </span>
                            {search.phenotypes.length > 0 && (
                              <span style={styles.phenotype} title={describeAlternatives(search.phenotypes)}>
                                <UserIcon size={10} strokeWidth={2.5} aria-hidden="true" />
                                {describeAlternatives(search.phenotypes)}
                              </span>
                            )}
                          </>
                        )}
                      </span>
                      <span style={styles.cost}>
                        <span>
                          {search.queries.length} {search.queries.length === 1 ? "query" : "queries"}
                        </span>
                        <span style={styles.costBilled}>{formatBytes(search.bytesBilled)}</span>
                        <CostTag search={search} />
                      </span>
                    </button>
                    {expanded && (
                      <table id={jobsId} style={styles.jobs} aria-label={`Queries run by request ${search.id}`}>
                        <thead>
                          <tr>
                            <th style={styles.jobsHead}>When</th>
                            <th style={{ ...styles.jobsHead, paddingLeft: 10 }}>Query</th>
                            <th style={{ ...styles.jobsHead, ...styles.jobCellRight }}>Read</th>
                            <th style={{ ...styles.jobsHead, ...styles.jobCellRight }}>Billed</th>
                            <th style={{ ...styles.jobsHead, paddingLeft: 10 }} />
                          </tr>
                        </thead>
                        <tbody>
                          {search.queries.map((job, jobIndex) => (
                            <tr key={jobIndex}>
                              <td style={{ ...styles.jobCell, fontVariantNumeric: "tabular-nums" }}>{clockSeconds(job.at)}</td>
                              <td style={{ ...styles.jobCell, paddingLeft: 10 }}>{job.name}</td>
                              <td style={{ ...styles.jobCell, ...styles.jobCellRight }}>{formatBytes(job.bytesProcessed)}</td>
                              <td style={{ ...styles.jobCell, ...styles.jobCellRight }}>{job.cacheHit ? "0" : formatBytes(job.bytesBilled)}</td>
                              <td style={{ ...styles.jobCell, paddingLeft: 10 }}>
                                <span style={{ ...styles.tag, ...(job.cacheHit ? styles.tagCached : styles.tagBilled) }}>
                                  {job.cacheHit ? "cache" : "billed"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {usage.searches.length > SEARCHES_PER_PAGE && (
            <nav style={styles.pager} aria-label="Requests, by page">
              <span style={styles.pagerRange}>
                {first + 1}–{first + shown.length} of {usage.searches.length}
              </span>
              <Clickable
                style={Style.buttons.icon}
                hoverStyle={Style.buttons.iconHover}
                disabledStyle={Style.buttons.disabled}
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                aria-label="Newer requests"
                title="Newer requests"
              >
                <ArrowLeftIcon size={14} strokeWidth={2.5} aria-hidden="true" />
              </Clickable>
              <Clickable
                style={Style.buttons.icon}
                hoverStyle={Style.buttons.iconHover}
                disabledStyle={Style.buttons.disabled}
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                aria-label="Older requests"
                title="Older requests"
              >
                <ArrowRightIcon size={14} strokeWidth={2.5} aria-hidden="true" />
              </Clickable>
            </nav>
          )}
        </>
      )}
    </>
  );
}
