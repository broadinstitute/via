import { Fragment, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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
import { clinvarSearchUrl, gnomadVariantUrl } from "../../utils/externalLinks";
import { exactAf, formatAcAn, formatAf } from "../../utils/format";
import { AOU_SUBPOP_CODES, GNOMAD_SUBPOP_CODES } from "../../utils/subpopulations";
import Clickable from "../common/Clickable";
import AllOfUs from "../common/AllOfUs";
import InfoLabel from "../common/InfoLabel";
import { ChevronRightIcon, EyeOffIcon } from "../icons";
import ClinvarBadge from "../elements/ClinvarBadge";
import ClinvarExpanderDetail from "./ClinvarExpanderDetail";
import MoreBelowCue from "./MoreBelowCue";
import QuickReviewButton from "./QuickReviewButton";
import PopulationFrequencyTable from "./PopulationFrequencyTable";
import ResultsPanel, { ScopeChip } from "./ResultsPanel";
import SubpopBadge from "../elements/SubpopBadge";

/**
 * The table's floor, shared with its loading placeholder so the swap doesn't resize the row.
 * Sized so this panel is at least as tall as a loaded phenotype panel with a one-line condition
 * name: any shorter and the phenotype panel stretches the row taller the moment it loads.
 */
export const COHORT_TABLE_MIN_HEIGHT = 431;

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
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
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
    minHeight: COHORT_TABLE_MIN_HEIGHT,
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
  // An expanded row and its detail read as one unit: they share the detail's fill, the rule
  // between them is dropped, and one accent bar runs down the left of both.
  expandedCell: {
    borderBottom: "1px solid transparent",
  },
  expandedRowFill: {
    background: colors.surface1,
  },
  expandedBar: {
    boxShadow: `inset 3px 0 0 ${colors.textAccent}`,
  },
  detailRow: {
    background: colors.surface1,
    // Tucked up under its row, with the room below it instead, before the next row.
    padding: "0 12px 12px 13px",
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
  // The expanded view of a variant that isn't in All of Us: what's missing, and why.
  detailEmpty: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 16px",
  },
  detailEmptyIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: colors.surface0,
    border: `1px solid ${colors.border}`,
    color: colors.textMuted,
  },
  detailEmptyTitle: {
    margin: "0 0 3px",
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 600,
  },
  detailEmptyText: {
    maxWidth: 560,
    margin: 0,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
  },
  detailEmptyLinks: {
    display: "flex",
    gap: 14,
    marginTop: 8,
  },
  detailEmptyLink: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
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

interface MissingGroup {
  columnIds: Set<string>;
  mergedIntoColumnId: string;
  message: ReactNode;
  /** Tooltip on the merged cell. */
  title?: string;
}

const AOU_MISSING_GROUP: MissingGroup = {
  columnIds: SOURCE_COLUMN_IDS.aou,
  mergedIntoColumnId: "aouSubpop",
  message: (
    <>
      Not observed in <AllOfUs />
    </>
  ),
};

const GNOMAD_MISSING_GROUP: MissingGroup = {
  columnIds: SOURCE_COLUMN_IDS.gnomad,
  mergedIntoColumnId: "gnomadSubpop",
  message: "Not observed in gnomAD",
};

// Everything after the Variant column. A variant that isn't in All of Us has no VAT row, so it has
// no annotations and no gnomAD data either -- not because gnomAD lacks it, but because the VAT
// only covers variants All of Us has seen. One message across the row says so, rather than a
// "not observed in gnomAD" that may not be true.
const UNANNOTATED_GROUP: MissingGroup = {
  columnIds: new Set([
    "gene",
    "consequence",
    "proteinChange",
    ...SOURCE_COLUMN_IDS.aou,
    ...SOURCE_COLUMN_IDS.gnomad,
    "clinvar",
    "spliceAi",
    "plof",
  ]),
  mergedIntoColumnId: "gene",
  message: (
    <>
      Not observed in <AllOfUs />
    </>
  ),
  title:
    "Annotations and gnomAD frequencies come from the All of Us variant annotation table, which only includes variants observed in All of Us.",
};

/** No value for this cell — the variant isn't present in the source behind it. */
function NotAvailable() {
  return <span style={Style.elements.notAvailable}>—</span>;
}

// For a variant in the VAT (annotated), whether each source has data for it.
function isMissingFromAou(row: CohortVariantRow): boolean {
  return row.annotated && row.aouSubpopulation === null;
}

function isMissingFromGnomad(row: CohortVariantRow): boolean {
  return row.annotated && row.gnomadSubpopulation === null;
}

interface CohortVariantsPanelProps {
  rows: CohortVariantRow[];
  /** Opens Review; offered only once a phenotype filter gives it something to compare with. */
  onQuickReview?: () => void;
}

export default function CohortVariantsPanel({ rows, onQuickReview }: CohortVariantsPanelProps) {
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
                    style={isExpanded ? { transform: "rotate(90deg)", color: colors.textAccent } : undefined}
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
          columnHelper.accessor((row) => (row.annotated ? row.consequence : undefined), {
            id: "consequence",
            header: "Consequence",
            cell: ({ row }) => (row.original.annotated ? row.original.consequence : <NotAvailable />),
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
        ]),
      }),
      columnHelper.group({
        id: "aou",
        header: () => (
          <InfoLabel
            tooltip={
              <>
                Values below reflect the <AllOfUs /> subpopulation ({AOU_SUBPOP_CODES.join(", ")}) with the
                highest allele frequency for this variant, not the entire <AllOfUs /> cohort.
                {"\n\n"}To see the allele frequency for the entire cohort, expand the row.
              </>
            }
          >
            <AllOfUs /> <span style={styles.groupQualifier}>— max subpopulation</span>
          </InfoLabel>
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
                <span title={exactAf(row.original.aouAf)}>{formatAf(row.original.aouAf)}</span>
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
          <InfoLabel
            tooltip={
              `Values below reflect the gnomAD subpopulation (${GNOMAD_SUBPOP_CODES.join(", ")}) with the highest allele frequency for this variant, not the entire gnomAD cohort.\n\n` +
              "To see the allele frequency for the entire cohort, expand the row."
            }
          >
            gnomAD <span style={styles.groupQualifier}>— max subpopulation</span>
          </InfoLabel>
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
                <span title={exactAf(row.original.gnomadAf)}>{formatAf(row.original.gnomadAf)}</span>
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
      title="Candidate variants"
      scope={<ScopeChip>All participants</ScopeChip>}
      headerRight={
        <span style={styles.headerActions}>
          <span style={styles.sub}>Showing {rows.length} results</span>
          {onQuickReview && <QuickReviewButton onClick={onQuickReview} />}
        </span>
      }
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
                const missingGroups: MissingGroup[] = !row.original.annotated
                  ? [UNANNOTATED_GROUP]
                  : [
                      isMissingFromAou(row.original) ? AOU_MISSING_GROUP : null,
                      isMissingFromGnomad(row.original) ? GNOMAD_MISSING_GROUP : null,
                    ].filter((group) => group !== null);
                const hovered = hoveredRow === row.id;
                const expanded = expandedVariants.has(row.original.variant);
                return (
                  <Fragment key={row.id}>
                    <tr
                      data-variant-row
                      style={styles.dataRow}
                      onClick={() => toggleExpanded(row.original.variant)}
                      {...rowHoverProps(row.id)}
                    >
                      {row.getVisibleCells().map((cell, index) => {
                        const source = sourceOf(cell.column.id);
                        const cellStyle: CSSProperties = {
                          ...Style.table.bodyCell,
                          ...(expanded ? styles.expandedCell : undefined),
                          background: cellBackground(source, hovered) ?? (expanded ? styles.expandedRowFill.background : undefined),
                          ...(expanded && index === 0 ? styles.expandedBar : undefined),
                        };
                        const group = missingGroups.find((candidate) =>
                          candidate.columnIds.has(cell.column.id),
                        );
                        if (group) {
                          if (cell.column.id !== group.mergedIntoColumnId) return null;
                          return (
                            <td
                              key={cell.id}
                              colSpan={group.columnIds.size}
                              style={{ ...cellStyle, ...styles.sourceMissing }}
                              title={group.title}
                            >
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
                    {expanded && (
                      <tr id={`variant-detail-${row.original.variant}`}>
                        <td
                          colSpan={row.getVisibleCells().length}
                          style={{ ...Style.table.bodyCell, ...styles.detailRow, ...styles.expandedBar }}
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
                              <div style={styles.detailEmpty}>
                                <span style={styles.detailEmptyIcon} aria-hidden="true">
                                  <EyeOffIcon size={16} />
                                </span>
                                <div>
                                  <p style={styles.detailEmptyTitle}>
                                    Not observed in <AllOfUs />
                                  </p>
                                  {/* Careful to say VIA doesn't show these, not that they don't exist: the
                                      variant can be in gnomAD or ClinVar, just not brought in when All of Us
                                      doesn't have it. */}
                                  <p style={styles.detailEmptyText}>
                                    VIA only shows annotations and frequencies for variants found in <AllOfUs />,
                                    so there's nothing to show here. This variant may still be in gnomAD or ClinVar.
                                  </p>
                                  <div style={styles.detailEmptyLinks}>
                                    {[
                                      { label: "Look up in gnomAD ↗", href: gnomadVariantUrl(row.original.variant) },
                                      { label: "Look up in ClinVar ↗", href: clinvarSearchUrl(row.original.variant) },
                                    ].map(({ label, href }) => (
                                      <a
                                        key={href}
                                        style={styles.detailEmptyLink}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        {label}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              </div>
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
        <MoreBelowCue scrollRef={scrollRef} rowSelector="[data-variant-row]" />
      </div>
    </ResultsPanel>
  );
}
