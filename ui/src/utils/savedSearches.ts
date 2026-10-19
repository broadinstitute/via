// Saved searches: a search's criteria under a name, kept so it can be run again later. Like
// recent searches they live in this browser's localStorage for now, behind this one module, so
// moving them to a server-side store is a change here and nowhere else. Only criteria, a name,
// notes and a short log of runs are stored -- never results.

import { useSyncExternalStore } from "react";
import { isCondition, type RecentSearchCondition, type SearchCriteria } from "./recentSearches";
import { notifyStorageKey, subscribeToStorageKey } from "./storageSync";

const STORAGE_KEY = "via.savedSearches.v1";
/** Runs remembered per saved search, newest first. */
export const RUNS_KEPT = 10;
export const NAME_LIMIT = 80;

export interface SavedSearchRun {
  /** When it ran, as epoch milliseconds. */
  at: number;
  /** How many participants the phenotype filter matched, or null for a search without one. */
  matchedCount: number | null;
}

export interface SavedSearch {
  id: string;
  name: string;
  notes: string;
  variants: string[];
  conditions: RecentSearchCondition[];
  createdAt: number;
  updatedAt: number;
  runs: SavedSearchRun[];
}

function isRun(value: unknown): value is SavedSearchRun {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Record<string, unknown>;
  return typeof run.at === "number" && (typeof run.matchedCount === "number" || run.matchedCount === null);
}

function isSavedSearch(value: unknown): value is SavedSearch {
  if (typeof value !== "object" || value === null) return false;
  const search = value as Record<string, unknown>;
  return (
    typeof search.id === "string" &&
    typeof search.name === "string" &&
    typeof search.notes === "string" &&
    Array.isArray(search.variants) &&
    search.variants.every((variant) => typeof variant === "string") &&
    Array.isArray(search.conditions) &&
    search.conditions.every(isCondition) &&
    typeof search.createdAt === "number" &&
    typeof search.updatedAt === "number" &&
    Array.isArray(search.runs) &&
    search.runs.every(isRun)
  );
}

/** Most recently updated first. Anything unreadable is dropped. */
export function loadSavedSearches(): SavedSearch[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSavedSearch).sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function findSavedSearch(id: string): SavedSearch | undefined {
  return loadSavedSearches().find((search) => search.id === id);
}

function save(searches: SavedSearch[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Storage full or blocked: the save is lost; the caller's state still shows it this session.
  }
  notifyStorageKey(STORAGE_KEY);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** A name with its ends trimmed and its length capped; empty names are refused by the form, not here. */
export function normalizeName(name: string): string {
  return name.trim().slice(0, NAME_LIMIT);
}

/** Saves new criteria under a name and returns the record, newest at the top of the list. */
export function createSavedSearch(
  input: SearchCriteria & { name: string; notes?: string },
  now = Date.now(),
): SavedSearch {
  const search: SavedSearch = {
    id: newId(),
    name: normalizeName(input.name),
    notes: input.notes ?? "",
    variants: [...input.variants],
    conditions: input.conditions.map(({ conceptId, name }) => ({ conceptId, name })),
    createdAt: now,
    updatedAt: now,
    runs: [],
  };
  save([search, ...loadSavedSearches()]);
  return search;
}

/** Changes a saved search's name, notes or criteria. Returns the record, or undefined if it's gone. */
export function updateSavedSearch(
  id: string,
  patch: Partial<Pick<SavedSearch, "name" | "notes" | "variants" | "conditions">>,
  now = Date.now(),
): SavedSearch | undefined {
  const searches = loadSavedSearches();
  const index = searches.findIndex((search) => search.id === id);
  if (index < 0) return undefined;
  const next: SavedSearch = {
    ...searches[index],
    ...patch,
    name: patch.name !== undefined ? normalizeName(patch.name) : searches[index].name,
    updatedAt: now,
  };
  searches[index] = next;
  save(searches);
  return next;
}

/** Logs a run of a saved search, newest first, keeping the last RUNS_KEPT. */
export function recordSavedSearchRun(id: string, matchedCount: number | null, now = Date.now()) {
  const searches = loadSavedSearches();
  const search = searches.find((candidate) => candidate.id === id);
  if (!search) return;
  search.runs = [{ at: now, matchedCount }, ...search.runs].slice(0, RUNS_KEPT);
  save(searches);
}

export function deleteSavedSearch(id: string) {
  save(loadSavedSearches().filter((search) => search.id !== id));
}

const subscribe = (listener: () => void) => subscribeToStorageKey(STORAGE_KEY, listener);
let cachedRaw: string | null | undefined;
let cachedList: SavedSearch[] = [];
function snapshot(): SavedSearch[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = loadSavedSearches();
  }
  return cachedList;
}

/** The saved searches as state, most recently updated first. */
export function useSavedSearches(): SavedSearch[] {
  return useSyncExternalStore(subscribe, snapshot);
}

/** One saved search as state, or undefined once it's deleted. */
export function useSavedSearch(id: string | undefined): SavedSearch | undefined {
  const searches = useSavedSearches();
  return id === undefined ? undefined : searches.find((search) => search.id === id);
}
