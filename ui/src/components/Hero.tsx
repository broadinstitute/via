import type { CSSProperties, ReactNode } from "react";
import colors, { alpha } from "../libs/colors";
import HeroWatermark from "./HeroWatermark";

// A band under the top bar that names the app and says in a line what it does, in the brand's
// navy with the mark as a watermark. Short on purpose: the search form is what the page is for,
// and it starts right beneath.
const styles = {
  hero: {
    position: "relative",
    padding: "22px 20px 24px",
    overflow: "hidden",
    // The favicon's navy, deepening upward, with a blue glow top-right and a teal one bottom-left.
    // Dark enough throughout for white text without a scrim or text shadows.
    backgroundImage: [
      `radial-gradient(ellipse 50% 110% at 92% 0%, ${alpha(colors.heroGlowBlue, 0.9)}, ${alpha(colors.heroGlowBlue, 0)} 72%)`,
      `radial-gradient(ellipse 45% 110% at 5% 100%, ${alpha(colors.heroGlowTeal, 0.75)}, ${alpha(colors.heroGlowTeal, 0)} 72%)`,
      `linear-gradient(180deg, ${colors.heroDeep} 0%, ${colors.textPrimary} 100%)`,
    ].join(", "),
  },
  // The same width as the search card beneath, so the title and the card share a left edge.
  inner: {
    position: "relative",
    maxWidth: 860,
    margin: "0 auto",
  },
  title: {
    margin: "0 0 4px",
    color: colors.white,
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: -0.3,
    lineHeight: 1.2,
  },
  subtitle: {
    margin: 0,
    color: alpha(colors.white, 0.85),
    fontSize: 13.5,
    lineHeight: 1.5,
  },
} as const satisfies Record<string, CSSProperties>;

interface HeroProps {
  title: ReactNode;
  subtitle: ReactNode;
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <div style={styles.hero}>
      <HeroWatermark />
      <div style={styles.inner}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>
    </div>
  );
}
