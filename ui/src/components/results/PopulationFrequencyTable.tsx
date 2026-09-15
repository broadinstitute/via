import type { CSSProperties } from "react";
import colors, { POPMAX_BACKGROUND, sourceTints } from "../../libs/colors";
import { useHover, useHoveredKey } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { AnnotatedCohortVariant, GnomadSubpopCode, PopulationFrequency, SubpopCode } from "../../types/results";
import { formatAcAn, formatAf } from "../../utils/format";
import { SUBPOP_COLOR, SUBPOP_LABEL } from "./SubpopBadge";

// The union of both sources' subpopulation vocabularies, alphabetical by code -- a stable order
// so rows line up across variants. AoU has EUR/MID with no gnomAD equivalent; gnomAD has
// ASJ/FIN/NFE with no AoU equivalent, so a population absent from one source's own vocabulary
// (not just absent from this variant) renders as an em dash too, same as missing data.
const ALL_POPULATION_CODES: (SubpopCode | GnomadSubpopCode)[] = [
  "AFR",
  "AMR",
  "ASJ",
  "EAS",
  "EUR",
  "FIN",
  "MID",
  "NFE",
  "OTH",
  "SAS",
];

// Identifies the summary row at the bottom for hover tracking; not a population code.
const ALL_POPULATIONS_ROW = "all";

type Source = "aou" | "gnomad";

const styles = {
  table: {
    ...Style.table.base,
    borderCollapse: "collapse",
  },
  // Tighter than the cohort table's cells: this one is nested inside an expanded row of it.
  cell: {
    padding: "1px 10px",
    textAlign: "left",
  },
  populationHeader: {
    color: colors.textSecondary,
    fontWeight: 600,
  },
  // inline-flex on a span nested in the td, not the td itself -- display: flex directly on a td
  // overrides its table-cell display, which fights the table's own row-height/vertical-align
  // handling and throws off spacing versus the plain <td> cells next to it.
  populationLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  allPopulationsLabel: {
    color: colors.textMuted,
  },
  sourceLink: {
    color: "inherit",
    fontWeight: 600,
    textDecoration: "none",
  },
  maxMarker: {
    marginLeft: 4,
    color: colors.textAccent,
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: "0.04em",
  },
} as const satisfies Record<string, CSSProperties>;

/** AoU columns lean accent-blue, gnomAD columns stay neutral. */
const SOURCE_INK: Record<Source, string> = {
  aou: colors.textAccent,
  gnomad: colors.textSecondary,
};

function sourceCellStyle(source: Source, hovered: boolean): CSSProperties {
  return {
    ...styles.cell,
    background: hovered ? sourceTints[source].hover : sourceTints[source].soft,
    color: SOURCE_INK[source],
  };
}

function byPopulation(frequencies: PopulationFrequency[]): Map<string, PopulationFrequency> {
  return new Map(frequencies.map((frequency) => [frequency.population, frequency]));
}

interface FrequencyCellsProps {
  af: number | null | undefined;
  ac: number | null | undefined;
  an: number | null | undefined;
  inVocabulary: boolean;
  isMax: boolean;
  source: Source;
  hovered: boolean;
}

function FrequencyCells({ af, ac, an, inVocabulary, isMax, source, hovered }: FrequencyCellsProps) {
  const cellStyle = sourceCellStyle(source, hovered);

  if (af == null || ac == null || an == null) {
    return (
      <>
        <td style={cellStyle}>
          <span
            style={Style.elements.notAvailable}
            title={inVocabulary ? undefined : "Not part of this source's population scheme"}
          >
            —
          </span>
        </td>
        <td style={cellStyle}>
          <span style={Style.elements.notAvailable}>—</span>
        </td>
      </>
    );
  }

  // The max cell keeps its highlight ink even while hovered, but gives up its own fill to the
  // hover band so the row still reads as one.
  const valueStyle: CSSProperties = isMax
    ? { ...cellStyle, background: hovered ? cellStyle.background : POPMAX_BACKGROUND, color: colors.textPrimary }
    : cellStyle;

  return (
    <>
      <td style={valueStyle}>
        {formatAf(af)}
        {isMax && <span style={styles.maxMarker}>MAX</span>}
      </td>
      <td style={valueStyle}>{formatAcAn(ac, an)}</td>
    </>
  );
}

interface PopulationFrequencyTableProps {
  variant: AnnotatedCohortVariant;
}

export default function PopulationFrequencyTable({ variant }: PopulationFrequencyTableProps) {
  const { hoveredKey: hoveredRow, hoverProps: rowHoverProps } = useHoveredKey<string>();
  const { hovered: linkHovered, hoverProps: linkHoverProps } = useHover();

  const aouByPopulation = byPopulation(variant.aouPopulations);
  const gnomadByPopulation = byPopulation(variant.gnomadPopulations);
  const aouVocabulary = new Set(variant.aouPopulations.map((p) => p.population));
  const gnomadVocabulary = new Set(variant.gnomadPopulations.map((p) => p.population));

  function headerStyle(source: Source): CSSProperties {
    return { ...sourceCellStyle(source, false), fontWeight: 600 };
  }

  function labelCellStyle(hovered: boolean): CSSProperties {
    return { ...styles.cell, ...(hovered ? { background: colors.surface1 } : undefined) };
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={{ ...styles.cell, ...styles.populationHeader }}>Population</th>
          <th style={headerStyle("aou")}>AoU AF</th>
          <th style={headerStyle("aou")}>AoU AC/AN</th>
          <th style={headerStyle("gnomad")}>
            gnomAD AF{" "}
            {variant.gnomadUrl && (
              <a
                style={{ ...styles.sourceLink, ...(linkHovered ? { color: colors.textAccent } : undefined) }}
                href={variant.gnomadUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${variant.variant} in gnomAD`}
                aria-label={`Open ${variant.variant} in gnomAD (opens in new tab)`}
                onClick={(event) => event.stopPropagation()}
                {...linkHoverProps}
              >
                ↗
              </a>
            )}
          </th>
          <th style={headerStyle("gnomad")}>gnomAD AC/AN</th>
        </tr>
      </thead>
      <tbody>
        {ALL_POPULATION_CODES.map((population) => {
          const hovered = hoveredRow === population;
          return (
            <tr key={population} {...rowHoverProps(population)}>
              <td style={labelCellStyle(hovered)}>
                <span style={styles.populationLabel}>
                  <span style={Style.colorDot(SUBPOP_COLOR[population])} />
                  {SUBPOP_LABEL[population]}
                </span>
              </td>
              <FrequencyCells
                af={aouByPopulation.get(population)?.af}
                ac={aouByPopulation.get(population)?.ac}
                an={aouByPopulation.get(population)?.an}
                inVocabulary={aouVocabulary.has(population)}
                isMax={variant.aouSubpopulation === population}
                source="aou"
                hovered={hovered}
              />
              <FrequencyCells
                af={gnomadByPopulation.get(population)?.af}
                ac={gnomadByPopulation.get(population)?.ac}
                an={gnomadByPopulation.get(population)?.an}
                inVocabulary={gnomadVocabulary.has(population)}
                isMax={variant.gnomadSubpopulation === population}
                source="gnomad"
                hovered={hovered}
              />
            </tr>
          );
        })}
        <tr {...rowHoverProps(ALL_POPULATIONS_ROW)}>
          <td
            style={{
              ...labelCellStyle(hoveredRow === ALL_POPULATIONS_ROW),
              ...styles.allPopulationsLabel,
            }}
          >
            All populations
          </td>
          <FrequencyCells
            af={variant.aouAllAf}
            ac={variant.aouAllAc}
            an={variant.aouAllAn}
            inVocabulary
            isMax={false}
            source="aou"
            hovered={hoveredRow === ALL_POPULATIONS_ROW}
          />
          <FrequencyCells
            af={variant.gnomadAllAf}
            ac={variant.gnomadAllAc}
            an={variant.gnomadAllAn}
            inVocabulary
            isMax={false}
            source="gnomad"
            hovered={hoveredRow === ALL_POPULATIONS_ROW}
          />
        </tr>
      </tbody>
    </table>
  );
}
