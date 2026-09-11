import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WORLDS, DISCOVERIES, clampToIsland } from './data.js';
import { OBSTACLES, findRoute } from './navigation.js';

const TAU = Math.PI * 2;
const materials = new Map();
function mat(color, extras = {}) {
  const key = color + JSON.stringify(extras);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .76, ...extras }));
  return materials.get(key);
}
function mesh(geo, color, parent, x = 0, y = 0, z = 0, extras = {}) {
  const m = new THREE.Mesh(geo, mat(color, extras));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function ball(parent, color, x, y, z, sx = 1, sy = sx, sz = sx) {
  const m = mesh(new THREE.SphereGeometry(1, 16, 12), color, parent, x, y, z);
  m.scale.set(sx, sy, sz); return m;
}
function box(parent, color, x, y, z, w, h, d, radius = .12) {
  return mesh(new RoundedBoxGeometry(w, h, d, 2, radius), color, parent, x, y, z);
}
function cylinder(parent, color, x, y, z, top, bottom, height, segments = 32) {
  return mesh(new THREE.CylinderGeometry(top, bottom, height, segments), color, parent, x, y, z);
}
function ring(parent, color, radius, tube, x, y, z) {
  return mesh(new THREE.TorusGeometry(radius, tube, 10, 64), color, parent, x, y, z);
}
function labelTexture(text, color = '#fff', background = null, size = 64) {
  // Some static hosts can preserve a mojibake apostrophe from an older build.
  // Normalize it at render time so every existing sign displays plain text.
  const printableText = text.replace(/\u00e2\u20ac\u2122/g, "'");
  // Render signage at 4× its displayed size so it stays crisp from the orbit camera.
  const pixelRatio = 4;
  const canvas = document.createElement('canvas'); canvas.width = 512 * pixelRatio; canvas.height = 128 * pixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  if (background) { ctx.fillStyle = background; ctx.beginPath(); ctx.roundRect(0, 0, 512, 128, 28); ctx.fill(); }
  ctx.font = `800 ${size}px Outfit, Arial, sans-serif`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(printableText, 256, 68);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}
function glyphTexture(text, color = '#fff') {
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.font='900 100px Arial';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,70);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function capSpots(parent,cx,cy,cz,rx,ry,rz) {
  for(const [u,v,r] of [[-.42,.05,.17],[.39,.4,.18],[.15,-.48,.18],[-.68,-.35,.13],[.7,-.21,.12]]){
    const x=u*rx,z=v*rz,y=Math.sqrt(1-u*u-v*v)*ry;
    const normal=new THREE.Vector3(x/(rx*rx),y/(ry*ry),z/(rz*rz)).normalize();
    const spot=ball(parent,'#fff9e9',cx+x+normal.x*.035,cy+y+normal.y*.035,cz+z+normal.z*.035,rx*r,.045,rx*r);
    spot.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
  }
}
function sign(parent, text, x, y, z, color = '#175cc8', width = 6) {
  // Retire the former recessed hub sign; the forward sign below is the single
  // readable welcome label.
  if (text.includes('CONNECT') && z < 0) return new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: labelTexture(text, color, '#ffffff'), transparent: true, side: THREE.DoubleSide }));
  plane.position.set(x, y, z); parent.add(plane); return plane;
}
function starGeometry(size = 1, depth = .3) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + Math.PI / 2; const r = i % 2 ? size * .46 : size; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (!i) shape.moveTo(x, y); else shape.lineTo(x, y); }
  shape.closePath(); return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .06, bevelThickness: .06 });
}
function mushroom(parent, x, z, scale = 1, color = '#ee514b') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, '#fff2d4', 0, .65, 0, .43, .57, 1.3);
  ball(g, color, 0, 1.35, 0, 1.16, .66, 1.16);
  cylinder(g, '#ffdcc5', 0, 1.19, 0, 1.1, 1.06, .16);
  capSpots(g,0,1.35,0,1.16,.66,1.16);
  return g;
}
function tree(parent, x, z, scale = 1, color = '#42b88b') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, '#a27653', 0, 1.05, 0, .18, .3, 2.1, 10);
  ball(g, color, 0, 2.4, 0, 1.18, 1.55, 1.1);
  ball(g, color, -.6, 2, .2, .7, .9, .7); ball(g, color, .65, 2.2, -.2, .75, 1, .8);
  return g;
}
function pine(parent, x, z, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, '#929eb9', 0, .65, 0, .2, .25, 1.3, 8);
  for (let i = 0; i < 3; i++) { mesh(new THREE.ConeGeometry(1.3 - i * .28, 1.7, 8), i % 2 ? '#d5e8f6' : '#eaf5fc', g, 0, 1.5 + i * .9, 0); }
}
function flower(parent, x, z, color = '#fff7ce') {
  cylinder(parent, '#4d9b67', x, .2, z, .026, .035, .4, 5);
  for (let j = 0; j < 5; j++) { const a = j * TAU / 5; ball(parent, color, x + Math.cos(a) * .13, .42, z + Math.sin(a) * .13, .1, .055, .1); }
  ball(parent, '#ffd35c', x, .46, z, .07);
}
function pipe(parent, x, z, color = '#2eae85', scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, color, 0, .8, 0, .8, .8, 1.6);
  cylinder(g, color, 0, 1.65, 0, 1.01, 1.01, .43);
  cylinder(g, '#174c4f', 0, 1.875, 0, .77, .77, .025);
  const edge = ring(g, '#63d9a6', .91, .065, 0, 1.89, 0); edge.rotation.x = Math.PI / 2;
  return g;
}
function beacon(parent, x, z, color = '#67b8f4', scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
  cylinder(g, '#dce9f6', 0, .72, 0, .22, .32, 1.3, 10);
  const light = ball(g, color, 0, 1.5, 0, .3); light.material = mat(color, { emissive: color, emissiveIntensity: .42 });
  const halo = ring(g, color, .45, .035, 0, 1.5, 0); halo.rotation.x = Math.PI / 2;
  return g;
}
function critter(parent, x, z, color = '#dca36d', scale = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); parent.add(g);
  ball(g, color, 0, .42, 0, .48, .34, .38); ball(g, color, .36, .62, .03, .24, .24, .23);
  ball(g, '#fff7e8', .45, .66, .21, .075); ball(g, '#243d6a', .52, .72, .22, .035);
  for (const ear of [-.08, .08]) ball(g, color, .31 + ear, .92, .02, .07, .28, .07);
  return g;
}
function createTia() {
  const tia = new THREE.Group(), body = new THREE.Group(); tia.add(body);
  const texture = new THREE.TextureLoader().load(new URL('../assets/tia-mascot.png', import.meta.url).href);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mascot = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  mascot.scale.set(3.1, 3.1, 1); mascot.position.y = 1.55; body.add(mascot);
  return { group: tia, body };
}
function island(id) {
  const w = WORLDS[id], g = new THREE.Group(), r = w.radius;
  g.position.fromArray(w.center); g.userData.world = id;
  const surface = id === 'tensor' ? '#e0effb' : id === 'one' ? '#8ddaaf' : '#ace278';
  cylinder(g, id === 'tensor' ? '#779ac5' : '#b99168', 0, -2.7, 0, r * .96, r * .67, 5, 12);
  cylinder(g, id === 'tensor' ? '#a8c6e0' : '#d5b58b', 0, -.95, 0, r, r * .96, 1.5, 48);
  cylinder(g, surface, 0, -.12, 0, r, r, .4, 64);
  const rock = mesh(new THREE.IcosahedronGeometry(r * .62, 0), id === 'tensor' ? '#91accb' : '#b8a38a', g, 0, -5, 0); rock.scale.set(1, .6, 1); rock.rotation.y = .2;
  for (let i = 0; i < 13; i++) {
    const a = i / 13 * TAU; const x = Math.cos(a) * (r - .7), z = Math.sin(a) * (r - .7);
    ball(g, surface, x, -.07, z, .7, .22, .72);
    if (i % 3 === 0) { const stone = mesh(new THREE.DodecahedronGeometry(.6, 0), id === 'tensor' ? '#b9d3ed' : '#c4bfa3', g, x * .95, .28, z * .95); stone.scale.y = .6; }
  }
  const path = ring(g, id === 'tensor' ? '#f7fcff' : '#f7e8bd', id === 'hub' ? 6 : 8, .62, 0, .075, 0); path.rotation.x = Math.PI / 2; path.scale.z = .13;
  if (id === 'hub') {
    cylinder(g, '#fff1cf', 0, .08, 0, 4.5, 4.5, .14);
    // Mushroom observatory: rounded plaster, striped cap, windows, arched entrance.
    cylinder(g, '#f7fcff', 0, 2.3, -3, 2.7, 3, 4.6);
    ball(g, '#6c8ef0', 0, 5, -3, 4.4, 2.1, 4.3);
    cylinder(g, '#bed7ff', 0, 4.52, -3, 4.15, 4.1, .25);
    box(g, '#4d7fe5', 0, 1.05, -.2, 1.3, 2.1, .18, .6);
    ball(g, '#b6f0e3', .38, 1.03, -.08, .08);
    // Keep the welcome sign beyond the roof's footprint so it is legible from the player camera.
    const welcomeSign = sign(g, 'LET’S CONNECT', 0, 3.05, .95, '#886943', 3.7);
    welcomeSign.renderOrder = 2;
    [-1, 1].forEach(s => { const win = ring(g, '#b9d7ff', .48, .11, s * 1.65, 2.9, -.78); win.rotation.y = s * .38; ball(g, '#86c5f5', s * 1.65, 2.9, -.78, .45, .45, .11); });
    sign(g, 'LET’S CONNECT', 0, 3.4, -.18, '#886943', 3.3);
    tree(g, -8, 2, 1.3); tree(g, 7, 6, .8); tree(g, -6, -7, .7);
    tree(g, 7, -6, 1.4); tree(g, -8, -4, 1.2); tree(g, 3, -9, .95);
    for (const [x,z] of [[-9,7],[-4,9],[8,8],[10,-4],[-10,-6]]) flower(g,x,z,'#f5a4c8');
    critter(g,-8,6,'#e8b46b',.7); critter(g,8,-8,'#f2d4a3',.58);
    pipe(g, -5.8, 1, '#2daf89');
    box(g, '#dcaa68', 6, 1.15, 1, 1.65, 1.65, 1.65);
    const q = sign(g, '?', 6, 1.16, 1.84, '#fff6d7', 1.1); q.material.map = labelTexture('?', '#fff6d7', null, 100);
  } else if (id === 'tensor') {
    cylinder(g, '#d1e0f1', 0, .22, -1, 4.2, 4.6, .5);
    box(g, '#f9fcff', 0, 2.6, -2, 5.6, 4.9, 3.9, .3);
    box(g, '#8eb5e5', 0, 5.13, -2, 6, .38, 4.3);
    for (const s of [-1, 1]) {
      cylinder(g, '#e6f1ff', s * 3.4, 3.2, -1.7, 1.25, 1.4, 6.4, 12);
      mesh(new THREE.ConeGeometry(1.7, 2.4, 12), '#4896ef', g, s * 3.4, 7.55, -1.7);
      box(g, '#74b7ed', s * 3.4, 3.5, -.47, .45, 1.1, .08);
      cylinder(g, '#d3e5f7', s * 3.4, 6.3, -1.7, 1.43, 1.43, .32, 12);
    }
    box(g, '#558ddd', 0, 1.25, .01, 1.5, 2.5, .2, .7);
    sign(g, 'TENSOR', 0, 4.25, .04, '#2465c7', 4.3);
    const emblem = ring(g, '#80c7fc', .85, .13, 0, 7.1, -2);
    mesh(starGeometry(.66, .16), '#ffdc7c', g, 0, 7.1, -1.95);
    cylinder(g, '#b8cde7', 0, 5.8, -2, .08, .08, 2.4);
    const moat = ring(g, '#64c6ef', 4.15, .34, 0, .16, -2); moat.rotation.x = Math.PI / 2; moat.material = mat('#64c6ef', { emissive: '#278fbd', emissiveIntensity: .12, roughness: .32 });
    for (const [x,z] of [[-11,-8],[-12,-3],[-11,3],[-9,8],[10,-8],[11,-3],[11,4],[8,8]]) pine(g,x,z,.75+((x+z)%3)*.12);
    for (const [x,z] of [[-7,8],[8,8],[-12,0]]) critter(g,x,z,'#b8d9ee',.72);
    pine(g,-10,-6,1.1); pine(g,9,-7,1.2); pine(g,1,-11,.9); pine(g,-10,5,.7);
    pipe(g,10,1,'#589ede',.8);
  } else {
    cylinder(g, '#e5f8e9', 0, .24, -2, 4.1, 4.6, .5);
    cylinder(g, '#f7fff9', 0, 2.2, -2, 2.9, 3.2, 4);
    cylinder(g, '#54b69b', 0, 3.3, -2, 3.04, 3.04, .2);
    ball(g, '#a3e8d3', 0, 4.1, -2, 3.35, 2.1, 3.35);
    for (let i=0;i<6;i++) { const a=i/6*TAU; box(g,'#62bea9',Math.sin(a)*3.17,2,Math.cos(a)*3.17-2,.58,1.7,.18,.2).rotation.y=a; }
    const orbit = ring(g, '#ffda82', 3.9, .09, 0, 6, -2); orbit.rotation.x = 1.17; orbit.rotation.z = .3;
    ball(g, '#ffc660', 3.3, 7.12, -1.2, .37);
    sign(g, 'ONE', 0, 3.5, 1.46, '#12886e', 3.4);
    box(g, '#58baa7', 0, 1.1, 1.24, 1.2, 2.1, .16, .55);
    tree(g,-10,-6,1.35,'#64c5a6'); tree(g,9,-6,1.3,'#8abe65'); tree(g,0,-11,1,'#70bd91');
    for (const [x,z,c] of [[-11,3,'#68c6ad'],[-8,8,'#95d078'],[8,8,'#64c5a6'],[11,2,'#93d47f'],[7,-10,'#62bfa4']]) tree(g,x,z,.78,c);
    critter(g,-9,6,'#f3d3a5',.62); critter(g,9,6,'#d9b2e7',.57);
    tree(g,10,1,.58,'#8fcf88'); pipe(g,-10,1,'#2cad8d',.8);
  }
  const beaconColor = id === 'tensor' ? '#6baef5' : id === 'one' ? '#60cfaa' : '#ffd16b';
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .42; beacon(g, Math.cos(a) * (r - 2.25), Math.sin(a) * (r - 2.25), beaconColor, .72 + (i % 2) * .12); }
  for (let i = 0; i < 22; i++) { const a = i * 2.399; const radius = r - 1.6 - (i % 3) * .55; flower(g, Math.cos(a)*radius,Math.sin(a)*radius,id==='tensor'?'#cadbff':i%2?'#fff6d3':'#f4aab8'); }
  return g;
}

export class WorldScene {
  constructor(container, callbacks, collected) {
    this.container = container; this.callbacks = callbacks; this.collected = new Set(collected);
    this.orbitYaw=Math.atan2(13,30);this.orbitPitch=.613;this.orbitDistance=41.5;
    this.mapOrbitYaw=Math.atan2(23,90);this.mapOrbitPitch=Math.asin(44/Math.hypot(23,44,90));this.mapOrbitDistance=Math.hypot(23,44,90);this.drag=null;
    this.active = 'map'; this.keys = new Set(); this.stations = []; this.portals = []; this.clouds = []; this.particles = []; this.elapsed = 0; this.paused = false; this.jumpY = 0; this.velocityY = 0; this.moveTarget = null; this.waypoints = []; this.pendingStation = null; this.nearest = null; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#e7f0fa', 100, 235);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.setAttribute('aria-label', 'TeamViewer 3D universe. Use WASD or the arrow keys to move TIA, Space to jump, and E to interact.');
    this.renderer.domElement.setAttribute('tabindex', '0'); container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction='pan-y';
    this.camera = new THREE.PerspectiveCamera(37, 1, .1, 350);
    this.camTarget = new THREE.Vector3(0, 0, -7); this.camPos = new THREE.Vector3(23, 44, 83); this.camera.position.copy(this.camPos); this.camera.lookAt(this.camTarget);
    this.scene.add(new THREE.HemisphereLight('#e5f4ff', '#a0a6bc', 1.8));
    const sun = new THREE.DirectionalLight('#fff1d9', 2.8); sun.position.set(-28, 65, 35); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left=-70; sun.shadow.camera.right=70; sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55; sun.shadow.normalBias=.05; sun.shadow.bias=-.0003; this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#b9dcff', .8); fill.position.set(35,20,-45); this.scene.add(fill);
    this.worldGroups = {};
    Object.keys(WORLDS).forEach(id => { const g = island(id); this.scene.add(g); this.worldGroups[id] = g; });
    this.tia = createTia(); this.tia.group.traverse(o=>{o.castShadow=false;}); this.tia.group.scale.setScalar(1.15); this.tia.group.position.set(1, .15, 5); this.tia.group.rotation.y = .15; this.scene.add(this.tia.group);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.72, 24), new THREE.MeshBasicMaterial({color:'#2c5460',opacity:.14,transparent:true,depthWrite:false})); this.shadow.rotation.x=-Math.PI/2; this.scene.add(this.shadow);
    DISCOVERIES.forEach((data,i) => {
      const g = new THREE.Group(); const [x,z] = data.position; g.position.set(x,0,z); this.worldGroups[data.world].add(g);
      cylinder(g, data.world==='tensor'?'#a3c7e9':'#c0e7ba',0,.14,0,1.1,1.2,.25);
      cylinder(g,'#fff7e2',0,.36,0,.86,1,.28);
      const cube = box(g,this.collected.has(data.id)?'#6ac39d':'#fbc75e',0,1.65,0,1.12,1.12,1.12,.12);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(.72,.72),new THREE.MeshBasicMaterial({map:glyphTexture(this.collected.has(data.id)?'✓':'?','#fff9e6'),transparent:true}));face.position.set(0,0,.57);cube.add(face);
      const face2 = face.clone();face2.rotation.y=Math.PI/2;face2.position.set(.57,0,0);cube.add(face2);
      const halo = ring(g,data.world==='tensor'?'#61a6ed':'#53bb98',.8,.035,0,1.6,0);halo.rotation.x=Math.PI/2;
      g.userData.discovery=data; cube.userData.discovery=data; face.userData.discovery=data; face2.userData.discovery=data;
      this.stations.push({group:g,cube,halo,data,base:1.65,phase:i*.8,faces:[face,face2]});
    });
    this.createPortal('tensor',-7,5,'#54a8f3','TENSOR'); this.createPortal('one',7,2,'#4dd8ac','ONE');
    for (const id of ['tensor','one']) this.createPortal('hub',0,11,'#ffd17c','HOME',id,.65);
    this.makeSky(); this.makeTrails();
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2(); this.ground = new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.resizeObserver = new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(container); this.resize();
    this.renderer.domElement.addEventListener('pointerdown',e=>{if(this.paused)return;this.drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};this.renderer.domElement.setPointerCapture(e.pointerId);});
    this.renderer.domElement.addEventListener('pointermove',e=>{if(!this.drag||this.paused)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(e.clientX-this.drag.startX,e.clientY-this.drag.startY)>7)this.drag.moved=true;if(this.drag.moved){if(this.active==='map'){this.mapOrbitYaw-=dx*.006;this.mapOrbitPitch=THREE.MathUtils.clamp(this.mapOrbitPitch+dy*.004,.28,.82);}else{this.orbitYaw-=dx*.006;this.orbitPitch=THREE.MathUtils.clamp(this.orbitPitch+dy*.004,.36,1.2);}this.renderer.domElement.style.cursor='grabbing';}this.drag.x=e.clientX;this.drag.y=e.clientY;});
    this.renderer.domElement.addEventListener('pointerup',e=>{if(this.drag&&!this.drag.moved)this.pointerDown(e);this.drag=null;this.renderer.domElement.style.cursor='';});
    this.renderer.domElement.addEventListener('pointercancel',()=>{this.drag=null;this.renderer.domElement.style.cursor='';});
    this.renderer.domElement.addEventListener('wheel',e=>{if(this.paused)return;e.preventDefault();if(this.active==='map')this.mapOrbitDistance=THREE.MathUtils.clamp(this.mapOrbitDistance+e.deltaY*.045,76,138);else this.orbitDistance=THREE.MathUtils.clamp(this.orbitDistance+e.deltaY*.02,29,65);},{passive:false});
    window.addEventListener('keydown',event=>this.keyDown(event)); window.addEventListener('keyup',event=>this.keys.delete(event.code)); window.addEventListener('blur',()=>this.keys.clear());
    document.addEventListener('visibilitychange',()=>{this.keys.clear();this.previous=performance.now();});
    this.previous=performance.now(); this.animate=this.animate.bind(this); this.raf=requestAnimationFrame(this.animate);
  }
  createPortal(target,x,z,color,text,parent='hub',scale=1) {
    const g = new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);this.worldGroups[parent].add(g);
    cylinder(g,'#e6e5d5',0,.2,0,1.8,2,.4);
    const arch=ring(g,color,1.6,.23,0,2.2,0); arch.material=mat(color,{emissive:color,emissiveIntensity:.16});
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.38,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false}));glow.position.set(0,2.2,0);g.add(glow);
    sign(g,text,0,4.5,0,color,3.7);
    for (const s of [-1,1]) box(g,'#f3f3e9',s*1.55,1.1,0,.42,2.2,.6);
    g.traverse(o=>{o.userData.portal={target,parent};});
    this.portals.push({group:g,glow,target,parent});
  }
  makeSky() {
    for(let i=0;i<24;i++) {
      const g=new THREE.Group(); const a=i*2.399; const r=35+(i%4)*12;
      g.position.set(Math.cos(a)*r,-9-(i%3)*3,Math.sin(a)*r-17);
      const s=1.15+(i%3)*.5; ball(g,'#ffffff',0,0,0,3*s,1*s,1.5*s);ball(g,'#ffffff',-1.2*s,.5*s,0,1.7*s,1.3*s,1.4*s);ball(g,'#ffffff',1.4*s,.45*s,0,1.9*s,1.4*s,1.6*s);
      g.traverse(o=>{o.castShadow=false;});this.scene.add(g);this.clouds.push({group:g,x:g.position.x,phase:i});
    }
    // Tiny drifting gold stars between the islands.
    for(let i=0;i<15;i++){ const s=mesh(starGeometry(.23+(i%3)*.12,.1),'#f2c86d',this.scene,Math.sin(i*2.4)*41,4+(i%4)*2,Math.cos(i*2.4)*24-7);s.rotation.z=i;this.particles.push({mesh:s,y:s.position.y,phase:i}); }
    for (let i = 0; i < 3; i++) {
      const satellite = new THREE.Group(), a = i * TAU / 3 + .6, radius = 42 + i * 7;
      satellite.position.set(Math.cos(a) * radius, 12 + i * 4, Math.sin(a) * 26 - 10);
      box(satellite, '#6f9ee8', 0, 0, 0, .65, .4, .65, .08);
      box(satellite, '#8cd2f4', -1.15, 0, 0, 1.25, .06, .55, .03); box(satellite, '#8cd2f4', 1.15, 0, 0, 1.25, .06, .55, .03);
      ball(satellite, '#ffe38b', 0, .42, 0, .16); this.scene.add(satellite); this.particles.push({ mesh: satellite, y: satellite.position.y, phase: i * 2.1 });
    }
  }
  makeTrails() {
    for(const target of ['tensor','one']) {
      const center=new THREE.Vector3(...WORLDS[target].center);
      const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(target==='tensor'?-9:9,-1,-4),new THREE.Vector3(center.x*.55,0,-10),center.clone().add(new THREE.Vector3(0,-1,8)));
      for(let i=0;i<20;i++){const p=curve.getPoint(i/20);ball(this.scene,'#ffffff',p.x,p.y,p.z,.13);}
    }
  }
  resize() {
    const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;
    this.viewport={width,height,left:this.container.offsetLeft,top:this.container.offsetTop};
    this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  }
  enter(id) {
    this.active=id;this.moveTarget=null;this.waypoints=[];this.pendingStation=null;this.keys.clear();this.jumpY=0;this.velocityY=0;
    const w=WORLDS[id]; this.tia.group.position.set(w.center[0]+w.spawn[0],w.center[1]+.15,w.center[2]+w.spawn[1]);this.tia.group.rotation.y=Math.PI;
    Object.entries(this.worldGroups).forEach(([key,g])=>{g.visible=key===id;});
    this.orbitYaw=Math.atan2(13,30);this.orbitPitch=.613;this.orbitDistance=Math.max(41.5,w.radius*2.85);this.renderer.domElement.style.touchAction='none';
    this.renderer.shadowMap.needsUpdate=true;
    this.nearest=null;this.callbacks.near(null);this.resize();
  }
  showMap() {this.active='map';Object.values(this.worldGroups).forEach(g=>{g.visible=true;});this.renderer.shadowMap.needsUpdate=true;this.renderer.domElement.style.touchAction='none';this.keys.clear();this.moveTarget=null;this.waypoints=[];this.pendingStation=null;this.nearest=null;this.callbacks.near(null);}
  setPaused(value) {this.paused=value;this.keys.clear();if(value){this.moveTarget=null;this.waypoints=[];this.pendingStation=null;}}
  keyDown(e) {
    if(this.paused || this.active==='map' || /INPUT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable)return;
    if(e.target.tagName==='BUTTON' && e.code==='Space')return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyE'].includes(e.code))e.preventDefault();
    this.keys.add(e.code);
    if(e.code==='Space'&&!e.repeat)this.jump();
    if(e.code==='KeyE'&&!e.repeat)this.interact();
  }
  jump() {if(this.active==='map'||this.paused)return;if(this.jumpY<=.001){this.velocityY=7.8;this.callbacks.sound('jump');}}
  interact() {
    if(this.paused)return;
    if(this.nearest?.type==='discovery')this.callbacks.discover(this.nearest.data);
    else if(this.nearest?.type==='portal')this.callbacks.travel(this.nearest.target);
  }
  pointerDown(e) {
    if(this.paused)return;
    const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    if(this.active==='map') {
      const hits=this.raycaster.intersectObjects(Object.values(this.worldGroups),true);
      if(hits.length){let o=hits[0].object;while(o&&!o.userData.world)o=o.parent;if(o)this.callbacks.travel(o.userData.world);}return;
    }
    // Pick discovery groups first. This makes a visible block selectable even when the
    // fortress geometry sits between the camera and its lower edge.
    const discoveryHits=this.raycaster.intersectObjects(this.stations.filter(s=>s.data.world===this.active).map(s=>s.group),true);
    for(const hit of discoveryHits){if(hit.object.userData.discovery){this.walkTo(hit.object.userData.discovery);return;}}
    const hits=this.raycaster.intersectObject(this.worldGroups[this.active],true);
    for(const hit of hits){if(hit.object.userData.discovery){this.walkTo(hit.object.userData.discovery);return;}if(hit.object.userData.portal){const p=this.portals.find(p=>p.parent===this.active&&p.target===hit.object.userData.portal.target);this.setDestination(p.group.getWorldPosition(new THREE.Vector3()),{type:'portal',target:p.target});return;}}
    this.ground.constant=-WORLDS[this.active].center[1];const p=new THREE.Vector3();
    if(this.raycaster.ray.intersectPlane(this.ground,p)){const c=WORLDS[this.active].center;const [x,z]=clampToIsland(p.x-c[0],p.z-c[2],WORLDS[this.active].radius-1.1);this.setDestination(new THREE.Vector3(x+c[0],c[1],z+c[2]));}
    this.renderer.domElement.focus({preventScroll:true});
  }
  walkTo(data) {
    if(this.active!==data.world)return;
    const station=this.stations.find(s=>s.data.id===data.id);this.setDestination(station.group.getWorldPosition(new THREE.Vector3()),{type:'discovery',data});
  }
  setDestination(target,pending=null) {
    const c=WORLDS[this.active].center,p=this.tia.group.position;
    this.waypoints=findRoute([p.x-c[0],p.z-c[2]],[target.x-c[0],target.z-c[2]],OBSTACLES[this.active]).map(([x,z])=>new THREE.Vector3(x+c[0],c[1],z+c[2]));
    this.moveTarget=this.waypoints.shift()||null;this.pendingStation=pending;
  }
  collect(id) {
    this.collected.add(id);const s=this.stations.find(s=>s.data.id===id);if(!s)return;
    s.cube.material=mat('#6ac39d');const tex=glyphTexture('✓','#ffffff');s.faces.forEach(f=>{f.material=new THREE.MeshBasicMaterial({map:tex,transparent:true});});
    const p=s.group.getWorldPosition(new THREE.Vector3());
    for(let i=0;i<16;i++){const m=mesh(new THREE.BoxGeometry(.11,.23,.07),i%2?'#ffd16b':'#6cbeaa',this.scene,p.x,p.y+2,p.z);this.particles.push({mesh:m,life:1.5,velocity:new THREE.Vector3((Math.random()-.5)*5,3+Math.random()*3,(Math.random()-.5)*5)});}
  }
  move(dt) {
    const p=this.tia.group.position,w=WORLDS[this.active], direction=new THREE.Vector3(), blockClearance=2.3;
    const horizontal=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0);
    const vertical=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0);
    if(horizontal||vertical){this.moveTarget=null;this.waypoints=[];this.pendingStation=null;const c=Math.cos(this.orbitYaw),s=Math.sin(this.orbitYaw);direction.set(horizontal*c+vertical*s,0,vertical*c-horizontal*s).normalize();}
    else if(this.moveTarget){direction.subVectors(this.moveTarget,p);direction.y=0;const arrivalDistance=!this.waypoints.length&&this.pendingStation?(this.pendingStation.type==='discovery'?2.7:1.65):.16;if(direction.length()<arrivalDistance){this.moveTarget=this.waypoints.shift()||null;if(!this.moveTarget){const pending=this.pendingStation;this.pendingStation=null;if(pending){if(pending.type==='discovery')this.callbacks.discover(pending.data);else this.callbacks.travel(pending.target);}}direction.set(0,0,0);}else direction.normalize();}
    const speed=this.keys.has('ShiftLeft')?8.5:6;
    p.addScaledVector(direction,dt*speed);
    let x=p.x-w.center[0],z=p.z-w.center[2];[x,z]=clampToIsland(x,z,w.radius-1);p.x=x+w.center[0];p.z=z+w.center[2];
    // Keep the hero outside the central buildings, including while following a clicked station.
    const obstacleZ=OBSTACLES[this.active].z, obstacleRadius=OBSTACLES[this.active].radius;let dx=x,dz=z-obstacleZ;const dist=Math.hypot(dx,dz);
    if(dist<obstacleRadius){if(dist<.001){dx=0;dz=1;}const a=Math.atan2(dz,dx);p.x=w.center[0]+Math.cos(a)*obstacleRadius;p.z=w.center[2]+obstacleZ+Math.sin(a)*obstacleRadius;}
    // Golden discovery blocks stop manual movement. Click-to-walk keeps its route intact,
    // so a block positioned near another one cannot cancel the selected discovery.
    if (!this.pendingStation) for (const station of this.stations) {
      if (station.data.world !== this.active) continue;
      const block = station.group.getWorldPosition(new THREE.Vector3()), bx = p.x - block.x, bz = p.z - block.z, distance = Math.hypot(bx, bz);
      if (distance >= blockClearance) continue;
      const angle = Math.atan2(distance < .001 ? 1 : bz, distance < .001 ? 0 : bx);
      p.x = block.x + Math.cos(angle) * blockClearance; p.z = block.z + Math.sin(angle) * blockClearance;
      direction.set(0, 0, 0); this.moveTarget = null; this.waypoints = []; this.pendingStation = null;
      break;
    }
    x = p.x - w.center[0]; z = p.z - w.center[2];
    if(direction.lengthSq()>.01){const angle=Math.atan2(direction.x,direction.z);const delta=Math.atan2(Math.sin(angle-this.tia.group.rotation.y),Math.cos(angle-this.tia.group.rotation.y));this.tia.group.rotation.y+=delta*Math.min(dt*14,1);}
    this.velocityY-=19*dt;this.jumpY=Math.max(0,this.jumpY+this.velocityY*dt);if(!this.jumpY)this.velocityY=0;p.y=w.center[1]+.15+this.jumpY;
    const walking=direction.lengthSq()>.01;this.animateTia(walking,this.elapsed);
    let nearest=null, min=2.7;
    for(const s of this.stations.filter(s=>s.data.world===this.active)){const wp=s.group.getWorldPosition(new THREE.Vector3());const d=Math.hypot(p.x-wp.x,p.z-wp.z);if(d<min){min=d;nearest={type:'discovery',data:s.data};}}
    for(const portal of this.portals.filter(po=>po.parent===this.active)){const wp=portal.group.getWorldPosition(new THREE.Vector3());const d=Math.hypot(p.x-wp.x,p.z-wp.z);if(d<min){min=d;nearest={type:'portal',target:portal.target};}}
    const prevId=this.nearest?.data?.id||this.nearest?.target;const nextId=nearest?.data?.id||nearest?.target;if(prevId!==nextId){this.nearest=nearest;this.callbacks.near(nearest);}
    this.callbacks.position(x,z);
  }
  animateTia(walking,t) {this.tia.body.position.y=walking?Math.abs(Math.sin(t*11))*.09:Math.sin(t*2.5)*.035;this.tia.body.rotation.z=walking?Math.sin(t*11)*.05:Math.sin(t*2)*.018;}
  animate(now) {
    this.raf=requestAnimationFrame(this.animate);const dt=Math.min((now-this.previous)/1000,.045);this.previous=now;if(document.hidden)return;this.elapsed+=dt;
    const t=this.elapsed;
    if(this.active!=='map'&&!this.paused)this.move(dt);else this.animateTia(false,t);
    let desiredPos,desiredTarget;
    if(this.active==='map'){
      const factor=Math.max(1,1.52/this.camera.aspect);
      this.scene.fog.near=120*factor;this.scene.fog.far=235*factor;
      desiredTarget=new THREE.Vector3(0,0,-7);const d=this.mapOrbitDistance*factor,flat=d*Math.cos(this.mapOrbitPitch);desiredPos=desiredTarget.clone().add(new THREE.Vector3(Math.sin(this.mapOrbitYaw)*flat,Math.sin(this.mapOrbitPitch)*d,Math.cos(this.mapOrbitYaw)*flat));
    }else{
      this.scene.fog.near=100;this.scene.fog.far=235;
      const p=this.tia.group.position,c=WORLDS[this.active].center;
      desiredTarget=new THREE.Vector3(c[0]*.78+p.x*.22,c[1]+1.2,c[2]*.78+p.z*.22-1.7);
      const zoom=this.camera.aspect<.9?1.35:1,d=this.orbitDistance*zoom,flat=d*Math.cos(this.orbitPitch);desiredPos=desiredTarget.clone().add(new THREE.Vector3(Math.sin(this.orbitYaw)*flat,Math.sin(this.orbitPitch)*d,Math.cos(this.orbitYaw)*flat));
    }
    const lerp=this.reduced?1:1-Math.exp(-dt*3);this.camPos.lerp(desiredPos,lerp);this.camTarget.lerp(desiredTarget,lerp);this.camera.position.copy(this.camPos);this.camera.lookAt(this.camTarget);
    if(this.active==='map'&&this.callbacks.labels&&this.viewport){
      const positions={};for(const id of ['tensor','one']){const w=WORLDS[id],v=new THREE.Vector3(w.center[0],w.center[1]+10,w.center[2]).project(this.camera);positions[id]={x:(v.x*.5+.5)*this.viewport.width+this.viewport.left,y:(-v.y*.5+.5)*this.viewport.height+this.viewport.top};}this.callbacks.labels(positions);
    }
    for(const s of this.stations){s.cube.position.y=s.base+(this.reduced?0:Math.sin(t*2+s.phase)*.17);s.cube.rotation.y=this.reduced?.25:t*.45+s.phase*.2;s.halo.position.y=s.cube.position.y-.4;}
    for(const p of this.portals)p.glow.material.opacity=.22+(this.reduced?0:Math.sin(t*2)*.07);
    for(const c of this.clouds)if(!this.reduced)c.group.position.x=c.x+Math.sin(t*.07+c.phase)*1.6;
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];if(p.life!==undefined){p.life-=dt;p.mesh.position.addScaledVector(p.velocity,dt);p.velocity.y-=8*dt;p.mesh.rotation.z+=dt*4;if(p.life<0){this.scene.remove(p.mesh);p.mesh.geometry.dispose();this.particles.splice(i,1);}}else if(!this.reduced){p.mesh.position.y=p.y+Math.sin(t+p.phase)*.4;p.mesh.rotation.y=t*.4;}}
    const base=this.active==='map'?0:WORLDS[this.active].center[1];this.shadow.position.set(this.tia.group.position.x,base+.13,this.tia.group.position.z);this.shadow.scale.setScalar(1-this.jumpY*.13);
    this.renderer.render(this.scene,this.camera);
  }
}
