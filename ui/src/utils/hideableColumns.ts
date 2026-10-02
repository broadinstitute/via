// The results-table columns a user may hide from settings > Data view, and how a hidden set maps
// onto each table's TanStack column visibility. The identifying columns (Variant, the expand and
// select controls, copy) can't be hidden: a row has to stay recognizable and operable.

import type { ColumnVisibilityState } from "@tanstack/react-table";

export type TableKey = "cohort" | "matched";

export const TABLE_LABELS: Record<TableKey, string> = {
  cohort: "Candidate variants — all participants",
  matched: "Candidate variants — phenotype-matched participants",
};

export interface HideableColumn {
  /** Stable key stored in settings, "<table>.<name>". */
  key: string;
  table: TableKey;
  label: string;
  /** The TanStack column ids this hides. A source's column group hides as one. */
  columnIds: readonly string[];
}

export const HIDEABLE_COLUMNS: readonly HideableColumn[] = [
  { key: "cohort.gene", table: "cohort", label: "Gene", columnIds: ["gene"] },
  { key: "cohort.consequence", table: "cohort", label: "Consequence", columnIds: ["consequence"] },
  { key: "cohort.proteinChange", table: "cohort", label: "Protein change", columnIds: ["proteinChange"] },
  { key: "cohort.aou", table: "cohort", label: "All of Us frequencies", columnIds: ["aouSubpop", "aouAf", "aouAcAn"] },
  { key: "cohort.gnomad", table: "cohort", label: "gnomAD frequencies", columnIds: ["gnomadSubpop", "gnomadAf", "gnomadAcAn"] },
  { key: "cohort.clinvar", table: "cohort", label: "ClinVar", columnIds: ["clinvar"] },
  { key: "cohort.spliceAi", table: "cohort", label: "SpliceAI", columnIds: ["spliceAi"] },
  { key: "cohort.plof", table: "cohort", label: "pLOF", columnIds: ["plof"] },
  { key: "matched.gene", table: "matched", label: "Gene", columnIds: ["gene"] },
  { key: "matched.consequence", table: "matched", label: "Consequence", columnIds: ["consequence"] },
  { key: "matched.cohortAc", table: "matched", label: "Allele count", columnIds: ["cohortAc"] },
  { key: "matched.cohortAn", table: "matched", label: "Allele number", columnIds: ["cohortAn"] },
  { key: "matched.cohortAf", table: "matched", label: "Allele frequency", columnIds: ["cohortAf"] },
  { key: "matched.homozygotes", table: "matched", label: "Homozygotes", columnIds: ["homozygotes"] },
  { key: "matched.heterozygotes", table: "matched", label: "Heterozygotes", columnIds: ["heterozygotes"] },
  { key: "matched.clinvarPlpInTrans", table: "matched", label: "ClinVar P/LP in trans", columnIds: ["clinvarPlpInTrans"] },
  { key: "matched.afRatio", table: "matched", label: "AF ratio", columnIds: ["afRatio"] },
];

const KNOWN_KEYS = new Set(HIDEABLE_COLUMNS.map((column) => column.key));

export function isHideableColumnKey(key: unknown): key is string {
  return typeof key === "string" && KNOWN_KEYS.has(key);
}

export function hideableColumnsFor(table: TableKey): HideableColumn[] {
  return HIDEABLE_COLUMNS.filter((column) => column.table === table);
}

/** TanStack visibility for one table: every hideable column id, true unless its key is hidden. */
export function columnVisibilityFor(table: TableKey, hiddenColumns: readonly string[]): ColumnVisibilityState {
  const hidden = new Set(hiddenColumns);
  const visibility: ColumnVisibilityState = {};
  for (const column of hideableColumnsFor(table)) {
    for (const id of column.columnIds) visibility[id] = !hidden.has(column.key);
  }
  return visibility;
}
