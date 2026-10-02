import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { PlusIcon } from "../icons";
import PhenotypeFilterIllustration, { type PhenotypeFilterIllustrationVariant } from "./PhenotypeFilterIllustration";

const styles = {
  body: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "32px 20px 40px",
    textAlign: "center",
  },
  title: {
    marginTop: 10,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 700,
  },
  message: {
    maxWidth: 340,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 1.5,
  },
  button: {
    ...Style.buttons.primary,
    marginTop: 12,
    padding: "8px 14px",
    fontSize: 12.5,
    fontWeight: 700,
  },
} as const satisfies Record<string, CSSProperties>;

interface PhenotypeFilterRequiredProps {
  title: string;
  message: string;
  buttonLabel: string;
  onAddPhenotypeFilter: () => void;
  /** Which panel this stands in for, which picks the sketch under the illustration's funnel. */
  illustration: PhenotypeFilterIllustrationVariant;
  /** The footprint of whatever this prompt stands in for, so the panel keeps its size. */
  minHeight: number;
}

export default function PhenotypeFilterRequired({
  title,
  message,
  buttonLabel,
  onAddPhenotypeFilter,
  illustration,
  minHeight,
}: PhenotypeFilterRequiredProps) {
  return (
    <div style={{ ...styles.body, minHeight }}>
      <PhenotypeFilterIllustration variant={illustration} width={illustration === "table" ? 220 : 196} />
      <div style={styles.title}>{title}</div>
      <p style={styles.message}>{message}</p>
      <Clickable style={styles.button} hoverStyle={Style.buttons.primaryHover} onClick={onAddPhenotypeFilter}>
        <PlusIcon size={12} strokeWidth={2.5} />
        {buttonLabel}
      </Clickable>
    </div>
  );
}
