import type { CSSProperties } from "react";
import colors, { alpha } from "../libs/colors";

const styles = {
  hero: {
    position: "relative",
    // Bottom padding is what the search card overlaps; see SearchEntryPage.
    padding: "52px 20px 112px",
    overflow: "hidden",
    // Brand navy with a blue glow top-right and a teal one bottom-left. Dark enough throughout for
    // white text without a scrim or text shadows.
    backgroundImage: [
      `radial-gradient(ellipse 50% 110% at 92% 0%, ${alpha(colors.textAccent, 0.9)}, ${alpha(colors.textAccent, 0)} 72%)`,
      `radial-gradient(ellipse 45% 110% at 5% 100%, ${alpha(colors.heroGlowTeal, 0.75)}, ${alpha(colors.heroGlowTeal, 0)} 72%)`,
      `linear-gradient(180deg, ${colors.heroDeep} 0%, ${colors.textPrimary} 100%)`,
    ].join(", "),
  },
  // Narrower than the hero, so the copy stays centered on wide viewports.
  inner: {
    position: "relative",
    maxWidth: 760,
    margin: "0 auto",
    textAlign: "center",
  },
  title: {
    marginBottom: 10,
    color: colors.white,
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: -0.4,
  },
  subtitle: {
    maxWidth: 500,
    margin: "0 auto",
    color: alpha(colors.white, 0.85),
    fontSize: 15,
    lineHeight: 1.6,
  },
} as const satisfies Record<string, CSSProperties>;

interface HeroProps {
  title: string;
  subtitle: string;
}

export default function Hero({ title, subtitle }: HeroProps) {
  return (
    <div style={styles.hero}>
      <div style={styles.inner}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.subtitle}>{subtitle}</p>
      </div>
    </div>
  );
}
