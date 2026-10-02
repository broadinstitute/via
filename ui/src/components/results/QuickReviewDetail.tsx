import type { CSSProperties, ReactNode } from "react";
import colors, { alpha, POPMAX_BACKGROUND } from "../../libs/colors";
import { useMediaQuery } from "../../libs/hooks";
import * as Style from "../../libs/style";
import type { BreakdownSegment } from "../../types/results";
import {
  ancestryContext,
  ENRICHMENT_RATIO_THRESHOLD,
  formatExpected,
  formatPValue,
  formatRatio,
  largestMatchedAncestry,
  LOW_COUNT_THRESHOLD,
  type ComparisonRow,
  type Direction,
  type Enrichment,
} from "../../utils/comparison";
import { exactAf, formatAcAn, formatAf, formatInt } from "../../utils/format";
import { SUBPOP_COLOR, SUBPOP_LABEL } from "../../utils/subpopulations";
import AllOfUs from "../common/AllOfUs";
import InfoTooltip from "../common/InfoTooltip";
import ClinvarBadge from "../elements/ClinvarBadge";

// Below this the two tables no longer fit beside each other and stack instead.
const STACKED_QUERY = "(max-width: 1000px)";

// Every section shares one rhythm: an eyebrow title, then its content, 24px apart. The two tables
// sit side by side so the whole view fits the window's height without scrolling.
const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 32,
    alignItems: "start",
  },
  // Identity: the variant on the first line with its annotation badges, the gene line under it.
  identity: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  identityLine: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  variantId: {
    ...Style.elements.mono,
    fontSize: 16,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  badges: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  pill: {
    padding: "2px 8px",
    borderRadius: 999,
    border: `1px solid ${colors.border}`,
    background: colors.surface1,
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    whiteSpace: "nowrap",
  },
  geneLine: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  gene: {
    fontWeight: 600,
    color: colors.textBody,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionTitle: {
    ...Style.elements.eyebrow,
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  // Verdict: the call and ratio on the left, the evidence for it on the right, one sentence below.
  verdict: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: "14px 18px",
    borderRadius: Style.radius,
    border: "1px solid",
  },
  verdictLine: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "4px 12px",
  },
  verdictWord: {
    fontSize: 17,
    fontWeight: 700,
  },
  verdictRatio: {
    ...Style.elements.mono,
    fontSize: 17,
    fontWeight: 700,
  },
  // Evidence: a row of stat tiles, each a label over a figure over a one-word reading of it.
  evidence: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 10,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "10px 12px",
    border: `1px solid ${colors.border}`,
    borderRadius: Style.radius,
    background: colors.surface1,
  },
  tileValue: {
    ...Style.elements.mono,
    fontSize: 15,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  tileNote: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cautions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  caution: {
    padding: "2px 8px",
    borderRadius: 999,
    background: colors.bgWarning,
    color: colors.textWarning,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  verdictSentence: {
    fontSize: 12.5,
    lineHeight: 1.5,
    color: colors.textBody,
  },
  // Head to head and ancestry share one table treatment.
  table: {
    ...Style.table.base,
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  th: {
    padding: "7px 10px",
    background: colors.surface1,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: 600,
    textAlign: "left",
    verticalAlign: "bottom",
    whiteSpace: "nowrap",
  },
  thScope: {
    display: "block",
    marginTop: 1,
    fontWeight: 500,
    fontSize: 10.5,
    color: colors.textMuted,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  td: {
    padding: "6px 10px",
    borderBottom: `1px solid ${colors.border}`,
    verticalAlign: "middle",
  },
  metric: {
    color: colors.textSecondary,
    fontSize: 11.5,
    whiteSpace: "nowrap",
  },
  value: {
    ...Style.elements.mono,
    fontSize: 11.5,
    color: colors.textBody,
  },
  valueStrong: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  bar: {
    marginTop: 4,
    height: 5,
    borderRadius: 3,
    background: colors.surface0,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  populationLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: colors.textBody,
  },
  shareBar: {
    display: "inline-block",
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    verticalAlign: "middle",
    background: colors.textAccent,
  },
  insight: {
    margin: 0,
    fontSize: 12.5,
    lineHeight: 1.5,
    color: colors.textBody,
  },
  footnote: {
    margin: 0,
    fontSize: 11,
    color: colors.textMuted,
  },
  empty: {
    padding: "18px 12px",
    borderRadius: Style.radius,
    background: colors.surface1,
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 1.5,
  },
} as const satisfies Record<string, CSSProperties>;

const VERDICT_TONE: Record<Direction, { ink: string; fill: string; word: string }> = {
  enriched: { ink: colors.textDanger, fill: colors.bgDanger, word: "Enriched" },
  depleted: { ink: colors.textAccent, fill: colors.bgAccent, word: "Depleted" },
  similar: { ink: colors.textSecondary, fill: colors.surface1, word: "Similar frequency" },
  inconclusive: { ink: colors.textMuted, fill: colors.surface1, word: "Inconclusive" },
};

/** Ink and fill for a comparison's verdict; exported so the rail's dot agrees with the strip. */
export function verdictTone(enrichment: Enrichment | null) {
  return enrichment
    ? VERDICT_TONE[enrichment.direction]
    : { ink: colors.textMuted, fill: colors.surface1, word: "No comparison" };
}

interface QuickReviewDetailProps {
  row: ComparisonRow;
  condition: string;
  participantCount: number;
  ancestryBreakdown: BreakdownSegment[];
}

export default function QuickReviewDetail({ row, condition, participantCount, ancestryBreakdown }: QuickReviewDetailProps) {
  const { cohort, matched, enrichment } = row;
  const tone = verdictTone(enrichment);
  const allAncestry = ancestryContext(cohort, ancestryBreakdown);
  // A group with no matched participants and no frequency in either source would be a row of
  // dashes, so it's left out; the ones that remain are the ones that bear on the verdict.
  const ancestry = allAncestry.filter(
    (r) => r.isAouPopmax || r.matchedCount !== null || r.aouAf !== null || r.gnomadAf !== null,
  );
  const popmax = allAncestry.find((r) => r.isAouPopmax) ?? null;
  const largest = largestMatchedAncestry(allAncestry);
  const stacked = useMediaQuery(STACKED_QUERY);

  return (
    <div style={styles.root}>
      <header style={styles.identity}>
        <div style={styles.identityLine}>
          <span style={styles.variantId}>{row.variant}</span>
          {cohort && (
            <span style={styles.badges}>
              {cohort.clinvarSignificance && (
                <ClinvarBadge significance={cohort.clinvarSignificance} stars={cohort.clinvarStars} />
              )}
              <span style={styles.pill} title="SpliceAI delta score">
                SpliceAI {cohort.spliceAi.toFixed(2)}
              </span>
              {cohort.plof && (
                <span style={styles.pill} title="LOFTEE loss-of-function confidence">
                  pLOF {cohort.plof}
                </span>
              )}
            </span>
          )}
        </div>
        <div style={styles.geneLine}>
          {cohort ? (
            <>
              <span style={styles.gene}>{cohort.gene}</span> · {cohort.consequence} · {cohort.proteinChange}
            </>
          ) : (
            <>
              Not observed in <AllOfUs />, so there are no annotations or frequencies to compare.
            </>
          )}
        </div>
      </header>

      <section style={styles.section} aria-labelledby="quickReviewVerdict">
        <SectionTitle id="quickReviewVerdict">Verdict</SectionTitle>
        <div
          role="status"
          style={{ ...styles.verdict, color: tone.ink, background: tone.fill, borderColor: alpha(tone.ink, 0.35) }}
        >
          <div style={styles.verdictLine}>
            <span style={styles.verdictWord}>{tone.word}</span>
            {enrichment && enrichment.direction !== "inconclusive" && (
              <span style={styles.verdictRatio}>{formatRatio(enrichment.ratio)}</span>
            )}
          </div>
          <p style={{ ...styles.verdictSentence, margin: 0 }}>{verdictSentence(row, condition)}</p>
        </div>
      </section>

      {enrichment && (
        <section style={styles.section} aria-labelledby="quickReviewEvidence">
          <SectionTitle
            id="quickReviewEvidence"
            tooltip="What stands behind the verdict. The test compares matched participants with the rest of the cohort; the interval is for the frequency ratio. Fifty candidates means fifty tests, so a p-value near 0.05 is weak on its own."
          >
            Evidence
          </SectionTitle>
          <div style={styles.evidence}>
            <StatTile
              label="Fisher's exact p"
              value={formatPValue(enrichment.pValue)}
              note={enrichment.significant ? "below 0.05" : "not below 0.05"}
            />
            {enrichment.ci ? (
              <StatTile
                label="95% CI for ratio"
                value={`${formatRatio(enrichment.ci[0])} – ${formatRatio(enrichment.ci[1])}`}
                note={enrichment.ci[0] > 1 ? "excludes 1×" : enrichment.ci[1] < 1 ? "excludes 1×" : "includes 1×"}
              />
            ) : enrichment.upperBound !== null ? (
              <StatTile
                label="Ratio upper bound"
                value={`≤ ${formatRatio(enrichment.upperBound)}`}
                note="rule of three, no carriers"
              />
            ) : (
              <StatTile label="95% CI for ratio" value="—" note="undefined at zero" />
            )}
            <StatTile
              label="Matched alt alleles"
              value={formatInt(enrichment.matchedAc)}
              note={`${formatExpected(enrichment.expectedMatchedAc)} expected at cohort rate`}
            />
          </div>
          {(enrichment.lowCount || (!enrichment.significant && enrichment.direction !== "similar")) && (
            <div style={styles.cautions}>
              {!enrichment.significant && enrichment.direction !== "similar" && (
                <span style={styles.caution}>Not statistically significant</span>
              )}
              {enrichment.lowCount && (
                <span
                  style={styles.caution}
                  title={`Fewer than ${LOW_COUNT_THRESHOLD} alternate alleles among matched participants`}
                >
                  Low count
                </span>
              )}
            </div>
          )}
        </section>
      )}

      <div style={stacked ? undefined : styles.columns}>
      <section style={styles.section} aria-labelledby="quickReviewHeadToHead">
        <SectionTitle
          id="quickReviewHeadToHead"
          tooltip="The same measures for both cohorts, side by side. A dash means the measure isn't available for that cohort."
        >
          Head to head
        </SectionTitle>
        {cohort ? (
          <table style={styles.table}>
            <colgroup>
              <col style={{ width: "34%" }} />
              <col style={{ width: "33%" }} />
              <col style={{ width: "33%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={styles.th}>Measure</th>
                <th style={styles.th}>
                  <AllOfUs /> cohort-wide
                  {cohort.aouAllAn !== null && (
                    <span style={styles.thScope}>{formatInt(Math.round(cohort.aouAllAn / 2))} participants</span>
                  )}
                </th>
                <th style={styles.th}>
                  Phenotype-matched
                  <span style={styles.thScope}>
                    {formatInt(participantCount)} with {condition}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <CompareRow
                metric="Allele frequency"
                left={
                  cohort.aouAllAf !== null ? (
                    <Frequency af={cohort.aouAllAf} fraction={barFraction(cohort.aouAllAf, matched?.cohortAf)} color={colors.textSecondary} />
                  ) : null
                }
                right={
                  matched ? (
                    <Frequency af={matched.cohortAf} fraction={barFraction(matched.cohortAf, cohort.aouAllAf)} color={tone.ink} />
                  ) : null
                }
              />
              <CompareRow
                metric="AC / AN"
                left={cohort.aouAllAc !== null && cohort.aouAllAn !== null ? formatAcAn(cohort.aouAllAc, cohort.aouAllAn) : null}
                right={matched ? formatAcAn(matched.cohortAc, matched.cohortAn) : null}
              />
              <CompareRow
                metric="Hom / het"
                left={null}
                right={matched ? `${formatInt(matched.homozygotes)} / ${formatInt(matched.heterozygotes)}` : null}
              />
              <CompareRow
                metric="ClinVar P/LP in trans"
                left={null}
                right={matched ? formatInt(matched.clinvarPlpInTrans) : null}
              />
              <CompareRow
                metric="Highest ancestry"
                left={
                  popmax ? (
                    <span style={styles.populationLabel}>
                      <span style={Style.colorDot(SUBPOP_COLOR[popmax.population])} />
                      {popmax.population}
                      {popmax.aouAf !== null && <span style={styles.value}>{formatAf(popmax.aouAf)}</span>}
                    </span>
                  ) : null
                }
                right={null}
              />
              <CompareRow
                metric="gnomAD AF"
                left={cohort.gnomadAllAf !== null ? formatAf(cohort.gnomadAllAf) : "Not observed"}
                right={null}
              />
            </tbody>
          </table>
        ) : (
          <div style={styles.empty}>Nothing to compare: the variant has no cohort-wide data.</div>
        )}
      </section>

      <section style={styles.section} aria-labelledby="quickReviewAncestry">
        <SectionTitle
          id="quickReviewAncestry"
          tooltip="Each All of Us ancestry group: how much of the phenotype-matched cohort it makes up, beside the variant's cohort-wide frequency within that group. gnomAD's figure is shown where it has the same group."
        >
          Ancestry context
        </SectionTitle>
        {cohort ? (
          <>
            {popmax && largest && (
              <p style={styles.insight}>
                Cohort-wide, this variant is most frequent in {SUBPOP_LABEL[popmax.population]} participants
                {popmax.aouAf !== null && <> ({formatAf(popmax.aouAf)})</>}. The matched cohort is{" "}
                {largest.matchedPercent !== null && <>{Math.round(largest.matchedPercent)}% </>}
                {SUBPOP_LABEL[largest.population]}
                {largest.population !== popmax.population && largest.aouAf !== null && (
                  <>, where its frequency is {formatAf(largest.aouAf)}</>
                )}
                .
              </p>
            )}
            <table style={styles.table}>
              <colgroup>
                <col style={{ width: "15%" }} />
                <col style={{ width: "31%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={styles.th}>Ancestry</th>
                  <th style={styles.th}>Share of matched</th>
                  <th style={styles.th}>
                    <AllOfUs /> AF
                  </th>
                  <th style={styles.th}>
                    <AllOfUs /> AC / AN
                  </th>
                  <th style={styles.th}>gnomAD AF</th>
                </tr>
              </thead>
              <tbody>
                {ancestry.map((r) => (
                  <tr key={r.population} style={r.isAouPopmax ? { background: POPMAX_BACKGROUND } : undefined}>
                    <td style={styles.td}>
                      <span style={styles.populationLabel} title={SUBPOP_LABEL[r.population]}>
                        <span style={Style.colorDot(SUBPOP_COLOR[r.population])} />
                        {r.population}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {r.matchedPercent !== null && r.matchedCount !== null ? (
                        <span style={styles.value}>
                          <span style={{ ...styles.shareBar, width: Math.max(2, r.matchedPercent * 0.6) }} aria-hidden="true" />
                          {Math.round(r.matchedPercent)}% ({formatInt(r.matchedCount)})
                        </span>
                      ) : (
                        <NotAvailable />
                      )}
                    </td>
                    <td style={styles.td} title={r.aouAf !== null ? exactAf(r.aouAf) : undefined}>
                      {r.aouAf !== null ? (
                        <span style={styles.value}>{formatAf(r.aouAf)}</span>
                      ) : (
                        <NotAvailable />
                      )}
                    </td>
                    <td style={styles.td}>
                      {r.aouAc !== null && r.aouAn !== null ? (
                        <span style={styles.value}>{formatAcAn(r.aouAc, r.aouAn)}</span>
                      ) : (
                        <NotAvailable />
                      )}
                    </td>
                    <td style={styles.td} title={r.gnomadAf !== null ? exactAf(r.gnomadAf) : undefined}>
                      {r.gnomadAf !== null ? (
                        <span style={styles.value}>{formatAf(r.gnomadAf)}</span>
                      ) : (
                        <NotAvailable />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {popmax && (
              <p style={styles.footnote}>
                Shaded row: the ancestry group with the highest <AllOfUs /> frequency for this variant.
              </p>
            )}
          </>
        ) : (
          <div style={styles.empty}>No population frequencies for this variant.</div>
        )}
      </section>
      </div>
    </div>
  );
}

/** One line under the verdict saying what the numbers mean for this condition. */
function verdictSentence(row: ComparisonRow, condition: string): ReactNode {
  const { cohort, matched, enrichment } = row;
  if (!cohort) return "This variant has no cohort-wide frequency, so there is nothing to compare against.";
  if (!matched) return "No phenotype-matched statistics exist for this variant yet.";
  if (!enrichment) return "Cohort-wide allele counts are missing for this variant.";
  if (enrichment.matchedAc === 0) {
    const expected = formatExpected(enrichment.expectedMatchedAc);
    return enrichment.direction === "depleted" ? (
      <>
        No participants with {condition} carry this allele, where about {expected} carriers were expected at the
        cohort-wide rate.
      </>
    ) : (
      <>
        No participants with {condition} carry this allele, but only {expected} were expected at the cohort-wide
        rate, so this says nothing either way.
      </>
    );
  }
  if (enrichment.direction === "inconclusive") {
    return <>Nobody in the whole cohort carries this allele outside the matched participants, and the counts are too small to call.</>;
  }
  switch (enrichment.direction) {
    case "enriched":
      return (
        <>
          Participants with {condition} carry this allele {formatRatio(enrichment.ratio)} as often as the cohort overall
          {enrichment.significant ? "." : ", but the counts are too small to rule out chance."}
        </>
      );
    case "depleted":
      return (
        <>
          Participants with {condition} carry this allele {formatRatio(enrichment.ratio)} as often as the cohort overall,
          less than expected{enrichment.significant ? "." : ", though the counts are too small to rule out chance."}
        </>
      );
    default:
      return <>Participants with {condition} carry this allele about as often as the cohort overall.</>;
  }
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={styles.tile}>
      <span style={Style.elements.eyebrow}>{label}</span>
      <span style={styles.tileValue}>{value}</span>
      <span style={styles.tileNote}>{note}</span>
    </div>
  );
}

function SectionTitle({ id, children, tooltip }: { id: string; children: ReactNode; tooltip?: string }) {
  return (
    <h3 id={id} style={styles.sectionTitle}>
      {children}
      {tooltip && <InfoTooltip text={tooltip} style={{ marginTop: -4, marginBottom: -4 }} />}
    </h3>
  );
}

interface CompareRowProps {
  metric: string;
  /** Rendered as-is; null draws the "not available" dash. */
  left: ReactNode | null;
  right: ReactNode | null;
}

function CompareRow({ metric, left, right }: CompareRowProps) {
  return (
    <tr>
      <td style={{ ...styles.td, ...styles.metric }}>{metric}</td>
      <td style={styles.td}>{left === null ? <NotAvailable /> : <span style={styles.value}>{left}</span>}</td>
      <td style={styles.td}>{right === null ? <NotAvailable /> : <span style={styles.value}>{right}</span>}</td>
    </tr>
  );
}

/** The headline figure of the table, with a bar scaled against the other cohort's. */
function Frequency({ af, fraction, color }: { af: number; fraction: number; color: string }) {
  return (
    <span style={{ display: "block" }} title={exactAf(af) ? `Exactly ${exactAf(af)}` : undefined}>
      <span style={{ ...styles.value, ...styles.valueStrong }}>{formatAf(af)}</span>
      <span style={{ ...styles.bar, display: "block" }} aria-hidden="true">
        <span style={{ ...styles.barFill, display: "block", width: `${Math.max(1, fraction * 100)}%`, background: color }} />
      </span>
    </span>
  );
}

function NotAvailable() {
  return <span style={Style.elements.notAvailable}>—</span>;
}

/** Each bar is drawn relative to the larger of the two frequencies, so the pair reads at a glance. */
function barFraction(value: number, other: number | null | undefined): number {
  const max = Math.max(value, other ?? 0);
  return max === 0 ? 0 : value / max;
}

export { ENRICHMENT_RATIO_THRESHOLD };
