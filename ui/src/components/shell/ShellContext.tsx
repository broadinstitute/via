import { createContext, useContext } from "react";

/**
 * What the shell shares with the pages inside it: who's signed in (fetched once, for the rail's
 * footer and anything else that names the user), and a way for a view that brings its own left
 * rail (Review) to ask the app rail to fold to icons while it's showing.
 */
export interface ShellContextValue {
  userEmail: string;
  /** Call with true while a view wants the rail folded; false (or unmounting) lets it unfold. */
  requestCompactRail: (on: boolean) => void;
}

export const ShellContext = createContext<ShellContextValue>({
  userEmail: "",
  requestCompactRail: () => {},
});

export function useShell(): ShellContextValue {
  return useContext(ShellContext);
}
