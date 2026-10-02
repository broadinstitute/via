import type { CSSProperties, ReactNode } from "react";
import colors, { alpha, POPMAX_BACKGROUND } from "../../libs/colors";
import * as Style from "../../libs/style";
import type { BreakdownSegment } from "../../types/results";
import {
  ancestryContext,
  ENRICHMENT_RATIO_THRESHOLD,
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
import InfoLabel from "../common/InfoLabel";
import InfoTooltip from "../common/InfoTooltip";
import ClinvarBadge from "../elements/ClinvarBadge";

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  identity: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "4px 14px",
  },
  variantId: {
    ...Style.elements.mono,
    fontSize: 15,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  gene: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textBody,
  },
  annotation: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  badges: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
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
  },
  verdict: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px 14px",
    padding: "12px 16px",
    borderRadius: Style.radius,
    border: "1px solid",
  },
  verdictWord: {
    fontSize: 16,
    fontWeight: 700,
  },
  verdictRatio: {
    ...Style.elements.mono,
    fontSize: 15,
    fontWeight: 700,
  },
  verdictStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px 14px",
    marginLeft: "auto",
    fontSize: 12,
  },
  caution: {
    padding: "2px 8px",
    borderRadius: 999,
    background: colors.bgWarning,
    color: colors.textWarning,
    fontSize: 11,
    fontWeight: 600,
  },
  cohorts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },
  card: {
    ...Style.elements.panel,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  cardScope: {
    fontSize: 11,
    fontWeight: 500,
    color: colors.textMuted,
  },
  bigNumber: {
    ...Style.elements.mono,
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.1,
    color: colors.textPrimary,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    background: colors.surface0,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  facts: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "4px 12px",
    fontSize: 12,
    color: colors.textBody,
  },
  factLabel: {
    color: colors.textSecondary,
  },
  factValue: {
    ...Style.elements.mono,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  insight: {
    fontSize: 12,
    lineHeight: 1.5,
    color: colors.textSecondary,
  },
  table: {
    ...Style.table.base,
    borderCollapse: "collapse",
  },
  th: {
    padding: "6px 10px",
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: 600,
    textAlign: "right",
  },
  thLeft: {
    textAlign: "left",
  },
  td: {
    padding: "5px 10px",
    borderBottom: `1px solid ${colors.border}`,
    textAlign: "right",
    ...Style.elements.mono,
  },
  tdLeft: {
    textAlign: "left",
    fontFamily: "inherit",
    fontSize: 12,
  },
  populationLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  shareBar: {
    display: "inline-block",
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    verticalAlign: "middle",
    background: colors.textAccent,
  },
  empty: {
    padding: "24px 12px",
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
};

/** Ink and fill for a comparison's verdict; exported so the rail's dot agrees with the strip. */
export function verdictTone(enrichment: Enrichment | null) {
  return enrichment ? VERDICT_TONE[enrichment.direction] : { ink: colors.textMuted, fill: colors.surface1, word: "No comparison" };
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
  const ancestry = ancestryContext(cohort, ancestryBreakdown);
  const popmax = ancestry.find((r) => r.isAouPopmax) ?? null;
  const largest = largestMatchedAncestry(ancestry);

  return (
    <div style={styles.root}>
      <div style={styles.identity}>
        <span style={styles.variantId}>{row.variant}</span>
        {cohort ? (
          <>
            <span style={styles.gene}>{cohort.gene}</span>
            <span style={styles.annotation}>
              {cohort.consequence} · {cohort.proteinChange}
            </span>
            <span style={styles.badges}>
              {cohort.clinvarSignificance && <ClinvarBadge significance={cohort.clinvarSignificance} stars={cohort.clinvarStars} />}
              <span style={styles.pill} title="SpliceAI delta score">
                SpliceAI {cohort.spliceAi.toFixed(2)}
              </span>
              {cohort.plof && (
                <span style={styles.pill} title="LOFTEE loss-of-function confidence">
                  pLOF {cohort.plof}
                </span>
              )}
            </span>
          </>
        ) : (
          <span style={styles.annotation}>
            Not observed in <AllOfUs />, so there are no annotations or frequencies to compare.
          </span>
        )}
      </div>

      <div
        role="status"
        style={{ ...styles.verdict, color: tone.ink, background: tone.fill, borderColor: alpha(tone.ink, 0.35) }}
      >
        <span style={styles.verdictWord}>{tone.word}</span>
        {enrichment && (
          <>
            <span style={styles.verdictRatio}>{formatRatio(enrichment.ratio)}</span>
            <span style={{ fontSize: 12 }}>
              the cohort-wide frequency among participants with {condition}
            </span>
            <span style={styles.verdictStats}>
              <InfoLabel tooltip="Two-sided Fisher's exact test, matched participants against the rest of the cohort. Below 0.05 counts as significant.">
                p {formatPValue(enrichment.pValue).startsWith("<") ? "" : "= "}
                {formatPValue(enrichment.pValue)}
              </InfoLabel>
              <InfoLabel tooltip="95% confidence interval for the ratio.">
                CI {formatRatio(enrichment.ci[0])} – {formatRatio(enrichment.ci[1])}
              </InfoLabel>
              {!enrichment.significant && enrichment.direction !== "similar" && (
                <span style={styles.caution}>Not statistically significant</span>
              )}
              {enrichment.lowCount && (
                <span style={styles.caution} title={`Fewer than ${LOW_COUNT_THRESHOLD} alternate alleles among matched participants`}>
                  Low count
                </span>
              )}
            </span>
          </>
        )}
        {!enrichment && (
          <span style={{ fontSize: 12 }}>
            {!cohort
              ? "The variant has no cohort-wide frequency."
              : !matched
                ? "No phenotype-matched statistics for this variant yet."
                : "Cohort-wide allele counts are missing."}
          </span>
        )}
      </div>

      {enrichment && cohort && matched && (
        <div style={styles.cohorts}>
          <CohortCard
            title={
              <>
                <AllOfUs /> cohort-wide
              </>
            }
            scope={cohort.aouAllAn !== null ? `${formatInt(Math.round(cohort.aouAllAn / 2))} participants` : undefined}
            af={enrichment.cohortAf}
            barFraction={barFraction(enrichment.cohortAf, enrichment.matchedAf)}
            barColor={colors.textSecondary}
            facts={[
              ["AC / AN", cohort.aouAllAc !== null && cohort.aouAllAn !== null ? formatAcAn(cohort.aouAllAc, cohort.aouAllAn) : "—"],
              ["Highest subpopulation", popmax ? `${popmax.population} · ${popmax.aouAf !== null ? formatAf(popmax.aouAf) : "—"}` : "—"],
              ["gnomAD AF", cohort.gnomadAllAf !== null ? formatAf(cohort.gnomadAllAf) : "Not observed"],
            ]}
          />
          <CohortCard
            title={<>Phenotype-matched</>}
            scope={`${formatInt(participantCount)} with ${condition}`}
            af={enrichment.matchedAf}
            barFraction={barFraction(enrichment.matchedAf, enrichment.cohortAf)}
            barColor={tone.ink}
            facts={[
              ["AC / AN", formatAcAn(matched.cohortAc, matched.cohortAn)],
              ["Homozygous / heterozygous", `${formatInt(matched.homozygotes)} / ${formatInt(matched.heterozygotes)}`],
              ["ClinVar P/LP in trans", formatInt(matched.clinvarPlpInTrans)],
            ]}
          />
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <InfoLabel tooltip="Each All of Us ancestry group: how much of the phenotype-matched cohort it makes up, beside the variant's cohort-wide frequency within that group. gnomAD's figure is shown where it has the same group.">
            Ancestry context
          </InfoLabel>
        </div>
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
              <thead>
                <tr>
                  <th style={{ ...styles.th, ...styles.thLeft }}>Ancestry</th>
                  <th style={styles.th}>Share of matched cohort</th>
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
                    <td style={{ ...styles.td, ...styles.tdLeft }}>
                      <span style={styles.populationLabel} title={SUBPOP_LABEL[r.population]}>
                        <span style={Style.colorDot(SUBPOP_COLOR[r.population])} />
                        {r.population}
                        {r.isAouPopmax && <span style={{ ...styles.pill, marginLeft: 4 }}>highest</span>}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {r.matchedPercent !== null && r.matchedCount !== null ? (
                        <>
                          <span style={{ ...styles.shareBar, width: Math.max(2, r.matchedPercent * 0.8) }} aria-hidden="true" />
                          {Math.round(r.matchedPercent)}% ({formatInt(r.matchedCount)})
                        </>
                      ) : (
                        <NotAvailable />
                      )}
                    </td>
                    <td style={styles.td} title={r.aouAf !== null ? exactAf(r.aouAf) : undefined}>
                      {r.aouAf !== null ? formatAf(r.aouAf) : <NotAvailable />}
                    </td>
                    <td style={styles.td}>{r.aouAc !== null && r.aouAn !== null ? formatAcAn(r.aouAc, r.aouAn) : <NotAvailable />}</td>
                    <td style={styles.td} title={r.gnomadAf !== null ? exactAf(r.gnomadAf) : undefined}>
                      {r.gnomadAf !== null ? formatAf(r.gnomadAf) : <NotAvailable />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={styles.empty}>No population frequencies for this variant.</div>
        )}
      </div>
    </div>
  );
}

function NotAvailable() {
  return <span style={Style.elements.notAvailable}>—</span>;
}

/** Each bar is drawn relative to the larger of the two frequencies, so the pair reads at a glance. */
function barFraction(value: number, other: number): number {
  const max = Math.max(value, other);
  return max === 0 ? 0 : value / max;
}

interface CohortCardProps {
  title: ReactNode;
  scope?: string;
  af: number;
  barFraction: number;
  barColor: string;
  facts: [string, ReactNode][];
}

function CohortCard({ title, scope, af, barFraction, barColor, facts }: CohortCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        <span>{title}</span>
        {scope && <span style={styles.cardScope}>{scope}</span>}
      </div>
      <div>
        <div style={Style.elements.eyebrow}>
          Allele frequency
          <InfoTooltip text={exactAf(af) ? `Exactly ${exactAf(af)}` : "Alternate alleles over alleles called."} style={{ marginTop: -4, marginBottom: -4 }} />
        </div>
        <div style={styles.bigNumber}>{formatAf(af)}</div>
      </div>
      <div style={styles.bar} aria-hidden="true">
        <div style={{ ...styles.barFill, width: `${Math.max(1, barFraction * 100)}%`, background: barColor }} />
      </div>
      <div style={styles.facts}>
        {facts.map(([label, value]) => (
          <FactRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <span style={styles.factLabel}>{label}</span>
      <span style={styles.factValue}>{value}</span>
    </>
  );
}

// Keep the threshold in the module's public surface for the dialog's legend.
export { ENRICHMENT_RATIO_THRESHOLD };
