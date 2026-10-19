import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { fetchProfile } from "../../api/profile";
import colors from "../../libs/colors";
import { useMediaQuery } from "../../libs/hooks";
import { usePreference } from "../../utils/preferences";
import Rail from "./Rail";
import { ShellContext, type ShellContextValue } from "./ShellContext";

/** Below this the rail folds to its icon strip on its own, so the results table keeps its width. */
export const NARROW_QUERY = "(max-width: 1100px)";

const styles = {
  shell: {
    display: "flex",
    alignItems: "stretch",
    minHeight: "100vh",
    background: colors.surface0,
  },
  // The view: its top bar, then its content, scrolling with the page while the rail stays put.
  view: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
  },
} as const satisfies Record<string, CSSProperties>;

/**
 * The layout every route renders inside: the rail down the left, the view beside it. Fetches the
 * signed-in user once for the rail's footer. The rail folds when the user folds it, when the
 * window is narrow, or while a view asks for it (Review brings its own left rail); the user's own
 * fold is the only one the unfold button undoes.
 */
export default function AppShell() {
  const [userEmail, setUserEmail] = useState("");
  const [railCollapsedPref] = usePreference("railCollapsed");
  const narrow = useMediaQuery(NARROW_QUERY);
  const [compactRequested, setCompactRequested] = useState(false);

  useEffect(() => {
    fetchProfile()
      .then((profile) => setUserEmail(profile.userEmail))
      .catch((err: Error) => console.error("Failed to load profile", err));
  }, []);

  const requestCompactRail = useCallback((on: boolean) => setCompactRequested(on), []);
  const context = useMemo<ShellContextValue>(() => ({ userEmail, requestCompactRail }), [userEmail, requestCompactRail]);

  const collapsed = railCollapsedPref || narrow || compactRequested;
  const canUnfold = railCollapsedPref && !narrow && !compactRequested;

  return (
    <ShellContext.Provider value={context}>
      <div style={styles.shell}>
        <Rail userEmail={userEmail} collapsed={collapsed} canUnfold={canUnfold} />
        <div style={styles.view}>
          <Outlet />
        </div>
      </div>
    </ShellContext.Provider>
  );
}
