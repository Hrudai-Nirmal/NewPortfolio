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
