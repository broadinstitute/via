import type { AnnotatedCohortVariant, GnomadSubpopCode, PopulationFrequency, SubpopCode } from "../../types/results";
import { formatAcAn, formatAf } from "../../utils/format";
import SubpopBadge from "./SubpopBadge";
import styles from "./PopulationFrequenciesCard.module.css";

// Union of every AoU + gnomAD population code, in a stable (alphabetical) order so rows line up
// the same way across variants -- not sorted by frequency.
const POPULATION_ORDER: Array<SubpopCode | GnomadSubpopCode> = [
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

function toMap(frequencies: PopulationFrequency[]): Map<string, PopulationFrequency> {
  return new Map(frequencies.map((frequency) => [frequency.population, frequency]));
}

function Dash() {
  return <span className={styles.dash}>—</span>;
}

interface PopulationFrequenciesCardProps {
  variant: AnnotatedCohortVariant;
}

export default function PopulationFrequenciesCard({ variant }: PopulationFrequenciesCardProps) {
  const aouByPopulation = toMap(variant.aouPopulations);
  const gnomadByPopulation = toMap(variant.gnomadPopulations);
  const populations = POPULATION_ORDER.filter(
    (population) => aouByPopulation.has(population) || gnomadByPopulation.has(population),
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.heading}>Population frequencies</div>
        {/* No equivalent All of Us variant-lookup URL exists in this app, so only gnomAD links out. */}
        {variant.gnomadUrl && (
          <a
            className={styles.sourceLink}
            href={variant.gnomadUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={`Open ${variant.variant} in gnomAD (opens in new tab)`}
          >
            gnomAD ↗
          </a>
        )}
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th rowSpan={2} className={styles.populationHeader}>
                Population
              </th>
              <th colSpan={2} className={styles.tintAou}>
                All of Us
              </th>
              <th colSpan={2} className={styles.tintGnomad}>
                gnomAD
              </th>
            </tr>
            <tr>
              <th className={styles.tintAou}>AF</th>
              <th className={styles.tintAou}>AC/AN</th>
              <th className={styles.tintGnomad}>AF</th>
              <th className={styles.tintGnomad}>AC/AN</th>
            </tr>
          </thead>
          <tbody>
            {populations.map((population) => {
              const aou = aouByPopulation.get(population);
              const gnomad = gnomadByPopulation.get(population);
              const isAouMax = population === variant.aouSubpopulation;
              const isGnomadMax = population === variant.gnomadSubpopulation;
              return (
                <tr key={population}>
                  <td className={styles.populationCell}>
                    <SubpopBadge subpopulation={population} />
                  </td>
                  <td className={`${styles.tintAou} ${isAouMax ? styles.max : ""}`}>
                    {aou?.af != null ? formatAf(aou.af) : <Dash />}
                    {isAouMax && <span className={styles.maxMarker}>MAX</span>}
                  </td>
                  <td className={`${styles.tintAou} ${isAouMax ? styles.max : ""}`}>
                    {aou?.ac != null && aou.an != null ? formatAcAn(aou.ac, aou.an) : <Dash />}
                  </td>
                  <td className={`${styles.tintGnomad} ${isGnomadMax ? styles.max : ""}`}>
                    {gnomad?.af != null ? formatAf(gnomad.af) : <Dash />}
                    {isGnomadMax && <span className={styles.maxMarker}>MAX</span>}
                  </td>
                  <td className={`${styles.tintGnomad} ${isGnomadMax ? styles.max : ""}`}>
                    {gnomad?.ac != null && gnomad.an != null ? formatAcAn(gnomad.ac, gnomad.an) : <Dash />}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className={styles.allPopulationsLabel}>All populations</td>
              <td className={styles.tintAou}>
                {variant.aouAllAf != null ? formatAf(variant.aouAllAf) : <Dash />}
              </td>
              <td className={styles.tintAou}>
                {variant.aouAllAc != null && variant.aouAllAn != null ? (
                  formatAcAn(variant.aouAllAc, variant.aouAllAn)
                ) : (
                  <Dash />
                )}
              </td>
              <td className={styles.tintGnomad}>
                {variant.gnomadAllAf != null ? formatAf(variant.gnomadAllAf) : <Dash />}
              </td>
              <td className={styles.tintGnomad}>
                {variant.gnomadAllAc != null && variant.gnomadAllAn != null ? (
                  formatAcAn(variant.gnomadAllAc, variant.gnomadAllAn)
                ) : (
                  <Dash />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.caption}>
        Blank cells are populations not reported by that source, not zero values.
      </p>
    </div>
  );
}
