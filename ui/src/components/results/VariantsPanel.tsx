import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { flexRender, type SortingState } from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  legacyCreateColumnHelper as createColumnHelper,
  useLegacyTable as useReactTable,
} from "@tanstack/react-table/legacy";
import colors, { alpha, sourceTints } from "../../libs/colors";
import { useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { ClinVarSignificance, CohortVariantRow, FilteredVariantRow } from "../../types/results";
import { mergeVariantRows, type MergedVariantRow } from "../../utils/comparison";
import { clinvarSearchUrl, gnomadVariantUrl } from "../../utils/externalLinks";
import { exactAf, formatAcAn, formatAf, formatInt } from "../../utils/format";
import { AOU_SUBPOP_CODES, GNOMAD_SUBPOP_CODES } from "../../utils/subpopulations";
import Clickable from "../common/Clickable";
import AllOfUs from "../common/AllOfUs";
import InfoLabel from "../common/InfoLabel";
import { ChevronRightIcon, CompareIcon, EyeOffIcon, GlobeIcon, UserIcon } from "../icons";
import ClinvarBadge from "../elements/ClinvarBadge";
import NotAvailable from "../elements/NotAvailable";
import SubpopBadge from "../elements/SubpopBadge";
import ClinvarExpanderDetail from "./ClinvarExpanderDetail";
import PhenotypeFilterPrompt from "./PhenotypeFilterPrompt";
import PopulationFrequencyTable from "./PopulationFrequencyTable";
import ResultsPanel from "./ResultsPanel";

/** The loading placeholder's height, roughly what a dozen rows of the loaded table take. */
export const VARIANTS_TABLE_MIN_HEIGHT = 431;

// Lower rank = sorts first (ascending) = more clinically concerning.
const PLOF_RANK = { HC: 0, LC: 1, none: 2 } as const;

const CLINVAR_SEVERITY_RANK: Record<ClinVarSignificance, number> = {
  Pathogenic: 0,
  "Likely pathogenic": 1,
  VUS: 2,
  "Likely benign": 3,
  Benign: 4,
};

type Tint = keyof typeof sourceTints;

// Height of the sticky group-header row, which the column-header row below has to sit exactly
// under. Fixed (rather than implied by padding/font-size) so there's no sub-pixel gap between them.
const GROUP_HEADER_HEIGHT = 28;

/**
 * Every data row is this tall: the height a two-line cell gives it (two 15px lines, a 2px gap and
 * the cell padding), so a row whose cells are all one line -- a variant that isn't in All of Us,
 * say -- doesn't come out shorter than its neighbours.
 */
const BODY_ROW_HEIGHT = 46;

/**
 * The columns that stay put while the rest scroll sideways: a row's identity. Their group header
 * ("pinned") spans exactly these, so it can pin as one cell. The protein change rides under the
 * consequence in the last of them.
 */
const PINNED_COLUMN_IDS = ["expand", "variant", "gene", "consequence"] as const;
const PINNED_GROUP_ID = "pinned";
const LAST_PINNED_COLUMN_ID = PINNED_COLUMN_IDS[PINNED_COLUMN_IDS.length - 1];

const styles = {
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  sub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Every row is laid out and the page scrolls; only the horizontal axis scrolls here, since the
  // table is wider than a laptop window.
  tableScroll: {
    ...Style.table.scroller,
  },
  // separate (not collapse): under collapse, a sticky <th>'s border is painted via the table's
  // shared-grid-line model rather than as part of the cell's own box, and that desyncs from the
  // cell during scroll. borderSpacing: 0 keeps cells touching like collapse did.
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
  // Two group rows sit above the column headers: the scope row (all participants vs matched),
  // then the source row. Each row is sticky at its depth times this height.
  groupHeaderCell: {
    height: GROUP_HEADER_HEIGHT,
    // Above the column-header row, which scrolls up underneath it.
    zIndex: 2,
    padding: "0 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  // The scope row's labels, "All participants" and "Phenotype-matched participants": small caps,
  // a step quieter than the source names beneath. The matched side is in primary ink with its count.
  scopeHeader: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: 600,
    lineHeight: "15px",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  scopeHeaderMatched: {
    color: colors.textPrimary,
  },
  // Pinned cells sit above the scrolling ones; pinned header cells above everything.
  pinnedCell: {
    position: "sticky",
    zIndex: 1,
  },
  pinnedHeaderCell: {
    zIndex: 3,
  },
  pinnedGroupHeaderCell: {
    zIndex: 4,
  },
  // The seam where pinned meets scrolling: a hairline and a soft shadow that reads as depth. The
  // header version keeps the header's own bottom hairline, which is also drawn as an inset shadow.
  lastPinned: {
    boxShadow: `inset -1px 0 0 ${colors.border}, 6px 0 8px -6px ${alpha(colors.textPrimary, 0.14)}`,
  },
  lastPinnedHeader: {
    boxShadow: `inset -1px 0 0 ${colors.border}, inset 0 -1px 0 0 ${colors.border}, 6px 0 8px -6px ${alpha(colors.textPrimary, 0.14)}`,
  },
  groupQualifier: {
    color: colors.textSecondary,
    fontWeight: 500,
  },
  // Within a source group the badge and the figures beside it read as one unit, so the gutter
  // between them is closed up: the badge cell gives up its right padding, the figures their left.
  // Badges and the globe above them centred together, so the header icon sits over the badges.
  badgeCell: {
    paddingRight: 2,
    textAlign: "center",
  },
  figuresCell: {
    paddingLeft: 6,
  },
  // The subpopulation columns' header: a globe in place of a word the column is too narrow for.
  // Centred over the badges beneath it (see badgeCell); a lone icon at the cell's left edge read
  // as a missing word. vertical-align middle, not the default baseline: an icon-only inline box
  // sits on the text baseline with its descender space empty beneath, which lifts it a few pixels
  // above the words in the neighbouring headers.
  subpopHeader: {
    display: "inline-flex",
    alignItems: "center",
    verticalAlign: "middle",
    color: colors.textSecondary,
  },
  // A two-line cell: the value that's compared across rows, then its supporting figure.
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    lineHeight: 1.25,
  },
  stackSecondary: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // The header stays one line, naming both lines of the cell beneath it.
  stackHeaderSecondary: {
    marginLeft: 4,
    fontWeight: 500,
    color: colors.textMuted,
  },
  matchedCount: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    color: colors.textSecondary,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    lineHeight: "15px",
  },
  dataRow: {
    cursor: "pointer",
  },
  sourceMissing: {
    textAlign: "center",
  },
  // The one cell standing in for the whole matched block without a phenotype filter: it spans
  // every body row, so its prompt sits at the top in the matched tint.
  phenotypePrompt: {
    verticalAlign: "top",
    whiteSpace: "normal",
    padding: 0,
    background: sourceTints.matched.strong,
    cursor: "default",
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
    padding: "0 12px 12px 13px",
    whiteSpace: "normal",
  },
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

// Each source's frequency and its counts share one two-line cell: AF on the first line, AC / AN
// beneath in quieter ink. The frequency is what's compared across rows; the counts back it up.
const AOU_COLUMN_IDS = ["aouSubpop", "aouFreq"] as const;
const GNOMAD_COLUMN_IDS = ["gnomadSubpop", "gnomadFreq"] as const;
const ANNOTATION_COLUMN_IDS = ["clinvar", "spliceAi", "plof"] as const;
// The AF ratio isn't a column: Review states it with the interval behind it, which a bare ratio
// in a cell can't.
const MATCHED_COLUMN_IDS = ["matchedFreq", "homozygotes", "heterozygotes", "clinvarPlpInTrans"] as const;

const TINT_COLUMN_IDS: Record<Tint, Set<string>> = {
  aou: new Set(AOU_COLUMN_IDS),
  gnomad: new Set(GNOMAD_COLUMN_IDS),
  matched: new Set(MATCHED_COLUMN_IDS),
};

const BADGE_COLUMN_IDS = new Set(["aouSubpop", "gnomadSubpop"]);
const FIGURES_COLUMN_IDS = new Set(["aouFreq", "gnomadFreq"]);

/** Tighter inner padding for a badge cell and the figures cell beside it. */
function gutterStyle(columnId: string): CSSProperties | undefined {
  if (BADGE_COLUMN_IDS.has(columnId)) return styles.badgeCell;
  if (FIGURES_COLUMN_IDS.has(columnId)) return styles.figuresCell;
  return undefined;
}

/** The tint a group header cell takes from its id: the source groups' ids are tint names, and the matched scope is matched. */
function headerTint(columnId: string): Tint | null {
  if (columnId in sourceTints) return columnId as Tint;
  if (columnId === "matchedScope") return "matched";
  return null;
}

/**
 * Which column group a column belongs to, and therefore which tint it gets. Only leaf columns
 * have these ids -- a group-row header cell carries its group's id, so the tint band starts at
 * the column-header row below it.
 */
function tintOf(columnId: string): Tint | null {
  if (TINT_COLUMN_IDS.aou.has(columnId)) return "aou";
  if (TINT_COLUMN_IDS.gnomad.has(columnId)) return "gnomad";
  if (TINT_COLUMN_IDS.matched.has(columnId)) return "matched";
  return null;
}

/**
 * A run of columns a variant has nothing for, drawn as one cell with a message rather than a row
 * of bare dashes. The cell spans whichever of the group's columns are currently shown, from the
 * first of them.
 */
interface MissingGroup {
  columnIds: Set<string>;
  message: ReactNode;
  /** Tooltip on the merged cell. */
  title?: string;
}

const NOT_IN_AOU = (
  <>
    Not observed in <AllOfUs />
  </>
);

const AOU_MISSING_GROUP: MissingGroup = { columnIds: TINT_COLUMN_IDS.aou, message: NOT_IN_AOU };
const GNOMAD_MISSING_GROUP: MissingGroup = { columnIds: TINT_COLUMN_IDS.gnomad, message: "Not observed in gnomAD" };
/** No matched-participant statistics for a variant All of Us does have. */
const MATCHED_MISSING_GROUP: MissingGroup = { columnIds: TINT_COLUMN_IDS.matched, message: NOT_IN_AOU };

// Everything after the Variant column. A variant that isn't in All of Us has no VAT row, so it
// has no annotations, no gnomAD data and no matched statistics either -- not because gnomAD lacks
// it, but because the VAT only covers variants All of Us has seen. One message across the row
// says so, rather than a "not observed in gnomAD" that may not be true.
/** Below this many rows the no-phenotype prompt takes its one-line layout, so it doesn't stretch them. */
const COMPACT_PROMPT_BELOW_ROWS = 4;

const UNANNOTATED_GROUP: MissingGroup = {
  columnIds: new Set([
    "gene",
    "consequence",
    ...AOU_COLUMN_IDS,
    ...GNOMAD_COLUMN_IDS,
    ...MATCHED_COLUMN_IDS,
    ...ANNOTATION_COLUMN_IDS,
  ]),
  message: NOT_IN_AOU,
  title:
    "Annotations and gnomAD frequencies come from the All of Us variant annotation table, which only includes variants observed in All of Us.",
};

/** The subpopulation column's header: the badge beneath says which group, so the header says only what kind of thing it is. */
function SubpopHeader() {
  return (
    <span style={styles.subpopHeader} role="img" aria-label="Subpopulation" title="Subpopulation with the highest allele frequency">
      <GlobeIcon size={14} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

/** A frequency over its allele counts, the cell every source group shares. */
function FrequencyCell({ af, ac, an }: { af: number; ac: number; an: number }) {
  return (
    <span style={styles.stack}>
      <span title={exactAf(af)}>{formatAf(af)}</span>
      <span style={styles.stackSecondary}>{formatAcAn(ac, an)}</span>
    </span>
  );
}

function FrequencyHeader({ tooltip }: { tooltip?: ReactNode }) {
  const label = (
    <>
      AF<span style={styles.stackHeaderSecondary}>· AC / AN</span>
    </>
  );
  return tooltip ? <InfoLabel tooltip={tooltip}>{label}</InfoLabel> : <span>{label}</span>;
}

/** Every column's value for one row, in table order, for the TSV export. */
function rowToTsvValues(row: MergedVariantRow): string[] {
  const { cohort } = row;
  const stats = row.matched;
  const na = "n/a";
  const cohortValues = cohort.annotated
    ? [
        cohort.gene,
        cohort.consequence,
        cohort.proteinChange,
        cohort.aouSubpopulation ?? na,
        cohort.aouAf !== null ? cohort.aouAf.toFixed(6) : na,
        cohort.aouAc !== null ? String(cohort.aouAc) : na,
        cohort.aouAn !== null ? String(cohort.aouAn) : na,
        cohort.gnomadSubpopulation ?? na,
        cohort.gnomadAf !== null ? cohort.gnomadAf.toFixed(6) : na,
        cohort.gnomadAc !== null ? String(cohort.gnomadAc) : na,
        cohort.gnomadAn !== null ? String(cohort.gnomadAn) : na,
      ]
    : Array(11).fill(na);
  const annotationValues = cohort.annotated
    ? [
        cohort.clinvarSignificance ?? na,
        cohort.clinvarStars !== null ? String(cohort.clinvarStars) : na,
        String(cohort.spliceAi),
        cohort.plof ?? na,
      ]
    : Array(4).fill(na);
  const matchedValues = stats
    ? [
        String(stats.cohortAc),
        String(stats.cohortAn),
        stats.cohortAf.toFixed(4),
        String(stats.homozygotes),
        String(stats.heterozygotes),
        String(stats.clinvarPlpInTrans),
        `${stats.afRatio.toFixed(1)}x`,
      ]
    : Array(7).fill(na);
  return [row.variant, ...cohortValues, ...matchedValues, ...annotationValues];
}

const TSV_HEADER = [
  "variant",
  "gene",
  "consequence",
  "protein_change",
  "aou_max_subpop",
  "aou_max_subpop_af",
  "aou_max_subpop_ac",
  "aou_max_subpop_an",
  "gnomad_max_subpop",
  "gnomad_max_subpop_af",
  "gnomad_max_subpop_ac",
  "gnomad_max_subpop_an",
  "filtered_ac",
  "filtered_an",
  "filtered_af",
  "n_homalt",
  "n_het",
  "clinvar_plp_in_trans",
  "af_ratio",
  "clinvar_significance",
  "clinvar_stars",
  "spliceai",
  "plof",
];

function downloadTsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

interface VariantsPanelProps {
  cohortVariants: CohortVariantRow[];
  filteredVariants: FilteredVariantRow[];
  /** Whether a phenotype filter matched anyone; without one the matched columns hold a prompt to add one. */
  hasPhenotypeFilter: boolean;
  participantCount: number;
  /** The picked condition's name, for the matched header's tooltip; empty when none was picked. */
  condition: string;
  /** Opens Review on the given variant. */
  onReview?: (variant: string) => void;
  /** Opens the search editor, from the prompt the matched columns show without a phenotype filter. */
  onAddPhenotypeFilter?: () => void;
}

export default function VariantsPanel({
  cohortVariants,
  filteredVariants,
  hasPhenotypeFilter,
  participantCount,
  condition,
  onReview,
  onAddPhenotypeFilter,
}: VariantsPanelProps) {
  const rows = useMemo(() => mergeVariantRows(cohortVariants, filteredVariants), [cohortVariants, filteredVariants]);
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const { hoveredKey: hoveredRow, hoverProps: rowHoverProps } = useHoveredKey<string>();
  const { hoveredKey: hoveredHeader, hoverProps: headerHoverProps } = useHoveredKey<string>();

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

  const columnHelper = useMemo(() => createColumnHelper<MergedVariantRow>(), []);

  const columns = useMemo(
    () => [
      columnHelper.group({
        id: PINNED_GROUP_ID,
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
          columnHelper.accessor((row) => (row.cohort.annotated ? row.cohort.gene : undefined), {
            id: "gene",
            header: "Gene",
            cell: ({ row }) => (row.original.cohort.annotated ? row.original.cohort.gene : <NotAvailable />),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.cohort.annotated ? row.cohort.consequence : undefined), {
            id: "consequence",
            // The protein notation beneath the consequence is self-describing, so the header names
            // the sort key alone.
            header: "Consequence",
            cell: ({ row }) => {
              const { cohort } = row.original;
              if (!cohort.annotated) return <NotAvailable />;
              return (
                <span style={styles.stack}>
                  <span>{cohort.consequence}</span>
                  <span style={{ ...styles.stackSecondary, ...Style.elements.mono, fontSize: 11 }}>{cohort.proteinChange}</span>
                </span>
              );
            },
            sortUndefined: "last",
          }),
        ]),
      }),
      columnHelper.group({
        id: "allParticipants",
        header: () => <span style={styles.scopeHeader}>All participants</span>,
        enableSorting: false,
        columns: [
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
          columnHelper.accessor((row) => (row.cohort.annotated ? row.cohort.aouSubpopulation ?? undefined : undefined), {
            id: "aouSubpop",
            header: () => <SubpopHeader />,
            cell: ({ row }) =>
              row.original.cohort.annotated && row.original.cohort.aouSubpopulation ? (
                <SubpopBadge subpopulation={row.original.cohort.aouSubpopulation} />
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.cohort.annotated ? row.cohort.aouAf ?? undefined : undefined), {
            id: "aouFreq",
            header: () => <FrequencyHeader />,
            cell: ({ row }) => {
              const { cohort } = row.original;
              return cohort.annotated && cohort.aouAf !== null && cohort.aouAc !== null && cohort.aouAn !== null ? (
                <FrequencyCell af={cohort.aouAf} ac={cohort.aouAc} an={cohort.aouAn} />
              ) : (
                <NotAvailable />
              );
            },
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
          columnHelper.accessor((row) => (row.cohort.annotated ? row.cohort.gnomadSubpopulation ?? undefined : undefined), {
            id: "gnomadSubpop",
            header: () => <SubpopHeader />,
            cell: ({ row }) =>
              row.original.cohort.annotated && row.original.cohort.gnomadSubpopulation ? (
                <SubpopBadge subpopulation={row.original.cohort.gnomadSubpopulation} />
              ) : (
                <NotAvailable />
              ),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.cohort.annotated ? row.cohort.gnomadAf ?? undefined : undefined), {
            id: "gnomadFreq",
            header: () => <FrequencyHeader />,
            cell: ({ row }) => {
              const { cohort } = row.original;
              return cohort.annotated && cohort.gnomadAf !== null && cohort.gnomadAc !== null && cohort.gnomadAn !== null ? (
                <FrequencyCell af={cohort.gnomadAf} ac={cohort.gnomadAc} an={cohort.gnomadAn} />
              ) : (
                <NotAvailable />
              );
            },
            sortUndefined: "last",
          }),
        ]),
      }),
        ],
      }),
      columnHelper.group({
        id: "matchedScope",
        header: () => (
          <InfoLabel
            tooltip={
              hasPhenotypeFilter
                ? `Statistics among the ${formatInt(participantCount)} participants matched by the phenotype filter (${condition}), beside the figures for all participants to their left.`
                : "Add a phenotype filter to see these statistics among only the participants who have it, beside the figures for all participants to their left."
            }
          >
            <span style={{ ...styles.scopeHeader, ...styles.scopeHeaderMatched }}>
              Phenotype-matched participants
              {hasPhenotypeFilter && (
                <span style={styles.matchedCount}>
                  <UserIcon size={11} strokeWidth={2.5} aria-hidden="true" />
                  {formatInt(participantCount)}
                </span>
              )}
            </span>
          </InfoLabel>
        ),
        enableSorting: false,
        columns: [
      columnHelper.group({
        id: "matched",
        header: () => <AllOfUs />,
        enableSorting: false,
        columns: columnHelper.columns([
          columnHelper.accessor((row) => row.matched?.cohortAf, {
            id: "matchedFreq",
            enableSorting: hasPhenotypeFilter,
            header: () => <FrequencyHeader tooltip="Allele frequency among phenotype-matched participants, over the allele count and number behind it." />,
            cell: ({ row }) => {
              const stats = row.original.matched;
              return stats ? <FrequencyCell af={stats.cohortAf} ac={stats.cohortAc} an={stats.cohortAn} /> : <NotAvailable />;
            },
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => row.matched?.homozygotes, {
            id: "homozygotes",
            enableSorting: hasPhenotypeFilter,
            header: () => <InfoLabel tooltip="Matched participants carrying two copies of this allele.">Hom</InfoLabel>,
            cell: ({ row }) => row.original.matched?.homozygotes ?? <NotAvailable />,
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => row.matched?.heterozygotes, {
            id: "heterozygotes",
            enableSorting: hasPhenotypeFilter,
            header: () => <InfoLabel tooltip="Matched participants carrying one copy of this allele.">Het</InfoLabel>,
            cell: ({ row }) => row.original.matched?.heterozygotes ?? <NotAvailable />,
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => row.matched?.clinvarPlpInTrans, {
            id: "clinvarPlpInTrans",
            enableSorting: hasPhenotypeFilter,
            header: () => (
              <InfoLabel tooltip="Count of phenotype-matched participants with a ClinVar Pathogenic/Likely Pathogenic variant in trans with this variant.">
                P/LP in trans
              </InfoLabel>
            ),
            cell: ({ row }) => row.original.matched?.clinvarPlpInTrans ?? <NotAvailable />,
            sortUndefined: "last",
          }),
        ]),
      }),
        ],
      }),
      columnHelper.group({
        id: "annotations",
        header: "",
        enableSorting: false,
        columns: columnHelper.columns([
          columnHelper.accessor(
            (row) =>
              row.cohort.annotated && row.cohort.clinvarSignificance
                ? CLINVAR_SEVERITY_RANK[row.cohort.clinvarSignificance]
                : undefined,
            {
              id: "clinvar",
              header: "ClinVar",
              cell: ({ row }) => {
                const { cohort } = row.original;
                if (!cohort.annotated || !cohort.clinvarSignificance) return <NotAvailable />;
                return (
                  <ClinvarBadge
                    significance={cohort.clinvarSignificance}
                    stars={cohort.clinvarStars}
                    conflicts={cohort.clinvarHasConflicts}
                    href={clinvarSearchUrl(cohort.variant)}
                  />
                );
              },
              sortUndefined: "last",
            },
          ),
          columnHelper.accessor((row) => (row.cohort.annotated ? row.cohort.spliceAi : undefined), {
            id: "spliceAi",
            header: "SpliceAI",
            cell: ({ row }) => (row.original.cohort.annotated ? row.original.cohort.spliceAi : <NotAvailable />),
            sortUndefined: "last",
          }),
          columnHelper.accessor((row) => (row.cohort.annotated ? PLOF_RANK[row.cohort.plof ?? "none"] : undefined), {
            id: "plof",
            header: "pLOF",
            cell: ({ row }) => {
              const { cohort } = row.original;
              if (!cohort.annotated) return <NotAvailable />;
              if (cohort.plof === null) {
                return (
                  <span style={styles.plofNa} title="LOFTEE does not score this consequence type">
                    —
                  </span>
                );
              }
              return (
                <span style={{ ...styles.plofBadge, ...(cohort.plof === "HC" ? styles.plofHc : undefined) }}>
                  {cohort.plof}
                </span>
              );
            },
            sortUndefined: "last",
          }),
        ]),
      }),
      columnHelper.group({
        id: "actions",
        header: "",
        enableSorting: false,
        columns: columnHelper.columns([
          columnHelper.display({
            id: "review",
            header: "",
            enableSorting: false,
            cell: ({ row }) =>
              onReview ? (
                <Clickable
                  style={Style.buttons.icon}
                  hoverStyle={Style.buttons.iconHover}
                  onClick={(event) => {
                    // The row itself toggles expansion on click; this shouldn't.
                    event.stopPropagation();
                    onReview(row.original.variant);
                  }}
                  aria-label={`Review ${row.original.variant}`}
                  title="Open Review on this variant"
                >
                  <CompareIcon size={14} strokeWidth={2.2} aria-hidden="true" />
                </Clickable>
              ) : null,
          }),
        ]),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnHelper, expandedVariants, onReview, participantCount, condition, hasPhenotypeFilter],
  );

  // Each pinned column sticks at the left edge plus the widths of the pinned columns before it.
  // Widths come from the rendered header cells, re-read whenever the table's shape could change.
  const tableRef = useRef<HTMLTableElement>(null);
  const [pinnedOffsets, setPinnedOffsets] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const measure = () => {
      const offsets: Record<string, number> = {};
      let left = 0;
      for (const id of PINNED_COLUMN_IDS) {
        offsets[id] = left;
        // The fractional width, not offsetWidth's rounded one: summing rounded widths leaves each
        // cell a fraction short of its neighbour, a hairline slit the scrolling content shows through.
        left += tableRef.current?.querySelector<HTMLElement>(`th[data-column-id="${id}"]`)?.getBoundingClientRect().width ?? 0;
      }
      setPinnedOffsets((current) =>
        PINNED_COLUMN_IDS.every((id) => current[id] === offsets[id]) ? current : offsets,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [rows, hasPhenotypeFilter, sorting]);

  const pinnedIds = new Set<string>(PINNED_COLUMN_IDS);
  /** Sticky positioning for a pinned column's cell, or nothing for the rest. */
  function pinnedStyle(columnId: string): CSSProperties | undefined {
    if (columnId === PINNED_GROUP_ID) return { ...styles.pinnedCell, ...styles.pinnedGroupHeaderCell, left: 0 };
    if (!pinnedIds.has(columnId)) return undefined;
    return {
      ...styles.pinnedCell,
      left: pinnedOffsets[columnId] ?? 0,
      ...(columnId === LAST_PINNED_COLUMN_ID ? styles.lastPinned : undefined),
    };
  }

  // Without a phenotype filter the matched block holds only the prompt to add one, so it moves to
  // the end, out of the way of the figures there are; and with no Review to open, the Review
  // column goes. Moving the whole block keeps its group headers whole.
  const columnOrder = useMemo(() => {
    if (hasPhenotypeFilter) return [];
    // A column keyed by a field name takes that as its id; one missing from the order would land last.
    type Def = { id?: string; accessorKey?: string; columns?: readonly Def[] };
    const leafIds = (defs: readonly Def[]): string[] =>
      defs.flatMap((def) => (def.columns ? leafIds(def.columns) : [def.id ?? def.accessorKey ?? ""]));
    const ids = leafIds(columns as readonly Def[]);
    return [...ids.filter((id) => !TINT_COLUMN_IDS.matched.has(id)), ...ids.filter((id) => TINT_COLUMN_IDS.matched.has(id))];
  }, [columns, hasPhenotypeFilter]);
  const columnVisibility = useMemo(() => ({ review: onReview !== undefined }), [onReview]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnOrder, columnVisibility },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.variant,
  });

  function handleExport() {
    const lines = rows.map((row) => rowToTsvValues(row).join("\t"));
    downloadTsv("variant_results.tsv", [TSV_HEADER.join("\t"), ...lines].join("\n") + "\n");
  }

  const bodyRows = table.getRowModel().rows;
  // Without a phenotype filter the matched columns stay, as one cell running down the whole body
  // that asks for a phenotype. Every row, and every expanded detail beneath one, gives way to it.
  const leafColumnIds = table.getVisibleLeafColumns().map((column) => column.id);
  const inPromptBlock = (columnId: string) => !hasPhenotypeFilter && TINT_COLUMN_IDS.matched.has(columnId);
  const promptStart = leafColumnIds.findIndex(inPromptBlock);
  const promptSpan = leafColumnIds.filter(inPromptBlock).length;
  const promptRowSpan = bodyRows.length + bodyRows.filter((row) => expandedVariants.has(row.original.variant)).length;

  /** The tint a cell carries, which deepens into a band across whichever row is hovered. */
  function cellBackground(tint: Tint | null, hovered: boolean): string | undefined {
    if (tint) return hovered ? sourceTints[tint].hover : sourceTints[tint].strong;
    return hovered ? colors.surface1 : undefined;
  }

  return (
    <ResultsPanel
      title="Candidate variants"
      headerRight={
        <div style={styles.headerRight}>
          <span style={styles.sub}>Showing {rows.length} results</span>
          <Clickable style={Style.buttons.primary} hoverStyle={Style.buttons.primaryHover} onClick={handleExport}>
            Export TSV
          </Clickable>
        </div>
      }
    >
      <div style={styles.tableScroll}>
          <table ref={tableRef} style={styles.table}>
            <thead>
              {table.getHeaderGroups().map((headerGroup, depth, headerGroups) => {
                const isGroupRow = depth < headerGroups.length - 1;
                return (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      // A group header cell carries its group's id; the source groups' ids are
                      // tint names, and the matched scope takes the matched tint, so each band
                      // starts in its top-most header row.
                      const tint = tintOf(header.column.id) ?? headerTint(header.column.id);
                      const sortable = header.column.getCanSort();
                      const sortDirection = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          data-column-id={header.column.id}
                          style={{
                            ...styles.headerCell,
                            ...(isGroupRow ? styles.groupHeaderCell : undefined),
                            top: depth * GROUP_HEADER_HEIGHT,
                            ...gutterStyle(header.column.id),
                            background: cellBackground(tint, false) ?? styles.headerCell.background,
                            ...(sortable ? Style.table.sortable : undefined),
                            ...(sortable && hoveredHeader === header.id ? Style.table.sortableHover : undefined),
                            ...pinnedStyle(header.column.id),
                            ...(pinnedIds.has(header.column.id) ? styles.pinnedHeaderCell : undefined),
                            ...(header.column.id === PINNED_GROUP_ID || header.column.id === LAST_PINNED_COLUMN_ID
                              ? styles.lastPinnedHeader
                              : undefined),
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
              {bodyRows.map((row, rowIndex) => {
                const { cohort } = row.original;
                // A source with no data for this variant collapses its whole column group into one
                // "not observed" cell, rather than a row of bare dashes.
                const missingGroups: MissingGroup[] = !cohort.annotated
                  ? [UNANNOTATED_GROUP]
                  : [
                      cohort.aouSubpopulation === null ? AOU_MISSING_GROUP : null,
                      cohort.gnomadSubpopulation === null ? GNOMAD_MISSING_GROUP : null,
                      hasPhenotypeFilter && !row.original.matched ? MATCHED_MISSING_GROUP : null,
                    ].filter((group) => group !== null);
                const hovered = hoveredRow === row.id;
                const expanded = expandedVariants.has(row.original.variant);
                const visibleCells = row.getVisibleCells();
                return (
                  <Fragment key={row.id}>
                    <tr
                      data-variant-row
                      style={styles.dataRow}
                      onClick={() => toggleExpanded(row.original.variant)}
                      {...rowHoverProps(row.id)}
                    >
                      {visibleCells.map((cell, index) => {
                        if (inPromptBlock(cell.column.id)) {
                          if (rowIndex !== 0 || index !== promptStart) return null;
                          return (
                            <td
                              key="phenotype-prompt"
                              colSpan={promptSpan}
                              rowSpan={promptRowSpan}
                              style={styles.phenotypePrompt}
                              data-testid="phenotype-prompt-cell"
                              // The cell belongs to the first row but runs down all of them, so it
                              // neither expands that row nor bands it while the pointer is inside.
                              onClick={(event) => event.stopPropagation()}
                              onMouseEnter={rowHoverProps(row.id).onMouseLeave}
                              onMouseLeave={rowHoverProps(row.id).onMouseEnter}
                            >
                              <PhenotypeFilterPrompt
                                condition={condition}
                                compact={bodyRows.length < COMPACT_PROMPT_BELOW_ROWS}
                                onAddPhenotypeFilter={onAddPhenotypeFilter}
                              />
                            </td>
                          );
                        }
                        const tint = tintOf(cell.column.id);
                        const pinned = pinnedIds.has(cell.column.id);
                        const cellStyle: CSSProperties = {
                          ...Style.table.bodyCell,
                          height: BODY_ROW_HEIGHT,
                          ...gutterStyle(cell.column.id),
                          ...(expanded ? styles.expandedCell : undefined),
                          background:
                            cellBackground(tint, hovered) ??
                            (expanded ? styles.expandedRowFill.background : pinned ? colors.surface2 : undefined),
                          ...(expanded && index === 0 ? styles.expandedBar : undefined),
                        };
                        const group = missingGroups.find((candidate) => candidate.columnIds.has(cell.column.id));
                        if (group) {
                          // The prompt block can split a group in two, so it's drawn as runs of
                          // adjacent cells, with its message in the first.
                          const inGroup = (id: string) => group.columnIds.has(id) && !inPromptBlock(id);
                          if (index > 0 && inGroup(visibleCells[index - 1].column.id)) return null;
                          let end = index;
                          while (end < visibleCells.length && inGroup(visibleCells[end].column.id)) end++;
                          const runCells = visibleCells.slice(index, end);
                          const firstRun = !visibleCells.slice(0, index).some((candidate) => inGroup(candidate.column.id));
                          const spansPastPinned = runCells.some((candidate) => !pinnedIds.has(candidate.column.id));
                          return (
                            <td
                              key={cell.id}
                              colSpan={runCells.length}
                              style={{
                                ...cellStyle,
                                ...styles.sourceMissing,
                                ...(spansPastPinned ? undefined : pinnedStyle(cell.column.id)),
                              }}
                              title={group.title}
                            >
                              {firstRun && <span style={styles.cellNa}>{group.message}</span>}
                            </td>
                          );
                        }
                        return (
                          <td key={cell.id} style={{ ...cellStyle, ...pinnedStyle(cell.column.id) }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                    {expanded && (
                      <tr id={`variant-detail-${row.original.variant}`}>
                        <td
                          colSpan={promptSpan ? promptStart : visibleCells.length}
                          style={{ ...Style.table.bodyCell, ...styles.detailRow, ...styles.expandedBar }}
                        >
                          {cohort.annotated ? (
                            <div style={styles.detailPanel}>
                              <div style={styles.detailClinvar}>
                                <ClinvarExpanderDetail variant={cohort} />
                              </div>
                              <div style={styles.detailPopulations}>
                                <PopulationFrequencyTable variant={cohort} />
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
                        {/* The prompt cell runs through this row; the columns after it close it out. */}
                        {promptSpan > 0 && promptStart + promptSpan < visibleCells.length && (
                          <td
                            colSpan={visibleCells.length - promptStart - promptSpan}
                            style={{ ...Style.table.bodyCell, ...styles.detailRow }}
                          />
                        )}
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
      </div>
    </ResultsPanel>
  );
}
