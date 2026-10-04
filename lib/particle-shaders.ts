/** GPU frame interpolation preserves detailed skeletal motion while scroll remaps the same points into aircraft. */
export const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aAirplane;
  attribute vec3 aScatter;
  attribute float aHumanIndex;
  uniform sampler2D uHumanFrames;
  uniform vec2 uAtlasSize;
  uniform float uRowsPerFrame;
  uniform float uFrameCount;
  uniform float uWalkDuration;
  attribute float aSeed;
  uniform float uTime;
  uniform float uMorph;
  uniform float uPixelRatio;
  uniform float uReducedMotion;
  uniform vec2 uPointer;
  varying float vOpacity;
  varying float vSeed;

  vec4 sampleHuman(float frame) {
    float column = mod(aHumanIndex, uAtlasSize.x);
    float row = floor(aHumanIndex / uAtlasSize.x) + frame * uRowsPerFrame;
    return texture2D(uHumanFrames, (vec2(column, row) + .5) / uAtlasSize);
  }
  vec3 rotateY(vec3 point, float angle) {
    point.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * point.xz;
    return point;
  }
  void main() {
    float frame = mod(uTime / uWalkDuration, 1.0) * uFrameCount;
    float currentFrame = floor(frame);
    vec4 surface = mix(sampleHuman(currentFrame), sampleHuman(mod(currentFrame + 1.0, uFrameCount)), fract(frame));
    vec3 human = surface.xyz;
    human = rotateY(human, 1.03);
    float morph = uReducedMotion > .5 ? uMorph : smoothstep(aSeed * .12, .88 + aSeed * .12, uMorph);
    float energy = sin(morph * 3.14159265);
    vec3 airplane = aAirplane;
    airplane.y += sin(uTime * .7 + aSeed * .04) * .055;
    airplane = rotateY(airplane, sin(uTime * .25) * .055);
    vec3 point = mix(human, airplane, morph);
    vec3 curl = vec3(
      sin(point.y * 2.0 + uTime * .45 + aSeed * 6.28),
      cos(point.z * 1.6 + uTime * .35 + aSeed * 6.28),
      sin(point.x * 1.8 - uTime * .4 + aSeed * 6.28)
    );
    point += (aScatter * .66 + curl * .32) * energy;
    point = rotateY(point, uPointer.x * .13);
    point.y += uPointer.y * .06;
    vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(mix(1.6 + aSeed * 1.7, 2.4 + aSeed * 2.2, morph) * uPixelRatio * (6.0 / -viewPosition.z), 1.0, 10.0);
    vOpacity = (.22 + pow(aSeed, 2.0) * .68) * (1.0 - .3 * energy);
    vOpacity *= mix(surface.w, 1.0, morph);
    vOpacity *= clamp(1.1 + point.z * .13, .3, 1.0);
    vSeed = aSeed;
  }
`;

export const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying float vOpacity;
  varying float vSeed;
  void main() {
    vec2 centered = gl_PointCoord - .5;
    float distanceToDash = length(vec2(centered.x, centered.y * 2.7));
    float coverage = 1.0 - smoothstep(.3, .5, distanceToDash);
    if (coverage < .01) discard;
    vec3 color = mix(vec3(.66, .70, .72), vec3(.96, .97, .94), vSeed);
    gl_FragColor = vec4(color, coverage * vOpacity);
  }
`;
