/** Screen-space hover stays aligned with the cursor across camera depth, morphing, and responsive framing. */
export type HoverState = { horizontal: number; vertical: number; strength: number };
type CanvasBounds = { left: number; top: number; width: number; height: number };
export const HOVER_RADIUS = 110;
export const HOVER_DISPLACEMENT = 34;

/** Map a hover-capable pointer into canvas NDC; touch and out-of-bounds input release the field. */
export function getHoverTarget(clientX: number, clientY: number, bounds: CanvasBounds, pointerType: string): HoverState {
  if (![clientX, clientY, bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) throw new RangeError('Finite pointer coordinates and nonempty canvas bounds are required.');
  const horizontal = (clientX - bounds.left) / bounds.width * 2 - 1;
  const vertical = 1 - (clientY - bounds.top) / bounds.height * 2;
  const isInside = Math.abs(horizontal) <= 1 && Math.abs(vertical) <= 1;
  return { horizontal, vertical, strength: isInside && (pointerType === 'mouse' || pointerType === 'pen') ? 1 : 0 };
}

/** Apply time-based easing, freezing interaction with pause and disabling it for reduced motion. */
export function advanceHoverState(current: HoverState, target: HoverState, deltaSeconds: number, isPaused: boolean, isReducedMotion: boolean): HoverState {
  if (![...Object.values(current), ...Object.values(target), deltaSeconds].every(Number.isFinite) || deltaSeconds < 0) throw new RangeError('Hover state and elapsed time must be finite.');
  if (isReducedMotion) return { ...current, strength: 0 };
  if (isPaused) return current;
  const blend = 1 - Math.exp(-deltaSeconds * 14);
  return {
    horizontal: current.horizontal + (target.horizontal - current.horizontal) * blend,
    vertical: current.vertical + (target.vertical - current.vertical) * blend,
    strength: current.strength + (target.strength - current.strength) * blend,
  };
}
