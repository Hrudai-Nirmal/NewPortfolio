/** A disposable WebGL controller; React and the scroll timeline never touch GPU buffer details. */
import * as THREE from 'three';
import { advanceHoverState, getHoverTarget } from './particle-hover';
import { parseHumanAtlas } from './human-atlas';
import { createParticleModel, getParticleScale } from './particle-model';
import { PARTICLE_FRAGMENT_SHADER, PARTICLE_VERTEX_SHADER } from './particle-shaders';

export type ParticleScene = ReturnType<typeof createParticleScene>;

/** Initialize a local particle field and expose only frame updates and lifecycle cleanup. */
export function createParticleScene(canvas: HTMLCanvasElement, onError: (message: string) => void, onReady: () => void) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('A canvas is required.');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x08090a, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 50);
  camera.position.set(0, 0, 7.6);
  const count = window.innerWidth < 700 ? 10000 : 18000;
  const model = createParticleModel(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aAirplane', new THREE.BufferAttribute(model.airplane, 3));
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(model.scatter, 3));
  geometry.setAttribute('aHumanIndex', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, index) => index), 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(model.seeds, 1));
  const uniforms = {
    uHumanFrames: { value: null as THREE.DataTexture | null },
    uAtlasSize: { value: new THREE.Vector2(256, 1) }, uRowsPerFrame: { value: 1 },
    uFrameCount: { value: 2 }, uWalkDuration: { value: 1.15 },
    uTime: { value: 0 }, uMorph: { value: 0 }, uPixelRatio: { value: 1 },
    uHover: { value: new THREE.Vector3() }, uViewport: { value: new THREE.Vector2(1, 1) },
    uReducedMotion: { value: 0 }, uPointer: { value: new THREE.Vector2() },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERTEX_SHADER, fragmentShader: PARTICLE_FRAGMENT_SHADER,
    uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  });
  const particles = new THREE.Points(geometry, material);
  // All human coordinates live in a texture, so CPU position bounds cannot cull this field.
  particles.frustumCulled = false;
  particles.visible = false;
  scene.add(particles);
  let hasFailed = false;
  let isDisposed = false;
  const abortController = new AbortController();

  async function loadHumanMotion() {
    try {
      const response = await fetch('/motion/human-walk.bin', { signal: abortController.signal });
      if (!response.ok) throw new Error(`Motion asset request failed (${response.status}).`);
      const atlas = parseHumanAtlas(await response.arrayBuffer());
      if (isDisposed) return;
      if (atlas.count < count || atlas.height > renderer.capabilities.maxTextureSize) throw new Error('The motion asset is incompatible with this graphics device.');
      const texture = new THREE.DataTexture(atlas.texels, atlas.width, atlas.height, THREE.RGBAFormat, THREE.HalfFloatType);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      uniforms.uHumanFrames.value = texture;
      uniforms.uAtlasSize.value.set(atlas.width, atlas.height);
      uniforms.uRowsPerFrame.value = atlas.rowsPerFrame;
      uniforms.uFrameCount.value = atlas.frameCount;
      uniforms.uWalkDuration.value = atlas.duration;
      particles.visible = true;
      onReady();
    } catch (error) {
      // An unmount intentionally cancels loading; every other failure stays visible to the visitor.
      if (isDisposed) return;
      hasFailed = true;
      onError(error instanceof Error ? `Unable to load the human motion: ${error.message}` : 'Unable to load the human motion.');
    }
  }
  void loadHumanMotion();
  const pointerTarget = new THREE.Vector2();
  let hoverTarget = { horizontal: 0, vertical: 0, strength: 0 };
  let hoverState = { ...hoverTarget };
  let previousFrameTime: number | undefined;

  function resizeScene() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(19)) * camera.position.z;
    const isMobile = width < 700;
    particles.position.x = isMobile ? 0 : visibleHeight * camera.aspect * .17;
    particles.position.y = isMobile ? -visibleHeight * 80 / height : .02;
    particles.scale.setScalar(getParticleScale(width, height, uniforms.uMorph.value));
    uniforms.uPixelRatio.value = ratio;
    uniforms.uViewport.value.set(width, height);
  }
  function trackPointer(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    hoverTarget = getHoverTarget(event.clientX, event.clientY, bounds, event.pointerType);
    if (event.pointerType === 'touch') { resetPointer(); return; }
    pointerTarget.set(hoverTarget.horizontal, hoverTarget.vertical);
  }
  function resetPointer() {
    pointerTarget.set(0, 0);
    hoverTarget = { ...hoverTarget, strength: 0 };
  }
  function handlePointerExit(event: PointerEvent) {
    if (!event.relatedTarget) resetPointer();
  }
  function handleContextLoss(event: Event) {
    event.preventDefault();
    hasFailed = true;
    onError('The graphics connection was interrupted. Reload to restart the particle field.');
  }
  renderer.debug.onShaderError = () => {
    hasFailed = true;
    onError('The particle shader could not run on this device. Try a browser with WebGL 2 support.');
  };
  const observer = new ResizeObserver(resizeScene);
  observer.observe(canvas);
  window.addEventListener('pointermove', trackPointer, { passive: true });
  window.addEventListener('blur', resetPointer);
  window.addEventListener('pointerout', handlePointerExit);
  window.addEventListener('pointercancel', resetPointer);
  canvas.addEventListener('webglcontextlost', handleContextLoss);
  resizeScene();

  return {
    count,
    /** Update shader uniforms without allocating geometry on the animation frame. */
    renderFrame(time: number, morph: number, isReducedMotion: boolean, isPaused: boolean) {
      if (hasFailed) return;
      const deltaSeconds = previousFrameTime === undefined ? 1 / 60 : Math.max(0, time - previousFrameTime);
      previousFrameTime = time;
      hoverState = advanceHoverState(hoverState, hoverTarget, deltaSeconds, isPaused, isReducedMotion);
      uniforms.uHover.value.set(hoverState.horizontal, hoverState.vertical, hoverState.strength);
      uniforms.uTime.value = time;
      uniforms.uMorph.value = morph;
      particles.scale.setScalar(getParticleScale(canvas.clientWidth, canvas.clientHeight, morph));
      uniforms.uReducedMotion.value = Number(isReducedMotion);
      if (isReducedMotion) uniforms.uPointer.value.set(0, 0);
      else if (!isPaused) uniforms.uPointer.value.lerp(pointerTarget, .025);
      renderer.render(scene, camera);
    },
    /** Release GPU memory and DOM subscriptions when the React tree unmounts. */
    dispose() {
      isDisposed = true;
      abortController.abort();
      uniforms.uHumanFrames.value?.dispose();
      observer.disconnect();
      window.removeEventListener('pointermove', trackPointer);
      window.removeEventListener('blur', resetPointer);
      window.removeEventListener('pointerout', handlePointerExit);
      window.removeEventListener('pointercancel', resetPointer);
      canvas.removeEventListener('webglcontextlost', handleContextLoss);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
