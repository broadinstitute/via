import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import colors from "../libs/colors";
import { useMediaQuery } from "../libs/hooks";
import * as Style from "../libs/style";
import Clickable from "./common/Clickable";
import { ArrowRightIcon } from "./icons";

// Below this the row's details and its button no longer fit side by side, so the row stacks.
const NARROW_LAYOUT_QUERY = "(max-width: 720px)";

const styles = {
  panel: {
    ...Style.elements.panel,
    marginTop: 28,
    boxShadow: Style.shadows.raised,
  },
  heading: {
    ...Style.elements.panelHeader,
    ...Style.elements.panelTitle,
    padding: "12px 16px",
  },
  list: {
    listStyle: "none",
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "12px 16px",
  },
  details: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
    fontSize: 12.5,
  },
  variants: {
    color: colors.textPrimary,
    fontWeight: 600,
  },
  dotSeparator: {
    color: colors.textMuted,
  },
  phenotype: {
    color: colors.textSecondary,
  },
  hpoCode: {
    fontFamily: Style.monoFamily,
    fontWeight: 600,
    color: colors.textAccent,
  },
  noPhenotype: {
    color: colors.textMuted,
    fontStyle: "italic",
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: 11.5,
  },
  viewButton: {
    ...Style.buttons.accent,
    flexShrink: 0,
  },
} as const satisfies Record<string, CSSProperties>;

interface RecentSearch {
  id: string;
  variantsSummary: string;
  hpoTerm: string | null;
  hpoDescription: string | null;
  searchedAt: string;
}

const RECENT_SEARCHES: RecentSearch[] = [
  {
    id: "1",
    variantsSummary: "21 variants (GATA4)",
    hpoTerm: "HP:0001636",
    hpoDescription: "Tetralogy of Fallot",
    searchedAt: "2 hours ago",
  },
  {
    id: "2",
    variantsSummary: "8 variants (BRCA1)",
    hpoTerm: "HP:0003002",
    hpoDescription: "Breast carcinoma",
    searchedAt: "Yesterday",
  },
  {
    id: "3",
    variantsSummary: "3 variants (TTN)",
    hpoTerm: null,
    hpoDescription: null,
    searchedAt: "3 days ago",
  },
  {
    id: "4",
    variantsSummary: "45 variants (CFTR)",
    hpoTerm: "HP:0006528",
    hpoDescription: "Chronic bronchitis",
    searchedAt: "1 week ago",
  },
];

export default function RecentSearches() {
  const navigate = useNavigate();
  const isNarrow = useMediaQuery(NARROW_LAYOUT_QUERY);

  return (
    <section style={styles.panel}>
      <h2 style={styles.heading}>Recent searches</h2>
      <ul style={styles.list}>
        {RECENT_SEARCHES.map((search, index) => (
          <li
            key={search.id}
            style={{
              ...styles.item,
              ...(isNarrow ? { flexDirection: "column", alignItems: "flex-start" } : undefined),
              // Stands in for ":last-child" -- the panel's own border closes the list off.
              ...(index < RECENT_SEARCHES.length - 1
                ? { borderBottom: `1px solid ${colors.border}` }
                : undefined),
            }}
          >
            <div style={styles.details}>
              <span style={styles.variants}>{search.variantsSummary}</span>
              <span style={styles.dotSeparator} aria-hidden="true">
                ·
              </span>
              {search.hpoTerm ? (
                <span style={styles.phenotype}>
                  <span style={styles.hpoCode}>{search.hpoTerm}</span> {search.hpoDescription}
                </span>
              ) : (
                <span style={styles.noPhenotype}>No phenotype</span>
              )}
              <span style={styles.timestamp}>{search.searchedAt}</span>
            </div>
            <Clickable
              style={{ ...styles.viewButton, ...(isNarrow ? { alignSelf: "flex-end" } : undefined) }}
              hoverStyle={Style.buttons.accentHover}
              onClick={() => navigate("/results")}
            >
              View results
              <ArrowRightIcon size={13} strokeWidth={2.5} />
            </Clickable>
          </li>
        ))}
      </ul>
    </section>
  );
}
