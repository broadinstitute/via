import * as React from 'react';
import colors from '../../libs/colors';
import { useMediaQuery } from '../../libs/hooks';

/**
 * DnaSpinner
 *
 * The favicon, with its double helix turning in 3D. At rest (first paint, and
 * whenever the user prefers reduced motion) it is drawn at the favicon's own
 * pose, so the static fallback is the favicon itself.
 *
 * The helix is modelled as two strands winding round a vertical axis, half a
 * turn tall, with base-pair rungs at fixed heights. Each frame advances the
 * turn and redraws: each strand is split wherever it passes from the front of
 * the axis to the back, rear stretches are dimmed and drawn first, and front
 * stretches get a halo in the background color so the strand behind shows a
 * gap where it passes underneath, just as the favicon's green strand does. The
 * whole helix is tilted to lean right.
 *
 * Frames are written straight to the SVG through refs, so spinning never
 * re-renders React. A turn is FRAMES_PER_TURN fixed poses, each computed the
 * first time it's shown and then reused, and every mounted spinner runs off
 * one shared animation-frame clock -- the results page shows three at once, and
 * they'd otherwise each recompute the same geometry every frame.
 *
 * Usage:
 *   <DnaSpinner />
 *   <DnaSpinner size={56} duration={2000} label="Interpreting variant" />
 */

// Geometry in the favicon's 37×38 viewBox.
const VIEW_W = 37;
const VIEW_H = 38;
const CENTER_X = 18.5;
const CENTER_Y = 19;
/** The favicon's strands run from y 8.5 to 29.5 — half a turn. */
const HALF_HEIGHT = 10.5;
const AMPLITUDE = 5.26;
const WAVE = Math.PI / (2 * HALF_HEIGHT);
const STROKE_WIDTH = 1.4;
/** Stroke width of the background-colored band under each front stretch. */
const HALO_WIDTH = 3.6;
const BACK_OPACITY = 0.7;
/** Rung heights as offsets from center: evenly spaced, with the outermost where the favicon's are. */
const RUNG_COUNT = 7;
const RUNG_REACH = 9.24;
const RUNG_OFFSETS = Array.from(
  { length: RUNG_COUNT },
  (_, i) => -RUNG_REACH + (2 * RUNG_REACH * i) / (RUNG_COUNT - 1),
);
/** Longest a half-rung gets; the favicon's are about this, well short of the strands. */
const RUNG_HALF = 2.1;
const TILT_DEGREES = 20;
const SAMPLE_STEP = 0.35;

const STRAND_COLORS = [colors.white, colors.brandGreen] as const;

export interface DnaSpinnerProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'width' | 'height' | 'children'> {
  /** Rendered width in px. Height follows the favicon's 37:38 aspect ratio. Default 48. */
  size?: number;
  /** Milliseconds per full turn of the helix. Default 2000. */
  duration?: number;
  /** Announced by screen readers. Default "Loading". */
  label?: string;
}

type Strand = 0 | 1;

const round = (n: number) => Number(n.toFixed(2));

/**
 * Strand 0 (white) is at +sin, strand 1 (green) at -sin. Depth is the matching
 * cosine: positive is toward the viewer. At phase 0 this reproduces the
 * favicon, with white in front at the crossing.
 */
const strandOffset = (strand: Strand, y: number, phase: number) =>
  (strand === 0 ? 1 : -1) * Math.sin(WAVE * (y - CENTER_Y) + phase);
const strandDepth = (strand: Strand, y: number, phase: number) =>
  (strand === 0 ? 1 : -1) * Math.cos(WAVE * (y - CENTER_Y) + phase);

interface Frame {
  back: [string, string];
  front: [string, string];
  rungs: { x1: number; x2: number; opacity: number }[][];
}

/** Splits one strand into stretches in front of and behind the axis. */
function strandPaths(strand: Strand, phase: number) {
  const paths = { front: '', back: '' };
  const steps = Math.ceil((2 * HALF_HEIGHT) / SAMPLE_STEP);
  let points: string[] = [];
  let inFront: boolean | null = null;
  for (let i = 0; i <= steps; i++) {
    const y = CENTER_Y - HALF_HEIGHT + (2 * HALF_HEIGHT * i) / steps;
    const point = `${round(CENTER_X + AMPLITUDE * strandOffset(strand, y, phase))} ${round(y)}`;
    const nowInFront = strandDepth(strand, y, phase) >= 0;
    if (inFront !== null && nowInFront !== inFront) {
      // Close the stretch on this point and start the next one from it, so they join.
      points.push(point);
      paths[inFront ? 'front' : 'back'] += `M${points.join('L')}`;
      points = [];
    }
    points.push(point);
    inFront = nowInFront;
  }
  paths[inFront ? 'front' : 'back'] += `M${points.join('L')}`;
  return paths;
}

function drawFrame(phase: number): Frame {
  const strands = [strandPaths(0, phase), strandPaths(1, phase)];
  return {
    back: [strands[0].back, strands[1].back],
    front: [strands[0].front, strands[1].front],
    // Each rung is two halves; as in the favicon, the half on a strand's side takes the other
    // strand's color. Rungs foreshorten as the strands swing in toward the axis, and fade out
    // rather than dwindling to a dot.
    rungs: RUNG_OFFSETS.map((offset) => {
      const y = CENTER_Y + offset;
      const whiteSide = Math.sign(strandOffset(0, y, phase)) || 1;
      const half = RUNG_HALF * Math.abs(strandOffset(0, y, phase));
      const opacity = round(Math.min(1, Math.max(0, (half - 0.7) / 0.7)));
      const whiteEnd = round(CENTER_X + whiteSide * half);
      const greenEnd = round(CENTER_X - whiteSide * half);
      // [white half, green half]: the white half points at the green strand, and vice versa.
      return [
        { x1: CENTER_X, x2: greenEnd, opacity },
        { x1: CENTER_X, x2: whiteEnd, opacity },
      ];
    }),
  };
}

/** One per display frame at 60fps and the default 2s turn; finer steps wouldn't show. */
const FRAMES_PER_TURN = 120;
const frameCache: Frame[] = [];
const frameAt = (index: number) =>
  (frameCache[index] ??= drawFrame((index / FRAMES_PER_TURN) * 2 * Math.PI));

const REST_FRAME = frameAt(0);

// The shared clock: one requestAnimationFrame loop, running only while a spinner is subscribed.
// Time is measured from when the loop started, so spinners mounted together turn in step.
type ClockSubscriber = (elapsed: number) => void;
const clockSubscribers = new Set<ClockSubscriber>();
let clockStart = 0;
let clockFrameId = 0;

function clockTick(now: number) {
  const elapsed = Math.max(0, now - clockStart);
  clockSubscribers.forEach((subscriber) => subscriber(elapsed));
  // A subscriber may have unsubscribed the last one during this tick.
  if (clockSubscribers.size > 0) clockFrameId = requestAnimationFrame(clockTick);
}

function subscribeToClock(subscriber: ClockSubscriber) {
  if (clockSubscribers.size === 0) {
    clockStart = performance.now();
    clockFrameId = requestAnimationFrame(clockTick);
  }
  clockSubscribers.add(subscriber);
  return () => {
    clockSubscribers.delete(subscriber);
    if (clockSubscribers.size === 0) cancelAnimationFrame(clockFrameId);
  };
}

export const DnaSpinner = React.forwardRef<SVGSVGElement, DnaSpinnerProps>(
  function DnaSpinner({ size = 48, duration = 2000, label = 'Loading', ...rest }, ref) {
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const helixRef = React.useRef<SVGGElement>(null);

    React.useEffect(() => {
      const helix = helixRef.current;
      if (!helix || reduceMotion) return;
      const part = (name: string) => [...helix.querySelectorAll<SVGElement>(`[data-part="${name}"]`)];
      const back = part('back');
      const halos = part('halo');
      const front = part('front');
      const rungHalves = part('rung');

      const apply = (frame: Frame) => {
        frame.back.forEach((d, i) => back[i].setAttribute('d', d));
        frame.front.forEach((d, i) => {
          halos[i].setAttribute('d', d);
          front[i].setAttribute('d', d);
        });
        frame.rungs.flat().forEach(({ x2, opacity }, i) => {
          rungHalves[i].setAttribute('x2', String(x2));
          rungHalves[i].setAttribute('stroke-opacity', String(opacity));
        });
      };

      // Skips the DOM writes on a tick that lands on the pose already shown, e.g. on a 120Hz display.
      let shown = 0;
      const unsubscribe = subscribeToClock((elapsed) => {
        const index = Math.floor(((elapsed / duration) % 1) * FRAMES_PER_TURN);
        if (index === shown) return;
        shown = index;
        apply(frameAt(index));
      });
      return () => {
        unsubscribe();
        // Settle back to the favicon pose rather than freezing mid-turn.
        apply(REST_FRAME);
      };
    }, [duration, reduceMotion]);

    const stroke = { strokeWidth: STROKE_WIDTH, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

    return (
      <svg
        ref={ref}
        role="status"
        aria-label={label}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width={size}
        height={(size * VIEW_H) / VIEW_W}
        xmlns="http://www.w3.org/2000/svg"
        {...rest}
      >
        <circle cx={CENTER_X} cy={CENTER_Y} r={17.5} fill={colors.brandNavy} />
        <circle cx={CENTER_X} cy={CENTER_Y} r={17.8} stroke={colors.white} {...stroke} />
        <g ref={helixRef} transform={`rotate(${TILT_DEGREES} ${CENTER_X} ${CENTER_Y})`}>
          {REST_FRAME.back.map((d, i) => (
            <path key={i} data-part="back" d={d} stroke={STRAND_COLORS[i]} strokeOpacity={BACK_OPACITY} {...stroke} />
          ))}
          {REST_FRAME.rungs.map((halves, r) =>
            halves.map(({ x1, x2, opacity }, i) => (
              <line
                key={`${r}-${i}`}
                data-part="rung"
                x1={x1}
                y1={CENTER_Y + RUNG_OFFSETS[r]}
                x2={x2}
                y2={CENTER_Y + RUNG_OFFSETS[r]}
                stroke={STRAND_COLORS[i]}
                strokeOpacity={opacity}
                {...stroke}
              />
            )),
          )}
          {REST_FRAME.front.map((d, i) => (
            <path
              key={i}
              data-part="halo"
              d={d}
              stroke={colors.brandNavy}
              {...stroke}
              strokeWidth={HALO_WIDTH}
              strokeLinecap="butt"
            />
          ))}
          {REST_FRAME.front.map((d, i) => (
            <path key={i} data-part="front" d={d} stroke={STRAND_COLORS[i]} {...stroke} />
          ))}
        </g>
      </svg>
    );
  },
);

export default DnaSpinner;
