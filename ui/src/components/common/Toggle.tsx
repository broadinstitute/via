import { useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties } from "react";
import colors, { alpha } from "../../libs/colors";

const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 20;
const KNOB = 14;
const KNOB_INSET = (TRACK_HEIGHT - KNOB) / 2;

const styles = {
  track: {
    position: "relative",
    flexShrink: 0,
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    padding: 0,
    border: "none",
    borderRadius: 999,
    background: colors.borderStrong,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  trackOn: {
    background: colors.textAccent,
  },
  trackFocused: {
    outline: "none",
    boxShadow: `0 0 0 3px ${alpha(colors.textAccent, 0.3)}`,
  },
  knob: {
    position: "absolute",
    top: KNOB_INSET,
    left: KNOB_INSET,
    width: KNOB,
    height: KNOB,
    borderRadius: "50%",
    background: colors.white,
    boxShadow: `0 1px 2px ${alpha(colors.black, 0.25)}`,
  },
  knobOn: {
    transform: `translateX(${TRACK_WIDTH - KNOB - 2 * KNOB_INSET}px)`,
  },
} as const satisfies Record<string, CSSProperties>;

interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "style" | "role"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** An on/off switch: a <button role="switch">, so it reads as one to assistive tech. */
export default function Toggle({ checked, onChange, onFocus, onBlur, ...props }: ToggleProps) {
  // Only a keyboard focus draws the ring; a click's focus would flash it on every toggle.
  const [focusVisible, setFocusVisible] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      style={{
        ...styles.track,
        ...(checked ? styles.trackOn : undefined),
        ...(focusVisible ? styles.trackFocused : undefined),
      }}
      onClick={() => onChange(!checked)}
      onFocus={(event) => {
        setFocusVisible(event.currentTarget.matches(":focus-visible"));
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocusVisible(false);
        onBlur?.(event);
      }}
      {...props}
    >
      <span className="transition-transform" style={{ ...styles.knob, ...(checked ? styles.knobOn : undefined) }} />
    </button>
  );
}
