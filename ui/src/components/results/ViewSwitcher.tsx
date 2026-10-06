import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { CompareIcon, TableIcon } from "../icons";

export type ResultsView = "table" | "review";

// The one control that decides what the page shows beneath the summary strip, so it carries more
// weight than the small Ancestry/Age toggle: a taller pill, a stronger border, and the selected
// option filled in the accent with white type rather than lifted on a shadow.
const styles = {
  group: {
    display: "inline-flex",
    gap: 3,
    padding: 3,
    background: colors.surface1,
    border: `1px solid ${colors.borderStrong}`,
    borderRadius: 999,
  },
  option: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "6px 16px",
    border: "none",
    borderRadius: 999,
    background: "none",
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    cursor: "pointer",
    // No eased colour change: mid-fade, the option losing selection shows white text on a
    // near-white fill for a few frames, which reads as a flicker.
  },
  optionHover: {
    background: colors.surface0,
    color: colors.textPrimary,
  },
  optionSelected: {
    background: colors.textAccent,
    color: colors.white,
    boxShadow: Style.shadows.pill,
  },
} as const satisfies Record<string, CSSProperties>;

const OPTIONS: { value: ResultsView; label: string; icon: typeof TableIcon }[] = [
  { value: "table", label: "Table", icon: TableIcon },
  { value: "review", label: "Review", icon: CompareIcon },
];

interface ViewSwitcherProps {
  value: ResultsView;
  onChange: (view: ResultsView) => void;
  /** Why Review can't be chosen right now, e.g. no phenotype filter; disables that option. */
  reviewUnavailableReason?: string;
}

export default function ViewSwitcher({ value, onChange, reviewUnavailableReason }: ViewSwitcherProps) {
  return (
    <div role="tablist" aria-label="Results view" style={styles.group}>
      {OPTIONS.map(({ value: option, label, icon: Icon }) => {
        const disabled = option === "review" && reviewUnavailableReason !== undefined;
        return (
          <Clickable
            key={option}
            role="tab"
            aria-selected={value === option}
            style={{ ...styles.option, ...(value === option ? styles.optionSelected : undefined) }}
            hoverStyle={value === option ? undefined : styles.optionHover}
            disabledStyle={Style.buttons.disabled}
            disabled={disabled}
            title={disabled ? reviewUnavailableReason : undefined}
            onClick={() => onChange(option)}
          >
            <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
            {label}
          </Clickable>
        );
      })}
    </div>
  );
}
