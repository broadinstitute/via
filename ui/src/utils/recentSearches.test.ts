import { afterEach, describe, expect, it, vi } from "vitest";
import { clearRecentSearches, describeSearchedAt, groupRecentSearches, loadRecentSearches, recordRecentSearch } from "./recentSearches";

const TETRALOGY = { conceptId: 9000010, name: "Tetralogy of Fallot" };

describe("recent searches", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts empty", () => {
    expect(loadRecentSearches()).toEqual([]);
  });

  it("keeps searches newest first", () => {
    recordRecentSearch({ variants: ["1-1-A-G"], condition: null }, 1000);
    recordRecentSearch({ variants: ["2-2-C-T"], condition: TETRALOGY }, 2000);

    expect(loadRecentSearches()).toEqual([
      { variants: ["2-2-C-T"], condition: TETRALOGY, searchedAt: 2000 },
      { variants: ["1-1-A-G"], condition: null, searchedAt: 1000 },
    ]);
  });

  it("moves a re-run of the same criteria to the top instead of repeating it", () => {
    recordRecentSearch({ variants: ["1-1-A-G", "2-2-C-T"], condition: TETRALOGY }, 1000);
    recordRecentSearch({ variants: ["3-3-G-A"], condition: null }, 2000);
    recordRecentSearch({ variants: ["2-2-C-T", "1-1-A-G"], condition: TETRALOGY }, 3000);

    const searches = loadRecentSearches();
    expect(searches).toHaveLength(2);
    expect(searches[0]).toMatchObject({ variants: ["2-2-C-T", "1-1-A-G"], searchedAt: 3000 });
  });

  it("treats a different condition as a different search", () => {
    recordRecentSearch({ variants: ["1-1-A-G"], condition: TETRALOGY }, 1000);
    recordRecentSearch({ variants: ["1-1-A-G"], condition: null }, 2000);

    expect(loadRecentSearches()).toHaveLength(2);
  });

  it("keeps only the twenty most recent", () => {
    for (let i = 1; i <= 23; i++) {
      recordRecentSearch({ variants: [`${i}-1-A-G`], condition: null }, i);
    }

    const kept = loadRecentSearches().map((search) => search.variants[0]);
    expect(kept).toHaveLength(20);
    expect(kept[0]).toBe("23-1-A-G");
    expect(kept[19]).toBe("4-1-A-G");
  });

  it("groups searches into today, this week and earlier, by the calendar for today", () => {
    // Mid-afternoon, so "today" has hours either side of it.
    const now = new Date(2026, 9, 8, 15, 0).getTime();
    const hour = 60 * 60 * 1000, day = 24 * hour;
    const at = (ms: number, id: string) => ({ variants: [id], condition: null, searchedAt: ms });
    const groups = groupRecentSearches(
      [at(now - hour, "a"), at(now - 14 * hour, "b"), at(now - 20 * hour, "c"), at(now - 3 * day, "d"), at(now - 9 * day, "e")],
      now,
    );

    // 14 hours ago is 1am today; 20 hours ago is yesterday evening, so it's "this week".
    expect(groups.map((group) => [group.label, group.searches.map((search) => search.variants[0])])).toEqual([
      ["Today", ["a", "b"]],
      ["This week", ["c", "d"]],
      ["Earlier", ["e"]],
    ]);
    expect(groupRecentSearches([], now)).toEqual([]);
  });

  it("ignores a search with no variants", () => {
    recordRecentSearch({ variants: [], condition: null });

    expect(loadRecentSearches()).toEqual([]);
  });

  it("clears", () => {
    recordRecentSearch({ variants: ["1-1-A-G"], condition: null });
    clearRecentSearches();

    expect(loadRecentSearches()).toEqual([]);
  });

  it("drops unreadable or malformed data instead of failing", () => {
    window.localStorage.setItem("via.recentSearches.v1", "not json");
    expect(loadRecentSearches()).toEqual([]);

    window.localStorage.setItem(
      "via.recentSearches.v1",
      JSON.stringify([{ variants: "oops" }, { variants: ["1-1-A-G"], condition: null, searchedAt: 5 }]),
    );
    expect(loadRecentSearches()).toEqual([{ variants: ["1-1-A-G"], condition: null, searchedAt: 5 }]);
  });

  it("treats blocked storage as no history", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => recordRecentSearch({ variants: ["1-1-A-G"], condition: null })).not.toThrow();
    expect(loadRecentSearches()).toEqual([]);
  });
});

describe("describeSearchedAt", () => {
  const now = Date.UTC(2026, 8, 27, 12);

  it("describes how long ago, in the largest unit that fits", () => {
    expect(describeSearchedAt(now - 20 * 1000, now)).toBe("just now");
    expect(describeSearchedAt(now - 5 * 60 * 1000, now)).toBe("5 minutes ago");
    expect(describeSearchedAt(now - 2 * 60 * 60 * 1000, now)).toBe("2 hours ago");
    expect(describeSearchedAt(now - 24 * 60 * 60 * 1000, now)).toBe("yesterday");
    expect(describeSearchedAt(now - 15 * 24 * 60 * 60 * 1000, now)).toBe("2 weeks ago");
  });
});
