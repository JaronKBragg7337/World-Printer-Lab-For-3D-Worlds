import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

const BUILD = 'v2 — experimental (improved printer + textures)';
const app = document.querySelector('#app');

app.innerHTML = `
  <canvas id="world"></canvas>
  <section id="hud">
    <div class="topline">
      <h1>World Printer Lab <span class="mode-badge">v2</span></h1>
      <button id="toggleHud" class="secondary">Hide</button>
    </div>
    <div class="hud-body">
      <div style="margin-bottom:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button id="switchToV1" class="secondary" style="flex:1; min-width:120px;">← Switch to v1 (stable)</button>
        <button id="switchToV2" class="secondary" style="flex:1; min-width:120px; border-color:#00ff9d; color:#00ff9d;" disabled> v2 (experimental) </button>
      </div>

      <p class="note"><b>${BUILD}</b> — higher detail printer, better layer deposition, and realistic PBR textures coming here.</p>

      <div class="section-title">Speak / Type Object</div>
      <div class="row">
        <input id="commandInput" value="make a cottage" aria-label="Object command" />
        <button id="runCommand">Print</button>
        <button id="voiceButton" class="secondary">🎙</button>
      </div>

      <div class="section-title">Object Recipes</div>
      <div class="row" id="recipeButtons"></div>

      <div class="section-title">Printer Bed Flow</div>
      <div class="row">
        <button id="pickupPrint" disabled>Pick Up Print</button>
        <button id="placeObject" disabled>Place</button>
        <button class="danger" id="cancelObject">Cancel/Delete</button>
      </div>

      <div class="section-title">Move / Rotate After Pickup</div>
      <div class="row">
        <button class="secondary" id="moveLeft">←</button>
        <button class="secondary" id="moveForward">↑</button>
        <button class="secondary" id="moveBack">↓</button>
        <button class="secondary" id="moveRight">→</button>
        <button class="secondary" id="rotateLeft">Rot −</button>
        <button class="secondary" id="rotateRight">Rot +</button>
      </div>

      <div class="section-title">State</div>
      <div class="row">
        <span class="pill" id="statePill">ready</span>
        <span class="pill">print bed first</span>
        <span class="pill">slow layers</span>
        <span class="pill">pickup required</span>
      </div>

      <div id="status">v2 mode active. Improvements to printer model and printing visuals will appear here.</div>
      <div id="selected">Target: none</div>
    </div>
  </section>
  <aside id="help">v2 experimental — print on bed → pick up → move preview → place. Drag to orbit.</aside>
`;

const canvas = document.querySelector('#world');
const hud = document.querySelector('#hud');
const toggleHud = document.querySelector('#toggleHud');
const statusEl = document.querySelector('#status');
const selectedEl = document.querySelector('#selected');
const statePill = document.querySelector('#statePill');
const commandInput = document.querySelector('#commandInput');
const recipeButtons = document.querySelector('#recipeButtons');
const runButton = document.querySelector('#runCommand');
const pickupButton = document.querySelector('#pickupPrint');
const placeButton = document.querySelector('#placeObject');
const cancelButton = document.querySelector('#cancelObject');
const voiceButton = document.querySelector('#voiceButton');
const switchToV1 = document.querySelector('#switchToV1');

const switchToV2 = document.querySelector('#switchToV2');

if (window.innerWidth <= 720) {
  hud.classList.add('collapsed', 'mobile-start');
  toggleHud.textContent = 'Open';
}

toggleHud.addEventListener('click', () => {
  hud.classList.toggle('collapsed');
  hud.classList.remove('mobile-start');
  toggleHud.textContent = hud.classList.contains('collapsed') ? 'Open' : 'Hide';
});

// Mode switching
switchToV1.addEventListener('click', () => {
  localStorage.setItem('printerLabMode', 'v1');
  window.location.reload();
});

function setStatus(text) { statusEl.textContent = text; }
function setState(text) { statePill.textContent = text; }
function setTarget(text) { selectedEl.textContent = `Target: ${text}`; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1516);
scene.fog = new THREE.Fog(0x0a1516, 34, 105);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(11.5, 8.2, 13.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.9, -0.5);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 55;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

const materials = {
  ground: new THREE.MeshLambertMaterial({ color: 0x1b2924 }),
  accent: new THREE.MeshLambertMaterial({ color: 0x00ff9d }),
  printerDark: new THREE.MeshLambertMaterial({ color: 0x252c2a }),
  printerMid: new THREE.MeshLambertMaterial({ color: 0x59645f }),
  metal: new THREE.MeshLambertMaterial({ color: 0x8b9691 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x8c6138 }),
  darkWood: new THREE.MeshLambertMaterial({ color: 0x51331f }),
  wall: new THREE.MeshLambertMaterial({ color: 0xc4aa78 }),
  roofRed: new THREE.MeshLambertMaterial({ color: 0x9b3f48 }),
  cloth: new THREE.MeshLambertMaterial({ color: 0xd87052 }),
  clothCream: new THREE.MeshLambertMaterial({ color: 0xf4d59a }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x4fbf68 }),
  leafDark: new THREE.MeshLambertMaterial({ color: 0x2d7d4f }),
  water: new THREE.MeshLambertMaterial({ color: 0x4bbbd4, transparent: true, opacity: 0.42 }),
  stone: new THREE.MeshLambertMaterial({ color: 0x7c817b }),
  flame: new THREE.MeshBasicMaterial({ color: 0xff8a20 }),
  glass: new THREE.MeshLambertMaterial({ color: 0x8fd7ff }),
  ghost: new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.32, wireframe: true, depthWrite: false }),
  filament: new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.88, depthWrite: false }),
  selection: new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: 0.85, wireframe: true, depthWrite: false }),
  player: new THREE.MeshLambertMaterial({ color: 0x60a5ff })
};

function shadow(root) {
  root.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return root;
}

function cloneTransparent(mat, opacity) {
  const m = mat.clone();
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = opacity > 0.65;
  return m;
}

function setObjectOpacity(root, opacity) {
  root.traverse(child => {
    if (!child.isMesh) return;
    child.userData.originalMaterial = child.userData.originalMaterial || child.material;
    child.material = cloneTransparent(child.userData.originalMaterial, opacity);
  });
}

function restoreObjectMaterials(root) {
  root.traverse(child => {
    if (!child.isMesh) return;
    if (child.userData.originalMaterial) child.material = child.userData.originalMaterial;
  });
}

function setGhost(root, enabled) {
  root.traverse(child => {
    if (!child.isMesh) return;
    child.userData.originalMaterial = child.userData.originalMaterial || child.material;
    child.material = enabled ? materials.ghost : child.userData.originalMaterial;
  });
}

function archShape(w, h, arch) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h - arch);
  s.quadraticCurveTo(-w / 2, h, 0, h);
  s.quadraticCurveTo(w / 2, h, w / 2, h - arch);
  s.lineTo(w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
}

function extrudedShape(shape, depth, mat) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 3
  });
  geometry.center();
  return new THREE.Mesh(geometry, mat);
}

function tubeFromPoints(points, radius, mat) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 8), mat);
}

function cyl(radius, length, mat, segments = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), mat);
}

function labelSprite(text) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  c.width = 512;
  c.height = 128;
  ctx.fillStyle = 'rgba(0,0,0,.62)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(0,255,157,.56)';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12);
  ctx.fillStyle = '#eafff7';
  ctx.font = 'bold 42px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(3.2, 0.8, 1);
  return sprite;
}

scene.add(new THREE.AmbientLight(0x728078, 0.62));
const sun = new THREE.DirectionalLight(0xffffff, 1.18);
sun.position.set(18, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -36;
sun.shadow.camera.right = 36;
sun.shadow.camera.top = 36;
sun.shadow.camera.bottom = -36;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x9dc8ff, 0x473821, 0.35));

const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), materials.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(90, 90, 0x00ff9d, 0x33453f);
grid.material.transparent = true;
grid.material.opacity = 0.28;
grid.position.y = 0.012;
scene.add(grid);

const waterRing = new THREE.Mesh(new THREE.RingGeometry(20, 24, 96), materials.water);
waterRing.rotation.x = -Math.PI / 2;
waterRing.position.y = 0.018;
scene.add(waterRing);

function createPrinter() {
  const g = new THREE.Group();
  g.name = 'World Printer v2';

  const base = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.28, 5.4), materials.printerDark);
  base.position.y = 0.14;
  g.add(base);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.08, 4.2), cloneTransparent(materials.accent, 0.34));
  bed.position.set(0, 0.34, 0.25);
  g.add(bed);

  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.9, 18);
  for (const x of [-2.25, 2.25]) {
    for (const z of [-1.85, 1.85]) {
      const p = new THREE.Mesh(postGeo, materials.metal);
      p.position.set(x, 3.1, z);
      g.add(p);
    }
  }

  const beam1 = new THREE.Mesh(new THREE.BoxGeometry(5.25, 0.24, 0.34), materials.printerMid);
  beam1.position.set(0, 5.62, -1.85);
  g.add(beam1);
  const beam2 = beam1.clone();
  beam2.position.z = 1.85;
  g.add(beam2);

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.8, 16), materials.metal);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 5.25, 0);
  g.add(rail);

  const extruder = new THREE.Group();
  extruder.name = 'Moving Nozzle';
  extruder.position.set(0, 5.08, 0.25);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.65, 0.82), materials.accent);
  extruder.add(head);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 18), materials.printerDark);
  nozzle.position.y = -0.66;
  nozzle.rotation.x = Math.PI;
  extruder.add(nozzle);
  const cable = tubeFromPoints([
    new THREE.Vector3(-0.35, 0.35, 0),
    new THREE.Vector3(-1.05, 0.85, -0.35),
    new THREE.Vector3(-1.75, 0.25, -1.1)
  ], 0.035, materials.metal);
  extruder.add(cable);
  g.add(extruder);
  g.userData.extruder = extruder;

  const sign = labelSprite('WORLD PRINTER v2');
  sign.position.set(0, 6.25, -2.05);
  g.add(sign);

  return shadow(g);
}

const printer = createPrinter();
printer.position.set(0, 0, -5.5);
scene.add(printer);

function printerBedWorld(y = 0) {
  return printer.localToWorld(new THREE.Vector3(0, 0.42 + y, 0.25));
}

function playerHandWorld() {
  return player.localToWorld(new THREE.Vector3(0, 1.55, 0));
}

function createPlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.78, 6, 12), materials.player);
  body.position.y = 0.82;
  g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.025, 8, 36), cloneTransparent(materials.accent, 0.55));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  g.add(ring);
  const l = labelSprite('PLAYER');
  l.scale.set(1.7, 0.42, 1);
  l.position.y = 1.85;
  g.add(l);
  return shadow(g);
}

const player = createPlayer();
player.position.set(0, 0, 5.25);
scene.add(player);

function createCottage() {
  const g = new THREE.Group();
  g.name = 'Cottage';
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.15, 2.7), materials.wall);
  body.position.y = 1.08;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.1, 28, 1, false, 0, Math.PI), materials.roofRed);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 2.2;
  g.add(roof);
  for (let i = -2; i <= 2; i++) {
    const rib = cyl(0.035, 3.15, materials.darkWood, 10);
    rib.rotation.x = Math.PI / 2;
    rib.position.set(i * 0.42, 2.33 + Math.cos(i * 0.55) * 0.08, 0);
    g.add(rib);
  }
  const door = extrudedShape(archShape(0.75, 1.25, 0.44), 0.08, materials.darkWood);
  door.position.set(0, 0.64, 1.39);
  g.add(door);
  for (const x of [-0.92, 0.92]) {
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 24), materials.glass);
    win.rotation.x = Math.PI / 2;
    win.position.set(x, 1.33, 1.4);
    g.add(win);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 8, 24), materials.darkWood);
    ring.position.copy(win.position);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 10), materials.stone);
  chimney.position.set(1.05, 2.8, -0.55);
  g.add(chimney);
  return shadow(g);
}

function createTree() {
  const g = new THREE.Group();
  g.name = 'Layered Tree';
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.12, 0.8, 0.08),
    new THREE.Vector3(-0.16, 1.7, -0.05), new THREE.Vector3(0.08, 2.45, 0.06)
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.16, 12), materials.wood));
  const blobs = [[0,2.2,0,1.05,materials.leafDark],[-0.55,2.55,0.1,0.82,materials.leaf],[0.5,2.62,-0.12,0.8,materials.leaf],[0.05,3.02,0.02,0.72,materials.leaf]];
  for (const [x, y, z, s, m] of blobs) {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), m);
    b.position.set(x, y, z);
    b.scale.y = 0.82;
    g.add(b);
  }
  return shadow(g);
}

function createCart() {
  const g = new THREE.Group();
  g.name = 'Wood Cart';
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 1.15), materials.wood);
  base.position.y = 0.75;
  g.add(base);
  for (const z of [-0.66, 0.66]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.72, 0.12), materials.darkWood);
    side.position.set(0, 1.05, z);
    g.add(side);
  }
  for (const x of [-1.28, 1.28]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 1.28), materials.darkWood);
    wall.position.set(x, 1.0, 0);
    g.add(wall);
  }
  for (const x of [-0.86, 0.86]) {
    for (const z of [-0.78, 0.78]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 24), materials.darkWood);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      g.add(wheel);
    }
  }
  const handle = tubeFromPoints([new THREE.Vector3(-1.35,0.92,0), new THREE.Vector3(-2.0,0.86,0), new THREE.Vector3(-2.55,0.6,0)], 0.045, materials.metal);
  g.add(handle);
  return shadow(g);
}

function createBridge() {
  const g = new THREE.Group();
  g.name = 'Arched Bridge';
  for (let i = -4; i <= 4; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 2.05), materials.wood);
    plank.position.set(i * 0.38, 0.45 + Math.sin((i + 4) / 8 * Math.PI) * 0.5, 0);
    plank.rotation.z = Math.cos((i + 4) / 8 * Math.PI) * 0.18;
    g.add(plank);
  }
  for (const z of [-1.12, 1.12]) {
    g.add(tubeFromPoints([new THREE.Vector3(-1.9,1.05,z), new THREE.Vector3(-0.8,1.55,z), new THREE.Vector3(0,1.75,z), new THREE.Vector3(0.8,1.55,z), new THREE.Vector3(1.9,1.05,z)], 0.045, materials.darkWood));
  }
  return shadow(g);
}

function createStall() {
  const g = new THREE.Group();
  g.name = 'Market Stall';
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.65, 1.2), materials.wood);
  counter.position.y = 0.55;
  g.add(counter);
  for (const x of [-1.15, 1.15]) for (const z of [-0.45, 0.45]) {
    const post = cyl(0.07, 2.4, materials.darkWood, 12);
    post.position.set(x, 1.45, z);
    g.add(post);
  }
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.95, 24, 1, false, 0, Math.PI), materials.cloth);
  canopy.rotation.z = Math.PI / 2;
  canopy.rotation.y = Math.PI / 2;
  canopy.position.y = 2.55;
  g.add(canopy);
  return shadow(g);
}

function createBoat() {
  const g = new THREE.Group();
  g.name = 'Small Boat';
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.7, 0);
  hullShape.quadraticCurveTo(-1.25, -0.55, 0, -0.62);
  hullShape.quadraticCurveTo(1.25, -0.55, 1.7, 0);
  hullShape.quadraticCurveTo(0.9, 0.38, 0, 0.42);
  hullShape.quadraticCurveTo(-0.9, 0.38, -1.7, 0);
  const hull = extrudedShape(hullShape, 1.25, materials.wood);
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.55;
  g.add(hull);
  for (const x of [-0.75, 0, 0.75]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), materials.darkWood);
    bench.position.set(x, 0.93, 0);
    g.add(bench);
  }
  const mast = cyl(0.045, 2.2, materials.darkWood, 10);
  mast.position.set(0.15, 1.75, 0);
  g.add(mast);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(0.85, 0.35); sailShape.lineTo(0.05, 1.4); sailShape.lineTo(0, 0);
  const sail = extrudedShape(sailShape, 0.035, materials.clothCream);
  sail.position.set(0.45, 1.65, 0.02);
  sail.rotation.y = Math.PI / 2;
  g.add(sail);
  return shadow(g);
}

function createCampfire() {
  const g = new THREE.Group();
  g.name = 'Campfire';
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), materials.stone);
    st.position.set(Math.cos(a) * 0.55, 0.15, Math.sin(a) * 0.55);
    g.add(st);
  }
  for (const a of [0, Math.PI / 2]) {
    const log = cyl(0.09, 1.1, materials.wood, 12);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = a;
    log.position.y = 0.22;
    g.add(log);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), materials.flame);
  flame.position.y = 0.62;
  g.add(flame);
  return shadow(g);
}

const recipes = [
  { id: 'cottage', label: 'Cottage', aliases: ['cottage', 'house', 'home', 'hut'], dims: [3.8, 3.2, 3.2], create: createCottage },
  { id: 'tree', label: 'Tree', aliases: ['tree', 'forest', 'oak'], dims: [2.5, 2.5, 3.4], create: createTree },
  { id: 'cart', label: 'Cart', aliases: ['cart', 'wagon', 'carriage'], dims: [3.0, 1.9, 1.8], create: createCart },
  { id: 'bridge', label: 'Bridge', aliases: ['bridge', 'arch bridge', 'wood bridge'], dims: [4.4, 2.8, 2.0], create: createBridge },
  { id: 'stall', label: 'Market Stall', aliases: ['market', 'stall', 'shop', 'vendor'], dims: [3.4, 2.2, 3.1], create: createStall },
  { id: 'boat', label: 'Boat', aliases: ['boat', 'ship', 'sailboat'], dims: [3.7, 1.8, 2.7], create: createBoat },
  { id: 'campfire', label: 'Campfire', aliases: ['campfire', 'fire', 'firepit'], dims: [1.4, 1.4, 1.2], create: createCampfire }
];

let currentRecipe = recipes[0];
let phase = 'ready';
let printedOnBed = null;
let carriedPreview = null;
let selected = null;
let selectionBox = null;
let layerGroup = null;
let filamentDrop = null;
let idCounter = 0;
const placed = [];
const previewSlots = [[0,2.7],[-4,2.4],[4,2.4],[-4,6],[4,6],[0,7.2],[-7,0],[7,0]];
let slotIndex = 0;

function parseCommand(text) {
  const t = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  return recipes.find(r => r.aliases.some(a => t.includes(a))) || null;
}

function setButtons() {
  const busy = phase === 'printing' || phase === 'pickup-moving';
  runButton.disabled = busy || phase === 'printed-on-bed';
  pickupButton.disabled = phase !== 'printed-on-bed';
  placeButton.disabled = phase !== 'carried-preview';
  recipeButtons.querySelectorAll('button').forEach(b => { b.disabled = busy || phase === 'printed-on-bed'; });
}

function setPhase(next) {
  phase = next;
  setState(next);
  setButtons();
}

function createLayer(width, depth, y) {
  const w = width / 2;
  const d = depth / 2;
  const points = [
    new THREE.Vector3(-w, y, -d), new THREE.Vector3(w, y, -d),
    new THREE.Vector3(w, y, d), new THREE.Vector3(-w, y, d),
    new THREE.Vector3(-w, y, -d)
  ];
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.02);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.018, 6), materials.filament);
}

function clearSelection() {
  if (selectionBox) {
    scene.remove(selectionBox);
    selectionBox.geometry.dispose();
    selectionBox.material.dispose();
    selectionBox = null;
  }
  selected = null;
  setTarget(carriedPreview ? `preview ${carriedPreview.userData.label}` : printedOnBed ? `${printedOnBed.userData.label} on printer bed` : 'none');
}

function selectPlaced(obj) {
  clearSelection();
  selected = obj;
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  selectionBox = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.18, size.y + 0.18, size.z + 0.18), materials.selection);
  selectionBox.position.copy(center);
  scene.add(selectionBox);
  setTarget(`${obj.userData.label} #${obj.userData.id}`);
}

function updateSelectionBox() {
  if (!selectionBox || !selected) return;
  const box = new THREE.Box3().setFromObject(selected);
  const center = new THREE.Vector3();
  box.getCenter(center);
  selectionBox.position.copy(center);
  selectionBox.rotation.copy(selected.rotation);
}

function targetMovable() {
  return carriedPreview || selected;
}

function moveTarget(dx, dz) {
  const obj = targetMovable();
  if (!obj) { setStatus('Nothing can move yet. Print, pick up, then move the preview.'); return; }
  obj.position.x = Math.round(obj.position.x + dx);
  obj.position.z = Math.round(obj.position.z + dz);
  updateSelectionBox();
}

function rotateTarget(dir) {
  const obj = targetMovable();
  if (!obj) { setStatus('Nothing can rotate yet. Print, pick up, then rotate the preview.'); return; }
  obj.rotation.y += dir * Math.PI / 8;
  updateSelectionBox();
}

async function animateTransform(object, targetPosition, targetScale, duration) {
  const startPos = object.position.clone();
  const startScale = object.scale.clone();
  const endScale = new THREE.Vector3(targetScale, targetScale, targetScale);
  const t0 = performance.now();
  return new Promise(resolve => {
    function step(now) {
      const t = clamp01((now - t0) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      object.position.lerpVectors(startPos, targetPosition, eased);
      object.scale.lerpVectors(startScale, endScale, eased);
      if (t < 1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}

async function startPrint(recipe) {
  if (phase === 'printing') { setStatus('Printer is already working.'); return; }
  if (phase === 'printed-on-bed') { setStatus('Finished print is still locked on the bed. Pick it up or cancel it first.'); return; }
  if (carriedPreview) { setStatus('Place or cancel the carried preview before printing another object.'); return; }

  currentRecipe = recipe;
  commandInput.value = `make a ${recipe.label.toLowerCase()}`;
  clearSelection();
  setPhase('printing');
  setStatus(`Printing ${recipe.label}: fabricating slowly on the printer bed.`);

  const obj = recipe.create();
  obj.userData.label = recipe.label;
  obj.userData.recipeId = recipe.id;
  obj.userData.state = 'printing';
  obj.position.copy(printerBedWorld(0.01));
  obj.scale.setScalar(0.02);
  obj.rotation.y = 0;
  setObjectOpacity(obj, 0.38);
  scene.add(obj);
  printedOnBed = obj;

  layerGroup = new THREE.Group();
  layerGroup.name = `${recipe.label} layer stack`;
  layerGroup.position.copy(printerBedWorld(0.01));
  scene.add(layerGroup);

  const extruder = printer.userData.extruder;
  const startNozzle = extruder.position.clone();
  const [width, depth, height] = recipe.dims;
  const duration = 6200;
  const t0 = performance.now();
  let nextLayer = 0;

  await new Promise(resolve => {
    function step(now) {
      const raw = clamp01((now - t0) / duration);
      const eased = 1 - Math.pow(1 - raw, 2.1);

      obj.position.copy(printerBedWorld(0.01));
      obj.scale.setScalar(0.02 + 0.98 * eased);
      setObjectOpacity(obj, 0.34 + 0.66 * eased);

      const sweep = now * 0.0065;
      extruder.position.x = Math.sin(sweep) * 1.7;
      extruder.position.z = 0.25 + Math.cos(sweep * 1.43) * 1.24;
      extruder.position.y = 1.12 + height * 0.22 + eased * 1.15;

      const nozzleWorld = printer.localToWorld(extruder.position.clone());
      if (!filamentDrop) {
        filamentDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), materials.filament);
        scene.add(filamentDrop);
      }
      filamentDrop.position.copy(nozzleWorld).lerp(printerBedWorld(height * raw * 0.42), 0.5);
      filamentDrop.scale.y = 0.25 + raw * 0.8;

      if (raw >= nextLayer) {
        const layer = createLayer(width * 0.78, depth * 0.78, 0.025 + height * raw * 0.82);
        layerGroup.add(layer);
        nextLayer += 1 / 26;
      }

      if (raw < 1) requestAnimationFrame(step);
      else {
        extruder.position.copy(startNozzle);
        resolve();
      }
    }
    requestAnimationFrame(step);
  });

  if (filamentDrop) {
    scene.remove(filamentDrop);
    filamentDrop = null;
  }
  restoreObjectMaterials(obj);
  obj.scale.setScalar(1);
  obj.position.copy(printerBedWorld(0.01));
  obj.userData.state = 'printed-on-bed';
  setPhase('printed-on-bed');
  setTarget(`${recipe.label} finished on printer bed`);
  setStatus(`${recipe.label} finished. It is still locked to the printer. Tap Pick Up Print.`);
}

async function pickupPrint() {
  if (phase !== 'printed-on-bed' || !printedOnBed) {
    setStatus('Nothing finished on the printer bed yet.');
    return;
  }
  const obj = printedOnBed;
  printedOnBed = null;
  if (layerGroup) { scene.remove(layerGroup); layerGroup = null; }
  setPhase('pickup-moving');
  obj.userData.state = 'pickup-moving';
  setStatus(`Picking up ${obj.userData.label}: moving from bed to player carry point.`);
  await animateTransform(obj, playerHandWorld(), 0.42, 800);
  await sleep(160);
  obj.userData.state = 'carried-preview';
  obj.scale.setScalar(1);
  const [x, z] = previewSlots[slotIndex % previewSlots.length];
  slotIndex += 1;
  obj.position.set(x, 0, z);
  setGhost(obj, true);
  carriedPreview = obj;
  setPhase('carried-preview');
  setTarget(`preview ${obj.userData.label}`);
  setStatus(`${obj.userData.label} picked up. Now you can move/rotate it or tap ground, then Place.`);
}

function placePreview() {
  if (!carriedPreview) {
    setStatus('No carried preview. Print something, then Pick Up Print first.');
    return;
  }
  const obj = carriedPreview;
  carriedPreview = null;
  setGhost(obj, false);
  restoreObjectMaterials(obj);
  obj.userData.id = ++idCounter;
  obj.userData.state = 'placed';
  placed.push(obj);
  setPhase('ready');
  selectPlaced(obj);
  setStatus(`${obj.userData.label} placed as a solid world object.`);
}

function cancelOrDelete() {
  if (phase === 'printing') {
    setStatus('Print is mid-fabrication. Let this version finish, then cancel/pick up.');
    return;
  }
  if (carriedPreview) {
    scene.remove(carriedPreview);
    carriedPreview = null;
    setPhase('ready');
    setTarget('none');
    setStatus('Carried preview cancelled.');
    return;
  }
  if (printedOnBed) {
    scene.remove(printedOnBed);
    printedOnBed = null;
    if (layerGroup) { scene.remove(layerGroup); layerGroup = null; }
    setPhase('ready');
    setTarget('none');
    setStatus('Finished print removed from the bed.');
    return;
  }
  if (selected) {
    const doomed = selected;
    clearSelection();
    scene.remove(doomed);
    const idx = placed.indexOf(doomed);
    if (idx >= 0) placed.splice(idx, 1);
    setStatus('Selected placed object deleted.');
    return;
  }
  setStatus('Nothing to cancel or delete.');
}

for (const recipe of recipes) {
  const button = document.createElement('button');
  button.className = 'secondary';
  button.textContent = recipe.label;
  button.addEventListener('click', () => startPrint(recipe));
  recipeButtons.appendChild(button);
}

runButton.addEventListener('click', () => {
  const recipe = parseCommand(commandInput.value);
  if (!recipe) { setStatus('No recipe matched. Try cottage, tree, cart, bridge, market stall, boat, or campfire.'); return; }
  startPrint(recipe);
});
pickupButton.addEventListener('click', pickupPrint);
placeButton.addEventListener('click', placePreview);
cancelButton.addEventListener('click', cancelOrDelete);
document.querySelector('#moveLeft').addEventListener('click', () => moveTarget(-1, 0));
document.querySelector('#moveRight').addEventListener('click', () => moveTarget(1, 0));
document.querySelector('#moveForward').addEventListener('click', () => moveTarget(0, -1));
document.querySelector('#moveBack').addEventListener('click', () => moveTarget(0, 1));
document.querySelector('#rotateLeft').addEventListener('click', () => rotateTarget(-1));
document.querySelector('#rotateRight').addEventListener('click', () => rotateTarget(1));
commandInput.addEventListener('keydown', event => { if (event.key === 'Enter') runButton.click(); });

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('click', e => {
  if (e.target.closest?.('#hud')) return;
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (carriedPreview) {
    const groundHits = raycaster.intersectObject(ground);
    if (groundHits.length) {
      carriedPreview.position.x = Math.round(groundHits[0].point.x);
      carriedPreview.position.z = Math.round(groundHits[0].point.z);
      setStatus(`Moved carried preview to ${carriedPreview.position.x}, ${carriedPreview.position.z}.`);
    }
    return;
  }

  const hits = raycaster.intersectObjects(placed, true);
  if (hits.length) {
    let root = hits[0].object;
    while (root.parent && !root.userData.id) root = root.parent;
    if (root.userData.id) selectPlaced(root);
  }
});

window.addEventListener('keydown', event => {
  if (document.activeElement === commandInput && event.key !== 'Enter') return;
  const k = event.key.toLowerCase();
  if (k === 'w' || event.key === 'ArrowUp') moveTarget(0, -1);
  if (k === 's' || event.key === 'ArrowDown') moveTarget(0, 1);
  if (k === 'a' || event.key === 'ArrowLeft') moveTarget(-1, 0);
  if (k === 'd' || event.key === 'ArrowRight') moveTarget(1, 0);
  if (k === 'q') rotateTarget(-1);
  if (k === 'e') rotateTarget(1);
  if (event.key === 'Enter' && carriedPreview) placePreview();
  if (event.key === 'Delete' || event.key === 'Backspace') cancelOrDelete();
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  voiceButton.disabled = true;
  voiceButton.title = 'Speech recognition not available in this browser.';
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;
  voiceButton.addEventListener('click', () => { setStatus('Listening. Say make a cottage, print bridge, boat, tree...'); recognition.start(); });
  recognition.onresult = e => {
    const transcript = e.results[0][0].transcript;
    commandInput.value = transcript;
    const recipe = parseCommand(transcript);
    if (recipe) startPrint(recipe);
    else setStatus(`Heard “${transcript}”, but no recipe matched yet.`);
  };
  recognition.onerror = e => setStatus(`Voice error: ${e.error}. Type the command instead.`);
}

const starterHouse = createCottage();
starterHouse.position.set(-6, 0, -1.5);
starterHouse.scale.setScalar(0.78);
starterHouse.userData.label = 'Starter Cottage';
starterHouse.userData.id = ++idCounter;
placed.push(starterHouse);
scene.add(starterHouse);

const starterTree = createTree();
starterTree.position.set(-8.5, 0, 1.8);
starterTree.userData.label = 'Starter Tree';
starterTree.userData.id = ++idCounter;
placed.push(starterTree);
scene.add(starterTree);

const starterBoat = createBoat();
starterBoat.position.set(6.4, 0.04, -0.5);
starterBoat.rotation.y = -0.45;
starterBoat.userData.label = 'Starter Boat';
starterBoat.userData.id = ++idCounter;
placed.push(starterBoat);
scene.add(starterBoat);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

function animate(now) {
  requestAnimationFrame(animate);
  if (phase === 'ready') {
    const e = printer.userData.extruder;
    e.position.x = Math.sin(now * 0.0011) * 0.45;
    e.position.y = 5.08;
    e.position.z = 0.25 + Math.cos(now * 0.0009) * 0.16;
  }
  player.rotation.y = Math.sin(now * 0.001) * 0.08;
  updateSelectionBox();
  controls.update();
  renderer.render(scene, camera);
}

setPhase('ready');
setTarget('none');
setStatus(`${BUILD}. Ready for improvements to the printer model and printing visuals.`);
animate(performance.now());
