# Ideas in Motion

A two-chapter portfolio prototype inspired by Aaru's walking particle figure. The same 3D particles walk, disperse and become three aircraft as the visitor scrolls. The human uses a detailed skinned Mixamo mesh and authored walk cycle; aircraft and the morph shader are original. No Aaru assets are extracted.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Scroll, use the Human / Flight buttons, or scrub the bottom progress rail. The rail supports arrow keys, Home and End. Hover near either particle form to gently push and highlight nearby points. Pause freezes ambient movement and hover; scrolling still changes the form. The OS reduced-motion preference disables gait, turbulence and smooth scrolling in favor of static endpoints.

## Verify

```sh
npm test
npm run typecheck
npm run build
```

Twenty tests cover deterministic aircraft, finite targets, valid allocation, morph endpoints, pausing, responsive framing, accessible markup, timeline refresh, skinned human continuity, grounded stride, binary asset validation, surface lighting, posture alignment, athletic proportions, foot sizing, bald scalp selection, bounded floor density, foot-pose interpolation and hover behavior. The test suite uses Node's runner through tsx. See context.md for reference research, decisions, TDD evidence and known limits.

## Implementation

- Next.js App Router + React + TypeScript.
- GSAP ScrollTrigger scrubs an absolute 0–1 timeline across the sticky story; Lenis shares GSAP's animation ticker.
- Three.js manages WebGL buffers; GLSL interpolates a baked skeletal walk, staggers particle morphing, adds dispersion and draws tiny dash-shaped particles.
- 18,000 points on desktop, 10,000 on mobile at initialization; device pixel ratio capped at 1.75.
- Human particles are sampled deterministically from 21,877 mesh vertices animated by 65 bones. A 32-frame, 4.65 MB local half-float texture stores positions and surface lighting; only two texture reads per particle are needed each frame. Source textures and the raw mesh are never sent to the browser.
- `npm run bake:human` rebuilds `public/motion/human-walk.bin` and `lib/foot-motion.json` from the offline sources. See `assets/source/NOTICE.md` for provenance. Loading is abortable and has an explicit error state.
- Bind-space tailoring preserves the source waist height and width, adds only 2% upper-torso width, and reduces both feet by 10%. A compact circular particle floor reacts beneath the moving feet and fades before the airplane chapter. The hair mesh is excluded, retaining the anatomical scalp.
- No new runtime dependencies, postprocessing or physics libraries.
- WebGL initialization, shader failure and lost-context states show explicit recovery messages. GPU resources and event listeners are disposed on unmount.

This is a motion study, not a completed portfolio. The name is editable in components/particle-story.tsx and app/layout.tsx. No work history, projects or contact information has been invented.
