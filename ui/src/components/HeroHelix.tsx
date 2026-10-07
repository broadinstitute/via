import type { CSSProperties } from "react";
import colors from "../libs/colors";

// A double helix drawn across the hero's right half, as on the marketing page: two strands a
// half-turn apart, joined by rungs, drifting down to the right. Decorative, faint enough to sit
// behind the title, and drawn once from these constants rather than shipped as an image.

const VIEW_W = 900;
const VIEW_H = 440;
const MID_Y = 210;
const AMPLITUDE = 95;
const WAVELENGTH = 420;
/** The helix leans down to the right by this much per unit of x. */
const DRIFT = 0.16;
const RUNG_SPACING = 22;

const strandY = (x: number, phase: number) => MID_Y + AMPLITUDE * Math.sin((x / WAVELENGTH) * 2 * Math.PI + phase) + x * DRIFT;

function strandPath(phase: number): string {
  let d = "";
  for (let x = 0; x <= VIEW_W; x += 6) d += `${x === 0 ? "M" : "L"}${x} ${strandY(x, phase).toFixed(1)}`;
  return d;
}

const STRANDS = [strandPath(0), strandPath(Math.PI)];
const RUNGS = Array.from({ length: Math.floor(VIEW_W / RUNG_SPACING) }, (_, i) => {
  const x = 12 + i * RUNG_SPACING;
  return { x, y1: strandY(x, 0), y2: strandY(x, Math.PI) };
});

const styles = {
  svg: {
    position: "absolute",
    top: -60,
    right: -120,
    width: "min(900px, 72vw)",
    height: "calc(100% + 120px)",
    opacity: 0.16,
    pointerEvents: "none",
  },
} as const satisfies Record<string, CSSProperties>;

/** The hero's background helix. Purely decorative; hidden from assistive technology. */
export default function HeroHelix() {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMaxYMid slice"
      style={styles.svg}
      aria-hidden="true"
      data-testid="hero-helix"
    >
      <g stroke={colors.white} strokeWidth={2.5}>
        {RUNGS.map(({ x, y1, y2 }) => (
          <line key={x} x1={x} y1={y1.toFixed(1)} x2={x} y2={y2.toFixed(1)} />
        ))}
      </g>
      <path d={STRANDS[0]} fill="none" stroke={colors.brandGreen} strokeWidth={7} strokeLinecap="round" />
      <path d={STRANDS[1]} fill="none" stroke={colors.white} strokeWidth={7} strokeLinecap="round" />
    </svg>
  );
}
