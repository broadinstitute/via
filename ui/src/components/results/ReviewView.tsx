import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { BreakdownSegment, CohortVariantRow, FilteredVariantRow } from "../../types/results";
import { buildComparisonRows, formatRatio, sortByEnrichment } from "../../utils/comparison";
import Clickable from "../common/Clickable";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons";
import ResultsPanel, { MatchedParticipantsChip, ScopeChip } from "./ResultsPanel";
import ReviewDetail from "./ReviewDetail";
import { VERDICT_TONE, verdictTone } from "./verdictTone";

// The rail's height follows the detail's: it's absolutely positioned inside its grid cell, so a
// long candidate list scrolls within the rail instead of stretching the page.
const RAIL_WIDTH = 260;

const styles = {
  stepper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  position: {
    ...Style.elements.mono,
    minWidth: 52,
    textAlign: "center",
    fontSize: 12,
    color: colors.textSecondary,
  },
  body: {
    display: "grid",
    gridTemplateColumns: `${RAIL_WIDTH}px minmax(0, 1fr)`,
    minHeight: 520,
  },
  railCell: {
    position: "relative",
    background: colors.surface1,
    borderRight: `1px solid ${colors.border}`,
  },
  rail: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
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
  railText: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    flex: 1,
    minWidth: 0,
  },
  railGene: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textBody,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  railVariant: {
    ...Style.elements.mono,
    fontSize: 10.5,
    color: colors.textSecondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  railRatio: {
    ...Style.elements.mono,
    flexShrink: 0,
    fontWeight: 700,
  },
  detail: {
    minWidth: 0,
    padding: "22px 28px 26px",
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

interface ReviewViewProps {
  cohortVariants: CohortVariantRow[];
  filteredVariants: FilteredVariantRow[];
  condition: string;
  participantCount: number;
  ancestryBreakdown: BreakdownSegment[];
  /** Which variant to open on; the best-supported signal when omitted or unknown. */
  initialVariant?: string;
}

/**
 * Review: the two cohorts head to head, one variant at a time, shown in place of the table when
 * the summary strip's switcher is on Review. A rail on the left ranks the candidates by how well
 * the interval supports a departure from cohort-wide; the detail on the right states the verdict,
 * the evidence behind it, and how the matched cohort's ancestry makeup bears on it. Arrow keys
 * step through the rail.
 */
export default function ReviewView({
  cohortVariants,
  filteredVariants,
  condition,
  participantCount,
  ancestryBreakdown,
  initialVariant,
}: ReviewViewProps) {
  const rows = useMemo(
    () => sortByEnrichment(buildComparisonRows(cohortVariants, filteredVariants, ancestryBreakdown)),
    [cohortVariants, filteredVariants, ancestryBreakdown],
  );
  const [index, setIndex] = useState(() => Math.max(0, rows.findIndex((row) => row.variant === initialVariant)));
  const { hoveredKey, hoverProps } = useHoveredKey<string>();
  const railRef = useRef<HTMLOListElement>(null);
  const selected = rows[index] ?? null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Not while typing in a field, e.g. the edit-search popover.
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((i) => Math.min(rows.length - 1, i + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [rows.length]);

  // Keep the selected rail entry in view as the arrow keys move through a long list.
  useEffect(() => {
    railRef.current
      ?.querySelector<HTMLElement>(`[data-rail-index="${index}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [index]);

  const stepper = (
    <div style={styles.stepper}>
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
    </div>
  );

  return (
    <ResultsPanel
      title="Review"
      scope={
        <>
          <MatchedParticipantsChip participantCount={participantCount} condition={condition} />
          <ScopeChip>vs. all participants</ScopeChip>
        </>
      }
      headerRight={stepper}
    >
      <div style={styles.body}>
        <div style={styles.railCell}>
          <nav style={styles.rail} aria-label="Candidate variants, best-supported first">
            <p style={styles.railIntro}>
              {rows.length} candidate{rows.length === 1 ? "" : "s"}, best-supported departure from cohort-wide first.
            </p>
            <ol ref={railRef} style={styles.railList}>
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
                      <span style={styles.railText}>
                        {row.cohort && <span style={styles.railGene}>{row.cohort.gene}</span>}
                        <span style={styles.railVariant} title={row.variant}>
                          {row.variant}
                        </span>
                      </span>
                      <span style={{ ...styles.railRatio, color: tone.ink }} title={tone.word}>
                        {row.enrichment ? formatRatio(row.enrichment.ratio) : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div style={styles.railFooter}>
              {Object.values(VERDICT_TONE).map((tone) => (
                <span key={tone.word} style={styles.legendItem}>
                  <span style={Style.colorDot(tone.ink, 8)} /> {tone.word}: {tone.rule}
                </span>
              ))}
              <span style={{ ...styles.legendItem, marginTop: 3 }}>
                <kbd style={styles.kbd}>←</kbd> <kbd style={styles.kbd}>→</kbd> step between variants
              </span>
            </div>
          </nav>
        </div>

        <section style={styles.detail}>
          {selected ? (
            <ReviewDetail
              key={selected.variant}
              row={selected}
              condition={condition}
              participantCount={participantCount}
              ancestryBreakdown={ancestryBreakdown}
              candidateCount={rows.length}
            />
          ) : (
            <p style={{ color: colors.textSecondary }}>No candidate variants to review.</p>
          )}
        </section>
      </div>
    </ResultsPanel>
  );
}
