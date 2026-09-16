import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { DISCOVERIES, WORLDS, validateProgress, loadProgress, worldProgress, clampToIsland } from '../src/data.js';
import { OBSTACLES, findRoute, segmentClear } from '../src/navigation.js';
import { createAppServer } from '../scripts/server.mjs';

test('Saved progress recovers from corrupted, stale, or unavailable storage', () => {
  assert.deepEqual(validateProgress(['tensor-connect','tensor-connect','unknown',null,42,'one-ai']), ['tensor-connect','one-ai']);
  assert.deepEqual(loadProgress({ getItem: () => '{broken' }), []);
  assert.deepEqual(loadProgress({ getItem: () => null }), []);
  assert.deepEqual(loadProgress({ getItem: () => { throw Error('Storage disabled'); } }), []);
  assert.equal(worldProgress(DISCOVERIES.map(d => d.id), 'tensor'), 6);
  assert.equal(worldProgress(DISCOVERIES.map(d => d.id), 'one'), 6);
});

test('Every discovery is on its island and has an official product source', () => {
  assert.equal(new Set(DISCOVERIES.map(d => d.id)).size, 12);
  for (const d of DISCOVERIES) {
    assert.ok(Math.hypot(...d.position) < WORLDS[d.world].radius - 1);
    assert.equal(new URL(d.source).hostname, 'www.teamviewer.com');
    assert.equal(new URL(d.adminSource).hostname, 'www.teamviewer.com');
    assert.ok(d.sourceLabel && d.adminLabel);
    assert.ok(segmentClear(d.position, d.position, OBSTACLES[d.world]));
  }
});

test('TIA stays on the island at every approach angle', () => {
  for (let i = 0; i < 360; i++) {
    const x = Math.cos(i) * 100, z = Math.sin(i) * 100;
    const safe = clampToIsland(x, z, 13);
    assert.ok(Math.hypot(...safe) <= 13.000001);
  }
  assert.deepEqual(clampToIsland(2, 3, 13), [2, 3]);
});

test('Click-to-walk reaches every discovery from every other discovery without crossing a building', () => {
  for (const world of ['tensor', 'one']) {
    const locations = [WORLDS[world].spawn, ...DISCOVERIES.filter(d => d.world === world).map(d => d.position), [0, 11]];
    for (const start of locations) for (const end of locations) {
      const route = findRoute(start, end, OBSTACLES[world]);
      assert.ok(route.length > 0);
      assert.deepEqual(route.at(-1), end);
      let previous = start;
      for (const point of route) { assert.ok(segmentClear(previous, point, OBSTACLES[world]), `${world}: ${previous} to ${point}`); previous = point; }
    }
  }
});

test('A route can recover when TIA starts against a building', () => {
  const route = findRoute([0, 3], [0, -10], OBSTACLES.tensor);
  assert.ok(route.length > 2);
  assert.deepEqual(route.at(-1), [0, -10]);
});

test('The local server serves the complete site and rejects private or invalid paths', async () => {
  const server = createAppServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/src/main.js', '/src/scene.js', '/src/landscape.js', '/src/navigation.js', '/src/style.css', '/vendor/three/three.module.js', '/vendor/three/three.core.js', '/vendor/three/addons/geometries/RoundedBoxGeometry.js', '/fonts/manrope-latin.woff2']) {
      const response = await fetch(base + path); assert.equal(response.status, 200, path); assert.ok((await response.arrayBuffer()).byteLength > 0);
    }
    assert.equal((await fetch(base + '/.git/config')).status, 403);
    assert.equal((await fetch(base + '/package.json')).status, 404);
    assert.equal((await fetch(base + '/%E0%A4%A')).status, 400);
    assert.equal((await fetch(base + '/missing.js')).status, 404);
    assert.equal((await fetch(base, {method:'POST'})).status, 405);
    assert.match(await (await fetch(base)).text(), /lang="en"/);
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});
