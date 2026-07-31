import type { SubpopCode } from "../../types/results";
import styles from "./SubpopBadge.module.css";

const SUBPOP_COLOR: Record<SubpopCode, string> = {
  EUR: "#F9C854",
  AFR: "#2078B4",
  AMR: "#6DACE4",
  EAS: "#A27BD7",
  SAS: "#8CCA90",
  MID: "#CB2D4C",
  OTH: "#B3AEAD",
};

interface SubpopBadgeProps {
  subpopulation: SubpopCode;
}

export default function SubpopBadge({ subpopulation }: SubpopBadgeProps) {
  return (
    <span className={styles.badge}>
      <span className={styles.dot} style={{ background: SUBPOP_COLOR[subpopulation] }} />
      {subpopulation}
    </span>
  );
}
