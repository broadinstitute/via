// The entry page's "Recent searches": the criteria of the last few searches that loaded, kept in
// this browser's localStorage. Only what was searched for (variant IDs and a condition concept)
// is stored -- never results or participant counts. A per-browser convenience: storage can be
// empty, full, blocked or cleared, and every read and write here tolerates that by treating it
// as "no history" rather than failing.

const STORAGE_KEY = "via.recentSearches.v1";
const MAX_SEARCHES = 5;

export interface RecentSearch {
  variants: string[];
  /** The picked condition, if the search had one. */
  condition: { conceptId: number; name: string } | null;
  /** When it was last run, as epoch milliseconds. */
  searchedAt: number;
}

function isRecentSearch(value: unknown): value is RecentSearch {
  if (typeof value !== "object" || value === null) return false;
  const search = value as Record<string, unknown>;
  const condition = search.condition as Record<string, unknown> | null | undefined;
  return (
    Array.isArray(search.variants) &&
    search.variants.every((variant) => typeof variant === "string") &&
    typeof search.searchedAt === "number" &&
    (condition === null ||
      (typeof condition === "object" &&
        typeof condition.conceptId === "number" &&
        typeof condition.name === "string"))
  );
}

/** Newest first. Anything unreadable -- storage blocked, or data from an older format -- is dropped. */
export function loadRecentSearches(): RecentSearch[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isRecentSearch).slice(0, MAX_SEARCHES) : [];
  } catch {
    return [];
  }
}

function save(searches: RecentSearch[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Storage full or blocked: history just isn't kept.
  }
}

/** Same variants (in any order) and same condition: re-running a search moves it to the top. */
function sameCriteria(a: Omit<RecentSearch, "searchedAt">, b: Omit<RecentSearch, "searchedAt">) {
  const variants = (search: typeof a) => [...search.variants].sort().join("\n");
  return variants(a) === variants(b) && (a.condition?.conceptId ?? null) === (b.condition?.conceptId ?? null);
}

/** Adds a search that just loaded, at the top, replacing an earlier run of the same criteria. */
export function recordRecentSearch(search: Omit<RecentSearch, "searchedAt">, now = Date.now()) {
  if (search.variants.length === 0) return;
  const others = loadRecentSearches().filter((existing) => !sameCriteria(existing, search));
  save([{ ...search, searchedAt: now }, ...others].slice(0, MAX_SEARCHES));
}

export function clearRecentSearches() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function describeSearchedAt(searchedAt: number, now = Date.now()): string {
  const seconds = Math.round((searchedAt - now) / 1000);
  if (Math.abs(seconds) < 60) return "just now";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 60 * 60],
    ["day", 60 * 60 * 24],
    ["week", 60 * 60 * 24 * 7],
    ["month", 60 * 60 * 24 * 30],
    ["year", 60 * 60 * 24 * 365],
  ];
  // The largest unit that fits at least once.
  let [unit, size] = units[0];
  for (const candidate of units) {
    if (Math.abs(seconds) >= candidate[1]) [unit, size] = candidate;
  }
  return RELATIVE_TIME.format(Math.round(seconds / size), unit);
}
