import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import colors from "../libs/colors";
import { useHover } from "../libs/hooks";
import * as Style from "../libs/style";
import {
  clearRecentSearches,
  describeSearchedAt,
  groupRecentSearches,
  loadRecentSearches,
  type RecentSearch,
  type RecentSearchGroup,
} from "../utils/recentSearches";
import { resultsPath } from "../utils/variants";
import Clickable from "./common/Clickable";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon, UserIcon } from "./icons";

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
  // A group's heading: Today, This week, Earlier. The last is a button that opens its rows.
  group: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "7px 16px 5px",
    border: "none",
    borderTop: `1px solid ${colors.border}`,
    background: colors.surface1,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    textAlign: "left",
  },
  groupToggle: {
    cursor: "pointer",
  },
  groupToggleHover: {
    color: colors.textAccent,
  },
  groupCount: {
    fontWeight: 600,
    letterSpacing: 0,
    textTransform: "none",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    padding: "10px 16px",
    border: "none",
    borderTop: `1px solid ${colors.border}`,
    background: "none",
    textAlign: "left",
    cursor: "pointer",
  },
  rowFirst: {
    borderTop: "none",
  },
  rowHover: {
    background: colors.surface1,
  },
  // A disc with the search's kind: a person for a phenotype search, a lens for variants alone.
  kind: {
    display: "inline-grid",
    placeItems: "center",
    flexShrink: 0,
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: colors.bgAccent,
    color: colors.textAccent,
  },
  summary: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  // The phenotype is the row's title; a search without one says so in the same slot, quieter.
  title: {
    overflow: "hidden",
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 600,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  titleNone: {
    color: colors.textSecondary,
    fontWeight: 500,
  },
  // The count, then the first few IDs in mono, as one line that truncates at the end.
  detail: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    minWidth: 0,
    color: colors.textMuted,
    fontSize: 11.5,
  },
  detailCount: {
    flexShrink: 0,
    color: colors.textSecondary,
    fontWeight: 600,
  },
  preview: {
    ...Style.elements.mono,
    overflow: "hidden",
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
 * The searches run in this browser (see utils/recentSearches), each re-run with a click, grouped
 * by when: today, this week, and earlier, which starts folded so a long history doesn't push the
 * page down. Renders nothing until there's history, so a first visit isn't met with an empty list.
 */
export default function RecentSearches() {
  const navigate = useNavigate();
  const [searches, setSearches] = useState(loadRecentSearches);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const { hovered: clearHovered, hoverProps: clearHoverProps } = useHover();
  const { hovered: earlierHovered, hoverProps: earlierHoverProps } = useHover();

  if (searches.length === 0) return null;
  const groups = groupRecentSearches(searches);

  const groupHeading = (group: RecentSearchGroup, first: boolean) => {
    const style = { ...styles.group, ...(first ? styles.rowFirst : undefined) };
    if (group.label !== "Earlier") return <div style={style}>{group.label}</div>;
    return (
      <button
        type="button"
        style={{ ...style, ...styles.groupToggle, ...(earlierHovered ? styles.groupToggleHover : undefined) }}
        aria-expanded={earlierOpen}
        onClick={() => setEarlierOpen((open) => !open)}
        {...earlierHoverProps}
      >
        {earlierOpen ? (
          <ChevronDownIcon size={12} strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <ChevronRightIcon size={12} strokeWidth={2.5} aria-hidden="true" />
        )}
        {group.label}
        <span style={styles.groupCount}>· {group.searches.length}</span>
      </button>
    );
  };

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
      <div style={styles.list}>
        {groups.map((group, groupIndex) => (
          <section key={group.label} aria-label={group.label}>
            {groupHeading(group, groupIndex === 0)}
            {(group.label !== "Earlier" || earlierOpen) && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {group.searches.map((search, index) => (
                  <li key={search.searchedAt}>
                    <Clickable
                      style={{ ...styles.row, ...(index === 0 ? styles.rowFirst : undefined) }}
                      hoverStyle={styles.rowHover}
              onClick={() => navigate(resultsPath(search.variants, search.condition?.conceptId ?? null))}
              aria-label={`Run again: ${variantCount(search)}, ${
                search.condition?.name ?? "no phenotype"
              }, ${describeSearchedAt(search.searchedAt)}`}
            >
              <span style={styles.kind} aria-hidden="true">
                {search.condition ? (
                  <UserIcon size={14} strokeWidth={2.2} />
                ) : (
                  <SearchIcon size={14} strokeWidth={2.2} />
                )}
              </span>
              <span style={styles.summary}>
                {search.condition ? (
                  <span style={styles.title} title={search.condition.name}>
                    {search.condition.name}
                  </span>
                ) : (
                  <span style={{ ...styles.title, ...styles.titleNone }}>No phenotype</span>
                )}
                <span style={styles.detail}>
                  <span style={styles.detailCount}>{variantCount(search)}</span>
                  <span style={styles.preview}>{previewVariants(search.variants)}</span>
                </span>
              </span>
              <span style={styles.time}>{describeSearchedAt(search.searchedAt)}</span>
              <ChevronRightIcon size={14} strokeWidth={2.5} style={styles.chevron} aria-hidden="true" />
            </Clickable>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
