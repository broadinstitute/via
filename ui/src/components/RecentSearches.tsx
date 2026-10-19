import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import colors from "../libs/colors";
import { useHover } from "../libs/hooks";
import * as Style from "../libs/style";
import {
  describeSearchedAt,
  groupRecentSearches,
  type RecentSearch,
  type RecentSearchGroup,
} from "../utils/recentSearches";
import { describeAlternatives } from "../utils/phenotypes";
import { resultsPath } from "../utils/variants";
import Clickable from "./common/Clickable";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon, UserIcon } from "./icons";

/** Variant IDs shown in a row before the rest are summarised as "+N more". */
const PREVIEW_VARIANTS = 3;

const styles = {
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
    gap: 8,
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
  // Buttons don't inherit the page's font or line height; without these the Earlier row sits
  // tighter and shorter than the two headings above it.
  groupToggle: {
    fontFamily: "inherit",
    lineHeight: "inherit",
    cursor: "pointer",
  },
  groupToggleHover: {
    color: colors.textAccent,
  },
  groupSeparator: {
    color: colors.textMuted,
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

/** The row's title: the conditions as the search treats them, "A or B". */
const conditionNames = (search: RecentSearch) => describeAlternatives(search.conditions.map((c) => c.name));

/**
 * The searches run in this browser (see utils/recentSearches), each re-run with a click, grouped
 * by when: today, this week, and earlier, which starts folded so a long history doesn't push the
 * page down. The page around it supplies the heading, the Clear action and the empty state.
 */
export default function RecentSearches({ searches }: { searches: RecentSearch[] }) {
  const navigate = useNavigate();
  const [earlierOpen, setEarlierOpen] = useState(false);
  const { hovered: earlierHovered, hoverProps: earlierHoverProps } = useHover();
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
        <span style={styles.groupSeparator} aria-hidden="true">
          ·
        </span>
        <span style={styles.groupCount}>{group.searches.length}</span>
      </button>
    );
  };

  return (
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
              onClick={() =>
                navigate(
                  resultsPath(
                    search.variants,
                    search.conditions.map((condition) => condition.conceptId),
                  ),
                )
              }
              aria-label={`Run again: ${variantCount(search)}, ${
                search.conditions.length > 0 ? conditionNames(search) : "no phenotype"
              }, ${describeSearchedAt(search.searchedAt)}`}
            >
              <span style={styles.kind} aria-hidden="true">
                {search.conditions.length > 0 ? (
                  <UserIcon size={14} strokeWidth={2.2} />
                ) : (
                  <SearchIcon size={14} strokeWidth={2.2} />
                )}
              </span>
              <span style={styles.summary}>
                {search.conditions.length > 0 ? (
                  <span style={styles.title} title={conditionNames(search)}>
                    {conditionNames(search)}
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
  );
}
