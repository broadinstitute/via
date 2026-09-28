import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import colors from "../../libs/colors";
import * as Style from "../../libs/style";
import { InfoIcon } from "../icons";

/** Long enough that sweeping the pointer across a header row doesn't flash every tooltip. */
const SHOW_DELAY_MS = 120;
/** Between the icon and the tooltip, where the arrow sits. */
const GAP = 8;
/** Closest the tooltip comes to the window's edges. */
const EDGE = 8;
const ARROW_SIZE = 8;

const styles = {
  icon: {
    ...Style.elements.tooltipIcon,
    position: "relative",
  },
  // Fixed and portalled into <body>: the tables scroll inside overflow containers that would
  // clip anything positioned within them, header tooltips included.
  tooltip: {
    position: "fixed",
    zIndex: 200,
    maxWidth: 260,
    padding: "8px 10px",
    borderRadius: 6,
    background: colors.textPrimary,
    boxShadow: Style.shadows.raised,
    color: colors.white,
    fontSize: 11.5,
    fontWeight: 400,
    lineHeight: 1.45,
    textAlign: "left",
    // Honours line breaks in the text ("\n", or "\n\n" for a gap between paragraphs), while
    // still wrapping long lines to the max width.
    whiteSpace: "pre-line",
    // Hover text is only ever read, and letting the pointer land on it would count as leaving
    // the icon anyway.
    pointerEvents: "none",
  },
  arrow: {
    position: "absolute",
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    background: colors.textPrimary,
    transform: "rotate(45deg)",
  },
} as const satisfies Record<string, CSSProperties>;

interface Position {
  top: number;
  left: number;
  /** The arrow's offset from the tooltip's left edge, so it points at the icon even when the
   * tooltip has been pushed in from a window edge. */
  arrowLeft: number;
  placement: "above" | "below";
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Whether the browser would draw a focus ring here: keyboard focus, not a click. Inline styles
 * can't use :focus-visible, so it's asked of the element instead. Browsers too old to know the
 * selector throw, and get the ring on every focus.
 */
function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

interface InfoTooltipProps {
  /**
   * The explanation, shown on hover or focus and announced as the icon's description. Line
   * breaks are kept, so "\n\n" separates paragraphs -- pass it as a JS string (text={"..."}),
   * since a plain JSX attribute string doesn't turn \n into a newline.
   */
  text: ReactNode;
  /** Merged over the icon button's own style, e.g. InfoLabel's alignment margins. */
  style?: CSSProperties;
}

/**
 * A circled "i" that explains the thing beside it, e.g. a column header, in a styled tooltip
 * rather than the browser's native title text.
 *
 * Shows on hover (after a short delay), keyboard focus or a tap, above the icon unless there's
 * no room, and kept inside the window. Hides on leaving, blur, Escape or any scroll, since a
 * fixed tooltip would otherwise stay behind while its icon scrolls away. Clicks on it don't
 * reach the header underneath, so it never sorts the column.
 */
export default function InfoTooltip({ text, style }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number | undefined>(undefined);
  const descriptionId = useId();

  function show(delay: number) {
    window.clearTimeout(showTimer.current);
    showTimer.current = window.setTimeout(() => setOpen(true), delay);
  }

  function hide() {
    window.clearTimeout(showTimer.current);
    setOpen(false);
    setPosition(null);
  }

  useEffect(() => () => window.clearTimeout(showTimer.current), []);

  // Measured once it's rendered (hidden) at its natural size, then placed before it paints.
  useLayoutEffect(() => {
    if (!open || !iconRef.current || !tooltipRef.current) return;
    const icon = iconRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const iconCentre = icon.left + icon.width / 2;
    const left = clamp(iconCentre - tooltip.width / 2, EDGE, window.innerWidth - tooltip.width - EDGE);
    const topIfAbove = icon.top - GAP - tooltip.height;
    const placement = topIfAbove >= EDGE ? "above" : "below";
    setPosition({
      top: placement === "above" ? topIfAbove : icon.bottom + GAP,
      left,
      arrowLeft: clamp(iconCentre - left - ARROW_SIZE / 2, 10, tooltip.width - 10 - ARROW_SIZE),
      placement,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    // Capture, so a scroll inside a table's own scroll container counts too.
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        style={{
          ...styles.icon,
          ...style,
          ...(hovered || open ? Style.elements.tooltipIconActive : undefined),
          ...(keyboardFocused ? Style.elements.tooltipIconFocusRing : undefined),
        }}
        aria-label="More information"
        aria-describedby={descriptionId}
        onMouseEnter={() => {
          setHovered(true);
          show(SHOW_DELAY_MS);
        }}
        onMouseLeave={() => {
          setHovered(false);
          hide();
        }}
        onFocus={(event) => {
          setKeyboardFocused(isFocusVisible(event.currentTarget));
          show(0);
        }}
        onBlur={() => {
          setKeyboardFocused(false);
          hide();
        }}
        onClick={(event) => {
          // A header underneath would otherwise sort on this click.
          event.stopPropagation();
          show(0);
        }}
      >
        <InfoIcon size={15} aria-hidden="true" />
        {/* Always present, so screen readers get the explanation without hovering. */}
        <span id={descriptionId} style={Style.elements.visuallyHidden}>
          {text}
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            // The visible copy of the description above, so hidden from screen readers.
            aria-hidden="true"
            data-testid="infoTooltip"
            className={position ? "animate-tooltip-in" : undefined}
            style={{
              ...styles.tooltip,
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? "visible" : "hidden",
            }}
          >
            {text}
            {position && (
              <span
                style={{
                  ...styles.arrow,
                  left: position.arrowLeft,
                  ...(position.placement === "above" ? { bottom: -ARROW_SIZE / 2 } : { top: -ARROW_SIZE / 2 }),
                }}
              />
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
