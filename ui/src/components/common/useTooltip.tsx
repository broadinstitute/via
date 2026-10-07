import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import colors from "../../libs/colors";
import { isFocusVisible } from "../../libs/hooks";
import * as Style from "../../libs/style";

// The app's one tooltip: a dark bubble with an arrow, fixed and portalled into <body> so the
// scroll containers it's used in can't clip it. InfoTooltip puts it on its circled "i"; other
// elements -- a breakdown token, say -- attach it through this hook. Spreading `anchorProps` is
// the whole wiring: hover, keyboard focus and click all show it, so no anchor can forget one.

/** Long enough that sweeping the pointer across a row of anchors doesn't flash every tooltip. */
const SHOW_DELAY_MS = 120;
/** Between the anchor and the tooltip, where the arrow sits. */
const GAP = 8;
/** Closest the tooltip comes to the window's edges. */
const EDGE = 8;
const ARROW_SIZE = 8;

const styles = {
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
    letterSpacing: "normal",
    // Honours line breaks in the text ("\\n", or "\\n\\n" for a gap between paragraphs), while
    // still wrapping long lines to the max width.
    whiteSpace: "pre-line",
    // Hover text is only ever read, and letting the pointer land on it would count as leaving
    // the anchor anyway.
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
  /** The arrow's offset from the tooltip's left edge, so it points at the anchor even when the
   * tooltip has been pushed in from a window edge. */
  arrowLeft: number;
  placement: "above" | "below";
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export interface TooltipAnchorProps {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
  onClick: () => void;
}

export interface TooltipHandle {
  /** Whether the bubble is showing. */
  open: boolean;
  /** Whether the pointer is over the anchor, for an anchor that changes colour while it is. */
  hovered: boolean;
  /** Whether the anchor has keyboard focus (not a click), for drawing a focus ring. */
  keyboardFocused: boolean;
  /** Show after the hover delay (or at once with 0). */
  show: (delay?: number) => void;
  hide: () => void;
  /**
   * Spread onto the anchor: shows on hover (after the delay), on focus and on click. Hides once
   * nothing keeps it open: the pointer leaving hides it unless the anchor has keyboard focus, and
   * blur hides it unless the pointer is still over it. (Focus from a mouse click doesn't pin it,
   * so clicking an icon and moving away still closes it.) An anchor with handlers of its own lays
   * them over these with composeHandlers, or overrides one by setting it after the spread.
   */
  anchorProps: TooltipAnchorProps;
  /** Render this once, anywhere in the anchor's tree; it portals itself to <body>. */
  bubble: ReactNode;
}

/**
 * The tooltip's behaviour, for an anchor the caller renders and refs. Shows above the anchor
 * unless there's no room, kept inside the window; hides on Escape or any scroll, since a fixed
 * tooltip would otherwise stay behind while its anchor scrolls away.
 */
export function useTooltip(anchorRef: RefObject<HTMLElement | null>, text: ReactNode): TooltipHandle {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<number | undefined>(undefined);

  function show(delay = SHOW_DELAY_MS) {
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
    if (!open || !anchorRef.current || !tooltipRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const anchorCentre = anchor.left + anchor.width / 2;
    const left = clamp(anchorCentre - tooltip.width / 2, EDGE, window.innerWidth - tooltip.width - EDGE);
    const topIfAbove = anchor.top - GAP - tooltip.height;
    const placement = topIfAbove >= EDGE ? "above" : "below";
    setPosition({
      top: placement === "above" ? topIfAbove : anchor.bottom + GAP,
      left,
      arrowLeft: clamp(anchorCentre - left - ARROW_SIZE / 2, 10, tooltip.width - 10 - ARROW_SIZE),
      placement,
    });
  }, [open, anchorRef]);

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

  const bubble =
    open &&
    createPortal(
      <div
        ref={tooltipRef}
        // The caller exposes the text to assistive tech through the anchor; this is the visible copy.
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
    );

  return {
    open,
    hovered,
    keyboardFocused,
    show,
    hide,
    anchorProps: {
      onMouseEnter: () => {
        setHovered(true);
        show();
      },
      onMouseLeave: () => {
        setHovered(false);
        // A keyboard user who has tabbed to the anchor keeps the tooltip while the pointer wanders.
        if (!keyboardFocused) hide();
      },
      onFocus: (event) => {
        setKeyboardFocused(isFocusVisible(event.currentTarget));
        show(0);
      },
      onBlur: () => {
        setKeyboardFocused(false);
        if (!hovered) hide();
      },
      onClick: () => show(0),
    },
    bubble,
  };
}
