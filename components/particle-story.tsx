'use client';

/** Two accessible story chapters share a persistent GPU field and one scroll/animation clock. */
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createParticleScene, type ParticleScene } from '../lib/particle-scene';
import { getMotionTime, getStoryState } from '../lib/particle-model';

/** Construct the scrubbed timeline independently so refresh behavior is testable. */
export function createStoryTween(clock: { progress: number }, onUpdate: () => void) {
  if (!clock || !Number.isFinite(clock.progress) || typeof onUpdate !== 'function') throw new TypeError('A finite story clock and update callback are required.');
  // Explicit endpoints prevent invalidation from treating the current scroll position as the new start.
  return gsap.fromTo(clock, { progress: 0 }, { progress: 1, duration: 1, ease: 'none', onUpdate });
}

/** Render the portfolio motion study with scrub, chapter navigation and ambient-motion controls. */
export function ParticleStory() {
  const storyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const isPausedRef = useRef(false);
  const navigateRef = useRef<(progress: number) => void>(() => {});
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [status, setStatus] = useState('Preparing the particle field');
  const [hasError, setHasError] = useState(false);
  const [particleCount, setParticleCount] = useState(18000);
  const chapter = progress < .5 ? 0 : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    const story = storyRef.current;
    if (!canvas || !story) return;
    gsap.registerPlugin(ScrollTrigger);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReduced = motionQuery.matches;
    let scene: ParticleScene | undefined;
    let lenis: Lenis | undefined;
    let trigger: ScrollTrigger | undefined;
    let time = 1.1;
    let previousPercent = -1;
    const clock = { progress: 0 };
    setIsReducedMotion(isReduced);

    function reportError(message: string) {
      setHasError(true);
      setStatus(message);
    }
    function updateProgress() {
      progressRef.current = clock.progress;
      const percentage = Math.round(clock.progress * 1000) / 1000;
      if (percentage !== previousPercent) {
        setProgress(percentage);
        previousPercent = percentage;
      }
    }
    function advanceFrame(elapsed: number, deltaMs: number) {
      lenis?.raf(elapsed * 1000);
      if (document.hidden) return;
      time = getMotionTime(time, deltaMs / 1000, isPausedRef.current, isReduced);
      scene?.renderFrame(time, getStoryState(progressRef.current, isReduced).morph, isReduced, isPausedRef.current);
    }
    function changeMotionPreference() {
      isReduced = motionQuery.matches;
      setIsReducedMotion(isReduced);
      // Recreate Lenis so an OS preference change also removes smooth-scroll inertia.
      lenis?.destroy();
      lenis = new Lenis({ smoothWheel: !isReduced, lerp: .085 });
      lenis.on('scroll', ScrollTrigger.update);
      trigger?.getTween()?.duration(isReduced ? 0 : .65);
    }
    try {
      scene = createParticleScene(canvas, reportError, () => setStatus('Particle field ready'));
      setParticleCount(scene.count);
      lenis = new Lenis({ smoothWheel: !isReduced, lerp: .085 });
      lenis.on('scroll', ScrollTrigger.update);
      trigger = ScrollTrigger.create({
        trigger: story,
        start: 'top top',
        end: 'bottom bottom',
        animation: createStoryTween(clock, updateProgress),
        scrub: isReduced ? true : .65,
        invalidateOnRefresh: true,
      });
      navigateRef.current = (destination) => {
        if (!Number.isFinite(destination) || !trigger) return;
        const target = trigger.start + Math.min(1, Math.max(0, destination)) * (trigger.end - trigger.start);
        lenis?.scrollTo(target, { immediate: isReduced, duration: 1.5 });
      };
      gsap.ticker.add(advanceFrame);
      motionQuery.addEventListener('change', changeMotionPreference);
      ScrollTrigger.refresh();
      trigger.animation?.totalProgress(trigger.progress);
      updateProgress();
    } catch (error) {
      reportError(error instanceof Error ? `Unable to start the particle field: ${error.message}` : 'Unable to start the particle field.');
    }
    return () => {
      gsap.ticker.remove(advanceFrame);
      motionQuery.removeEventListener('change', changeMotionPreference);
      trigger?.animation?.kill();
      trigger?.kill();
      lenis?.destroy();
      scene?.dispose();
      navigateRef.current = () => {};
    };
  }, []);

  function toggleMotion() {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  }
  function navigateToChapter(destination: number) { navigateRef.current(destination); }
  const transitionOpacity = 1 - Math.sin(getStoryState(progress).morph * Math.PI) * .96;

  return (
    <main ref={storyRef} className="story" id="story" data-chapter={chapter === 0 ? 'human' : 'flight'}>
      <div className="story-stage">
        <canvas ref={canvasRef} className="particle-canvas" aria-label="A walking human made of particles transforms into a formation of three airplanes as you scroll" role="img" />
        <div className="canvas-vignette" aria-hidden="true" />
        <header className="site-header">
          <button className="wordmark" onClick={() => navigateToChapter(0)} aria-label="Back to the beginning"><span className="brand-symbol" aria-hidden="true">h<span>n</span></span><span>HRUDAI NIRMAL</span></button>
          <span className="header-note">A PORTFOLIO IN THE MAKING</span>
          <button className="study-link" onClick={() => navigateToChapter(chapter === 0 ? 1 : 0)}>EXPERIMENT 001 <span aria-hidden="true">↗</span></button>
        </header>
        <div className="top-rule" />
        <div className="edition-label"><span className="small-cross" aria-hidden="true">+</span> FORM / EXPLORATION / 2026</div>
        <div className="story-copy" style={{ opacity: transitionOpacity }}>
          <div className="chapter-eyebrow"><span className="eyebrow-line" /> {chapter === 0 ? '01 — THE HUMAN ELEMENT' : '02 — BEYOND THE ORDINARY'}</div>
          <h1 className={chapter === 0 ? 'chapter-title is-visible' : 'chapter-title'} aria-hidden={chapter !== 0}>Ideas in <br />motion.</h1>
          <h2 className={chapter === 1 ? 'chapter-title is-visible' : 'chapter-title'} aria-hidden={chapter !== 1}>Made to <br />take flight.</h2>
          <p className="chapter-description">{chapter === 0 ? <>Every idea starts with a human.<br />A thought. A step. A different perspective.</> : <>Curiosity becomes possibility.<br />The same pieces. An entirely new direction.</>}</p>
          <button className="chapter-cta" onClick={() => navigateToChapter(chapter === 0 ? 1 : 0)}><span>{chapter === 0 ? 'FOLLOW THE TRANSFORMATION' : 'BACK TO THE BEGINNING'}</span><span aria-hidden="true">{chapter === 0 ? '↓' : '↑'}</span></button>
        </div>
        <div className="figure-annotation" aria-hidden="true"><span className="annotation-cross">+</span><span>{chapter === 0 ? 'FIG. 01 — HUMAN' : 'FIG. 02 — FLIGHT'}<br /><span className="annotation-detail">{particleCount.toLocaleString('en-US')} POINTS / ONE POSSIBILITY</span></span></div>
        <div className="side-caption" aria-hidden="true">AN EXPLORATION OF WHAT COMES NEXT</div>
        <div className="scene-caption" aria-hidden="true"><span className="tiny-line" />{progress > .25 && progress < .75 ? 'NOTHING LOST. EVERYTHING REIMAGINED.' : chapter === 0 ? 'IT STARTS WITH A SINGLE STEP.' : 'A NEW WAY OF SEEING.'}</div>
        {status === 'Preparing the particle field' && <div className="loading-message" role="status">{status}<span> …</span></div>}
        {hasError && <div className="error-message" role="alert"><p>{status}</p><button onClick={() => window.location.reload()}>Reload experience ↗</button></div>}
        <footer className="story-footer">
          <div className="scroll-note"><span className="scroll-icon" aria-hidden="true">↓</span><span>SCROLL TO EXPLORE<span className="scroll-subtitle">A change in perspective.</span></span></div>
          <nav className="chapter-navigation" aria-label="Story chapters">
            <button className={chapter === 0 ? 'chapter-button active' : 'chapter-button'} aria-label="Go to human chapter" aria-current={chapter === 0 ? 'step' : undefined} onClick={() => navigateToChapter(0)}><span>01</span> HUMAN</button>
            <span className="chapter-divider" aria-hidden="true" />
            <button className={chapter === 1 ? 'chapter-button active' : 'chapter-button'} aria-label="Go to flight chapter" aria-current={chapter === 1 ? 'step' : undefined} onClick={() => navigateToChapter(1)}><span>02</span> FLIGHT</button>
          </nav>
          <button className="motion-toggle" aria-label={isPaused ? 'Resume ambient motion' : 'Pause ambient motion'} aria-pressed={isPaused} onClick={toggleMotion} disabled={isReducedMotion}><span aria-hidden="true">{isPaused || isReducedMotion ? '▷' : 'Ⅱ'}</span><span>{isReducedMotion ? 'REDUCED MOTION' : isPaused ? 'MOTION PAUSED' : 'PAUSE MOTION'}</span></button>
        </footer>
        <div className="progress-control"><input aria-label="Story progress" aria-valuetext={`${Math.round(progress * 100)} percent, ${chapter === 0 ? 'human' : 'flight'} chapter`} type="range" min="0" max="1000" step="1" value={Math.round(progress * 1000)} onChange={(event) => navigateToChapter(Number(event.target.value) / 1000)} /><div className="progress-track" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(.005, progress)})` }} /></div></div>
        <span className="progress-label" aria-hidden="true">{Math.round(progress * 100).toString().padStart(3, '0')} <span>/ 100</span></span>
      </div>
    </main>
  );
}
