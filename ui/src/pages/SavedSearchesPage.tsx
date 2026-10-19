import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import colors from "../libs/colors";
import { useHoveredKey } from "../libs/hooks";
import * as Style from "../libs/style";
import { StarIcon } from "../components/icons";
import TopBar from "../components/shell/TopBar";
import { describeAlternatives } from "../utils/phenotypes";
import { describeSearchedAt } from "../utils/recentSearches";
import { useSavedSearches } from "../utils/savedSearches";

const styles = {
  main: {
    padding: "24px 28px 48px",
  },
  column: {
    maxWidth: 800,
  },
  empty: {
    ...Style.elements.panel,
    padding: "28px 20px",
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12.5,
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
    gap: 14,
    padding: "12px 16px",
    borderTop: `1px solid ${colors.border}`,
    color: colors.textBody,
    textDecoration: "none",
  },
  rowFirst: {
    borderTop: "none",
  },
  rowHover: {
    background: colors.surface1,
  },
  star: {
    flexShrink: 0,
    color: colors.textAccent,
  },
  text: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  name: {
    overflow: "hidden",
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 600,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  detail: {
    overflow: "hidden",
    color: colors.textSecondary,
    fontSize: 11.5,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  when: {
    flexShrink: 0,
    color: colors.textMuted,
    fontSize: 11.5,
  },
} as const satisfies Record<string, CSSProperties>;

/** Every saved search, most recently changed first, each opening to its page. */
export default function SavedSearchesPage() {
  const searches = useSavedSearches();
  const { hoveredKey, hoverProps } = useHoveredKey<string>();
  return (
    <>
      <TopBar title="Saved searches" lede="Named searches kept in this browser. Open one to run it again or change it." />
      <main style={styles.main}>
        <div style={styles.column}>
          {searches.length === 0 ? (
            <p style={styles.empty}>Nothing saved yet. Save a search from the form or from its results.</p>
          ) : (
            <ul style={styles.list} aria-label="Saved searches">
              {searches.map((search, index) => (
                <li key={search.id}>
                  <Link
                    to={`/saved/${search.id}`}
                    {...hoverProps(search.id)}
                    style={{
                      ...styles.row,
                      ...(index === 0 ? styles.rowFirst : undefined),
                      ...(hoveredKey === search.id ? styles.rowHover : undefined),
                    }}
                  >
                    <StarIcon size={15} filled strokeWidth={1.5} style={styles.star} aria-hidden="true" />
                    <span style={styles.text}>
                      <span style={styles.name}>{search.name}</span>
                      <span style={styles.detail}>
                        {search.variants.length} variant{search.variants.length === 1 ? "" : "s"} ·{" "}
                        {search.conditions.length > 0 ? describeAlternatives(search.conditions.map((c) => c.name)) : "no phenotype"}
                        {search.runs.length > 0 && ` · last run ${describeSearchedAt(search.runs[0].at)}`}
                      </span>
                    </span>
                    <span style={styles.when}>saved {describeSearchedAt(search.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
