import { useMemo, useState } from "react";
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
import CopyButton from "./CopyButton";
import PhenotypeFilterRequired from "./PhenotypeFilterRequired";
import ResultsPanel from "./ResultsPanel";

const styles = {
  nCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: 500,
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
  tableScroll: {
    ...Style.table.scroller,
    maxHeight: 346,
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
      row.classification ?? "n/a",
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
    row.classification ?? "n/a",
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
  hpoTerm: string;
  onAddPhenotypeFilter: () => void;
}

export default function ParticipantMatchedVariantsPanel({
  rows,
  participantCount,
  hasPhenotypeFilter,
  hpoTerm,
  onAddPhenotypeFilter,
}: ParticipantMatchedVariantsPanelProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(() =>
    Object.fromEntries(rows.map((row) => [row.variant, true])),
  );
  const [sorting, setSorting] = useState<SortingState>([]);
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
        columnHelper.accessor((row) => row.classification ?? undefined, {
          id: "classification",
          header: "Classification",
          cell: ({ row }) => row.original.classification ?? <NotAvailable />,
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.cohortAc : undefined), {
          id: "cohortAc",
          header: () => (
            <>
              Cohort AC{" "}
              <span style={Style.elements.tooltipIcon} title="Allele count among phenotype-matched participants.">
                i
              </span>
            </>
          ),
          cell: ({ row }) => (row.original.hasStats ? row.original.cohortAc : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.cohortAn : undefined), {
          id: "cohortAn",
          header: () => (
            <>
              Cohort AN{" "}
              <span style={Style.elements.tooltipIcon} title="Allele number among phenotype-matched participants.">
                i
              </span>
            </>
          ),
          cell: ({ row }) => (row.original.hasStats ? row.original.cohortAn : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.cohortAf : undefined), {
          id: "cohortAf",
          header: () => (
            <>
              Cohort AF{" "}
              <span style={Style.elements.tooltipIcon} title="Allele frequency among phenotype-matched participants.">
                i
              </span>
            </>
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
            <>
              ClinVar P/LP in trans{" "}
              <span
                style={Style.elements.tooltipIcon}
                title="Count of phenotype-matched participants with a ClinVar Pathogenic/Likely Pathogenic variant in trans."
              >
                i
              </span>
            </>
          ),
          cell: ({ row }) => (row.original.hasStats ? row.original.clinvarPlpInTrans : <NotAvailable />),
          sortUndefined: "last",
        }),
        columnHelper.accessor((row) => (row.hasStats ? row.afRatio : undefined), {
          id: "afRatio",
          header: () => (
            <>
              AF Ratio{" "}
              <span
                style={Style.elements.tooltipIcon}
                title="Ratio of the phenotype-matched cohort AF to the AoU cohort-wide AF."
              >
                i
              </span>
            </>
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
      "classification",
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
    const { message, buttonLabel } = phenotypeUnavailableCopy(hpoTerm, "phenotype-matched participant data");
    return (
      <ResultsPanel title="Candidate variants — phenotype-matched participants only">
        <PhenotypeFilterRequired message={message} buttonLabel={buttonLabel} onAddPhenotypeFilter={onAddPhenotypeFilter} />
      </ResultsPanel>
    );
  }

  return (
    <ResultsPanel
      title={
        <>
          Candidate variants — phenotype-matched participants only{" "}
          <span style={styles.nCount}>(n = {participantCount})</span>
        </>
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
      <div style={styles.tableScroll}>
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
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} {...rowHoverProps(row.id)}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      ...Style.table.bodyCell,
                      ...(hoveredRow === row.id ? { background: colors.surface1 } : undefined),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResultsPanel>
  );
}
