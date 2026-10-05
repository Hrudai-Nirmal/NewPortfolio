/** Subtle footfall rings share the exact walk clock, including pause and looping. */
export type FootContact = { phase: number; position: number[] };

/** Compute a short expanding ring at a measured foot contact; suppress it during morph and reduced motion. */
export function getFootstepRipple(time: number, duration: number, contact: FootContact, morph: number, isReducedMotion: boolean) {
  if (![time, duration, contact.phase, morph, ...contact.position].every(Number.isFinite) || time < 0 || duration <= 0 || contact.phase < 0 || contact.phase >= 1 || contact.position.length !== 3) throw new RangeError('Valid walk timing and a three-dimensional foot contact are required.');
  const age = ((time / duration - contact.phase) % 1 + 1) % 1 * duration;
  const progress = Math.min(1, age / .52);
  const visibility = isReducedMotion ? 0 : Math.max(0, 1 - morph / .35);
  return { radius: .08 + progress * .42, opacity: .18 * (1 - progress) ** 2 * visibility };
}
