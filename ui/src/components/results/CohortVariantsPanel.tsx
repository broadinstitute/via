import { Fragment, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  legacyCreateColumnHelper as createColumnHelper,
  useLegacyTable as useReactTable,
} from "@tanstack/react-table/legacy";
import colors, { sourceTints } from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { ClinVarSignificance, CohortVariantRow } from "../../types/results";
import { formatAcAn, formatAf } from "../../utils/format";
import Clickable from "../common/Clickable";
import { ChevronRightIcon } from "../icons";
import ClinvarBadge from "../elements/ClinvarBadge";
import ClinvarExpanderDetail from "./ClinvarExpanderDetail";
import MoreBelowCue from "./MoreBelowCue";
import PopulationFrequencyTable from "./PopulationFrequencyTable";
import ResultsPanel from "./ResultsPanel";
import SubpopBadge from "../elements/SubpopBadge";

// Lower rank = sorts first (ascending) = more clinically concerning.
const PLOF_RANK = { HC: 0, LC: 1, none: 2 } as const;

const CLINVAR_SEVERITY_RANK: Record<ClinVarSignificance, number> = {
  Pathogenic: 0,
  "Likely pathogenic": 1,
  VUS: 2,
  "Likely benign": 3,
  Benign: 4,
};

type Source = "aou" | "gnomad";

// Height of the sticky group-header row, which the column-header row below has to sit exactly
// under. Fixed (rather than implied by padding/font-size) so there's no sub-pixel gap between them.
const GROUP_HEADER_HEIGHT = 28;

const styles = {
  sub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // The scroller is absolutely positioned so the (much taller) table doesn't contribute to
  // intrinsic height. That lets the panel stretch to whatever height the phenotype panel beside
  // it sets, and the table fills it exactly, instead of stopping at a hardcoded cap and leaving
  // dead space below. minHeight is the floor for when this panel stands alone (stacked layout).
  tableWrap: {
    position: "relative",
    flex: 1,
    minHeight: 425,
  },
  tableScroll: {
    ...Style.table.scroller,
    position: "absolute",
    inset: 0,
  },
  // separate (not collapse): under collapse, a sticky <th>'s border is painted via the table's
  // shared-grid-line model rather than as part of the cell's own box, and that desyncs from the
  // cell during scroll -- e.g. a divider border fading/going faint once scrolled, even though its
  // style never changes. borderSpacing: 0 keeps cells touching like collapse did.
  table: {
    ...Style.table.base,
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  headerCell: {
    ...Style.table.headerCell,
    // boxShadow instead of borderBottom: with two stacked sticky header rows, a plain border can
    // render as a gap at the boundary between them.
    boxShadow: `inset 0 -1px 0 0 ${colors.border}`,
  },
  groupHeaderCell: {
    height: GROUP_HEADER_HEIGHT,
    top: 0,
    // Above the column-header row, which scrolls up underneath it.
    zIndex: 2,
    padding: "0 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  columnHeaderCell: {
    top: GROUP_HEADER_HEIGHT,
  },
  groupQualifier: {
    color: colors.textSecondary,
    fontWeight: 500,
  },
  dataRow: {
    cursor: "pointer",
  },
  sourceMissing: {
    textAlign: "center",
  },
  cellNa: {
    color: colors.textMuted,
    fontStyle: "italic",
  },
  plofBadge: {
    display: "inline-block",
    width: 28,
    textAlign: "center",
    padding: "0 4px",
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 4,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 600,
  },
  plofHc: {
    borderColor: colors.textPrimary,
    color: colors.textPrimary,
    fontWeight: 700,
  },
  plofNa: {
    color: colors.textMuted,
    cursor: "help",
  },
  detailRow: {
    background: colors.surface1,
    // Wrapping is re-enabled here: the expanded panel holds prose, not table values.
    whiteSpace: "normal",
  },
  // One bordered container, not a set of cards -- flat is the point (see the compact-expander
  // handoff). Collapses to a single column when there's no ClinVar record, so the population
  // table takes the full width instead of leaving a dead gap where ClinVar would have been.
  detailPanel: {
    display: "grid",
    gridTemplateColumns: "318px 1fr",
    background: colors.surface2,
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    overflow: "hidden",
  },
  detailClinvar: {
    padding: "12px 14px",
    borderRight: `1px solid ${colors.border}`,
  },
  detailPopulations: {
    overflowX: "auto",
  },
  detailPlaceholder: {
    padding: "12px 14px",
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
  },
} as const satisfies Record<string, CSSProperties>;

const SOURCE_COLUMN_IDS: Record<Source, Set<string>> = {
  aou: new Set(["aouSubpop", "aouAf", "aouAcAn"]),
  gnomad: new Set(["gnomadSubpop", "gnomadAf", "gnomadAcAn"]),
};

/**
 * Which source's column group a column belongs to, and therefore which tint it gets.
 *
 * Only leaf columns have these ids -- a group-row header cell carries its group's id ("aou"),
 * so the tint band starts at the column-header row below it, as it always has.
 */
function sourceOf(columnId: string): Source | null {
  if (SOURCE_COLUMN_IDS.aou.has(columnId)) return "aou";
  if (SOURCE_COLUMN_IDS.gnomad.has(columnId)) return "gnomad";
  return null;
}

const AOU_MISSING_GROUP = {
  columnIds: SOURCE_COLUMN_IDS.aou,
  mergedIntoColumnId: "aouSubpop",
  message: "Not observed in All of Us",
};

const GNOMAD_MISSING_GROUP = {
  columnIds: SOURCE_COLUMN_IDS.gnomad,
  mergedIntoColumnId: "gnomadSubpop",
  message: "Not observed in gnomAD",
};

/** No value for this cell — the variant isn't present in the source behind it. */
function NotAvailable() {
  return <span style={Style.elements.notAvailable}>—</span>;
}

// A variant missing from every source (annotated === false) is missing from each
// individual source too, so both cases get the same "not observed" callout.
function isMissingFromAou(row: CohortVariantRow): boolean {
  return !row.annotated || row.aouSubpopulation === null;
}

function isMissingFromGnomad(row: CohortVariantRow): boolean {
  return !row.annotated || row.gnomadSubpopulation === null;
}

interface CohortVariantsPanelProps {
  rows: CohortVariantRow[];
}

export default function CohortVariantsPanel({ rows }: CohortVariantsPanelProps) {
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const { hoveredKey: hoveredRow, hoverProps: rowHoverProps } = useHoveredKey<string>();
  const { hoveredKey: hoveredHeader, hoverProps: headerHoverProps } = useHoveredKey<string>();
  const scrollRef = useRef<HTMLDivElement>(null);

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
        columns: columnHelper.columns([
          columnHelper.display({
            id: "expand",
            header: "",
            enableSorting: false,
            cell: ({ row }) => {
              const isExpanded = expandedVariants.has(row.original.variant);
              return (
                <Clickable
                  style={Style.buttons.icon}
                  hoverStyle={Style.buttons.iconHover}
                  onClick={(event) => {
                    // The row itself also toggles on click; without this the bubbled event
                    // would immediately undo the toggle this button just performed.
                    event.stopPropagation();
                    toggleExpanded(row.original.variant);
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`variant-detail-${row.original.variant}`}
                  aria-label={isExpanded ? "Collapse row for more detail" : "Expand row for more detail"}
                >
                  <ChevronRightIcon
                    size={12}
                    strokeWidth={2.5}
                    className="transition-transform"
                    style={isExpanded ? { transform: "rotate(90deg)" } : undefined}
                  />
                </Clickable>
              );
            },
          }),
          columnHelper.accessor("variant", {
            header: "Variant",
            cell: (info) => <span style={Style.elements.mono}>{info.getValue()}</span>,
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
                <span style={Style.elements.mono}>{row.original.proteinChange}</span>
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.annotated ? row.consequence : undefined), {
            id: "consequence",
            header: "Consequence",
            cell: ({ row }) => (row.original.annotated ? row.original.consequence : <NotAvailable />),
            sortUndefined: "last",
          }),
        ]),
      }),
      columnHelper.group({
        id: "aou",
        header: () => (
          <>
            All of Us <span style={styles.groupQualifier}>— max subpopulation</span>{" "}
            <span
              style={Style.elements.tooltipIcon}
              title="Values below reflect the AoU subpopulation (EUR, AFR, AMR, EAS, SAS, MID, OTH) with the highest allele frequency for this variant, not the entire cohort."
            >
              i
            </span>
          </>
        ),
        enableSorting: false,
        columns: columnHelper.columns([
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
        ]),
      }),
      columnHelper.group({
        id: "gnomad",
        header: () => (
          <>
            gnomAD <span style={styles.groupQualifier}>— max subpopulation</span>{" "}
            <span
              style={Style.elements.tooltipIcon}
              title="Values below reflect the gnomAD subpopulation (EUR, AFR, AMR, EAS, SAS, MID, OTH) with the highest allele frequency for this variant, not the entire gnomAD population. Data shown is from gnomAD v3.1.2 and may differ from the current release."
            >
              i
            </span>
          </>
        ),
        enableSorting: false,
        columns: columnHelper.columns([
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
        ]),
      }),
      columnHelper.group({
        id: "annotations",
        header: "",
        enableSorting: false,
        columns: columnHelper.columns([
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
                return <ClinvarBadge significance={variant.clinvarSignificance} stars={variant.clinvarStars} />;
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
          columnHelper.accessor((row) => (row.annotated ? PLOF_RANK[row.plof ?? "none"] : undefined), {
            id: "plof",
            header: "pLOF",
            cell: ({ row }) => {
              const variant = row.original;
              if (!variant.annotated) return <NotAvailable />;
              if (variant.plof === null) {
                return (
                  <span style={styles.plofNa} title="LOFTEE does not score this consequence type">
                    —
                  </span>
                );
              }
              return (
                <span style={{ ...styles.plofBadge, ...(variant.plof === "HC" ? styles.plofHc : undefined) }}>
                  {variant.plof}
                </span>
              );
            },
            sortUndefined: "last",
          }),
        ]),
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

  /** The tint a cell carries, which deepens into a band across whichever row is hovered. */
  function cellBackground(source: Source | null, hovered: boolean): string | undefined {
    if (source) return hovered ? sourceTints[source].hover : sourceTints[source].strong;
    return hovered ? colors.surface1 : undefined;
  }

  return (
    <ResultsPanel
      title="Candidate variants — all participants"
      headerRight={<span style={styles.sub}>Showing {rows.length} results</span>}
    >
      <div style={styles.tableWrap}>
        <div ref={scrollRef} style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup, depth) => {
                const isGroupRow = depth === 0;
                return (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const source = sourceOf(header.column.id);
                      const sortable = header.column.getCanSort();
                      const sortDirection = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          style={{
                            ...styles.headerCell,
                            ...(isGroupRow ? styles.groupHeaderCell : styles.columnHeaderCell),
                            background: cellBackground(source, false) ?? styles.headerCell.background,
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
                );
              })}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                // A source with no data for this variant collapses its whole column
                // group into one "not observed" cell, rather than a row of bare n/a's.
                const missingGroups = [
                  isMissingFromAou(row.original) ? AOU_MISSING_GROUP : null,
                  isMissingFromGnomad(row.original) ? GNOMAD_MISSING_GROUP : null,
                ].filter((group) => group !== null);
                const hovered = hoveredRow === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr
                      style={styles.dataRow}
                      onClick={() => toggleExpanded(row.original.variant)}
                      {...rowHoverProps(row.id)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const source = sourceOf(cell.column.id);
                        const cellStyle: CSSProperties = {
                          ...Style.table.bodyCell,
                          background: cellBackground(source, hovered),
                        };
                        const group = missingGroups.find((candidate) =>
                          candidate.columnIds.has(cell.column.id),
                        );
                        if (group) {
                          if (cell.column.id !== group.mergedIntoColumnId) return null;
                          return (
                            <td key={cell.id} colSpan={group.columnIds.size} style={{ ...cellStyle, ...styles.sourceMissing }}>
                              <span style={styles.cellNa}>{group.message}</span>
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
                    {expandedVariants.has(row.original.variant) && (
                      <tr id={`variant-detail-${row.original.variant}`}>
                        {/* Padding is the standard body-cell padding rather than the roomier
                            "0 16px 14px" the old stylesheet asked for: that rule lost the cascade
                            to a higher-specificity one, so the compact spacing here is what has
                            always rendered. */}
                        <td
                          colSpan={row.getVisibleCells().length}
                          style={{ ...Style.table.bodyCell, ...styles.detailRow }}
                        >
                          {row.original.annotated ? (
                            <div style={styles.detailPanel}>
                              <div style={styles.detailClinvar}>
                                <ClinvarExpanderDetail variant={row.original} />
                              </div>
                              <div style={styles.detailPopulations}>
                                <PopulationFrequencyTable variant={row.original} />
                              </div>
                            </div>
                          ) : (
                            <div style={{ ...styles.detailPanel, gridTemplateColumns: "1fr" }}>
                              <div style={styles.detailPlaceholder}>No data available for this variant.</div>
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
        <MoreBelowCue scrollRef={scrollRef} />
      </div>
    </ResultsPanel>
  );
}
