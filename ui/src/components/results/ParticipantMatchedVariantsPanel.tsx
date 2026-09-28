import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { flexRender, type RowSelectionState, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  legacyCreateColumnHelper as createColumnHelper,
  useLegacyTable as useReactTable,
} from "@tanstack/react-table/legacy";
import colors from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { FilteredVariantRow } from "../../types/results";
import { phenotypeUnavailableCopy } from "../../utils/phenotype";
import Clickable from "../common/Clickable";
import AllOfUs from "../common/AllOfUs";
import InfoLabel from "../common/InfoLabel";
import { UserIcon } from "../icons";
import CopyButton from "./CopyButton";
import MoreBelowCue from "./MoreBelowCue";
import PhenotypeFilterRequired from "./PhenotypeFilterRequired";
import ResultsPanel, { ScopeChip } from "./ResultsPanel";

/**
 * Shows the same number of rows as the cohort table above at its floor. That table's
 * COHORT_TABLE_MIN_HEIGHT (431px) less its two header rows (28 + 34px) leaves 369px of 33.25px
 * rows; this one has a single 35.5px header row and 34px rows, so 35.5 + 369 × 34 / 33.25 ≈ 413.
 */
export const MATCHED_TABLE_HEIGHT = 413;

// The columns a variant with no All of Us stats has nothing for, in table order. They merge into
// one "not observed" cell, which also takes in Gene and Consequence (in that order, working left)
// when those are empty too -- they can be known without the stats.
const STAT_COLUMN_IDS = [
  "cohortAc",
  "cohortAn",
  "cohortAf",
  "homozygotes",
  "heterozygotes",
  "clinvarPlpInTrans",
  "afRatio",
];

function notObservedColumnIds(row: FilteredVariantRow): Set<string> {
  const ids = [...STAT_COLUMN_IDS];
  if (row.consequence === null) {
    ids.unshift("consequence");
    if (row.gene === null) ids.unshift("gene");
  }
  return new Set(ids);
}

const styles = {
  notObserved: {
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  selectedCount: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  // Positioning context for MoreBelowCue, which overlays the scroller's bottom edge.
  tableWrap: {
    position: "relative",
  },
  // A fixed height, like the cohort table's floor, rather than shrinking to fit a few rows.
  tableScroll: {
    ...Style.table.scroller,
    height: MATCHED_TABLE_HEIGHT,
  },
  table: {
    ...Style.table.base,
    borderCollapse: "collapse",
  },
  headerCell: {
    ...Style.table.headerCell,
    top: 0,
    borderBottom: `1px solid ${colors.border}`,
  },
  deltaUp: {
    color: colors.textDanger,
    fontWeight: 600,
  },
  deltaFlat: {
    color: colors.textSecondary,
  },
} as const satisfies Record<string, CSSProperties>;

/** No value for this cell — the variant isn't present in the source behind it. */
function NotAvailable() {
  return <span style={Style.elements.notAvailable}>—</span>;
}

// AF ratios near 1x are expected background noise; a ratio this much higher than the
// unfiltered cohort is what makes a variant worth flagging in the phenotype-matched view.
const ELEVATED_AF_RATIO_THRESHOLD = 2;

function rowToTsvValues(row: FilteredVariantRow): string[] {
  if (row.hasStats) {
    return [
      row.variant,
      row.gene ?? "n/a",
      row.consequence ?? "n/a",
      String(row.cohortAc),
      String(row.cohortAn),
      row.cohortAf.toFixed(4),
      String(row.homozygotes),
      String(row.heterozygotes),
      String(row.clinvarPlpInTrans),
      `${row.afRatio.toFixed(1)}x`,
    ];
  }
  return [
    row.variant,
    row.gene ?? "n/a",
    row.consequence ?? "n/a",
    "n/a",
    "n/a",
    "n/a",
    "n/a",
    "n/a",
    "n/a",
    "n/a",
  ];
}

function downloadTsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

interface ParticipantMatchedVariantsPanelProps {
  rows: FilteredVariantRow[];
  participantCount: number;
  hasPhenotypeFilter: boolean;
  /** Names the picked condition in the empty state; empty when none was picked. */
  condition: string;
  onAddPhenotypeFilter: () => void;
}

export default function ParticipantMatchedVariantsPanel({
  rows,
  participantCount,
  hasPhenotypeFilter,
  condition,
  onAddPhenotypeFilter,
}: ParticipantMatchedVariantsPanelProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(() =>
    Object.fromEntries(rows.map((row) => [row.variant, true])),
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { hoveredKey: hoveredRow, hoverProps: rowHoverProps } = useHoveredKey<string>();
  const { hoveredKey: hoveredHeader, hoverProps: headerHoverProps } = useHoveredKey<string>();

  const columnHelper = useMemo(() => createColumnHelper<FilteredVariantRow>(), []);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "select",
          header: ({ table }) => (
            <input
              type="checkbox"
              checked={table.getIsAllRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
              }}
              onChange={table.getToggleAllRowsSelectedHandler()}
              style={Style.table.checkbox}
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              style={Style.table.checkbox}
            />
          ),
          enableSorting: false,
        }),
        columnHelper.accessor("variant", {
          header: "Variant",
          cell: (info) => <span style={Style.elements.mono}>{info.getValue()}</span>,
        }),
        columnHelper.accessor((row) => row.gene ?? undefined, {
          id: "gene",
          header: "Gene",
          cell: ({ row }) => row.original.gene ?? <NotAvailable />,
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => row.consequence ?? undefined, {
          id: "consequence",
          header: "Consequence",
          cell: ({ row }) => row.original.consequence ?? <NotAvailable />,
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.cohortAc : undefined), {
          id: "cohortAc",
          header: () => (
            <InfoLabel tooltip="Allele count among phenotype-matched participants.">
              Cohort AC
            </InfoLabel>
          ),
          cell: ({ row }) => (row.original.hasStats ? row.original.cohortAc : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.cohortAn : undefined), {
          id: "cohortAn",
          header: () => (
            <InfoLabel tooltip="Allele number among phenotype-matched participants.">
              Cohort AN
            </InfoLabel>
          ),
          cell: ({ row }) => (row.original.hasStats ? row.original.cohortAn : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.cohortAf : undefined), {
          id: "cohortAf",
          header: () => (
            <InfoLabel tooltip="Allele frequency among phenotype-matched participants.">
              Cohort AF
            </InfoLabel>
          ),
          cell: ({ row }) => (row.original.hasStats ? row.original.cohortAf.toFixed(4) : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.homozygotes : undefined), {
          id: "homozygotes",
          header: "Homozygotes",
          cell: ({ row }) => (row.original.hasStats ? row.original.homozygotes : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.heterozygotes : undefined), {
          id: "heterozygotes",
          header: "Heterozygotes",
          cell: ({ row }) => (row.original.hasStats ? row.original.heterozygotes : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.clinvarPlpInTrans : undefined), {
          id: "clinvarPlpInTrans",
          header: () => (
            <InfoLabel tooltip="Count of phenotype-matched participants with a ClinVar Pathogenic/Likely Pathogenic variant in trans with this variant.">
              ClinVar P/LP in trans
            </InfoLabel>
          ),
          cell: ({ row }) => (row.original.hasStats ? row.original.clinvarPlpInTrans : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.afRatio : undefined), {
          id: "afRatio",
          header: () => (
            <InfoLabel
              tooltip={
                <>
                  Ratio of the phenotype-matched cohort AF to the <AllOfUs /> cohort-wide AF.
                </>
              }
            >
              AF Ratio
            </InfoLabel>
          ),
          cell: ({ row }) => {
            if (!row.original.hasStats) return <NotAvailable />;
            const { afRatio } = row.original;
            const elevated = afRatio >= ELEVATED_AF_RATIO_THRESHOLD;
            return <span style={elevated ? styles.deltaUp : styles.deltaFlat}>{afRatio.toFixed(1)}x</span>;
          },
          sortUndefined: "last",
        }),
        columnHelper.display({
          id: "copy",
          header: "",
          cell: ({ row }) => (
            <CopyButton getText={() => rowToTsvValues(row.original).join("\t")} label="Copy row" />
          ),
          enableSorting: false,
        }),
      ]),
    [columnHelper],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getRowId: (row) => row.variant,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  function handleExport() {
    const header = [
      "variant",
      "gene",
      "consequence",
      "filtered_ac",
      "filtered_an",
      "filtered_af",
      "n_homalt",
      "n_het",
      "clinvar_plp_in_trans",
      "af_ratio",
      "included",
    ].join("\t");
    const lines = rows.map((row) => {
      const included = rowSelection[row.variant] ? "TRUE" : "FALSE";
      return [...rowToTsvValues(row), included].join("\t");
    });
    downloadTsv("variant_filtering_results.tsv", [header, ...lines].join("\n") + "\n");
  }

  if (!hasPhenotypeFilter) {
    const { message, buttonLabel } = phenotypeUnavailableCopy(condition, "phenotype-matched participant data");
    return (
      <ResultsPanel title="Candidate variants" scope={<ScopeChip>Phenotype-matched participants</ScopeChip>}>
        <PhenotypeFilterRequired
          message={message}
          buttonLabel={buttonLabel}
          onAddPhenotypeFilter={onAddPhenotypeFilter}
          minHeight={MATCHED_TABLE_HEIGHT}
        />
      </ResultsPanel>
    );
  }

  return (
    <ResultsPanel
      title="Candidate variants"
      scope={
        <ScopeChip
          tone="accent"
          icon={<UserIcon size={12} strokeWidth={2.5} aria-hidden="true" />}
          title={`${participantCount.toLocaleString()} participants with ${condition}`}
        >
          {participantCount.toLocaleString()} with {condition}
        </ScopeChip>
      }
      headerRight={
        <div style={styles.actions}>
          <span style={styles.selectedCount}>
            {selectedCount} of {rows.length} included
          </span>
          <Clickable style={Style.buttons.primary} hoverStyle={Style.buttons.primaryHover} onClick={handleExport}>
            Export TSV
          </Clickable>
        </div>
      }
    >
      <div style={styles.tableWrap}>
        <div ref={scrollRef} style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortable = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        style={{
                          ...styles.headerCell,
                          ...(sortable ? Style.table.sortable : undefined),
                          ...(sortable && hoveredHeader === header.id ? Style.table.sortableHover : undefined),
                        }}
                        onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                        {...(sortable ? headerHoverProps(header.id) : undefined)}
                      >
                        {header.isPlaceholder ? null : (
                          <>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sortable && (
                              <span style={Style.table.sortIndicator}>
                                {sortDirection === "asc" ? "▲" : sortDirection === "desc" ? "▼" : ""}
                              </span>
                            )}
                          </>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const cellStyle: CSSProperties = {
                  ...Style.table.bodyCell,
                  ...(hoveredRow === row.id ? { background: colors.surface1 } : undefined),
                };
                const merged = row.original.hasStats ? null : notObservedColumnIds(row.original);
                const firstMergedId = merged && row.getVisibleCells().find((cell) => merged.has(cell.column.id))?.id;
                return (
                  <tr key={row.id} data-variant-row {...rowHoverProps(row.id)}>
                    {row.getVisibleCells().map((cell) => {
                      if (merged?.has(cell.column.id)) {
                        if (cell.id !== firstMergedId) return null;
                        return (
                          <td key={cell.id} colSpan={merged.size} style={{ ...cellStyle, ...styles.notObserved }}>
                            Not observed in <AllOfUs />
                          </td>
                        );
                      }
                      return (
                        <td key={cell.id} style={cellStyle}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <MoreBelowCue scrollRef={scrollRef} rowSelector="[data-variant-row]" />
      </div>
    </ResultsPanel>
  );
}
