import type { CSSProperties } from "react";
import colors from "../libs/colors";
import * as Style from "../libs/style";
import Clickable from "../components/common/Clickable";
import RecentSearches from "../components/RecentSearches";
import TopBar from "../components/shell/TopBar";
import { clearRecentSearches, useRecentSearches } from "../utils/recentSearches";

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
} as const satisfies Record<string, CSSProperties>;

/** Every search run in this browser, grouped by when, each re-run with a click. */
export default function RecentSearchesPage() {
  const searches = useRecentSearches();
  return (
    <>
      <TopBar
        title="Recent searches"
        lede="Searches run in this browser, newest first. Only what was searched for is kept, not results."
        actions={
          searches.length > 0 && (
            <Clickable style={Style.buttons.secondary} hoverStyle={Style.buttons.secondaryHover} onClick={clearRecentSearches}>
              Clear
            </Clickable>
          )
        }
      />
      <main style={styles.main}>
        <div style={styles.column}>
          {searches.length === 0 ? (
            <p style={styles.empty}>No searches yet. Ones you run will be listed here.</p>
          ) : (
            <RecentSearches searches={searches} />
          )}
        </div>
      </main>
    </>
  );
}
