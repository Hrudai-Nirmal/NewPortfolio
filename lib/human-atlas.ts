/** Versioned half-float motion atlas: point identities stay fixed while GLSL interpolates skeletal frames. */
import { DataUtils } from 'three';
const ATLAS_MAGIC = 0x48554d4e;
const HEADER_BYTES = 32;
const ATLAS_WIDTH = 256;

/** Pack equal-sized XYZ frames into a nearest-sampled RGBA16F texture with a validated header. */
export function encodeHumanAtlas(frames: Float32Array[], duration: number, lightingFrames?: Float32Array[]): ArrayBuffer {
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('Invalid walk duration.');
  if (frames.length < 2 || !frames[0]?.length || frames[0].length % 3) throw new RangeError('At least two XYZ frames are required.');
  const count = frames[0].length / 3;
  if (frames.some((frame) => frame.length !== count * 3)) throw new RangeError('Frames must have the same particle count.');
  if (lightingFrames && (lightingFrames.length !== frames.length || lightingFrames.some((frame) => frame.length !== count))) throw new RangeError('Lighting frames must have the same particle count.');
  const rowsPerFrame = Math.ceil(count / ATLAS_WIDTH);
  const height = rowsPerFrame * frames.length;
  if (height > 4096) throw new RangeError('Motion atlas exceeds the supported texture size.');
  const buffer = new ArrayBuffer(HEADER_BYTES + ATLAS_WIDTH * height * 8);
  new Uint32Array(buffer, 0, 7).set([ATLAS_MAGIC, 1, count, frames.length, ATLAS_WIDTH, height, rowsPerFrame]);
  new DataView(buffer).setFloat32(28, duration, true);
  const texels = new Uint16Array(buffer, HEADER_BYTES);
  frames.forEach((frame, frameIndex) => {
    for (let particle = 0; particle < count; particle++) {
      const offset = (frameIndex * rowsPerFrame * ATLAS_WIDTH + particle) * 4;
      for (let axis = 0; axis < 3; axis++) {
        const coordinate = frame[particle * 3 + axis];
        if (!Number.isFinite(coordinate) || Math.abs(coordinate) > 10) throw new RangeError('Human coordinates must be finite and within the stage.');
        texels[offset + axis] = DataUtils.toHalfFloat(coordinate);
      }
      const lighting = lightingFrames?.[frameIndex][particle] ?? 1;
      if (!Number.isFinite(lighting) || lighting < 0 || lighting > 1) throw new RangeError('Surface lighting must be between zero and one.');
      texels[offset + 3] = DataUtils.toHalfFloat(lighting);
    }
  });
  return buffer;
}

/** Reject incompatible or truncated assets before uploading their coordinates to WebGL. */
export function parseHumanAtlas(buffer: ArrayBuffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < HEADER_BYTES) throw new Error('Invalid human atlas header.');
  const [magic, version, count, frameCount, width, height, rowsPerFrame] = new Uint32Array(buffer, 0, 7);
  const duration = new DataView(buffer).getFloat32(28, true);
  if (magic !== ATLAS_MAGIC || version !== 1 || count < 1 || count > 200000 || frameCount < 2 || width !== ATLAS_WIDTH || rowsPerFrame !== Math.ceil(count / width) || height !== rowsPerFrame * frameCount || height > 4096 || !Number.isFinite(duration) || duration <= 0) throw new Error('Invalid human atlas header.');
  if (buffer.byteLength !== HEADER_BYTES + width * height * 8) throw new Error('Truncated human atlas payload.');
  const texels = new Uint16Array(buffer, HEADER_BYTES);
  if (texels.some((value) => (value & 0x7c00) === 0x7c00)) throw new Error('Non-finite human atlas coordinates.');
  return { count, frameCount, width, height, rowsPerFrame, duration, texels };
}
