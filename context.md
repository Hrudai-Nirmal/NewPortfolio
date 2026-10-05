# Particle story prototype

## Purpose
A focused two-chapter portfolio motion study: an articulated walking human disperses into three aircraft as the visitor scrolls. This is a prototype, not the complete portfolio. Identity uses Hrudai Nirmal from the workspace context; portfolio claims and project history are deliberately absent.

## Reference lock and decision ledger
- Primary: Aaru archived on Refero, https://styles.refero.design/style/ad98aac8-347c-47da-91c5-9c020febeb92 . Preserve monochrome granular forms, dark canvas, asymmetric whitespace and fine typography. Reference screenshot was visually inspected.
- Refero MCP searches returned NO_SUBSCRIPTION. The public Refero style entry remained accessible. The live aaru.com homepage has changed, so the old animated airplane transition could not be inspected directly; reconstruction follows the user's description, not a claim of pixel-perfect motion fidelity.
- Secondary: Astro on Refero, https://styles.refero.design/style/e8c604cc-1c8d-42a3-aeca-fcfc25e70344 . Borrow only quiet low-opacity structural hairlines. Do not borrow nebula gradients, card layouts or accent colors.
- User brief owns interaction: reversible scroll-driven human-to-airplanes, Next.js, React, GSAP ScrollTrigger, Lenis, GLSL.
- Canvas #08090a; type #f0f0ed; secondary #999b9d; border rgba(255,255,255,.12). Monochrome particles. Small lime CTA uses Aaru's action-only role. No lime decorative particles.
- Original framing: “Ideas in motion”, human/flight chapter controls and a simple progress rail. No clone of Aaru branding, content, full layout or products.
- Human media now uses the Mixamo Leonard mesh and a canonical authored Mixamo walk, obtained from the three.ws character/animation library. Persistent point identities are sampled on the skinned surface and baked locally. Aircraft remain procedural. See assets/source/NOTICE.md. No Aaru assets or videos are shipped.

## Dependencies
Next.js/React provide the requested application and component runtime (MIT). Three.js (MIT, ~20 MB unpacked package before bundling) provides WebGL buffers/materials and is the only extra runtime graphics library. GSAP (standard no-charge license, ~6 MB unpacked) provides ScrollTrigger and the shared ticker; Lenis (MIT, ~457 KB unpacked) integrates smooth scrolling into that ticker. Next's package is ~186 MB unpacked including tooling, not the browser payload. TypeScript, types and tsx (MIT) are development-only; tsx runs TS and JSX tests with Node's built-in test runner. No React Three Fiber, physics or postprocessing dependency is needed.

## Test slices
1. Particle geometry and timeline: test first, confirm failure, implement deterministic surfaces and progress contracts.
2. Page shell and accessible controls: SSR contract tests first, then UI and WebGL integration; browser check real scrolling, rendering, reduced motion and narrow layouts.

## Gotchas
- Keep stable particle counts/indices across all targets; interpolate on the GPU.
- One GSAP ticker feeds Lenis and rendering. Dispose buffers, materials, renderer, listeners, trigger and ticker on unmount.
- Reduced motion uses static endpoint forms with no gait, turbulence or parallax; pause freezes ambient motion but scroll remains usable.
- No personal contact details are invented. This study contains no fake portfolio destinations.

## Verification (2026-10-04)
- All 8 tests pass; `npm run typecheck` and `npm run build` pass. Production preview is served locally on port 3000 with `npm start`.
- TDD evidence: geometry and story suites first failed with missing modules. The joint-continuity test failed on the original ellipsoid hip profile, then passed with connected limb cross-sections. The mobile wing-clearance test failed before adaptive framing was introduced. The refresh regression reproduced `0.8 !== 0` against the original GSAP `to` timeline, then passed with absolute `fromTo` endpoints.
- Browser QA: desktop (~1250×712), phone 390×844 and 375×667. Corrected human/header collision, footer spacing, missing word spacing on phones and airplane wing clipping. Verified chapter buttons, keyboard Home, ambient pause/resume, and reload at the flight endpoint. No shader or runtime errors in the inspected session. Earlier development edits emitted ordinary Fast Refresh full-reload warnings; the production preview has no development overlay.
- Screenshots are in artifacts/. Mobile evidence was captured in development; desktop evidence uses the production build.
- Reduced-motion timing/endpoints are covered by unit tests and the OS preference listener is implemented; no physical-device performance benchmark or OS-level reduced-motion browser emulation was performed.
- Original Aaru motion was unavailable through the expired Refero subscription and the changed live homepage. This is a procedural interpretation of the supplied human-to-aircraft brief and archived screenshot, not an exact reproduction of Aaru's original gait or choreography.


## Human realism revision (2026-10-05)
- User approved structure and requested realistic anatomy and gait. Removed primitive ellipsoid body parts and analytic sine-wave limb articulation at their source.
- Source: Leonard, a clothed human with full-length trousers, 32,600 sampled mesh vertices / 65 bones. Mixamo canonical walk is mapped to matching bone names, with root translation scaled to the character. Source eyes/eyelashes are excluded from surface sampling.
- Each particle keeps one area-weighted triangle and barycentric coordinates through all poses. Deform the actual mesh first, then sample its skin; this preserves joint volume and prevents particles swimming between body parts.
- Bake 32 frames into a 256×2272 RGBA16F atlas (4,653,088 bytes). XYZ is position; W is surface-facing lighting. GLSL interpolates consecutive frames and wraps to frame zero. Playback duration is 1.15 seconds, independent of scroll. No per-frame CPU skinning or runtime model loader.
- An abortable local fetch controls loading readiness. No procedural-human fallback conceals missing or invalid assets. Dispose aborts pending requests and releases the motion texture.
- Human points are finer and depth-shaded; aircraft retain the previous dash sizing. Page structure, GSAP/Lenis clock, pause behavior, reduced-motion endpoints and reverse morph remain intact.
- No new dependencies. Three.js already provides the offline GLTF loader, animation mixer, skin deformation and half-float conversion.
- TDD: motion test failed on missing module, then passed on detailed anatomy, deformation, exact wrap and consistent floor height; atlas test failed on missing module before encode/parse implementation; target contract failed while primitive anatomy remained, then passed after removal; surface-lighting tests failed before normal-based lighting and alpha packing were implemented.
- Verification: all 10 tests pass; TypeScript and production build pass. Desktop and 390×844 phone browser checks include skeletal poses, forward/reverse morph, pause and runtime error inspection. No physical-device performance benchmark or OS-level reduced-motion emulation was performed.
- The archived Refero still is the visual direction. A found Ripplix recording starts after the walking section, and the live Aaru homepage has changed. The new figure is a realistic reconstruction with a separately sourced rig/clip, not Aaru's original model or an independently verified exact gait match.

## Repository
- Initialized on `main` with origin `https://github.com/Hrudai-Nirmal/NewPortfolio.git` on 2026-10-05.
- Source, motion assets, screenshots, documentation, lockfile and tests are versioned. Installed dependencies, Next.js build output and TypeScript build caches remain excluded by `.gitignore`.


## Posture and hover revision (2026-10-05)
- The user requested a slightly lowered face, upright torso, and hover effects on every particle form.
- Fixed posture in the source skeleton before skinning/baking: align the spine-to-neck sagittal direction vertically and set the face to a six-degree downward gaze, retaining authored head yaw, lateral body sway, arms and legs. Restore authored quaternions before each mixer evaluation so corrections cannot accumulate on repeated samples.
- Added a screen-space cursor field after morph projection. A 110 CSS-pixel radius repels nearby particles up to 34 pixels and increases their brightness/size. The same field covers human, aircraft and in-between particles, with frame-time-based easing and smooth release on pointer exit/blur.
- Touch does not activate hover. Pause freezes the field; reduced motion disables it. Pointer subscriptions are removed with scene disposal. No dependency changes.
- TDD: posture regression measured the original backward lean (-0.0986 radians), then passed across 16 stride phases with upright torso/downward face. Hover tests first failed on the missing module, then passed canvas-local mapping, touch/outside rejection, easing consistency, release, pause and reduced-motion contracts.
- All 13 tests, typecheck and production build pass. Browser verification confirms corrected posture, repulsion on human and aircraft, the mid-morph cursor field, and no console shader/runtime warnings. Preview remains on http://127.0.0.1:3000/.

## Delivery preference
- The user explicitly requested on 2026-10-05 that changes always be committed and pushed. This is recorded in AGENTS.md and applies to future completed changes in this project.


## Athletic proportions and footfalls (2026-10-05)
- User requested a fitter silhouette, a slightly raised waistline, subtle footfall ripples, and feet reduced by 10%.
- Tailor the mesh and skeleton together in bind space before generating particles: waist width/depth taper peaks at 16%/17%, upper-torso width increases up to 8%, and the waist lifts by 3.5% of standing height with smooth falloff. Head and floor anchors stay fixed. Recalculate inverse bind matrices to keep skin and joints aligned.
- Feet shrink 10% in all dimensions around their ankle/floor anchors, smoothly blending above the ankle into the lower leg. The authored gait and upright posture pass remain intact.
- Bake two alternating foot-contact events from descending ankle trajectories, locating the floor from the posed shoe surfaces. Store these alongside the atlas in lib/foot-contacts.json. The same bake command regenerates both outputs.
- Two faint ground-plane rings expand for 0.52 seconds at contact. They share the walk clock, freeze when paused, disappear under reduced motion, and fade out early in the aircraft morph. Ring geometry/materials are disposed with the scene.
- TDD: new proportion and foot-size tests failed before implementation, then passed exact scaling, floor/head anchoring, symmetry and monotonic remapping. Contact/ripple tests failed before the APIs existed, then passed alternation, floor placement, cyclic timing, expansion, decay and reduced-motion/morph suppression.
- Verification: all 18 tests, typecheck and production build pass. Browser preview shows the revised figure without shader/runtime warnings. No new dependencies.


## Natural waist correction and stronger ripples (2026-10-05)
- User rejected the raised, narrowed waist and requested a proper humanoid reference. Consulted Max Planck's scan-based SMPL overview (https://smpl.is.tue.mpg.de/) and visually inspected Wellcome's male anatomical proportion plate (https://commons.wikimedia.org/wiki/File:Male_anatomical_figure,_showing_proportions._Wellcome_M0000426.jpg). These are references only; no SMPL assets or Wellcome images are incorporated into the site.
- Restore the Mixamo source mesh's authored waist width/depth and all vertical landmarks. Remove the 3.5%-height waist lift and 16%/17% waist taper. Reduce upper-torso expansion from 8% width/4% depth to 2%/1%. This supersedes the exaggerated athletic-profile settings above. The 10% foot reduction and corrected posture remain.
- Increase footfall ripple peak opacity from .18 to .58, lifetime from .52 to .65 seconds, and maximum radius from .50 to .80 stage units. Add a secondary ring and widen/brighten the strokes. Regenerate the atlas and foot-contact positions to match restored body proportions.
- TDD: revised waist tests failed with .168 versus required .2 width and unwanted vertical displacement; revised ripple visibility test failed on the old faint decay. All 18 tests pass after correction, as do typecheck and production build. Browser verification shows the fuller/lower waist and visible double rings with no runtime warnings.


## Bald humanoid and reactive particle floor (2026-10-06)
- User requested removal of all ripple rings, a slightly dense compact circular particle floor responsive to the humanoid's feet, and a bald head.
- Exclude the separate Hair mesh during surface selection while retaining Body/scalp geometry. The baked human now samples 21,877 vertices with the same 65-bone gait, corrected posture, natural waist and smaller feet.
- Remove ring geometry/materials, ripple timing code, obsolete contact JSON and ripple-only tests. Add a 1.05-stage-unit-radius disk of 2,400 points (1,600 on phones), with soft edge opacity and a hard displacement boundary. It occupies only the area around the feet.
- Bake both sole-center positions for all 32 walk frames into lib/foot-motion.json. GPU distance/height falloff makes nearby grounded-foot particles spread, lift and brighten; they settle as the foot leaves. The ground shares the walk clock and cursor highlight, freezes on pause, disables foot response for reduced motion, and fades away during the aircraft morph.
- Raise desktop human/floor framing slightly to keep the disk above the footer; aircraft framing stays unchanged. Dispose floor buffers/materials with the scene.
- TDD: floor tests failed on the missing module before passing deterministic bounded area density and cyclic interpolation. Bald/foot-path test failed before hair exclusion and continuous foot sampling were added. All 20 tests, typecheck and production build pass. Desktop/phone browser checks show the bald scalp and confined floor with no runtime warnings.
