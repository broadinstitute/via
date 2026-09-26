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
 * Whether a scroll container has content hidden below its bottom edge, and how many of its rows
 * are out of sight there, for a "more below" cue. `rowSelector` picks out what counts as a row
 * within the container -- a table's data rows, say, and not a row's expanded detail.
 *
 * A row counts as below once more than half of it is past the bottom edge. Re-checked on scroll,
 * whenever the container or its content resizes, and when rows are added or removed, so
 * expanding a row, re-sorting or a new set of results all keep it current.
 */
export function useMoreBelow(
  ref: RefObject<HTMLElement | null>,
  rowSelector: string,
): { hasMoreBelow: boolean; rowsBelow: number } {
  const [state, setState] = useState({ hasMoreBelow: false, rowsBelow: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      // 1px of slack: scrollTop can be fractional on zoomed or high-DPI displays, which would
      // otherwise leave the cue showing at the very bottom.
      const hasMoreBelow = element.scrollTop + element.clientHeight < element.scrollHeight - 1;
      // clientTop/clientHeight rather than the rect's bottom, which would include a horizontal
      // scrollbar that no row can be seen through.
      const visibleBottom = element.getBoundingClientRect().top + element.clientTop + element.clientHeight;
      let rowsBelow = 0;
      if (hasMoreBelow) {
        for (const row of element.querySelectorAll(rowSelector)) {
          const rect = row.getBoundingClientRect();
          if (rect.top + rect.height / 2 > visibleBottom) rowsBelow++;
        }
      }
      // Bail out of the re-render when nothing changed, since this runs on every scroll event.
      setState((current) =>
        current.hasMoreBelow === hasMoreBelow && current.rowsBelow === rowsBelow
          ? current
          : { hasMoreBelow, rowsBelow },
      );
    };

    update();
    element.addEventListener("scroll", update, { passive: true });
    // Guarded: jsdom doesn't implement ResizeObserver.
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resizeObserver?.observe(element);
    for (const child of Array.from(element.children)) resizeObserver?.observe(child);
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(element, { childList: true, subtree: true });
    return () => {
      element.removeEventListener("scroll", update);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref, rowSelector]);

  return state;
}
