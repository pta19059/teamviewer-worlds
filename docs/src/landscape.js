import * as THREE from 'three';
import { WORLDS, DISCOVERIES } from './data.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const geometry = {
  sphere: new THREE.SphereGeometry(1, 12, 8),
  rock: new THREE.IcosahedronGeometry(1, 0),
  cube: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 7),
  crystal: new THREE.OctahedronGeometry(1, 0),
  ring: new THREE.TorusGeometry(1, .045, 6, 40),
};
const materialCache = new Map();
function material(color, glow = 0) {
  const key = `${color}:${glow}`;
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({
    color, roughness: glow ? .3 : .84, emissive: color, emissiveIntensity: glow,
    flatShading: true,
  }));
  return materialCache.get(key);
}
function piece(parent, shape, color, position, scale = [1, 1, 1], glow = 0) {
  const object = new THREE.Mesh(geometry[shape], material(color, glow));
  object.position.set(...position); object.scale.set(...scale);
  object.castShadow = true; object.receiveShadow = true;
  parent.add(object); return object;
}
function group(parent, x = 0, y = 0, z = 0, scale = 1) {
  const object = new THREE.Group(); object.position.set(x, y, z); object.scale.setScalar(scale);
  parent.add(object); return object;
}
function beam(parent, color, from, to, width = .08) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.sub(a);
  const object = piece(parent, 'cylinder', color, a.addScaledVector(delta, .5).toArray(), [width, delta.length(), width]);
  object.quaternion.setFromUnitVectors(UP, delta.normalize()); return object;
}
function seededRandom(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

// Hundreds of small details share geometry and are drawn in material batches.
// Animated water, particles and floating ornaments live in a separate group.
function batchScenery(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(), batches = new Map();
  root.traverse(object => {
    if (!object.isMesh) return;
    const key = `${object.geometry.uuid}:${object.material.uuid}`;
    if (!batches.has(key)) batches.set(key, { geometry: object.geometry, material: object.material, matrices: [] });
    batches.get(key).matrices.push(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
  });
  root.clear();
  for (const batch of batches.values()) {
    const object = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, i) => object.setMatrixAt(i, matrix));
    object.instanceMatrix.needsUpdate = true; object.castShadow = true; object.receiveShadow = true;
    object.computeBoundingSphere(); root.add(object);
  }
}

const palettes = {
  hub: { grass: '#62ab45', light: '#a4d564', rock: '#9b7455', strata: '#d8af72', flower: '#ff7caa', crystal: '#a488ff', water: '#4bbfe0' },
  tensor: { grass: '#99bed6', light: '#eff8ff', rock: '#637f9e', strata: '#abcce3', flower: '#8a9fea', crystal: '#62d8ff', water: '#68c9f0' },
  one: { grass: '#369878', light: '#84d4a1', rock: '#758c7d', strata: '#b4cba0', flower: '#f496cd', crystal: '#79efd0', water: '#3ebdc1' },
};

function crystalCluster(parent, x, y, z, scale, color) {
  const cluster = group(parent, x, y, z, scale);
  piece(cluster, 'rock', '#8c92aa', [0, .14, 0], [.9, .26, .7]);
  for (const [dx, dz, height, tilt] of [[0, 0, 2.7, .12], [-.52, .12, 1.55, -.3], [.47, .2, 1.8, .35], [.18, -.42, 1.2, -.25]]) {
    const shard = piece(cluster, 'crystal', color, [dx, height * .47, dz], [.3, height * .57, .34], .32);
    shard.rotation.z = tilt;
    piece(cluster, 'crystal', '#efffff', [dx - .06, height * .66, dz + .17], [.055, height * .22, .06], .5).rotation.z = tilt;
  }
  return cluster;
}

function toadstool(parent, x, z, scale = 1, color = '#ee645b') {
  const g = group(parent, x, .12, z, scale);
  piece(g, 'cylinder', '#ffedc5', [0, .55, 0], [.24, 1.1, .24]);
  piece(g, 'sphere', '#f2d6a9', [0, 1, 0], [.86, .13, .86]);
  piece(g, 'sphere', color, [0, 1.12, 0], [.95, .55, .95]);
  for (let i = 0; i < 6; i++) {
    const angle = i * TAU / 6, radius = i ? .62 : 0;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const spot = piece(g, 'sphere', '#fff6df', [x, 1.12 + Math.sqrt(1 - radius * radius / .95 ** 2) * .55, z], [.15, .035, .15]);
    spot.quaternion.setFromUnitVectors(UP, new THREE.Vector3(x / .95 ** 2, (spot.position.y - 1.12) / .55 ** 2, z / .95 ** 2).normalize());
  }
}

function blossomTree(parent, x, z, scale = 1, color = '#efafd8') {
  const g = group(parent, x, .12, z, scale);
  beam(g, '#87708b', [0, 0, 0], [.12, 3.5, 0], .26);
  for (const [dx, dy, dz] of [[-1.1, 3.5, .25], [1.15, 3.8, .1], [.1, 4.3, -.55], [.55, 3.2, 1]]) {
    beam(g, '#87708b', [0, 1.7, 0], [dx, dy, dz], .11);
    piece(g, 'sphere', color, [dx, dy, dz], [1.3, 1.05, 1.18]);
    piece(g, 'sphere', '#ffd8e8', [dx - .27, dy + .5, dz + .15], [.78, .56, .78]);
  }
  for (let i = 0; i < 8; i++) piece(g, 'sphere', color, [Math.sin(i * 2.4) * 1.8, .02, Math.cos(i * 2.4) * 1.4], [.15, .035, .12]);
}

function ruins(parent, x, z, scale, color, broken = false) {
  const g = group(parent, x, .12, z, scale);
  for (const side of [-1, 1]) {
    piece(g, 'cube', '#c3c4bf', [side * 1.45, .12, 0], [1.1, .24, 1.05]);
    const height = broken && side === 1 ? 1.65 : 3.45;
    for (let j = 0; j < 5; j++) {
      if (j * .68 > height) break;
      piece(g, 'cube', '#e3e6d9', [side * 1.45, j * .68 + .4, 0], [.75, .62, .7]).rotation.y = j === 4 ? side * .09 : 0;
    }
    piece(g, 'cube', '#b3bfc0', [side * 1.45, height + .2, 0], [1.03, .3, 1.03]);
  }
  if (!broken) {
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI / 8;
      const stone = piece(g, 'cube', '#e8e9dc', [Math.cos(angle) * 1.45, 3.55 + Math.sin(angle) * 1.3, 0], [.6, .6, .75]);
      stone.rotation.z = angle;
    }
    piece(g, 'crystal', color, [0, 4.9, .43], [.25, .48, .17], .4);
  } else {
    piece(g, 'cube', '#ced6cf', [.5, .32, .9], [1.6, .45, .65]).rotation.y = .45;
  }
  for (let i = 0; i < 8; i++) piece(g, 'sphere', '#58a78b', [-1.7 + Math.sin(i) * .19, .5 + i * .4, .4], [.22, .15, .1]);
}

function cliffDetails(parent, id, random) {
  const { radius } = WORLDS[id], p = palettes[id];
  for (let i = 0; i < 34; i++) {
    const angle = i * TAU / 34, r = radius - .35;
    const ledge = piece(parent, 'rock', i % 3 ? p.rock : p.strata,
      [Math.cos(angle) * r, -1.8 - random() * 1.3, Math.sin(angle) * r],
      [.8 + random() * .7, 1.4 + random() * 1.1, .7 + random() * .4]);
    ledge.rotation.y = -angle;
    piece(parent, 'sphere', i % 3 ? p.grass : p.light,
      [Math.cos(angle) * (radius - .18), -.05, Math.sin(angle) * (radius - .18)], [1.2, .18, .8]);
    if (i % 3 === 0) {
      const shard = piece(parent, 'crystal', p.crystal, [Math.cos(angle) * (r - .3), -3.2, Math.sin(angle) * (r - .3)], [.45, 1.4, .6], .23);
      shard.rotation.z = Math.cos(angle) * .3;
    }
    if (id !== 'tensor' && i % 2 === 0) {
      for (let j = 0; j < 7; j++) {
        const a = angle + Math.sin(j * .9) * .015, length = .35 + j * .48;
        piece(parent, 'sphere', j % 2 ? p.grass : p.light,
          [Math.cos(a) * (radius + .2 - j * .08), -length, Math.sin(a) * (radius + .2 - j * .08)], [.24, .42, .2]);
      }
    }
  }
  // Silhouettes on the rear rim create depth without covering the discovery routes.
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * 1.13 + i * .115, r = radius + .35;
    const height = (id === 'tensor' ? 4 : 1.8) + random() * 2.5;
    piece(parent, id === 'tensor' ? 'cone' : 'sphere', i % 2 ? p.light : p.grass,
      [Math.cos(angle) * r, height * .34, Math.sin(angle) * r], [1.8, height, 1.5]);
    if (id === 'tensor') piece(parent, 'cone', '#f3fbff', [Math.cos(angle) * r, height * .77, Math.sin(angle) * r], [.77, height * .4, .65]);
  }
}

function groundDetails(parent, id, random) {
  const w = WORLDS[id], p = palettes[id], pathRadius = id === 'hub' ? 6 : 8;
  const clear = (x, z, margin = 2.6) => {
    if (Math.hypot(x, z + 2) < 5) return false;
    if (DISCOVERIES.some(d => d.world === id && Math.hypot(x - d.position[0], z - d.position[1]) < margin)) return false;
    const entrances = id === 'hub' ? [[-7, 5], [7, 2], w.spawn] : [[0, 11], w.spawn];
    return entrances.every(([px, pz]) => Math.hypot(x - px, z - pz) > margin);
  };
  for (let i = 0; i < 64; i++) {
    const a = i * TAU / 64, x = Math.cos(a) * pathRadius, z = Math.sin(a) * pathRadius;
    const stone = piece(parent, 'cube', i % 3 ? (id === 'tensor' ? '#e2f0f9' : '#edd8ab') : '#fff0d0', [x, .13, z], [.67, .07, .86]);
    stone.rotation.y = -a;
  }
  for (let i = 0; i < 145; i++) {
    const a = random() * TAU, r = 5 + random() * (w.radius - 5.7), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!clear(x, z) || Math.abs(r - pathRadius) < 1) continue;
    piece(parent, 'sphere', i % 2 ? p.grass : p.light, [x, .095, z], [.35 + random() * .55, .035, .28 + random() * .4]);
    for (let j = 0; j < 3; j++) {
      const blade = piece(parent, 'cone', j % 2 ? p.grass : p.light, [x + (j - 1) * .13, .27, z], [.075, .28 + random() * .32, .06]);
      blade.rotation.z = (j - 1) * .35;
    }
    if (i % 3 === 0) {
      for (let j = 0; j < 5; j++) piece(parent, 'sphere', i % 2 ? p.flower : '#fff3bd', [x + Math.cos(j * TAU / 5) * .13, .46, z + Math.sin(j * TAU / 5) * .13], [.12, .06, .12]);
      piece(parent, 'sphere', '#ffc453', [x, .5, z], [.07, .05, .07]);
    }
    if (i % 13 === 0 && r > w.radius - 3 && clear(x, z, 3.3)) toadstool(parent, x, z, .4 + random() * .25, id === 'tensor' ? '#829ef0' : '#ef817f');
  }
  // Small stepping stones lead toward the actual interactive golden blocks.
  for (const d of DISCOVERIES.filter(d => d.world === id)) {
    const [x, z] = d.position, distance = Math.hypot(x, z);
    for (let i = 0; i < 4; i++) {
      const r = pathRadius + i * (distance - pathRadius - 1.4) / 4;
      piece(parent, 'rock', id === 'tensor' ? '#f4fbff' : '#f8e4bb', [x / distance * r, .12, z / distance * r], [.35, .075, .26]).rotation.y = i;
    }
  }
}

function waterfall(parent, staticRoot, id, angle, width, uniforms) {
  const p = palettes[id], r = WORLDS[id].radius;
  const x = Math.sin(angle) * (r - .35), z = Math.cos(angle) * (r - .35);
  const bank = group(staticRoot, x, 0, z); bank.rotation.y = angle;
  piece(bank, 'sphere', '#cfdfbf', [0, .07, -1.1], [width * 1.4, .1, 2.7]);
  piece(bank, 'sphere', p.water, [0, .15, -1.1], [width * 1.22, .055, 2.45], .12);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    piece(bank, 'rock', i % 2 ? p.strata : p.rock, [Math.cos(a) * width * 1.3, .17, Math.sin(a) * 2.5 - 1.1], [.28, .23, .3]);
  }
  // A little wooden bridge sits across the head of the stream.
  for (let i = 0; i < 10; i++) piece(bank, 'cube', i % 2 ? '#cb9f70' : '#e2bb83', [(i - 4.5) * width * .25, .36 + Math.sin(i / 9 * Math.PI) * .17, -1.3], [width * .235, .15, 1.05]);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) piece(bank, 'cylinder', '#9b765b', [end * width * 1.2, .7, -1.3 + side * .6], [.09, 1.2, .09]);
    beam(bank, '#e8c994', [-width * 1.2, 1.08, -1.3 + side * .6], [width * 1.2, 1.08, -1.3 + side * .6], .05);
  }
  const positions = [], uvs = [], indices = [], segments = 30;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    for (const side of [-1, 1]) {
      positions.push(side * width * (.92 - t * .2), .16 - t * 10.5, .2 + Math.sin(t * Math.PI / 2) * 1.6);
      uvs.push((side + 1) / 2, t);
    }
    if (i < segments) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const curtain = new THREE.BufferGeometry();
  curtain.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  curtain.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  curtain.setIndex(indices); curtain.computeVertexNormals();
  const waterUniforms = { time: { value: 0 }, tint: { value: new THREE.Color(p.water) } };
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: waterUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float time; uniform vec3 tint; varying vec2 vUv;
      void main() {
        float ribbons = pow(.5 + .5 * sin(vUv.x * 74.0 + sin(vUv.y * 17.0 - time * 2.0)), 7.0);
        float foam = pow(.5 + .5 * sin(vUv.y * 65.0 - time * 5.0 + vUv.x * 9.0), 12.0);
        float edge = smoothstep(0.0, .07, vUv.x) * smoothstep(0.0, .07, 1.0 - vUv.x);
        gl_FragColor = vec4(mix(tint, vec3(.93, 1.0, 1.0), .2 + ribbons * .48 + foam * .22), edge * (1.0 - smoothstep(.73, 1.0, vUv.y)) * .88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const fall = new THREE.Mesh(curtain, waterMaterial);
  fall.position.set(x, 0, z); fall.rotation.y = angle; parent.add(fall); uniforms.push(waterUniforms);
  for (let i = 0; i < 8; i++) piece(bank, 'sphere', '#e1fcff', [(i - 3.5) * width * .22, .2, .19 + Math.sin(i) * .12], [.27, .09, .19], .1);
}

function floatingIsle(animated, id, angle, scale, floats) {
  const p = palettes[id], r = WORLDS[id].radius + 5;
  const isle = group(animated, Math.sin(angle) * r, 2.2, Math.cos(angle) * r, scale);
  piece(isle, 'cone', p.rock, [0, -1.45, 0], [2.2, 3.8, 2.2]).rotation.z = Math.PI;
  piece(isle, 'sphere', p.light, [0, .05, 0], [2.35, .3, 2.25]);
  crystalCluster(isle, 0, .15, 0, .78, p.crystal);
  const orbit = piece(isle, 'ring', '#f5dc91', [0, 1.2, 0], [2.45, 2.45, 2.45], .15); orbit.rotation.x = 1.18;
  // Batch the moving island internally; its transform can still float as one unit.
  batchScenery(isle);
  floats.push({ object: isle, y: isle.position.y, phase: angle, spin: 0, bob: .2 });
}

function ornaments(parent, id, floats) {
  const p = palettes[id], height = id === 'tensor' ? 10 : id === 'one' ? 8.4 : 8.3;
  const crown = group(parent, 0, height, id === 'hub' ? -3 : -2);
  piece(crown, 'crystal', p.crystal, [0, 0, 0], [.52, 1.25, .52], .45);
  const orbit = piece(crown, 'ring', '#ffe5a4', [0, -.05, 0], [1.35, 1.35, 1.35], .22); orbit.rotation.x = 1.12;
  for (let i = 0; i < 3; i++) piece(crown, 'crystal', '#fff0b4', [Math.cos(i * TAU / 3) * 1.35, 0, Math.sin(i * TAU / 3) * 1.35], [.12, .25, .12], .4);
  batchScenery(crown);
  floats.push({ object: crown, y: height, phase: 0, spin: .22, bob: .15 });
}

function landmarks(parent, animated, id, floats) {
  const p = palettes[id];
  if (id === 'hub') {
    toadstool(parent, -13, -6, 1.9, '#e95b60');
    toadstool(parent, -11.7, -7.8, .95, '#f5b84e');
    toadstool(parent, 12.8, 6.4, 1.3, '#ee7166');
    toadstool(parent, 11.3, 8.1, .68, '#f6be54');
    blossomTree(parent, 6, -13, .78, '#f3b0c0');
    ruins(parent, -1, -14.3, .72, p.crystal, true);
    // Chunky suspended platform blocks with raised golden studs.
    for (let i = 0; i < 3; i++) {
      const x = -7.5 + i * 1.25, y = 2.4 + Math.sin(i * 1.2) * .6;
      piece(parent, 'cube', i === 1 ? '#f7c258' : '#be8255', [x, y, -11.5], [1.05, 1.05, 1.05]);
      if (i === 1) piece(parent, 'crystal', '#fff6cf', [x, y, -10.95], [.23, .32, .065], .13);
      else for (const side of [-1, 1]) piece(parent, 'cube', '#e8b17b', [x, y + side * .23, -10.96], [.97, .04, .02]);
    }
    crystalCluster(parent, 12, .1, -8.7, .72, p.crystal);
    floatingIsle(animated, id, -1.6, .6, floats);
  } else if (id === 'tensor') {
    crystalCluster(parent, -15.2, .1, 4, 1.2, '#71d7ff');
    crystalCluster(parent, 15.5, .1, -7, 1.55, '#a5a1ff');
    crystalCluster(parent, 2, .1, -16, 1.1, '#73d8ec');
    ruins(parent, -11.7, -12.3, .92, p.crystal);
    ruins(parent, 13.9, 7.5, .6, p.crystal, true);
    // Window mullions, battlements and banners enrich the existing fortress.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        piece(parent, 'cube', '#d7e9fa', [side * 2.7, 5.48, -3.5 + i], [.48, .65, .5]);
        piece(parent, 'cube', '#accbe8', [side * 3.4, 3.5 + (i - 1.5) * .22, -.405], [.48, .025, .03]);
      }
      beam(parent, '#c8ab78', [side * 2.15, 4.4, .12], [side * 2.15, 4.4, .9], .045);
      piece(parent, 'cube', '#5679c5', [side * 2.15, 3.65, .9], [.65, 1.45, .07]);
      piece(parent, 'crystal', '#f3dd9e', [side * 2.15, 3.72, .95], [.2, .34, .035], .1);
    }
    floatingIsle(animated, id, -2.15, .72, floats);
  } else {
    blossomTree(parent, -15, -6.8, 1.1, '#d1a1de');
    blossomTree(parent, 14.4, 7.8, .88, '#f2b7d1');
    blossomTree(parent, 9.7, -13.6, .82, '#e4a6db');
    ruins(parent, -.7, -16, 1, p.crystal);
    crystalCluster(parent, -13.7, .1, 8.9, .8, p.crystal);
    crystalCluster(parent, 15.7, .1, -5.8, .85, '#c0adff');
    // Petalled copper canopy around the garden observatory.
    for (let i = 0; i < 10; i++) {
      const a = i * TAU / 10;
      const petal = piece(parent, 'ring', '#ead5a2', [Math.cos(a) * 1.85, 4.15, -2 + Math.sin(a) * 1.85], [1.4, 2.15, 1.4]);
      petal.rotation.set(.5, a, .6);
    }
    toadstool(parent, 4.8, -15.8, 1.15, '#aa89d0');
    floatingIsle(animated, id, 2, .7, floats);
  }
  ornaments(animated, id, floats);
}

function motes(parent, id, random, uniforms) {
  const count = id === 'tensor' ? 115 : 65, positions = [], phases = [], colors = [], p = palettes[id];
  for (let i = 0; i < count; i++) {
    const a = random() * TAU, r = 6 + random() * (WORLDS[id].radius - 6);
    positions.push(Math.cos(a) * r, .7 + random() * 5.5, Math.sin(a) * r);
    phases.push(random() * TAU);
    colors.push(...new THREE.Color(id === 'tensor' ? '#f6fcff' : i % 3 ? '#ffe6a2' : p.flower).toArray());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const particleUniforms = { time: { value: 0 }, snow: { value: id === 'tensor' ? 1 : 0 } };
  const shader = new THREE.ShaderMaterial({
    uniforms: particleUniforms, vertexColors: true, transparent: true, depthWrite: false,
    vertexShader: `uniform float time; uniform float snow; attribute float phase; varying vec3 vColor; varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(time * .35 + phase) * .45;
        p.y = mix(p.y + sin(time * .7 + phase) * .3, .4 + mod(p.y - time * .45 + 12.0, 6.0), snow);
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(155.0 / -view.z, 1.5, 6.0);
        vColor = color; vAlpha = mix(.55 + .4 * sin(phase + time), .78, snow);
      }`,
    fragmentShader: `varying vec3 vColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - .5);
        if (d > .5) discard;
        gl_FragColor = vec4(vColor, (1.0 - smoothstep(.05, .5, d)) * vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geo, shader);
  // The shader displaces the points slightly beyond their initial positions.
  geo.computeBoundingSphere(); geo.boundingSphere.radius += 1;
  parent.add(points); uniforms.push(particleUniforms);
}

export function addLandscape(parent, id) {
  const random = seededRandom({ hub: 481, tensor: 1927, one: 8823 }[id]);
  const staticRoot = group(parent), animated = group(parent), floats = [], uniforms = [];
  staticRoot.name = `${id}-landscape`; animated.name = `${id}-atmosphere`;
  cliffDetails(staticRoot, id, random);
  groundDetails(staticRoot, id, random);
  landmarks(staticRoot, animated, id, floats);
  waterfall(animated, staticRoot, id, id === 'tensor' ? .7 : -.85, id === 'one' ? 1.25 : .95, uniforms);
  if (id === 'one') waterfall(animated, staticRoot, id, 1.17, .65, uniforms);
  motes(animated, id, random, uniforms);
  batchScenery(staticRoot);
  return {
    update(time, reducedMotion) {
      if (!parent.visible) return;
      const t = reducedMotion ? 0 : time;
      for (const uniform of uniforms) uniform.time.value = t;
      for (const item of floats) {
        item.object.position.y = item.y + (reducedMotion ? 0 : Math.sin(t * .75 + item.phase) * item.bob);
        item.object.rotation.y = t * item.spin;
      }
    },
  };
}
