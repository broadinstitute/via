import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import colors from "../libs/colors";
import { useHover } from "../libs/hooks";
import * as Style from "../libs/style";
import {
  clearRecentSearches,
  describeSearchedAt,
  loadRecentSearches,
  type RecentSearch,
} from "../utils/recentSearches";
import { resultsPath } from "../utils/variants";
import Clickable from "./common/Clickable";
import { ChevronRightIcon } from "./icons";

/** Variant IDs shown in a row before the rest are summarised as "+N more". */
const PREVIEW_VARIANTS = 3;

const styles = {
  section: {
    marginTop: 28,
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: "0 4px",
  },
  heading: {
    ...Style.elements.eyebrow,
    color: colors.textSecondary,
  },
  clear: {
    padding: 0,
    border: "none",
    background: "none",
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  clearHover: {
    color: colors.textAccent,
  },
  list: {
    ...Style.elements.panel,
    margin: 0,
    padding: 0,
    listStyle: "none",
    boxShadow: Style.shadows.panel,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: "100%",
    padding: "11px 16px",
    border: "none",
    background: "none",
    textAlign: "left",
    cursor: "pointer",
  },
  rowHover: {
    background: colors.surface1,
  },
  summary: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  topLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  count: {
    flexShrink: 0,
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: 600,
  },
  condition: {
    overflow: "hidden",
    padding: "1px 8px",
    borderRadius: 6,
    background: colors.bgAccent,
    color: colors.textAccent,
    fontSize: 11.5,
    fontWeight: 600,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  noCondition: {
    color: colors.textMuted,
    fontSize: 11.5,
  },
  preview: {
    ...Style.elements.mono,
    overflow: "hidden",
    color: colors.textMuted,
    fontSize: 11,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  time: {
    flexShrink: 0,
    color: colors.textMuted,
    fontSize: 11.5,
  },
  chevron: {
    flexShrink: 0,
    color: colors.textMuted,
  },
} as const satisfies Record<string, CSSProperties>;

function previewVariants(variants: string[]): string {
  const shown = variants.slice(0, PREVIEW_VARIANTS).join(", ");
  const rest = variants.length - PREVIEW_VARIANTS;
  return rest > 0 ? `${shown} +${rest} more` : shown;
}

const variantCount = (search: RecentSearch) =>
  `${search.variants.length} variant${search.variants.length === 1 ? "" : "s"}`;

/**
 * The last few searches run in this browser (see utils/recentSearches), each re-run with a
 * click. Renders nothing until there's history, so a first visit isn't met with an empty list.
 */
export default function RecentSearches() {
  const navigate = useNavigate();
  const [searches, setSearches] = useState(loadRecentSearches);
  const { hovered: clearHovered, hoverProps: clearHoverProps } = useHover();

  if (searches.length === 0) return null;

  return (
    <section style={styles.section} aria-labelledby="recentSearchesHeading">
      <div style={styles.header}>
        <h2 id="recentSearchesHeading" style={styles.heading}>
          Recent searches
        </h2>
        <button
          type="button"
          style={{ ...styles.clear, ...(clearHovered ? styles.clearHover : undefined) }}
          onClick={() => {
            clearRecentSearches();
            setSearches([]);
          }}
          {...clearHoverProps}
        >
          Clear
        </button>
      </div>
      <ul style={styles.list}>
        {searches.map((search, index) => (
          <li
            key={search.searchedAt}
            style={index > 0 ? { borderTop: `1px solid ${colors.border}` } : undefined}
          >
            <Clickable
              style={styles.row}
              hoverStyle={styles.rowHover}
              onClick={() => navigate(resultsPath(search.variants, search.condition?.conceptId ?? null))}
              aria-label={`Run again: ${variantCount(search)}, ${
                search.condition?.name ?? "no phenotype"
              }, ${describeSearchedAt(search.searchedAt)}`}
            >
              <span style={styles.summary}>
                <span style={styles.topLine}>
                  <span style={styles.count}>{variantCount(search)}</span>
                  {search.condition ? (
                    <span style={styles.condition} title={search.condition.name}>
                      {search.condition.name}
                    </span>
                  ) : (
                    <span style={styles.noCondition}>No phenotype</span>
                  )}
                </span>
                <span style={styles.preview}>{previewVariants(search.variants)}</span>
              </span>
              <span style={styles.time}>{describeSearchedAt(search.searchedAt)}</span>
              <ChevronRightIcon size={14} strokeWidth={2.5} style={styles.chevron} aria-hidden="true" />
            </Clickable>
          </li>
        ))}
      </ul>
    </section>
  );
}
