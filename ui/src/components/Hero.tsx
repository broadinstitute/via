import type { CSSProperties } from "react";
import colors, { alpha } from "../libs/colors";

const styles = {
  hero: {
    position: "relative",
    padding: "48px 20px 90px",
    overflow: "hidden",
    backgroundImage: `linear-gradient(180deg, ${alpha(colors.heroScrim, 0.45)} 0%, ${alpha(
      colors.heroScrim,
      0.55,
    )} 100%), url("/hero-background.png")`,
    backgroundSize: "cover",
    backgroundPosition: "top center",
  },
  // Sits above the scrim, and narrower than it, so the copy stays centered on wide viewports.
  inner: {
    position: "relative",
    zIndex: 2,
    maxWidth: 760,
    margin: "0 auto",
    textAlign: "center",
  },
  title: {
    marginBottom: 10,
    color: colors.white,
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: -0.3,
    textShadow: `0 2px 12px ${alpha(colors.black, 0.25)}`,
  },
  subtitle: {
    maxWidth: 460,
    margin: "0 auto",
    color: alpha(colors.white, 0.92),
    fontSize: 13.5,
    lineHeight: 1.6,
    textShadow: `0 1px 8px ${alpha(colors.black, 0.2)}`,
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
