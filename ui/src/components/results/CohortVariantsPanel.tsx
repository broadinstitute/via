import { useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useSearchParams } from "react-router-dom";
import type { ClinVarSignificance, CohortVariantRow } from "../../types/results";
import { formatAcAn, formatAf } from "../../utils/format";
import ResultsPanel from "./ResultsPanel";
import SubpopBadge from "./SubpopBadge";
import Tag, { type TagVariant } from "./Tag";
import VariantSidePanel, { type VariantSidePanelTab } from "./VariantSidePanel";
import styles from "./CohortVariantsPanel.module.css";

const CLINVAR_TAG_VARIANT: Record<ClinVarSignificance, TagVariant> = {
  Pathogenic: "path",
  "Likely pathogenic": "likely-path",
  VUS: "vus",
  "Likely benign": "likely-benign",
  Benign: "benign",
};

// Lower rank = sorts first (ascending) = more clinically concerning.
const CLINVAR_SEVERITY_RANK = {
  Pathogenic: 0,
  "Likely pathogenic": 1,
  VUS: 2,
  "Likely benign": 3,
  Benign: 4,
} as const;

const VALID_TABS: VariantSidePanelTab[] = ["overview", "populations", "predictions"];

// Matches VariantSidePanel.module.css's own "docked vs. overlay" breakpoint (max-width: 1400px
// there): below it the panel becomes a fixed-position overlay sheet that isn't part of this flex
// layout at all, so collapsing the table side to make room for it would just waste space.
const DOCKED_LAYOUT_QUERY = "(min-width: 1401px)";

// Default table-side width when the panel is open: just enough to keep the Variant column
// visible (its actual rendered width isn't worth measuring -- the user can drag it wider anyway).
const DEFAULT_TABLE_WIDTH = 170;
const MIN_TABLE_WIDTH = 120;
const MIN_PANEL_WIDTH = 320;

/** No value for this cell — the variant isn't present in the source behind it. */
function NotAvailable({ title }: { title?: string }) {
  return (
    <span className={title ? `${styles.dash} ${styles.dashHelp}` : styles.dash} title={title}>
      —
    </span>
  );
}

function tintClassName(columnId: string): string {
  const classNames: string[] = [];
  if (AOU_GROUP_COLUMN_IDS.has(columnId)) classNames.push(styles.tintAou);
  if (GNOMAD_GROUP_COLUMN_IDS.has(columnId)) classNames.push(styles.tintGnomad);
  if (GROUP_START_COLUMN_IDS.has(columnId)) classNames.push(styles.groupStart);
  return classNames.join(" ");
}

const AOU_GROUP_COLUMN_IDS = new Set(["aouSubpop", "aouAf", "aouAcAn"]);
const GNOMAD_GROUP_COLUMN_IDS = new Set(["gnomadSubpop", "gnomadAf", "gnomadAcAn"]);
const GROUP_START_COLUMN_IDS = new Set(["aouSubpop", "gnomadSubpop"]);

interface CohortVariantsPanelProps {
  rows: CohortVariantRow[];
}

export default function CohortVariantsPanel({ rows }: CohortVariantsPanelProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const layoutRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(DEFAULT_TABLE_WIDTH);
  const [isDockedLayout, setIsDockedLayout] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DOCKED_LAYOUT_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(DOCKED_LAYOUT_QUERY);
    const handleChange = () => setIsDockedLayout(query.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  function handleResizeStart(event: React.MouseEvent) {
    event.preventDefault();
    const layoutEl = layoutRef.current;
    if (!layoutEl) return;
    const maxTableWidth = Math.max(
      MIN_TABLE_WIDTH,
      layoutEl.getBoundingClientRect().width - MIN_PANEL_WIDTH,
    );
    const startX = event.clientX;
    const startWidth = tableWidth;

    function handleMouseMove(moveEvent: MouseEvent) {
      const next = startWidth + (moveEvent.clientX - startX);
      setTableWidth(Math.min(maxTableWidth, Math.max(MIN_TABLE_WIDTH, next)));
    }
    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  const selectedVariantId = searchParams.get("selected");
  const rawTab = searchParams.get("tab");
  const activeTab: VariantSidePanelTab = VALID_TABS.includes(rawTab as VariantSidePanelTab)
    ? (rawTab as VariantSidePanelTab)
    : "overview";

  function selectVariant(variantId: string) {
    setSearchParams(
      (previous) => {
        const wasClosed = !previous.get("selected");
        const next = new URLSearchParams(previous);
        next.set("selected", variantId);
        // Someone comparing (say) SpliceAI across several variants shouldn't be reset to
        // Overview on every arrow press -- only when the panel goes from closed to open.
        if (wasClosed) {
          next.set("tab", "overview");
        }
        return next;
      },
      { replace: true },
    );
  }

  function setActiveTab(tab: VariantSidePanelTab) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  }

  function closePanel() {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete("selected");
        next.delete("tab");
        return next;
      },
      { replace: true },
    );
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Escape") {
      closePanel();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    const sibling =
      event.key === "ArrowDown"
        ? (event.currentTarget.nextElementSibling as HTMLTableRowElement | null)
        : (event.currentTarget.previousElementSibling as HTMLTableRowElement | null);
    if (!sibling?.dataset.variant) {
      return;
    }
    event.preventDefault();
    sibling.focus();
    sibling.scrollIntoView({ block: "nearest" });
    selectVariant(sibling.dataset.variant);
  }

  const columnHelper = useMemo(() => createColumnHelper<CohortVariantRow>(), []);

  const columns = useMemo(
    () => [
      columnHelper.group({
        id: "meta",
        header: "",
        enableSorting: false,
        columns: [
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
            header: "Protein Δ",
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
                <NotAvailable title="Not observed in All of Us" />
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
                <NotAvailable title="Not observed in All of Us" />
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
                <NotAvailable title="Not observed in All of Us" />
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
                <NotAvailable title="Not observed in gnomAD" />
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
                <NotAvailable title="Not observed in gnomAD" />
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
                <NotAvailable title="Not observed in gnomAD" />
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
                  <span className={styles.clinvarCell}>
                    <Tag variant={CLINVAR_TAG_VARIANT[variant.clinvarSignificance]}>
                      {variant.clinvarSignificance}
                    </Tag>
                  </span>
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
    [columnHelper],
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

  const selectedRow = selectedVariantId
    ? table.getRowModel().rows.find((row) => row.original.variant === selectedVariantId)
    : undefined;

  return (
    <ResultsPanel title="Candidate variants — all participants" headerRight={<span className={styles.sub}>Showing {rows.length} results</span>}>
      <div className={styles.layout} ref={layoutRef}>
        <div
          className={styles.tableSide}
          style={selectedRow && isDockedLayout ? { flex: `0 0 ${tableWidth}px` } : undefined}
        >
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table className={styles.table} aria-activedescendant={selectedVariantId ?? undefined}>
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
                    const isSelected = row.original.variant === selectedVariantId;
                    return (
                      <tr
                        key={row.id}
                        id={row.original.variant}
                        data-variant={row.original.variant}
                        role="row"
                        aria-selected={isSelected}
                        tabIndex={0}
                        className={isSelected ? `${styles.dataRow} ${styles.selectedRow}` : styles.dataRow}
                        onClick={() => selectVariant(row.original.variant)}
                        onKeyDown={handleRowKeyDown}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className={tintClassName(cell.column.id)}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedRow && isDockedLayout && (
          <div
            className={styles.resizeHandle}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize side panel"
            onMouseDown={handleResizeStart}
          />
        )}

        {selectedRow && (
          <VariantSidePanel
            variant={selectedRow.original}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onClose={closePanel}
          />
        )}
      </div>
    </ResultsPanel>
  );
}
