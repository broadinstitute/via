import type { GnomadSubpopCode, SubpopCode } from "../../types/results";
import styles from "./SubpopBadge.module.css";

// AFR, AMR, EAS, SAS, and OTH are shared between AoU and gnomAD, so they share
// a color; FIN, NFE, and ASJ only exist in gnomAD's subpopulation scheme.
const SUBPOP_COLOR: Record<SubpopCode | GnomadSubpopCode, string> = {
  EUR: "#F9C854",
  AFR: "#2078B4",
  AMR: "#6DACE4",
  EAS: "#A27BD7",
  SAS: "#8CCA90",
  MID: "#CB2D4C",
  OTH: "#B3AEAD",
  FIN: "#6B4226",
  NFE: "#E67E22",
  ASJ: "#7B2D8E",
};

interface SubpopBadgeProps {
  subpopulation: SubpopCode | GnomadSubpopCode;
}

export default function SubpopBadge({ subpopulation }: SubpopBadgeProps) {
  return (
    <span className={styles.badge}>
      <span className={styles.dot} style={{ background: SUBPOP_COLOR[subpopulation] }} />
      {subpopulation}
    </span>
  );
}
