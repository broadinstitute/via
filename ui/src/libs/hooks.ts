// State hooks standing in for the CSS features an inline style object can't express.

import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** Tracks ":hover" as state, so a hovered style can be merged over the base one. */
export function useHover() {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    hoverProps: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}

/**
 * useHover for a list, where a hook per item isn't possible: table rows, footer links.
 *
 * Only one item can be hovered at a time, so one piece of state holds whichever key that is.
 */
export function useHoveredKey<K>() {
  const [hoveredKey, setHoveredKey] = useState<K | null>(null);
  return {
    hoveredKey,
    hoverProps: (key: K) => ({
      onMouseEnter: () => setHoveredKey(key),
      // Guarded against a leave firing after the pointer has already entered the next item,
      // which would otherwise clear that one's hover.
      onMouseLeave: () => setHoveredKey((current) => (current === key ? null : current)),
    }),
  };
}

/** Tracks ":focus" as state, for fields that change border/background while focused. */
export function useFocus() {
  const [focused, setFocused] = useState(false);
  return {
    focused,
    focusProps: {
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}

/** Watches a "@media" breakpoint, for layouts that have to restructure rather than just restyle. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    // Re-read on subscribe as well as on change: the viewport may have crossed the breakpoint
    // between the initial render and this effect.
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

/**
 * Whether a scroll container has content hidden below its bottom edge, for a "more below" cue.
 *
 * Re-checked on scroll and whenever the container or its content resizes, so expanding a row,
 * re-sorting or a layout change all keep it current.
 */
export function useHasMoreBelow(ref: RefObject<HTMLElement | null>): boolean {
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // 1px of slack: scrollTop can be fractional on zoomed or high-DPI displays, which would
    // otherwise leave the cue showing at the very bottom.
    const update = () =>
      setHasMoreBelow(element.scrollTop + element.clientHeight < element.scrollHeight - 1);

    update();
    element.addEventListener("scroll", update, { passive: true });
    // Guarded: jsdom doesn't implement ResizeObserver.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    for (const child of Array.from(element.children)) observer?.observe(child);
    return () => {
      element.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [ref]);

  return hasMoreBelow;
}
