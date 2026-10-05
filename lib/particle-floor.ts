/** A compact, evenly sampled ground disk and a shared-clock foot pose keep contact effects local. */
/** Generate a circular floor with stable particle identities and uniform area density. */
export function createFloorParticles(count: number, radius: number, floorHeight: number) {
  if (!Number.isInteger(count) || count < 1 || count > 10000 || !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(floorHeight)) throw new RangeError('Valid floor size and particle count are required.');
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const distance = radius * Math.sqrt((index + .5) / count);
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    positions.set([Math.cos(angle) * distance, floorHeight, Math.sin(angle) * distance], index * 3);
    seeds[index] = (index * .754877666 + .17) % 1;
  }
  return { positions, seeds };
}

/** Interpolate the baked left/right soles with the same phase and wrapping as the human shader. */
export function sampleFloorFeet(frames: number[][], time: number, duration: number): number[] {
  if (frames.length < 2 || !Number.isFinite(time) || time < 0 || !Number.isFinite(duration) || duration <= 0) throw new RangeError('Valid foot frames and walk timing are required.');
  const frame = (time % duration) / duration * frames.length;
  const current = Math.floor(frame);
  const blend = frame - current;
  const first = frames[current];
  const second = frames[(current + 1) % frames.length];
  if (first.length !== 6 || second.length !== 6 || ![...first, ...second].every(Number.isFinite)) throw new Error('Foot frames must contain two finite XYZ positions.');
  return first.map((value, index) => value * (1 - blend) + second[index] * blend);
}

export const FLOOR_VERTEX_SHADER = /* glsl */ `
  attribute float aSeed;
  uniform vec3 uLeftFoot;
  uniform vec3 uRightFoot;
  uniform float uFloorHeight;
  uniform float uRadius;
  uniform float uPixelRatio;
  uniform float uMorph;
  uniform float uReducedMotion;
  uniform vec3 uHover;
  uniform vec2 uViewport;
  varying float vOpacity;
  vec3 contactPush(vec3 point, vec3 foot) {
    vec2 offset = point.xz - foot.xz;
    float distance = length(offset);
    float grounded = 1.0 - smoothstep(.08, .30, foot.y - uFloorHeight);
    float pressure = exp(-distance * distance / .07) * grounded * (1.0 - uReducedMotion);
    return vec3(offset.x / max(distance, .02) * pressure * .10, pressure, offset.y / max(distance, .02) * pressure * .10);
  }
  void main() {
    vec3 point = position;
    vec3 response = contactPush(point, uLeftFoot) + contactPush(point, uRightFoot);
    point.xz += response.xz;
    point.y += response.y * (.025 + aSeed * .055);
    float distance = length(point.xz);
    point.xz *= min(1.0, uRadius / max(distance, .001));
    vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    vec2 cursorDelta = (gl_Position.xy / gl_Position.w - uHover.xy) * uViewport * .5;
    float hover = (1.0 - smoothstep(0.0, 80.0, length(cursorDelta))) * uHover.z;
    vOpacity = (.20 + aSeed * .14 + min(1.0, response.y) * .5 + hover * .15);
    vOpacity *= (1.0 - smoothstep(uRadius * .78, uRadius, length(position.xz))) * (1.0 - smoothstep(0.0, .45, uMorph));
    gl_PointSize = (1.15 + aSeed * .7 + response.y * .45) * uPixelRatio * (6.0 / -viewPosition.z);
  }
`;

export const FLOOR_FRAGMENT_SHADER = /* glsl */ `
  varying float vOpacity;
  void main() {
    float distance = length(gl_PointCoord - .5);
    float coverage = 1.0 - smoothstep(.2, .5, distance);
    if (coverage < .01) discard;
    gl_FragColor = vec4(.72, .76, .78, vOpacity * coverage);
  }
`;
