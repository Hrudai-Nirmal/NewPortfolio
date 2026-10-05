# Human motion source assets

The human is adapted from **Leonard**, a Mixamo character, and an authored Mixamo walk distributed in the three.ws public character/animation library. They are used as ingredients of this portfolio particle experience, not offered as a standalone asset library.

- Character catalog: https://three.ws/api/avatars/library (entry `leonard`, source/license `mixamo` / `Mixamo`).
- Character file: https://pub-2534e921bf9c4314addcd4d8a6e98b7b.r2.dev/avatars/mixamo/glb/leonard.glb
- Walk: https://github.com/nirholas/three.ws/blob/main/public/animations/clips/walk.json
- Library documentation: https://github.com/nirholas/three.ws/blob/main/docs/character-library.md
- Adobe usage FAQ: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

These assets are governed by Mixamo's terms, not the MIT license of Three.js or the surrounding application code. Adobe's FAQ describes royalty-free use of its characters and animations in personal, commercial and nonprofit projects. Preserve this provenance if the project is shared.

The 48.8 MB original mesh remains an offline build/test input in this directory. Its textures are discarded by the bake pipeline. Only the integrated 4.65 MB particle motion atlas under `public/motion/` is loaded by the website. No source model or animation was downloaded from Aaru.

Rebuild with `npm run bake:human`. The bake uses deterministic area-weighted sampling, barycentric skin attachment, 32 authored poses, half-float quantization and pose-dependent surface lighting. A skeletal posture pass aligns the torso upright and lowers the gaze by six degrees before baking. The mesh and rig retain their authored waist height and volume, with only slight upper-torso definition and feet reduced by 10%. The separate hair mesh is excluded to produce a bald scalp. Both feet are sampled throughout the resulting gait to drive localized reactions in a circular particle floor. The source clip is played at a relaxed 1.15-second cycle. The source mesh and walk are retained so this output can be reproduced and tested.
