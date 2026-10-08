import { useId, useRef } from "react";
import type { CSSProperties } from "react";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { useTooltip } from "../common/useTooltip";
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
  // A disabled button takes no pointer events (Style.buttons.disabled), so the reason it's
  // disabled is shown from a wrapper around it, which does receive the hover.
  disabledWrap: {
    display: "inline-flex",
    cursor: "not-allowed",
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

interface OptionProps {
  label: string;
  icon: typeof TableIcon;
  selected: boolean;
  /** Given, the option is disabled and this is shown as its tooltip and read to screen readers. */
  disabledReason?: string;
  onSelect: () => void;
}

function Option({ label, icon: Icon, selected, disabledReason, onSelect }: OptionProps) {
  const disabled = disabledReason !== undefined;
  const wrapRef = useRef<HTMLSpanElement>(null);
  const reasonId = useId();
  const tooltip = useTooltip(wrapRef, disabledReason ?? "", "top");

  const button = (
    <Clickable
      aria-pressed={selected}
      aria-describedby={disabled ? reasonId : undefined}
      style={{ ...styles.option, ...(selected ? styles.optionSelected : undefined) }}
      hoverStyle={selected ? undefined : styles.optionHover}
      disabledStyle={Style.buttons.disabled}
      disabled={disabled}
      onClick={onSelect}
    >
      <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
      {label}
    </Clickable>
  );
  if (!disabled) return button;
  return (
    <span ref={wrapRef} style={styles.disabledWrap} {...tooltip.anchorProps}>
      {button}
      <span id={reasonId} style={Style.elements.visuallyHidden}>
        {disabledReason}
      </span>
      {tooltip.bubble}
    </span>
  );
}

export default function ViewSwitcher({ value, onChange, reviewUnavailableReason }: ViewSwitcherProps) {
  return (
    // A group of toggle buttons, not tabs: there are no tab panels or arrow-key moves, so the
    // tab pattern would promise what isn't there. Pressed state says which view is showing.
    <div role="group" aria-label="Results view" style={styles.group}>
      {OPTIONS.map(({ value: option, label, icon }) => (
        <Option
          key={option}
          label={label}
          icon={icon}
          selected={value === option}
          disabledReason={option === "review" ? reviewUnavailableReason : undefined}
          onSelect={() => onChange(option)}
        />
      ))}
    </div>
  );
}
