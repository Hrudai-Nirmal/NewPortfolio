/** Smooth bind-space tailoring keeps the body, clothing and skeleton in the same proportions. */
import { Box3, Vector3 } from 'three';

function getSmoothBump(height: number, center: number, radius: number) {
  const offset = Math.abs((height - center) / radius);
  return offset >= 1 ? 0 : (1 - offset * offset) ** 3;
}

/** Preserve the source anatomical landmarks and waist volume, with only subtle upper-torso definition. */
export function reshapeHumanPoint(point: Vector3, bounds: Box3): Vector3 {
  const height = bounds.max.y - bounds.min.y;
  if (![point.x, point.y, point.z, ...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite) || height <= 0) throw new RangeError('Finite coordinates and nonempty body bounds are required.');
  const relativeHeight = (point.y - bounds.min.y) / height;
  const chest = getSmoothBump(relativeHeight, .72, .13);
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerZ = (bounds.min.z + bounds.max.z) / 2;
  point.x = centerX + (point.x - centerX) * (1 + .02 * chest);
  point.z = centerZ + (point.z - centerZ) * (1 + .01 * chest);
  // Keep the authored ribcage/pelvis spacing; raising this region also lengthened the legs and pinched the torso.
  return point;
}

/** Reduce foot dimensions by ten percent, anchoring the sole and blending smoothly above the ankle. */
export function resizeHumanFoot(point: Vector3, ankle: Vector3, floorHeight: number): Vector3 {
  if (![...point.toArray(), ...ankle.toArray(), floorHeight].every(Number.isFinite) || ankle.y <= floorHeight) throw new RangeError('A finite ankle above the floor is required.');
  const ankleHeight = ankle.y - floorHeight;
  const transition = Math.min(1, Math.max(0, (point.y - ankle.y) / (ankleHeight * .6)));
  const influence = 1 - transition * transition * (3 - 2 * transition);
  const scale = 1 - .1 * influence;
  point.x = ankle.x + (point.x - ankle.x) * scale;
  point.z = ankle.z + (point.z - ankle.z) * scale;
  point.y = floorHeight + (point.y - floorHeight) * scale;
  return point;
}
