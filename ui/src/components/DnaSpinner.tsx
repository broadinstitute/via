import * as React from 'react';

/**
 * DnaSpinner
 *
 * A minimal double-helix loading indicator. Pure SVG + CSS keyframes — no
 * animation library, no JS timers, no re-renders while spinning.
 *
 * Each node orbits a circle in the Y/Z plane; the projection gives vertical
 * travel (translateY), and the depth component drives scale and opacity so the
 * strands read as passing in front of and behind one another. A fixed phase
 * offset per column makes one full turn across the width.
 *
 * Usage:
 *   <DnaSpinner />
 *   <DnaSpinner size={72} colors={['#35C4D7', '#F2647C']} />
 *   <DnaSpinner label="Interpreting variant" duration={2000} rungs={false} />
 */

const COLUMNS = 9;
const X_START = 8;
const X_STEP = 10;
const CENTER_Y = 24;
const AMPLITUDE = 15;
const NODE_RADIUS = 3.2;

const VIEW_W = X_START * 2 + X_STEP * (COLUMNS - 1); // 116
const VIEW_H = CENTER_Y * 2; // 48

const STYLES = `
.aou-dna-node,
.aou-dna-rung {
  animation-duration: var(--aou-dna-duration, 1500ms);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.aou-dna-node { animation-name: aou-dna-node; }
.aou-dna-rung { animation-name: aou-dna-rung; }

@keyframes aou-dna-node {
  0%     { transform: translateY(0px)       scale(1.34); opacity: 1;     }
  12.5%  { transform: translateY(10.61px)   scale(1.24); opacity: 0.919; }
  25%    { transform: translateY(15px)      scale(1);    opacity: 0.725; }
  37.5%  { transform: translateY(10.61px)   scale(0.76); opacity: 0.531; }
  50%    { transform: translateY(0px)       scale(0.66); opacity: 0.45;  }
  62.5%  { transform: translateY(-10.61px)  scale(0.76); opacity: 0.531; }
  75%    { transform: translateY(-15px)     scale(1);    opacity: 0.725; }
  87.5%  { transform: translateY(-10.61px)  scale(1.24); opacity: 0.919; }
  100%   { transform: translateY(0px)       scale(1.34); opacity: 1;     }
}

@keyframes aou-dna-rung {
  0%    { transform: scaleY(0);     opacity: 0;   }
  12.5% { transform: scaleY(0.707); opacity: 0.6; }
  25%   { transform: scaleY(1);     opacity: 1;   }
  37.5% { transform: scaleY(0.707); opacity: 0.6; }
  50%   { transform: scaleY(0);     opacity: 0;   }
  62.5% { transform: scaleY(0.707); opacity: 0.6; }
  75%   { transform: scaleY(1);     opacity: 1;   }
  87.5% { transform: scaleY(0.707); opacity: 0.6; }
  100%  { transform: scaleY(0);     opacity: 0;   }
}

@keyframes aou-dna-breathe {
  0%, 100% { opacity: 1;    }
  50%      { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  /* Pausing holds each element at its negative-delay offset, so the helix
     freezes into a static shape instead of collapsing to a flat line. */
  .aou-dna-node,
  .aou-dna-rung { animation-play-state: paused; }
  .aou-dna-group { animation: aou-dna-breathe 2.8s ease-in-out infinite; }
}
`;

export interface DnaSpinnerProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'width' | 'height' | 'children'> {
  /** Rendered width in px. Height follows the 116:48 aspect ratio. Default 116. */
  size?: number;
  /** Milliseconds per full turn of the helix. Default 1500. */
  duration?: number;
  /** Colors for the two strands. Defaults to `currentColor` for both. */
  colors?: [string, string];
  /** Show the base-pair rungs between strands. Default true. */
  rungs?: boolean;
  /** Announced by screen readers. Default "Loading". */
  label?: string;
}

/** Phase offset per column, as a fraction of one full turn. */
const phaseAt = (index: number) => index / (COLUMNS - 1);

const delay = (fraction: number) =>
  `calc(var(--aou-dna-duration, 1500ms) * ${-Number(fraction.toFixed(4))})`;

export const DnaSpinner = React.forwardRef<SVGSVGElement, DnaSpinnerProps>(
  function DnaSpinner(
    {
      size = 116,
      duration = 1500,
      colors = ['currentColor', 'currentColor'],
      rungs = true,
      label = 'Loading',
      style,
      ...rest
    },
    ref,
  ) {
    const columns = React.useMemo(
      () =>
        Array.from({ length: COLUMNS }, (_, i) => ({
          x: X_START + i * X_STEP,
          phase: phaseAt(i),
        })),
      [],
    );

    return (
      <svg
        ref={ref}
        role="status"
        aria-label={label}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width={size}
        height={(size * VIEW_H) / VIEW_W}
        xmlns="http://www.w3.org/2000/svg"
        style={{ '--aou-dna-duration': `${duration}ms`, ...style } as React.CSSProperties}
        {...rest}
      >
        <style>{STYLES}</style>
        <g className="aou-dna-group">
          {rungs &&
            columns.map(({ x, phase }) => (
              <g key={`rung-${x}`} transform={`translate(${x} ${CENTER_Y})`}>
                <line
                  className="aou-dna-rung"
                  x1={0}
                  y1={-AMPLITUDE}
                  x2={0}
                  y2={AMPLITUDE}
                  stroke={colors[0]}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                  strokeOpacity={0.3}
                  style={{ animationDelay: delay(phase) }}
                />
              </g>
            ))}

          {columns.map(({ x, phase }) => (
            <g key={`node-${x}`} transform={`translate(${x} ${CENTER_Y})`}>
              <circle
                className="aou-dna-node"
                r={NODE_RADIUS}
                fill={colors[0]}
                style={{ animationDelay: delay(phase) }}
              />
              <circle
                className="aou-dna-node"
                r={NODE_RADIUS}
                fill={colors[1]}
                style={{ animationDelay: delay(phase + 0.5) }}
              />
            </g>
          ))}
        </g>
      </svg>
    );
  },
);

export default DnaSpinner;
