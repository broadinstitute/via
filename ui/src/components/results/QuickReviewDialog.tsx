import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import colors, { alpha } from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { BreakdownSegment, CohortVariantRow, FilteredVariantRow } from "../../types/results";
import { buildComparisonRows, formatRatio, sortByEnrichment } from "../../utils/comparison";
import Clickable from "../common/Clickable";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, UserIcon } from "../icons";
import QuickReviewDetail, { ENRICHMENT_RATIO_THRESHOLD, verdictTone } from "./QuickReviewDetail";
import { ScopeChip } from "./ResultsPanel";

const styles = {
  scrim: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: alpha(colors.textPrimary, 0.35),
  },
  dialog: {
    ...Style.elements.panel,
    display: "flex",
    flexDirection: "column",
    width: 1040,
    maxWidth: "100%",
    height: "calc(100vh - 32px)",
    maxHeight: 760,
    boxShadow: Style.shadows.raised,
    outline: "none",
  },
  header: {
    ...Style.elements.panelHeader,
    justifyContent: "space-between",
    gap: 12,
  },
  heading: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  position: {
    ...Style.elements.mono,
    minWidth: 52,
    textAlign: "center",
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerDivider: {
    width: 1,
    height: 18,
    margin: "0 4px",
    background: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 700,
  },
  body: {
    display: "flex",
    flex: 1,
    minHeight: 0,
  },
  rail: {
    display: "flex",
    flexDirection: "column",
    width: 250,
    flexShrink: 0,
    background: colors.surface1,
    borderRight: `1px solid ${colors.border}`,
  },
  railIntro: {
    padding: "10px 12px 6px",
    fontSize: 11,
    lineHeight: 1.45,
    color: colors.textMuted,
  },
  railFooter: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    padding: "8px 12px 10px",
    borderTop: `1px solid ${colors.border}`,
    fontSize: 11,
    color: colors.textMuted,
  },
  railList: {
    flex: 1,
    margin: 0,
    padding: "0 6px 6px",
    listStyle: "none",
    overflowY: "auto",
    scrollbarWidth: "thin",
  },
  railItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "7px 8px",
    border: "none",
    borderRadius: 6,
    background: "none",
    textAlign: "left",
    cursor: "pointer",
  },
  railItemHovered: {
    background: colors.surface0,
  },
  railItemSelected: {
    background: colors.bgAccent,
  },
  railVariant: {
    ...Style.elements.mono,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.textBody,
  },
  railRatio: {
    ...Style.elements.mono,
    flexShrink: 0,
    fontWeight: 700,
  },
  detail: {
    flex: 1,
    minWidth: 0,
    padding: "18px 22px",
    overflowY: "auto",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },
  kbd: {
    padding: "0 4px",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 3,
    fontFamily: Style.monoFamily,
    fontSize: 10,
  },
} as const satisfies Record<string, CSSProperties>;

interface QuickReviewDialogProps {
  cohortVariants: CohortVariantRow[];
  filteredVariants: FilteredVariantRow[];
  condition: string;
  participantCount: number;
  ancestryBreakdown: BreakdownSegment[];
  /** Which variant to open on; the strongest signal when omitted or unknown. */
  initialVariant?: string;
  onClose: () => void;
}

/**
 * Quick review: the two cohorts head to head, one variant at a time. A rail on the left ranks the
 * candidates by how far their phenotype-matched frequency departs from the cohort-wide one; the
 * detail on the right states the verdict, the counts behind it, and how the matched cohort's
 * ancestry makeup bears on it. Arrow keys step through the rail, Escape closes.
 */
export default function QuickReviewDialog({
  cohortVariants,
  filteredVariants,
  condition,
  participantCount,
  ancestryBreakdown,
  initialVariant,
  onClose,
}: QuickReviewDialogProps) {
  const rows = useMemo(
    () => sortByEnrichment(buildComparisonRows(cohortVariants, filteredVariants)),
    [cohortVariants, filteredVariants],
  );
  const [index, setIndex] = useState(() => Math.max(0, rows.findIndex((row) => row.variant === initialVariant)));
  const { hoveredKey, hoverProps } = useHoveredKey<string>();
  const dialogRef = useRef<HTMLDivElement>(null);
  const selected = rows[index] ?? null;

  useEffect(() => dialogRef.current?.focus(), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((i) => Math.min(rows.length - 1, i + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, rows.length]);

  // Keep the selected rail entry in view as the arrow keys move through a long list.
  useEffect(() => {
    dialogRef.current
      ?.querySelector<HTMLElement>(`[data-rail-index="${index}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [index]);

  return (
    <div style={styles.scrim} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickReviewTitle"
        tabIndex={-1}
        style={styles.dialog}
      >
        <div style={styles.header}>
          <div style={styles.heading}>
            <h2 id="quickReviewTitle" style={styles.title}>
              Quick review
            </h2>
            <ScopeChip
              tone="accent"
              icon={<UserIcon size={12} strokeWidth={2.5} aria-hidden="true" />}
              title={`${participantCount.toLocaleString()} participants with ${condition}`}
            >
              {participantCount.toLocaleString()} with {condition}
            </ScopeChip>
            <ScopeChip>vs. all participants</ScopeChip>
          </div>
          <div style={styles.headerRight}>
            <Clickable
              style={Style.buttons.icon}
              hoverStyle={Style.buttons.iconHover}
              disabledStyle={Style.buttons.disabled}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index <= 0}
              aria-label="Previous variant"
              title="Previous variant (←)"
            >
              <ArrowLeftIcon size={14} strokeWidth={2.5} aria-hidden="true" />
            </Clickable>
            <span style={styles.position} aria-live="polite">
              {rows.length === 0 ? "0 of 0" : `${index + 1} of ${rows.length}`}
            </span>
            <Clickable
              style={Style.buttons.icon}
              hoverStyle={Style.buttons.iconHover}
              disabledStyle={Style.buttons.disabled}
              onClick={() => setIndex((i) => Math.min(rows.length - 1, i + 1))}
              disabled={index >= rows.length - 1}
              aria-label="Next variant"
              title="Next variant (→)"
            >
              <ArrowRightIcon size={14} strokeWidth={2.5} aria-hidden="true" />
            </Clickable>
            <span style={styles.headerDivider} aria-hidden="true" />
            <Clickable
              style={Style.buttons.icon}
              hoverStyle={Style.buttons.iconHover}
              onClick={onClose}
              aria-label="Close quick review"
              title="Close (Esc)"
            >
              <CloseIcon size={14} strokeWidth={2.5} />
            </Clickable>
          </div>
        </div>

        <div style={styles.body}>
          <nav style={styles.rail} aria-label="Candidate variants, strongest signal first">
            <p style={styles.railIntro}>
              {rows.length} candidate{rows.length === 1 ? "" : "s"}, strongest departure from cohort-wide first.
            </p>
            <ol style={styles.railList}>
              {rows.map((row, i) => {
                const tone = verdictTone(row.enrichment);
                return (
                  <li key={row.variant}>
                    <button
                      type="button"
                      data-rail-index={i}
                      aria-current={i === index ? "true" : undefined}
                      onClick={() => setIndex(i)}
                      {...hoverProps(row.variant)}
                      style={{
                        ...styles.railItem,
                        ...(hoveredKey === row.variant ? styles.railItemHovered : undefined),
                        ...(i === index ? styles.railItemSelected : undefined),
                      }}
                    >
                      <span style={Style.colorDot(tone.ink, 8)} aria-hidden="true" />
                      <span style={styles.railVariant} title={row.variant}>
                        {row.variant}
                      </span>
                      <span style={{ ...styles.railRatio, color: tone.ink }}>
                        {row.enrichment ? formatRatio(row.enrichment.ratio) : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div style={styles.railFooter}>
              <span style={styles.legendItem}>
                <span style={Style.colorDot(colors.textDanger, 8)} /> Enriched, ≥ {ENRICHMENT_RATIO_THRESHOLD}× cohort-wide
              </span>
              <span style={styles.legendItem}>
                <span style={Style.colorDot(colors.textAccent, 8)} /> Depleted, ≤ {1 / ENRICHMENT_RATIO_THRESHOLD}×
              </span>
              <span style={styles.legendItem}>
                <span style={Style.colorDot(colors.textSecondary, 8)} /> Similar
              </span>
              <span style={{ ...styles.legendItem, marginTop: 3 }}>
                <kbd style={styles.kbd}>←</kbd> <kbd style={styles.kbd}>→</kbd> step · <kbd style={styles.kbd}>Esc</kbd> close
              </span>
            </div>
          </nav>

          <section style={styles.detail}>
            {selected ? (
              <QuickReviewDetail
                key={selected.variant}
                row={selected}
                condition={condition}
                participantCount={participantCount}
                ancestryBreakdown={ancestryBreakdown}
              />
            ) : (
              <p style={{ color: colors.textSecondary }}>No candidate variants to review.</p>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
