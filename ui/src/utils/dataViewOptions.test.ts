import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_DATA_VIEW_OPTIONS,
  getDataViewOptions,
  resetDataViewOptionsForTests,
  setColumnHidden,
  setDataViewOptions,
} from "./dataViewOptions";

const STORAGE_KEY = "via.dataViewOptions.v1";

describe("dataViewOptions", () => {
  afterEach(() => {
    window.localStorage.clear();
    resetDataViewOptionsForTests();
  });

  it("starts from the defaults when nothing is stored", () => {
    expect(getDataViewOptions()).toEqual(DEFAULT_DATA_VIEW_OPTIONS);
    expect(getDataViewOptions().showAllRows).toBe(false);
  });

  it("persists a change and reads it back", () => {
    setDataViewOptions({ showAllRows: true });

    expect(getDataViewOptions().showAllRows).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({ showAllRows: true, hiddenColumns: [] });

    resetDataViewOptionsForTests();
    expect(getDataViewOptions().showAllRows).toBe(true);
  });

  it("falls back to the defaults for unreadable or mistyped storage", () => {
    window.localStorage.setItem(STORAGE_KEY, "not json");
    resetDataViewOptionsForTests();
    expect(getDataViewOptions()).toEqual(DEFAULT_DATA_VIEW_OPTIONS);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ showAllRows: "yes" }));
    resetDataViewOptionsForTests();
    expect(getDataViewOptions().showAllRows).toBe(false);
  });

  it("hides and shows columns one at a time, persisting the set", () => {
    setColumnHidden("cohort.gnomad", true);
    setColumnHidden("matched.afRatio", true);
    expect(getDataViewOptions().hiddenColumns).toEqual(["cohort.gnomad", "matched.afRatio"]);

    setColumnHidden("cohort.gnomad", false);
    expect(getDataViewOptions().hiddenColumns).toEqual(["matched.afRatio"]);

    resetDataViewOptionsForTests();
    expect(getDataViewOptions().hiddenColumns).toEqual(["matched.afRatio"]);
  });

  it("drops stored column keys it no longer knows", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ hiddenColumns: ["cohort.gene", "cohort.retired", 7] }),
    );
    resetDataViewOptionsForTests();
    expect(getDataViewOptions().hiddenColumns).toEqual(["cohort.gene"]);
  });
});
