import type { CSSProperties } from "react";
import colors from "../libs/colors";

// VIA's mark as a watermark: the lens from the favicon without its tile, large and faint in the
// hero's top-right corner, cropped by the hero's edges. The one place the mark appears at scale;
// the hero's overflow: hidden does the cropping. Decorative, so hidden from assistive technology.

const styles = {
  svg: {
    position: "absolute",
    top: -30,
    right: -40,
    width: 300,
    height: 300,
    opacity: 0.1,
    pointerEvents: "none",
  },
} as const satisfies Record<string, CSSProperties>;

export default function HeroWatermark() {
  return (
    // The same geometry as public/favicon.svg, cropped to the lens: 44 units square from (10, 10).
    <svg viewBox="10 10 44 44" style={styles.svg} aria-hidden="true" data-testid="hero-watermark">
      <line x1="20" y1="21" x2="34" y2="21" stroke={colors.white} strokeWidth={2.4} strokeLinecap="round" />
      <line x1="18" y1="27" x2="36" y2="27" stroke={colors.brandGreen} strokeWidth={3.8} strokeLinecap="round" />
      <line x1="20" y1="33" x2="34" y2="33" stroke={colors.white} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx="27" cy="27" r="14" fill="none" stroke={colors.white} strokeWidth={4} />
      <line x1="37.5" y1="37.5" x2="50" y2="50" stroke={colors.white} strokeWidth={5.5} strokeLinecap="round" />
    </svg>
  );
}
