/** Reproducible offline asset build; browser payload contains only the sampled human walk. */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHumanMotion } from './human-motion';
import { encodeHumanAtlas } from '../lib/human-atlas';

async function bakeHuman() {
  try {
    const motion = await createHumanMotion(18000);
    try {
      const frames = Array.from({ length: 32 }, (_, frame) => motion.sampleSurface(frame / 32 * motion.duration));
      const atlas = encodeHumanAtlas(frames.map((frame) => frame.positions), 1.15, frames.map((frame) => frame.lighting));
      await mkdir(new URL('../public/motion/', import.meta.url), { recursive: true });
      await writeFile(new URL('../public/motion/human-walk.bin', import.meta.url), new Uint8Array(atlas));
      process.stdout.write(`Baked ${motion.vertexCount} source vertices and ${motion.boneCount} bones into ${atlas.byteLength} bytes.\n`);
    } finally { motion.dispose(); }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
    process.exitCode = 1;
  }
}
void bakeHuman();
