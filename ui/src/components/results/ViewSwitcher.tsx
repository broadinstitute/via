import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { CompareIcon, TableIcon } from "../icons";

export type ResultsView = "table" | "review";

// The same pill the breakdown's Ancestry/Age toggle uses, one size up: the one control that
// decides what the page shows beneath the summary strip.
const styles = {
  group: {
    display: "inline-flex",
    gap: 2,
    padding: 2,
    background: colors.surface1,
    border: `1px solid ${colors.border}`,
    borderRadius: 999,
  },
  option: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    border: "none",
    borderRadius: 999,
    background: "none",
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  optionHover: {
    color: colors.textAccent,
  },
  optionSelected: {
    background: colors.surface2,
    color: colors.textAccent,
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
            <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
            {label}
          </Clickable>
        );
      })}
    </div>
  );
}
