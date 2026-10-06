// State hooks standing in for the CSS features an inline style object can't express.

import { useEffect, useState } from "react";

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
