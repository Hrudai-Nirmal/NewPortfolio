/** Deterministic surface sampling keeps particle identity stable across the two story forms. */
type Point = readonly [number, number, number];
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleEllipsoid(center: Point, radius: Point, random: () => number): Point {
  const azimuth = random() * Math.PI * 2;
  const vertical = random() * 2 - 1;
  const ring = Math.sqrt(1 - vertical * vertical);
  return [center[0] + radius[0] * ring * Math.cos(azimuth), center[1] + radius[1] * vertical, center[2] + radius[2] * ring * Math.sin(azimuth)];
}

function sampleTriangle(first: Point, second: Point, third: Point, random: () => number): Point {
  const along = Math.sqrt(random());
  const across = random();
  return first.map((value, axis) => value * (1 - along) + second[axis] * along * (1 - across) + third[axis] * along * across) as unknown as Point;
}

function sampleAircraft(random: () => number): Point {
  const region = random();
  const side = random() > .5 ? 1 : -1;
  if (region < .4) {
    const length = random() * 3.8 - 1.9;
    const taper = Math.pow(Math.max(0, 1 - (length / 1.9) ** 2), .65);
    const angle = random() * Math.PI * 2;
    return [.16 * taper * Math.cos(angle), .15 * taper * Math.sin(angle), length];
  }
  if (region < .78) {
    return sampleTriangle([side * .10, 0, .65], [side * 2.1, .045, -.85], [side * .12, -.025, -.60], random);
  }
  if (region < .9) {
    return sampleTriangle([side * .06, .04, -1.25], [side * .85, .06, -1.85], [side * .1, .03, -1.83], random);
  }
  if (region < .95) {
    return sampleTriangle([0, .08, -1.2], [0, .72, -1.8], [0, .05, -1.89], random);
  }
  return sampleEllipsoid([side * .65, -.17, -.1], [.12, .12, .38], random);
}

function orientAircraft(point: Point, aircraftIndex: number): Point {
  const pitch = .62;
  const yaw = -.65;
  const bank = -.24;
  const pitchedY = point[1] * Math.cos(pitch) - point[2] * Math.sin(pitch);
  const pitchedZ = point[1] * Math.sin(pitch) + point[2] * Math.cos(pitch);
  const yawedX = point[0] * Math.cos(yaw) + pitchedZ * Math.sin(yaw);
  const yawedZ = -point[0] * Math.sin(yaw) + pitchedZ * Math.cos(yaw);
  const scale = aircraftIndex === 0 ? .93 : .42;
  const offset: Point = aircraftIndex === 0 ? [0, -.10, 0] : aircraftIndex === 1 ? [-1.55, 1.12, -1] : [1.45, -1.15, -1.4];
  return [
    (yawedX * Math.cos(bank) - pitchedY * Math.sin(bank)) * scale + offset[0],
    (yawedX * Math.sin(bank) + pitchedY * Math.cos(bank)) * scale + offset[1],
    yawedZ * scale + offset[2],
  ];
}

/** Generate deterministic aircraft and transition targets for persistent particle identities. */
export function createParticleModel(count: number, seed = 71) {
  if (!Number.isInteger(count) || count < 1 || count > 200000) throw new RangeError('Particle count must be an integer between 1 and 200000.');
  if (!Number.isFinite(seed)) throw new TypeError('Seed must be finite.');
  const random = createRandom(seed);
  const airplane = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    // More particles go to the foreground aircraft, keeping the two distant forms airy.
    const aircraftIndex = index < count * .62 ? 0 : index < count * .81 ? 1 : 2;
    airplane.set(orientAircraft(sampleAircraft(random), aircraftIndex), index * 3);
    scatter.set([(random() - .5) * 5.2, (random() - .5) * 3.4, (random() - .5) * 4], index * 3);
    seeds[index] = random();
  }
  return { airplane, scatter, seeds };
}

/** Map scroll to a reversible morph with breathing room at both chapter endpoints. */
export function getStoryState(scrollProgress: number, isReducedMotion = false) {
  if (!Number.isFinite(scrollProgress)) throw new TypeError('Scroll progress must be finite.');
  const progress = Math.min(1, Math.max(0, scrollProgress));
  const linearMorph = Math.min(1, Math.max(0, (progress - .2) / .6));
  const morph = isReducedMotion ? Number(progress >= .5) : linearMorph * linearMorph * (3 - 2 * linearMorph);
  return { progress, morph, chapter: progress < .5 ? 0 : 1 };
}

/** Freeze ambient animation on request, and cap time jumps after a background tab resumes. */
export function getMotionTime(currentTime: number, delta: number, isPaused: boolean, isReducedMotion: boolean) {
  if (![currentTime, delta].every(Number.isFinite) || delta < 0) throw new RangeError('Motion times must be finite and delta nonnegative.');
  return isPaused || isReducedMotion ? currentTime : currentTime + Math.min(delta, .05);
}

/** Fit the tall human and wider aircraft between the mobile story copy and navigation. */
export function getParticleScale(width: number, height: number, morph: number) {
  if (![width, height, morph].every(Number.isFinite) || width <= 0 || height <= 0) throw new RangeError('Viewport dimensions must be positive and finite.');
  if (width >= 700) return Math.min(.94, width / height * .86);
  const humanScale = Math.min(.80, width / height * 1.33, Math.max(.3, (height - 450) / (height * .68)));
  return humanScale * (1 - Math.min(1, Math.max(0, morph)) * .25);
}
