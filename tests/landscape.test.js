import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from '../public/vendor/three/three.module.js';
import { WORLDS } from '../src/data.js';

// Resolve the same bundled Three.js module as the browser's import map.
const imports = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === 'three' ? new URL('../public/vendor/three/three.module.js', import.meta.url).href : specifier, context);
  },
});
const { addLandscape } = await import('../src/landscape.js');
imports.deregister();

for (const id of Object.keys(WORLDS)) {
  test(`${id}: detailed scenery has finite geometry, bounded batches and no remote assets`, () => {
    const root = new THREE.Group(); root.position.fromArray(WORLDS[id].center);
    addLandscape(root, id);
    let meshes = 0, instances = 0, waterfalls = 0;
    root.traverse(object => {
      if (object.isMesh || object.isPoints) {
        meshes++;
        assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite));
        assert.ok(!object.material.map, 'Scenery uses procedural materials');
      }
      if (object.isInstancedMesh) {
        instances += object.count;
        assert.ok(Array.from(object.instanceMatrix.array).every(Number.isFinite));
        assert.ok(Number.isFinite(object.boundingSphere.radius));
        assert.ok(object.boundingSphere.radius < 100, 'Instance bounds stay local to their island');
      }
      if (object.material?.uniforms?.tint) {
        waterfalls++;
        const indices = object.geometry.index.array, vertices = object.geometry.attributes.position.count;
        assert.ok(Array.from(indices).every(index => index >= 0 && index < vertices));
      }
    });
    assert.ok(instances > 650, 'The island includes dense scenery');
    assert.ok(meshes < 100, `Scenery is batched: ${meshes} draws for ${instances} details`);
    assert.equal(waterfalls, id === 'one' ? 2 : 1);
  });

  test(`${id}: reduced motion freezes all landscape animation and hidden worlds skip updates`, () => {
    const root = new THREE.Group(), landscape = addLandscape(root, id);
    const state = () => {
      root.updateMatrixWorld(true);
      const result = [];
      root.traverse(object => result.push([...object.matrixWorld.elements, object.material?.uniforms?.time?.value ?? 0]));
      return result;
    };
    landscape.update(0, true); const still = state();
    landscape.update(8, false); assert.notDeepEqual(state(), still);
    landscape.update(15, true); assert.deepEqual(state(), still);
    root.visible = false;
    landscape.update(20, false); assert.deepEqual(state(), still);
  });
}
