/** Build a deterministic surface-bound point cloud from a detailed Mixamo mesh and authored walk. */
import { readFile } from 'node:fs/promises';
import { AnimationClip, AnimationMixer, Box3, SkinnedMesh, Vector3, Quaternion } from 'three';
import { reshapeHumanPoint, resizeHumanFoot } from './human-proportions';
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
    const bindBounds = new Box3();
    const bindPoint = new Vector3();
    for (const mesh of meshes) {
      const positions = mesh.geometry.getAttribute('position');
      for (let index = 0; index < positions.count; index++) {
        bindPoint.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
        bindBounds.expandByPoint(bindPoint);
      }
    }
    const ankles = ['LeftFoot', 'RightFoot'].map((name) => {
      const bone = root.getObjectByName(`mixamorig${name}`);
      if (!bone) throw new Error(`Missing ankle bone: ${name}`);
      return reshapeHumanPoint(bone.getWorldPosition(new Vector3()), bindBounds);
    });
    function reshapeBindPoint(point: Vector3) {
      reshapeHumanPoint(point, bindBounds);
      const ankle = Math.abs(point.x - ankles[0].x) < Math.abs(point.x - ankles[1].x) ? ankles[0] : ankles[1];
      return resizeHumanFoot(point, ankle, bindBounds.min.y);
    }
    const boneTargets = new Map<import('three').Bone, Vector3>();
    for (const mesh of meshes) for (const bone of mesh.skeleton.bones) {
      if (!boneTargets.has(bone)) boneTargets.set(bone, reshapeBindPoint(bone.getWorldPosition(new Vector3())));
    }
    for (const mesh of meshes) {
      const positions = mesh.geometry.getAttribute('position');
      for (let index = 0; index < positions.count; index++) {
        bindPoint.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
        reshapeBindPoint(bindPoint);
        mesh.worldToLocal(bindPoint);
        positions.setXYZ(index, bindPoint.x, bindPoint.y, bindPoint.z);
      }
      positions.needsUpdate = true;
    }
    // Move joints with the tailored skin before rebuilding inverse bind matrices; otherwise knees and waist would drift.
    root.traverse((object) => {
      const target = boneTargets.get(object as import('three').Bone);
      if (!target) return;
      object.position.copy(object.parent ? object.parent.worldToLocal(target.clone()) : target);
      object.updateMatrixWorld(true);
    });
    root.updateMatrixWorld(true);
    for (const mesh of meshes) mesh.bind(mesh.skeleton, mesh.matrixWorld);
    const hip = root.getObjectByName('mixamorigHips');
    if (!hip) throw new Error('The expected Mixamo hip bone is missing.');
    const spine = root.getObjectByName('mixamorigSpine');
    const neck = root.getObjectByName('mixamorigNeck');
    const head = root.getObjectByName('mixamorigHead');
    if (!spine?.parent || !neck || !head?.parent) throw new Error('The posture bones are missing.');
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
    const spineBase = spine.quaternion.clone();
    const headBase = head.quaternion.clone();
    const preparePose = (time: number) => {
      if (!Number.isFinite(time) || time < 0) throw new RangeError('Frame time must be finite and nonnegative.');
      // Restore authored values before mixing: repeated samples must not accumulate corrective rotations.
      spine.quaternion.copy(spineBase);
      head.quaternion.copy(headBase);
      mixer.setTime(time % clip.duration);
      spineBase.copy(spine.quaternion);
      headBase.copy(head.quaternion);
      root.updateMatrixWorld(true);
      const torso = neck.getWorldPosition(new Vector3()).sub(spine.getWorldPosition(new Vector3()));
      const straighten = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.atan2(torso.z, torso.y));
      const spineWorld = spine.getWorldQuaternion(new Quaternion()).premultiply(straighten);
      spine.quaternion.copy(spine.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(spineWorld));
      root.updateMatrixWorld(true);
      // Keep the authored head yaw, with a six-degree downward gaze instead of an upturned chin.
      const headWorld = head.getWorldQuaternion(new Quaternion());
      const forward = new Vector3(0, 0, 1).applyQuaternion(headWorld);
      const yaw = Math.atan2(forward.x, forward.z);
      const downward = new Vector3(Math.sin(yaw) * Math.cos(.105), -Math.sin(.105), Math.cos(yaw) * Math.cos(.105));
      const lowerChin = new Quaternion().setFromUnitVectors(forward, downward);
      head.quaternion.copy(head.parent!.getWorldQuaternion(new Quaternion()).invert().multiply(headWorld.premultiply(lowerChin)));
      root.updateMatrixWorld(true);
    };
    /** Evaluate skinning before computing a surface normal, so lighting follows the pose. */
    function sampleSurface(time: number) {
      preparePose(time);
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
      /** Measure descending foot contact from the animated rig instead of guessing alternating timer offsets. */
      getFootContacts() {
        const contactFrames = 64;
        return ['LeftFoot', 'RightFoot'].map((name) => {
          const foot = root.getObjectByName(`mixamorig${name}`);
          if (!foot) throw new Error(`Missing foot bone: ${name}`);
          const path = Array.from({ length: contactFrames }, (_, frame) => {
            preparePose(frame / contactFrames * clip.duration);
            return foot.getWorldPosition(new Vector3()).sub(center).multiplyScalar(scale);
          });
          const threshold = Math.min(...path.map((point) => point.y)) + .035;
          const impact = path.findIndex((point, frame) => point.y <= threshold && path[(frame + contactFrames - 1) % contactFrames].y > threshold);
          if (impact < 0) throw new Error(`No descending ground contact for ${name}`);
          preparePose(impact / contactFrames * clip.duration);
          let floorHeight = Infinity;
          for (const mesh of meshes.filter((mesh) => /Shoes/.test(mesh.name))) {
            mesh.skeleton.update();
            for (let index = 0; index < mesh.geometry.getAttribute('position').count; index++) {
              mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld).sub(center).multiplyScalar(scale);
              floorHeight = Math.min(floorHeight, vertex.y);
            }
          }
          if (!Number.isFinite(floorHeight)) throw new Error('No shoe surface available for floor contact.');
          const position = path[impact].clone();
          position.y = floorHeight + .008;
          return { phase: impact / contactFrames, position: position.toArray() };
        });
      },
      /** Report sagittal alignment from the posed skeleton for animation regression checks. */
      samplePosture(time: number) {
        preparePose(time);
        const torso = neck.getWorldPosition(new Vector3()).sub(spine.getWorldPosition(new Vector3()));
        const forward = new Vector3(0, 0, 1).applyQuaternion(head.getWorldQuaternion(new Quaternion()));
        return { torsoLean: Math.atan2(torso.z, torso.y), facePitch: Math.atan2(forward.y, Math.hypot(forward.x, forward.z)) };
      },
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
