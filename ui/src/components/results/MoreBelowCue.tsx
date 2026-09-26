import type { CSSProperties, RefObject } from "react";
import colors, { alpha } from "../../libs/colors";
import { useHasMoreBelow } from "../../libs/hooks";
import * as Style from "../../libs/style";
import Clickable from "../common/Clickable";
import { ChevronDownIcon } from "../icons";

const styles = {
  // Sit above the tables' sticky header cells (zIndex 1-2) so a short panel can't cover them.
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    background: `linear-gradient(${alpha(colors.surface2, 0)}, ${colors.surface2})`,
    pointerEvents: "none",
    zIndex: 3,
  },
  button: {
    position: "absolute",
    left: "50%",
    bottom: 12,
    transform: "translateX(-50%)",
    zIndex: 3,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px 4px 12px",
    border: `1px solid ${colors.border}`,
    borderRadius: 999,
    background: colors.surface2,
    boxShadow: Style.shadows.pill,
    color: colors.textAccent,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonHover: {
    background: colors.bgAccent,
  },
} as const satisfies Record<string, CSSProperties>;

interface MoreBelowCueProps {
  /** The scroll container to watch and scroll. */
  scrollRef: RefObject<HTMLElement | null>;
}

/**
 * A fade over a scroll container's bottom edge and a "More below" pill, shown only while there
 * are rows out of sight below. Render it as a sibling of the scroll container, inside a
 * position: relative wrapper that the container fills.
 */
export default function MoreBelowCue({ scrollRef }: MoreBelowCueProps) {
  const hasMoreBelow = useHasMoreBelow(scrollRef);

  if (!hasMoreBelow) return null;

  function scrollDown() {
    const scroller = scrollRef.current;
    // Most of a screenful, so the last visible rows stay in view for context.
    scroller?.scrollBy({ top: scroller.clientHeight * 0.8, behavior: "smooth" });
  }

  return (
    <>
      <div style={styles.fade} aria-hidden="true" />
      <Clickable style={styles.button} hoverStyle={styles.buttonHover} onClick={scrollDown}>
        More below
        <ChevronDownIcon size={12} strokeWidth={2.5} aria-hidden="true" />
      </Clickable>
    </>
  );
}
