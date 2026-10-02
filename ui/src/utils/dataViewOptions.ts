// The settings dialog's "Data view" options: how the results tables are displayed. Kept in this
// browser's localStorage, like recent searches, and read through a hook so every table re-renders
// the moment an option changes -- the dialog that changes it lives in the top bar, not in any
// table's tree. Storage can be blocked or cleared; every read and write here tolerates that by
// falling back to the defaults.

import { useSyncExternalStore } from "react";
import { isHideableColumnKey } from "./hideableColumns";

const STORAGE_KEY = "via.dataViewOptions.v1";

export interface DataViewOptions {
  /**
   * Lay every variant row out at once, letting the page scroll, instead of capping each table at
   * a fixed height with its own scrollbar.
   */
  showAllRows: boolean;
  /** Keys of the table columns to hide; see hideableColumns.ts. Empty shows every column. */
  hiddenColumns: string[];
}

export const DEFAULT_DATA_VIEW_OPTIONS: DataViewOptions = {
  showAllRows: false,
  hiddenColumns: [],
};

function load(): DataViewOptions {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_DATA_VIEW_OPTIONS;
    const stored = parsed as Record<string, unknown>;
    return {
      showAllRows:
        typeof stored.showAllRows === "boolean" ? stored.showAllRows : DEFAULT_DATA_VIEW_OPTIONS.showAllRows,
      // Keys from a column that no longer exists are dropped rather than kept around.
      hiddenColumns: Array.isArray(stored.hiddenColumns) ? stored.hiddenColumns.filter(isHideableColumnKey) : [],
    };
  } catch {
    return DEFAULT_DATA_VIEW_OPTIONS;
  }
}

// One in-memory copy, so useSyncExternalStore gets a stable snapshot between changes (a fresh
// object from storage on every read would re-render forever).
let current: DataViewOptions = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDataViewOptions(): DataViewOptions {
  return current;
}

export function setDataViewOptions(update: Partial<DataViewOptions>) {
  current = { ...current, ...update };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage blocked or full: the option still applies for this page load.
  }
  listeners.forEach((listener) => listener());
}

/** Hides or shows one column (by its hideableColumns key), leaving the rest as they are. */
export function setColumnHidden(key: string, hidden: boolean) {
  const without = current.hiddenColumns.filter((candidate) => candidate !== key);
  setDataViewOptions({ hiddenColumns: hidden ? [...without, key] : without });
}

/** Tests only: forget the in-memory copy so the next read comes from storage. */
export function resetDataViewOptionsForTests() {
  current = load();
}

/** The current options, re-rendering the caller whenever they change. */
export function useDataViewOptions(): DataViewOptions {
  return useSyncExternalStore(subscribe, getDataViewOptions, getDataViewOptions);
}
