// Per-browser display preferences, kept in localStorage the way recent searches are: a
// convenience that may be empty, blocked or cleared, so every read falls back to the defaults and
// every write may silently do nothing. Components read a preference through usePreference, which
// re-renders them when it changes anywhere in the page (the Usage page flips a switch, the rail
// follows) or in another tab.

import { useCallback, useSyncExternalStore } from "react";
import { notifyStorageKey, subscribeToStorageKey } from "./storageSync";

// Bumped when the shape changes; an older shape fails validation and falls back to the defaults.
const STORAGE_KEY = "via.preferences.v1";

export interface Preferences {
  /** Show the BigQuery usage figure on the rail's Usage row. Off by default: it's a developer's readout. */
  showUsageMeter: boolean;
  /** The rail folded to its icon strip, by the user's own choice (not the narrow-window fold). */
  railCollapsed: boolean;
}

const DEFAULTS: Preferences = {
  showUsageMeter: false,
  railCollapsed: false,
};

function isPreferences(value: unknown): value is Partial<Record<keyof Preferences, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The stored preferences over the defaults; the defaults alone when storage is unreadable. */
export function readPreferences(): Preferences {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!isPreferences(parsed)) return DEFAULTS;
    const bool = (key: keyof Preferences) => (typeof parsed[key] === "boolean" ? (parsed[key] as boolean) : DEFAULTS[key]);
    return {
      showUsageMeter: bool("showUsageMeter"),
      railCollapsed: bool("railCollapsed"),
    };
  } catch {
    return DEFAULTS;
  }
}

/** Stores the given preferences over the current ones and tells every usePreference about it. */
export function updatePreferences(patch: Partial<Preferences>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readPreferences(), ...patch }));
  } catch {
    // Storage full or blocked: the preference isn't kept.
  }
  notifyStorageKey(STORAGE_KEY);
}

const subscribe = (listener: () => void) => subscribeToStorageKey(STORAGE_KEY, listener);

/** One preference as state: its current value, and a setter that stores it for every reader. */
export function usePreference<K extends keyof Preferences>(key: K): [Preferences[K], (value: Preferences[K]) => void] {
  const value = useSyncExternalStore(subscribe, () => readPreferences()[key]);
  const set = useCallback((next: Preferences[K]) => updatePreferences({ [key]: next } as Partial<Preferences>), [key]);
  return [value, set];
}
