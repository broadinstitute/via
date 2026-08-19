import { Fragment, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import type { ClinVarSignificance, CohortVariantRow } from "../../types/results";
import { formatAcAn, formatAf } from "../../utils/format";
import ResultsPanel from "./ResultsPanel";
import SubpopBadge from "./SubpopBadge";
import Tag from "./Tag";
import styles from "./CohortVariantsPanel.module.css";

const CLINVAR_TAG_VARIANT = {
  Pathogenic: "path",
  VUS: "vus",
  Benign: "benign",
} as const;

// Lower rank = sorts first (ascending) = more clinically concerning.
const CLINVAR_SEVERITY_RANK: Record<ClinVarSignificance, number> = {
  Pathogenic: 0,
  VUS: 1,
  Benign: 2,
};

function NotAvailable() {
  return <span className={styles.cellNa}>n/a</span>;
}

const AOU_GROUP_COLUMN_IDS = new Set(["subpopulation", "aouAf", "aouAcAn"]);
const GNOMAD_GROUP_COLUMN_IDS = new Set(["gnomadAf", "gnomadAcAn", "gnomadLink"]);
const GROUP_START_COLUMN_IDS = new Set(["subpopulation", "gnomadAf"]);

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
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);

  function toggleExpanded(variant: string) {
    setExpandedVariants((current) => {
      const next = new Set(current);
      if (next.has(variant)) {
        next.delete(variant);
      } else {
        next.add(variant);
      }
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
                  onClick={() => toggleExpanded(row.original.variant)}
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
          columnHelper.accessor("gene", { header: "Gene" }),
          columnHelper.accessor((row) => (row.annotated ? row.proteinChange : undefined), {
            id: "proteinChange",
            header: "Protein Change",
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
          columnHelper.accessor((row) => (row.annotated ? row.subpopulation : undefined), {
            id: "subpopulation",
            header: "",
            cell: ({ row }) =>
              row.original.annotated ? <SubpopBadge subpopulation={row.original.subpopulation} /> : <NotAvailable />,
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.aouAf : undefined), {
            id: "aouAf",
            header: "AF",
            cell: ({ row }) => (row.original.annotated ? formatAf(row.original.aouAf) : <NotAvailable />),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.aouAc : undefined), {
            id: "aouAcAn",
            header: "AC / AN",
            cell: ({ row }) =>
              row.original.annotated ? formatAcAn(row.original.aouAc, row.original.aouAn) : <NotAvailable />,
            sortUndefined: "last",
          }),
        ],
      }),
      columnHelper.group({
        id: "gnomad",
        header: () => (
          <>
            gnomAD{" "}
            <span className={styles.tooltipIcon} title="Data shown is from gnomAD v3.1.2 and may differ from the current release.">
              i
            </span>
          </>
        ),
        enableSorting: false,
        columns: [
          columnHelper.accessor((row) => (row.annotated ? row.gnomadAf : undefined), {
            id: "gnomadAf",
            header: "AF",
            cell: ({ row }) => (row.original.annotated ? formatAf(row.original.gnomadAf) : <NotAvailable />),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.gnomadAc : undefined), {
            id: "gnomadAcAn",
            header: "AC / AN",
            cell: ({ row }) =>
              row.original.annotated ? formatAcAn(row.original.gnomadAc, row.original.gnomadAn) : <NotAvailable />,
            sortUndefined: "last",
          }),
          columnHelper.display({
            id: "gnomadLink",
            header: "",
            enableSorting: false,
            cell: ({ row }) =>
              row.original.annotated ? (
                <a
                  className={styles.iconLinkBtn}
                  href={row.original.gnomadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in gnomAD"
                >
                  ↗
                </a>
              ) : null,
          }),
        ],
      }),
      columnHelper.group({
        id: "annotations",
        header: "",
        enableSorting: false,
        columns: [
          columnHelper.accessor((row) => (row.annotated ? CLINVAR_SEVERITY_RANK[row.clinvarSignificance] : undefined), {
            id: "clinvar",
            header: "ClinVar",
            cell: ({ row }) => {
              if (!row.original.annotated) return <NotAvailable />;
              const { clinvarSignificance, clinvarUrl } = row.original;
              return (
                <span className={styles.clinvarCell}>
                  <Tag variant={CLINVAR_TAG_VARIANT[clinvarSignificance]}>{clinvarSignificance}</Tag>
                  <a className={styles.iconLinkBtn} target={"_blank"} href={clinvarUrl} title="View in ClinVar">
                    ↗
                  </a>
                </span>
              );
            },
            sortUndefined: "last",
          }),
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
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={tintClassName(cell.column.id)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {expandedVariants.has(row.original.variant) && (
                  <tr className={styles.detailRow}>
                    <td colSpan={row.getVisibleCells().length}>
                      <div className={styles.detailPanel}>
                        <div className={styles.detailPlaceholder}>
                          Not mocked yet, coming soon :) Will show stats on each subpopulation
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </ResultsPanel>
  );
}
