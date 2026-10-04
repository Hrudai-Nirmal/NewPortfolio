/** Build a deterministic surface-bound point cloud from a detailed Mixamo mesh and authored walk. */
import { readFile } from 'node:fs/promises';
import { AnimationClip, AnimationMixer, Box3, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type SurfaceFace = { mesh: SkinnedMesh; vertices: [number, number, number]; cumulativeArea: number };
type SurfaceBinding = { face: SurfaceFace; weights: [number, number, number] };

/** Load geometry only: source textures are neither needed nor shipped for a particle rendering. */
export async function createHumanMotion(count: number, seed = 71) {
  if (!Number.isInteger(count) || count < 1 || count > 200000) throw new RangeError('Invalid human particle count.');
  if (!Number.isFinite(seed)) throw new TypeError('Seed must be finite.');
  try {
    const source = await readFile(new URL('../assets/source/leonard.glb', import.meta.url));
    const jsonLength = source.readUInt32LE(12);
    const document = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
    const binaryOffset = 20 + jsonLength + 8;

    for (const node of document.nodes) node.name = node.name?.replace(/^mixamorig\d*:/, 'mixamorig');
    delete document.images;
    delete document.textures;
    delete document.materials;
    delete document.animations;
    for (const mesh of document.meshes) for (const primitive of mesh.primitives) delete primitive.material;
    const encodedJson = Buffer.from(JSON.stringify(document));
    const paddedLength = Math.ceil(encodedJson.length / 4) * 4;
    const binary = source.subarray(binaryOffset);
    const stripped = Buffer.alloc(28 + paddedLength + binary.length, 0);
    stripped.writeUInt32LE(0x46546c67, 0);
    stripped.writeUInt32LE(2, 4);
    stripped.writeUInt32LE(stripped.length, 8);
    stripped.writeUInt32LE(paddedLength, 12);
    stripped.writeUInt32LE(0x4e4f534a, 16);
    stripped.fill(32, 20, 20 + paddedLength);
    encodedJson.copy(stripped, 20);
    stripped.writeUInt32LE(binary.length, 20 + paddedLength);
    stripped.writeUInt32LE(0x004e4942, 24 + paddedLength);
    binary.copy(stripped, 28 + paddedLength);
    const loaded = await new GLTFLoader().parseAsync(stripped.buffer.slice(stripped.byteOffset, stripped.byteOffset + stripped.byteLength) as ArrayBuffer, '');
    const root = loaded.scene;
    const meshes: SkinnedMesh[] = [];
    const bones = new Set<string>();
    root.traverse((object) => {
      if (object instanceof SkinnedMesh && !/Eyes|Eyelashes/.test(object.name)) {
        meshes.push(object);
        object.skeleton.bones.forEach((bone) => bones.add(bone.name));
      }
    });
    if (meshes.length === 0) throw new Error('The source has no skinned human surfaces.');
    root.updateMatrixWorld(true);
    const hip = root.getObjectByName('mixamorigHips');
    if (!hip) throw new Error('The expected Mixamo hip bone is missing.');
    const clipDocument = JSON.parse(await readFile(new URL('../assets/source/walk.json', import.meta.url), 'utf8'));
    const clip = AnimationClip.parse(clipDocument);
    const hipRest = hip.position.clone();
    // Scale the canonical metre-based hip motion to this character's leg length.
    const hipScale = hipRest.y / 1.04;
    for (const track of clip.tracks) {
      track.name = `mixamorig${track.name}`;
      if (!root.getObjectByName(track.name.split('.')[0])) throw new Error(`Walk bone missing: ${track.name}`);
      if (track.name.endsWith('.position')) {
        for (let offset = 0; offset < track.values.length; offset += 3) {
          track.values[offset] = hipRest.x + (track.values[offset] - .03) * hipScale;
          track.values[offset + 1] = hipRest.y + (track.values[offset + 1] - 1.04) * hipScale;
          track.values[offset + 2] = hipRest.z + (track.values[offset + 2] - .03) * hipScale;
        }
      }
    }
    const bounds = new Box3();
    const vertex = new Vector3();
    const first = new Vector3();
    const second = new Vector3();
    const third = new Vector3();
    const edge = new Vector3();
    const faces: SurfaceFace[] = [];
    let cumulativeArea = 0;
    let vertexCount = 0;
    for (const mesh of meshes) {
      mesh.skeleton.update();
      const positions = mesh.geometry.getAttribute('position');
      vertexCount += positions.count;
      for (let index = 0; index < positions.count; index++) {
        mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld);
        bounds.expandByPoint(vertex);
      }
      const indices = mesh.geometry.index;
      for (let index = 0; index < (indices?.count ?? positions.count); index += 3) {
        const vertices = [0, 1, 2].map((corner) => indices ? indices.getX(index + corner) : index + corner) as [number, number, number];
        mesh.getVertexPosition(vertices[0], first).applyMatrix4(mesh.matrixWorld);
        mesh.getVertexPosition(vertices[1], second).applyMatrix4(mesh.matrixWorld);
        mesh.getVertexPosition(vertices[2], third).applyMatrix4(mesh.matrixWorld);
        const area = second.sub(first).cross(edge.copy(third).sub(first)).length() / 2;
        if (area <= 0) continue;
        cumulativeArea += area;
        faces.push({ mesh, vertices, cumulativeArea });
      }
    }
    const scale = 3.4 / (bounds.max.y - bounds.min.y);
    const center = bounds.getCenter(new Vector3());
    let randomState = seed >>> 0;
    function nextRandom() {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return randomState / 4294967296;
    }
    const bindings: SurfaceBinding[] = [];
    for (let index = 0; index < count; index++) {
      const targetArea = nextRandom() * cumulativeArea;
      let lower = 0;
      let upper = faces.length - 1;
      while (lower < upper) {
        const middle = (lower + upper) >>> 1;
        if (faces[middle].cumulativeArea < targetArea) lower = middle + 1;
        else upper = middle;
      }
      const along = Math.sqrt(nextRandom());
      const across = nextRandom();
      bindings.push({ face: faces[lower], weights: [1 - along, along * (1 - across), along * across] });
    }
    const mixer = new AnimationMixer(root);
    mixer.clipAction(clip).play();
    /** Evaluate skinning before computing a surface normal, so lighting follows the pose. */
    function sampleSurface(time: number) {
      if (!Number.isFinite(time) || time < 0) throw new RangeError('Frame time must be finite and nonnegative.');
      mixer.setTime(time % clip.duration);
      root.updateMatrixWorld(true);
      for (const mesh of meshes) mesh.skeleton.update();
      const positions = new Float32Array(count * 3);
      const lighting = new Float32Array(count);
      bindings.forEach(({ face, weights }, index) => {
        face.mesh.getVertexPosition(face.vertices[0], first).applyMatrix4(face.mesh.matrixWorld);
        face.mesh.getVertexPosition(face.vertices[1], second).applyMatrix4(face.mesh.matrixWorld);
        face.mesh.getVertexPosition(face.vertices[2], third).applyMatrix4(face.mesh.matrixWorld);
        vertex.copy(first).multiplyScalar(weights[0]).addScaledVector(second, weights[1]).addScaledVector(third, weights[2]);
        vertex.sub(center).multiplyScalar(scale).toArray(positions, index * 3);
        second.sub(first).cross(edge.copy(third).sub(first)).normalize();
        // Match the fixed three-quarter presentation; rear-facing skin stays faint instead of reading as a flat X-ray.
        const facing = -Math.sin(1.03) * second.x + Math.cos(1.03) * second.z;
        lighting[index] = .32 + .68 * Math.max(0, facing);
      });
      return { positions, lighting };
    }
    return {
      duration: clip.duration, vertexCount, boneCount: bones.size,
      sampleSurface,
      /** Sample the same barycentric skin locations, including the exact loop seam. */
      sampleFrame(time: number) { return sampleSurface(time).positions; },
      /** Release source geometry after offline baking or verification. */
      dispose() {
        mixer.stopAllAction();
        mixer.uncacheRoot(root);
        for (const mesh of meshes) {
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material.dispose());
        }
      },
    };
  } catch (error) {
    throw new Error('Unable to prepare the human walk asset.', { cause: error });
  }
}
