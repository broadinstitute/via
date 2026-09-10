import { Fragment, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import type { ClinVarSignificance, CohortVariantRow } from "../../types/results";
import { CLINVAR_TAG_VARIANT } from "../../utils/clinvar";
import { formatAcAn, formatAf } from "../../utils/format";
import ClinvarExpanderDetail from "./ClinvarExpanderDetail";
import PopulationFrequencyTable from "./PopulationFrequencyTable";
import ResultsPanel from "./ResultsPanel";
import SubpopBadge from "./SubpopBadge";
import Tag from "./Tag";
import styles from "./CohortVariantsPanel.module.css";

// Lower rank = sorts first (ascending) = more clinically concerning.
const CLINVAR_SEVERITY_RANK: Record<ClinVarSignificance, number> = {
  Pathogenic: 0,
  "Likely pathogenic": 1,
  VUS: 2,
  "Likely benign": 3,
  Benign: 4,
};

/** No value for this cell — the variant isn't present in the source behind it. */
function NotAvailable() {
  return <span className={styles.dash}>—</span>;
}

// A variant missing from every source (annotated === false) is missing from each
// individual source too, so both cases get the same "not observed" callout.
function isMissingFromAou(row: CohortVariantRow): boolean {
  return !row.annotated || row.aouSubpopulation === null;
}

function isMissingFromGnomad(row: CohortVariantRow): boolean {
  return !row.annotated || row.gnomadSubpopulation === null;
}

const AOU_GROUP_COLUMN_IDS = new Set(["aouSubpop", "aouAf", "aouAcAn"]);
const GNOMAD_GROUP_COLUMN_IDS = new Set(["gnomadSubpop", "gnomadAf", "gnomadAcAn"]);
const GROUP_START_COLUMN_IDS = new Set(["aouSubpop", "gnomadSubpop"]);

const AOU_MISSING_GROUP = {
  columnIds: AOU_GROUP_COLUMN_IDS,
  mergedIntoColumnId: "aouSubpop",
  message: "Not observed in All of Us",
};

const GNOMAD_MISSING_GROUP = {
  columnIds: GNOMAD_GROUP_COLUMN_IDS,
  mergedIntoColumnId: "gnomadSubpop",
  message: "Not observed in gnomAD",
};

function tintClassName(columnId: string): string {
  const classNames: string[] = [];
  if (AOU_GROUP_COLUMN_IDS.has(columnId)) classNames.push(styles.tintAou);
  if (GNOMAD_GROUP_COLUMN_IDS.has(columnId)) classNames.push(styles.tintGnomad);
  if (GROUP_START_COLUMN_IDS.has(columnId)) classNames.push(styles.groupStart);
  return classNames.join(" ");
}

interface CohortVariantsPanelProps {
  rows: CohortVariantRow[];
}

export default function CohortVariantsPanel({ rows }: CohortVariantsPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Mirrored to the "expanded" query param (one-directional: state is the source of truth,
  // seeded from the URL on mount) so a shared link can pre-open rows.
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(
    () => new Set(searchParams.getAll("expanded")),
  );
  const [sorting, setSorting] = useState<SortingState>([]);

  function toggleExpanded(variant: string) {
    setExpandedVariants((current) => {
      const next = new Set(current);
      if (next.has(variant)) {
        next.delete(variant);
      } else {
        next.add(variant);
      }
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete("expanded");
        for (const expanded of next) params.append("expanded", expanded);
        return params;
      });
      return next;
    });
  }

  const columnHelper = useMemo(() => createColumnHelper<CohortVariantRow>(), []);

  const columns = useMemo(
    () => [
      columnHelper.group({
        id: "meta",
        header: "",
        enableSorting: false,
        columns: [
          columnHelper.display({
            id: "expand",
            header: "",
            enableSorting: false,
            cell: ({ row }) => {
              const isExpanded = expandedVariants.has(row.original.variant);
              return (
                <button
                  type="button"
                  className={isExpanded ? `${styles.expandBtn} ${styles.expanded}` : styles.expandBtn}
                  onClick={(event) => {
                    // The row itself also toggles on click; without this the bubbled event
                    // would immediately undo the toggle this button just performed.
                    event.stopPropagation();
                    toggleExpanded(row.original.variant);
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`variant-detail-${row.original.variant}`}
                  aria-label="Expand row for more detail"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </button>
              );
            },
          }),
          columnHelper.accessor("variant", {
            header: "Variant",
            cell: (info) => <span className={styles.mono}>{info.getValue()}</span>,
          }),
          columnHelper.accessor((row) => (row.annotated ? row.gene : undefined), {
            id: "gene",
            header: "Gene",
            cell: ({ row }) => (row.original.annotated ? row.original.gene : <NotAvailable />),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.proteinChange : undefined), {
            id: "proteinChange",
            header: "Protein ∆",
            cell: ({ row }) =>
              row.original.annotated ? (
                <span className={styles.mono}>{row.original.proteinChange}</span>
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.classification : undefined), {
            id: "classification",
            header: "Classification",
            cell: ({ row }) => (row.original.annotated ? row.original.classification : <NotAvailable />),
            sortUndefined: "last",
          }),
        ],
      }),
      columnHelper.group({
        id: "aou",
        header: () => (
          <>
            All of Us <span className={styles.groupQualifier}>— max subpopulation</span>{" "}
            <span
              className={styles.tooltipIcon}
              title="Values below reflect the AoU subpopulation (EUR, AFR, AMR, EAS, SAS, MID, OTH) with the highest allele frequency for this variant, not the entire cohort."
            >
              i
            </span>
          </>
        ),
        enableSorting: false,
        columns: [
          columnHelper.accessor((row) => (row.annotated ? row.aouSubpopulation ?? undefined : undefined), {
            id: "aouSubpop",
            header: "",
            cell: ({ row }) =>
              row.original.annotated && row.original.aouSubpopulation ? (
                <SubpopBadge subpopulation={row.original.aouSubpopulation} />
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.aouAf ?? undefined : undefined), {
            id: "aouAf",
            header: "AF",
            cell: ({ row }) =>
              row.original.annotated && row.original.aouAf !== null ? (
                formatAf(row.original.aouAf)
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.aouAc ?? undefined : undefined), {
            id: "aouAcAn",
            header: "AC / AN",
            cell: ({ row }) =>
              row.original.annotated && row.original.aouAc !== null && row.original.aouAn !== null ? (
                formatAcAn(row.original.aouAc, row.original.aouAn)
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
        ],
      }),
      columnHelper.group({
        id: "gnomad",
        header: () => (
          <>
            gnomAD <span className={styles.groupQualifier}>— max subpopulation</span>{" "}
            <span
              className={styles.tooltipIcon}
              title="Values below reflect the gnomAD subpopulation (EUR, AFR, AMR, EAS, SAS, MID, OTH) with the highest allele frequency for this variant, not the entire gnomAD population. Data shown is from gnomAD v3.1.2 and may differ from the current release."
            >
              i
            </span>
          </>
        ),
        enableSorting: false,
        columns: [
          columnHelper.accessor((row) => (row.annotated ? row.gnomadSubpopulation ?? undefined : undefined), {
            id: "gnomadSubpop",
            header: "",
            cell: ({ row }) =>
              row.original.annotated && row.original.gnomadSubpopulation ? (
                <SubpopBadge subpopulation={row.original.gnomadSubpopulation} />
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.gnomadAf ?? undefined : undefined), {
            id: "gnomadAf",
            header: "AF",
            cell: ({ row }) =>
              row.original.annotated && row.original.gnomadAf !== null ? (
                formatAf(row.original.gnomadAf)
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.gnomadAc ?? undefined : undefined), {
            id: "gnomadAcAn",
            header: "AC / AN",
            cell: ({ row }) =>
              row.original.annotated && row.original.gnomadAc !== null && row.original.gnomadAn !== null ? (
                formatAcAn(row.original.gnomadAc, row.original.gnomadAn)
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
        ],
      }),
      columnHelper.group({
        id: "annotations",
        header: "",
        enableSorting: false,
        columns: [
          columnHelper.accessor(
            (row) =>
              row.annotated && row.clinvarSignificance
                ? CLINVAR_SEVERITY_RANK[row.clinvarSignificance]
                : undefined,
            {
              id: "clinvar",
              header: "ClinVar",
              cell: ({ row }) => {
                const variant = row.original;
                if (!variant.annotated || !variant.clinvarSignificance) {
                  return <NotAvailable />;
                }
                return (
                  <Tag variant={CLINVAR_TAG_VARIANT[variant.clinvarSignificance]}>
                    {variant.clinvarSignificance}
                  </Tag>
                );
              },
              sortUndefined: "last",
            },
          ),
          columnHelper.accessor((row) => (row.annotated ? row.spliceAi : undefined), {
            id: "spliceAi",
            header: "SpliceAI",
            cell: ({ row }) => (row.original.annotated ? row.original.spliceAi : <NotAvailable />),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? (row.plof === "HC" ? 0 : 1) : undefined), {
            id: "plof",
            header: "pLOF",
            cell: ({ row }) => {
              if (!row.original.annotated) return <NotAvailable />;
              if (row.original.plof === "HC") return <span className={styles.plofHc}>HC</span>;
              return (
                <span className={styles.plofNa} title="LOFTEE does not score this consequence type">
                  —
                </span>
              );
            },
            sortUndefined: "last",
          }),
        ],
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnHelper, expandedVariants],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.variant,
  });

  return (
    <ResultsPanel title="Candidate variants — all participants" headerRight={<span className={styles.sub}>Showing {rows.length} results</span>}>
      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup, depth) => (
                <tr key={headerGroup.id} className={depth === 0 ? styles.groupRow : styles.columnRow}>
                  {headerGroup.headers.map((header) => {
                    const sortable = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    const className = sortable
                      ? `${tintClassName(header.column.id)} ${styles.sortable}`.trim()
                      : tintClassName(header.column.id);
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={className}
                        onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {header.isPlaceholder ? null : (
                          <>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sortable && (
                              <span className={styles.sortIndicator}>
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
                // A source with no data for this variant collapses its whole column
                // group into one "not observed" cell, rather than a row of bare n/a's.
                const missingGroups = [
                  isMissingFromAou(row.original) ? AOU_MISSING_GROUP : null,
                  isMissingFromGnomad(row.original) ? GNOMAD_MISSING_GROUP : null,
                ].filter((group) => group !== null);
                return (
                  <Fragment key={row.id}>
                    <tr className={styles.dataRow} onClick={() => toggleExpanded(row.original.variant)}>
                      {row.getVisibleCells().map((cell) => {
                        const group = missingGroups.find((candidate) =>
                          candidate.columnIds.has(cell.column.id),
                        );
                        if (group) {
                          if (cell.column.id !== group.mergedIntoColumnId) return null;
                          return (
                            <td
                              key={cell.id}
                              colSpan={group.columnIds.size}
                              className={`${tintClassName(cell.column.id)} ${styles.sourceMissing}`}
                            >
                              <span className={styles.dash} title={group.message}>
                                —
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td key={cell.id} className={tintClassName(cell.column.id)}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                    {expandedVariants.has(row.original.variant) && (
                      <tr className={styles.detailRow} id={`variant-detail-${row.original.variant}`}>
                        <td colSpan={row.getVisibleCells().length}>
                          {row.original.annotated ? (
                            <div className={styles.detailPanel}>
                              <div className={styles.detailClinvar}>
                                <ClinvarExpanderDetail variant={row.original} />
                              </div>
                              <div className={styles.detailPopulations}>
                                <PopulationFrequencyTable variant={row.original} />
                              </div>
                            </div>
                          ) : (
                            <div className={`${styles.detailPanel} ${styles.detailPanelNoClinvar}`}>
                              <div className={styles.detailPlaceholder}>No data available for this variant.</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ResultsPanel>
  );
}
