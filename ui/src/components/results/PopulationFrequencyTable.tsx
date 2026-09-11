import type { AnnotatedCohortVariant, GnomadSubpopCode, PopulationFrequency, SubpopCode } from "../../types/results";
import { SUBPOP_COLOR, SUBPOP_LABEL } from "./SubpopBadge";
import { formatAcAn, formatAf } from "../../utils/format";
import styles from "./PopulationFrequencyTable.module.css";

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

function byPopulation(frequencies: PopulationFrequency[]): Map<string, PopulationFrequency> {
  return new Map(frequencies.map((frequency) => [frequency.population, frequency]));
}

interface FrequencyCellsProps {
  af: number | null | undefined;
  ac: number | null | undefined;
  an: number | null | undefined;
  inVocabulary: boolean;
  isMax: boolean;
  tint: string;
}

function FrequencyCells({ af, ac, an, inVocabulary, isMax, tint }: FrequencyCellsProps) {
  if (af == null || ac == null || an == null) {
    return (
      <>
        <td className={tint}>
          <span className={styles.dash} title={inVocabulary ? undefined : "Not part of this source's population scheme"}>
            —
          </span>
        </td>
        <td className={tint}>
          <span className={styles.dash}>—</span>
        </td>
      </>
    );
  }
  const cellClass = isMax ? `${tint} ${styles.popmax}` : tint;
  return (
    <>
      <td className={cellClass}>
        {formatAf(af)}
        {isMax && <span className={styles.maxMarker}>MAX</span>}
      </td>
      <td className={cellClass}>{formatAcAn(ac, an)}</td>
    </>
  );
}

interface PopulationFrequencyTableProps {
  variant: AnnotatedCohortVariant;
}

export default function PopulationFrequencyTable({ variant }: PopulationFrequencyTableProps) {
  const aouByPopulation = byPopulation(variant.aouPopulations);
  const gnomadByPopulation = byPopulation(variant.gnomadPopulations);
  const aouVocabulary = new Set(variant.aouPopulations.map((p) => p.population));
  const gnomadVocabulary = new Set(variant.gnomadPopulations.map((p) => p.population));

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.populationHeader}>Population</th>
          <th className={styles.tintAou}>All of Us AF</th>
          <th className={styles.tintAou}>AC/AN</th>
          <th className={styles.tintGnomad}>
            gnomAD AF{" "}
            {variant.gnomadUrl && (
              <a
                className={styles.sourceLink}
                href={variant.gnomadUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${variant.variant} in gnomAD`}
                aria-label={`Open ${variant.variant} in gnomAD (opens in new tab)`}
                onClick={(event) => event.stopPropagation()}
              >
                ↗
              </a>
            )}
          </th>
          <th className={styles.tintGnomad}>AC/AN</th>
        </tr>
      </thead>
      <tbody>
        {ALL_POPULATION_CODES.map((population) => (
          <tr key={population}>
            <td>
              <span className={styles.populationLabel}>
                <span className={styles.dot} style={{ background: SUBPOP_COLOR[population] }} />
                {SUBPOP_LABEL[population]}
              </span>
            </td>
            <FrequencyCells
              af={aouByPopulation.get(population)?.af}
              ac={aouByPopulation.get(population)?.ac}
              an={aouByPopulation.get(population)?.an}
              inVocabulary={aouVocabulary.has(population)}
              isMax={variant.aouSubpopulation === population}
              tint={styles.tintAou}
            />
            <FrequencyCells
              af={gnomadByPopulation.get(population)?.af}
              ac={gnomadByPopulation.get(population)?.ac}
              an={gnomadByPopulation.get(population)?.an}
              inVocabulary={gnomadVocabulary.has(population)}
              isMax={variant.gnomadSubpopulation === population}
              tint={styles.tintGnomad}
            />
          </tr>
        ))}
        <tr>
          <td className={styles.allPopulationsLabel}>All populations</td>
          <FrequencyCells
            af={variant.aouAllAf}
            ac={variant.aouAllAc}
            an={variant.aouAllAn}
            inVocabulary
            isMax={false}
            tint={styles.tintAou}
          />
          <FrequencyCells
            af={variant.gnomadAllAf}
            ac={variant.gnomadAllAc}
            an={variant.gnomadAllAn}
            inVocabulary
            isMax={false}
            tint={styles.tintGnomad}
          />
        </tr>
      </tbody>
    </table>
  );
}
