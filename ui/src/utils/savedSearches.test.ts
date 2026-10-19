import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSavedSearch,
  deleteSavedSearch,
  findSavedSearch,
  loadSavedSearches,
  normalizeName,
  recordSavedSearchRun,
  RUNS_KEPT,
  updateSavedSearch,
  useSavedSearch,
  useSavedSearches,
} from "./savedSearches";

const TETRALOGY = { conceptId: 9000010, name: "Tetralogy of Fallot" };

describe("saved searches", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts empty", () => {
    expect(loadSavedSearches()).toEqual([]);
  });

  it("saves criteria under a trimmed name, newest first", () => {
    const first = createSavedSearch({ name: " First ", variants: ["1-1-A-G"], conditions: [TETRALOGY] }, 1000);
    const second = createSavedSearch({ name: "Second", notes: "why", variants: ["2-2-C-T"], conditions: [] }, 2000);

    expect(first).toMatchObject({ name: "First", notes: "", variants: ["1-1-A-G"], conditions: [TETRALOGY], createdAt: 1000, updatedAt: 1000, runs: [] });
    expect(loadSavedSearches().map((search) => search.id)).toEqual([second.id, first.id]);
    expect(findSavedSearch(first.id)?.name).toBe("First");
    expect(findSavedSearch("nope")).toBeUndefined();
  });

  it("caps a name's length", () => {
    expect(normalizeName("x".repeat(100))).toHaveLength(80);
  });

  it("updates name, notes and criteria, which moves the search to the top", () => {
    const first = createSavedSearch({ name: "First", variants: ["1-1-A-G"], conditions: [] }, 1000);
    createSavedSearch({ name: "Second", variants: ["2-2-C-T"], conditions: [] }, 2000);

    const updated = updateSavedSearch(first.id, { name: "Renamed", notes: "n", variants: ["3-3-G-A"], conditions: [TETRALOGY] }, 3000);

    expect(updated).toMatchObject({ id: first.id, name: "Renamed", notes: "n", variants: ["3-3-G-A"], conditions: [TETRALOGY], createdAt: 1000, updatedAt: 3000 });
    expect(loadSavedSearches()[0].id).toBe(first.id);
    expect(updateSavedSearch("nope", { name: "x" })).toBeUndefined();
  });

  it("logs runs newest first, keeping the last few", () => {
    const search = createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [TETRALOGY] });
    for (let i = 1; i <= RUNS_KEPT + 2; i++) recordSavedSearchRun(search.id, i, i * 1000);
    recordSavedSearchRun("nope", 1);

    const runs = findSavedSearch(search.id)!.runs;
    expect(runs).toHaveLength(RUNS_KEPT);
    expect(runs[0]).toEqual({ at: (RUNS_KEPT + 2) * 1000, matchedCount: RUNS_KEPT + 2 });
    expect(runs[RUNS_KEPT - 1].at).toBe(3000);
  });

  it("deletes", () => {
    const search = createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [] });
    deleteSavedSearch(search.id);
    expect(loadSavedSearches()).toEqual([]);
  });

  it("drops unreadable or malformed data instead of failing", () => {
    window.localStorage.setItem("via.savedSearches.v1", "not json");
    expect(loadSavedSearches()).toEqual([]);
    window.localStorage.setItem("via.savedSearches.v1", JSON.stringify([{ id: "x", name: "no criteria" }, { nope: true }]));
    expect(loadSavedSearches()).toEqual([]);
  });

  it("treats blocked storage as nothing saved", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadSavedSearches()).toEqual([]);
    expect(() => createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [] })).not.toThrow();
  });

  it("re-renders readers when a search is saved, changed or deleted", () => {
    const list = renderHook(() => useSavedSearches());
    expect(list.result.current).toEqual([]);

    let id = "";
    act(() => {
      id = createSavedSearch({ name: "S", variants: ["1-1-A-G"], conditions: [] }).id;
    });
    const one = renderHook(() => useSavedSearch(id));
    expect(list.result.current).toHaveLength(1);
    expect(one.result.current?.name).toBe("S");

    act(() => {
      updateSavedSearch(id, { name: "T" });
    });
    expect(one.result.current?.name).toBe("T");

    act(() => deleteSavedSearch(id));
    expect(list.result.current).toEqual([]);
    expect(one.result.current).toBeUndefined();
    expect(renderHook(() => useSavedSearch(undefined)).result.current).toBeUndefined();
  });
});
