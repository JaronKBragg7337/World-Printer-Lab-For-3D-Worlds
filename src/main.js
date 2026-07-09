import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

const app = document.querySelector('#app');

app.innerHTML = `
  <canvas id="world"></canvas>
  <section id="hud">
    <div class="topline">
      <h1>World Printer Lab</h1>
      <button id="toggleHud" class="secondary">Hide</button>
    </div>
    <div class="hud-body">
      <p class="note">Visible print lifecycle: command → printer bed fabrication → pick up → move preview → place into the world.</p>

      <div class="section-title">Speak / Type Object</div>
      <div class="row">
        <input id="commandInput" value="make a cottage" aria-label="Object command" />
        <button id="runCommand">Print</button>
        <button id="voiceButton" class="secondary">🎙</button>
      </div>

      <div class="section-title">Object Recipes</div>
      <div class="row" id="recipeButtons"></div>

      <div class="section-title">Print / Placement Flow</div>
      <div class="row">
        <button id="pickupPrint" disabled>Pick Up Print</button>
        <button id="placeObject">Place</button>
        <button class="danger" id="cancelObject">Cancel/Delete</button>
      </div>

      <div class="section-title">Move / Rotate Preview</div>
      <div class="row">
        <button class="secondary" id="moveLeft">←</button>
        <button class="secondary" id="moveForward">↑</button>
        <button class="secondary" id="moveBack">↓</button>
        <button class="secondary" id="moveRight">→</button>
        <button class="secondary" id="rotateLeft">Rot −</button>
        <button class="secondary" id="rotateRight">Rot +</button>
      </div>

      <div class="section-title">Design Goal</div>
      <div class="row">
        <span class="pill">visible fabrication</span>
        <span class="pill">pickup stage</span>
        <span class="pill">curves</span>
        <span class="pill">arches</span>
        <span class="pill">hulls</span>
        <span class="pill">not blockouts</span>
      </div>

      <div id="status">Ready. Type “make a cottage”, “print bridge”, “spawn boat”, etc.</div>
      <div id="selected">Target: none</div>
    </div>
  </section>
  <aside id="help">Drag to orbit. Pinch/wheel to zoom. Tap the ground to move the preview. Use <kbd>WASD</kbd>/arrows to move, <kbd>Q/E</kbd> rotate, <kbd>Enter</kbd> place.</aside>
`;

const canvas = document.querySelector('#world');
const hud = document.querySelector('#hud');
const toggleHud = document.querySelector('#toggleHud');
const statusEl = document.querySelector('#status');
const selectedEl = document.querySelector('#selected');
const commandInput = document.querySelector('#commandInput');
const recipeButtons = document.querySelector('#recipeButtons');
const pickupButton = document.querySelector('#pickupPrint');
const runCommandButton = document.querySelector('#runCommand');

if (window.innerWidth <= 720) {
  hud.classList.add('collapsed', 'mobile-start');
  toggleHud.textContent = 'Open';
}

toggleHud.addEventListener('click', () => {
  hud.classList.toggle('collapsed');
  hud.classList.remove('mobile-start');
  toggleHud.textContent = hud.classList.contains('collapsed') ? 'Open' : 'Hide';
});

function setStatus(text) { statusEl.textContent = text; }
function setTarget(text) { selectedEl.textContent = `Target: ${text}`; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

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
controls.target.set(0, 1.8, 1.5);
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
  roofBlue: new THREE.MeshLambertMaterial({ color: 0x297c91 }),
  cloth: new THREE.MeshLambertMaterial({ color: 0xd87052 }),
  clothCream: new THREE.MeshLambertMaterial({ color: 0xf4d59a }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x4fbf68 }),
  leafDark: new THREE.MeshLambertMaterial({ color: 0x2d7d4f }),
  water: new THREE.MeshLambertMaterial({ color: 0x4bbbd4, transparent: true, opacity: 0.42 }),
  stone: new THREE.MeshLambertMaterial({ color: 0x7c817b }),
  flame: new THREE.MeshBasicMaterial({ color: 0xff8a20 }),
  glass: new THREE.MeshLambertMaterial({ color: 0x8fd7ff }),
  player: new THREE.MeshLambertMaterial({ color: 0x60a5ff }),
  ghost: new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.32, wireframe: true, depthWrite: false }),
  selection: new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: 0.85, wireframe: true, depthWrite: false }),
  filament: new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.82, depthWrite: false })
};

function shadow(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return root;
}

function matClone(mat, opacity = 1) {
  const m = mat.clone();
  m.transparent = opacity < 1;
  m.opacity = opacity;
  if (opacity < 1) m.depthWrite = false;
  return m;
}

function setGhost(root, ghost = true) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    if (ghost) {
      child.userData.solidMaterial = child.userData.solidMaterial || child.material;
      child.material = materials.ghost;
    } else if (child.userData.solidMaterial) {
      child.material = child.userData.solidMaterial;
    }
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

function cylinderBetween(radius, length, mat, radial = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, radial), mat);
}

function makeLabelSprite(text) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  c.width = 512;
  c.height = 128;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(0,255,157,.5)';
  ctx.strokeRect(4, 4, c.width - 8, c.height - 8);
  ctx.fillStyle = '#eafff7';
  ctx.font = 'bold 42px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const texture = new THREE.CanvasTexture(c);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.2, 0.8, 1);
  return sprite;
}

scene.add(new THREE.AmbientLight(0x728078, 0.62));
const sun = new THREE.DirectionalLight(0xffffff, 1.16);
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

function createPrinterStation() {
  const g = new THREE.Group();
  g.name = 'World Printer Station';

  const bed = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.25, 5.2), materials.printerDark);
  bed.position.y = 0.16;
  g.add(bed);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 4.3), matClone(materials.accent, 0.32));
  plate.position.set(0, 0.36, 0.4);
  g.add(plate);

  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 6.2, 18);
  for (const x of [-2.25, 2.25]) {
    for (const z of [-1.9, 1.9]) {
      const p = new THREE.Mesh(postGeo, materials.metal);
      p.position.set(x, 3.25, z);
      g.add(p);
    }
  }

  const beamA = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 0.32), materials.printerMid);
  beamA.position.set(0, 5.72, -1.9);
  g.add(beamA);
  const beamB = beamA.clone();
  beamB.position.z = 1.9;
  g.add(beamB);

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.8, 16), materials.metal);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 5.33, 0);
  g.add(rail);

  const extruder = new THREE.Group();
  extruder.name = 'Printer Nozzle';
  extruder.position.set(0, 5.15, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.8), materials.accent);
  extruder.add(head);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 18), materials.printerDark);
  nozzle.position.y = -0.66;
  nozzle.rotation.x = Math.PI;
  extruder.add(nozzle);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.35, 0.35, 0),
    new THREE.Vector3(-1.1, 0.8, -0.4),
    new THREE.Vector3(-1.75, 0.2, -1.15)
  ]), 16, 0.035, 8), materials.metal);
  extruder.add(cable);
  g.add(extruder);
  g.userData.extruder = extruder;

  const sign = makeLabelSprite('WORLD PRINTER');
  sign.position.set(0, 6.35, -2.05);
  g.add(sign);

  shadow(g);
  return g;
}

const printer = createPrinterStation();
printer.position.set(0, 0, -5.5);
scene.add(printer);

function createPlayerMarker() {
  const g = new THREE.Group();
  g.name = 'Player Pickup Anchor';
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.75, 6, 12), materials.player);
  body.position.y = 0.82;
  g.add(body);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.025, 8, 36), matClone(materials.accent, 0.55));
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.08;
  g.add(halo);
  const label = makeLabelSprite('PICKUP');
  label.scale.set(1.8, 0.45, 1);
  label.position.y = 1.8;
  g.add(label);
  return shadow(g);
}

const playerMarker = createPlayerMarker();
playerMarker.position.set(0, 0, 5.2);
scene.add(playerMarker);

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
    const rib = cylinderBetween(0.035, 3.15, materials.darkWood, 10);
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

function createLayeredTree() {
  const g = new THREE.Group();
  g.name = 'Layered Tree';
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.12, 0.8, 0.08),
    new THREE.Vector3(-0.16, 1.7, -0.05),
    new THREE.Vector3(0.08, 2.45, 0.06)
  ]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.16, 12), materials.wood);
  g.add(trunk);

  const blobs = [
    [0, 2.2, 0, 1.05, materials.leafDark],
    [-0.55, 2.55, 0.1, 0.82, materials.leaf],
    [0.5, 2.62, -0.12, 0.8, materials.leaf],
    [0.05, 3.02, 0.02, 0.72, materials.leaf]
  ];
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

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.72, 0.12), materials.darkWood);
  sideL.position.set(0, 1.05, -0.66);
  g.add(sideL);
  const sideR = sideL.clone();
  sideR.position.z = 0.66;
  g.add(sideR);

  const front = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 1.28), materials.darkWood);
  front.position.set(1.28, 1.0, 0);
  g.add(front);
  const back = front.clone();
  back.position.x = -1.28;
  g.add(back);

  for (const x of [-0.86, 0.86]) {
    for (const z of [-0.78, 0.78]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 24), materials.darkWood);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      g.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16), materials.metal);
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(wheel.position);
      g.add(hub);
    }
    const axle = cylinderBetween(0.06, 1.7, materials.metal, 12);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(x, 0.36, 0);
    g.add(axle);
  }

  const handle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.35, 0.92, 0),
    new THREE.Vector3(-2.0, 0.86, 0),
    new THREE.Vector3(-2.55, 0.6, 0)
  ]), 16, 0.045, 8), materials.metal);
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
    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.9, 1.05, z),
      new THREE.Vector3(-0.8, 1.55, z),
      new THREE.Vector3(0, 1.75, z),
      new THREE.Vector3(0.8, 1.55, z),
      new THREE.Vector3(1.9, 1.05, z)
    ]);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 32, 0.045, 8), materials.darkWood);
    g.add(rail);
    for (const x of [-1.6, -0.55, 0.55, 1.6]) {
      const p = cylinderBetween(0.04, 0.95, materials.darkWood, 8);
      p.position.set(x, 0.9 + (1 - Math.abs(x) / 2) * 0.5, z);
      g.add(p);
    }
  }
  return shadow(g);
}

function createMarketStall() {
  const g = new THREE.Group();
  g.name = 'Market Stall';
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.65, 1.2), materials.wood);
  counter.position.y = 0.55;
  g.add(counter);

  for (const x of [-1.15, 1.15]) {
    for (const z of [-0.45, 0.45]) {
      const post = cylinderBetween(0.07, 2.4, materials.darkWood, 12);
      post.position.set(x, 1.45, z);
      g.add(post);
    }
  }

  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 2.95, 24, 1, false, 0, Math.PI), materials.cloth);
  canopy.rotation.z = Math.PI / 2;
  canopy.rotation.y = Math.PI / 2;
  canopy.position.y = 2.55;
  g.add(canopy);

  for (let i = -2; i <= 2; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 2.96), i % 2 === 0 ? materials.clothCream : materials.cloth);
    stripe.position.set(i * 0.32, 2.7 + Math.cos(i) * 0.08, 0);
    stripe.rotation.x = 0.25;
    g.add(stripe);
  }

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.5), materials.darkWood);
  crate.position.set(-0.75, 1.06, 0.05);
  g.add(crate);
  const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshLambertMaterial({ color: 0xff8a35 }));
  fruit.position.set(-0.65, 1.34, 0.03);
  g.add(fruit);
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

  const mast = cylinderBetween(0.045, 2.2, materials.darkWood, 10);
  mast.position.set(0.15, 1.75, 0);
  g.add(mast);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0.85, 0.35);
  sailShape.lineTo(0.05, 1.4);
  sailShape.lineTo(0, 0);
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
    const log = cylinderBetween(0.09, 1.1, materials.wood, 12);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = a;
    log.position.y = 0.22;
    g.add(log);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), materials.flame);
  flame.position.y = 0.62;
  g.add(flame);
  const light = new THREE.PointLight(0xff8a20, 1.4, 7);
  light.position.y = 1.3;
  g.add(light);
  return shadow(g);
}

const recipes = [
  { id: 'cottage', label: 'Cottage', aliases: ['cottage', 'house', 'home', 'hut'], dims: [3.8, 3.2, 3.2], create: createCottage },
  { id: 'tree', label: 'Tree', aliases: ['tree', 'forest', 'oak'], dims: [2.5, 2.5, 3.4], create: createLayeredTree },
  { id: 'cart', label: 'Cart', aliases: ['cart', 'wagon', 'carriage'], dims: [3.0, 1.9, 1.8], create: createCart },
  { id: 'bridge', label: 'Bridge', aliases: ['bridge', 'arch bridge', 'wood bridge'], dims: [4.4, 2.8, 2.0], create: createBridge },
  { id: 'stall', label: 'Market Stall', aliases: ['market', 'stall', 'shop', 'vendor'], dims: [3.4, 2.2, 3.1], create: createMarketStall },
  { id: 'boat', label: 'Boat', aliases: ['boat', 'ship', 'sailboat'], dims: [3.7, 1.8, 2.7], create: createBoat },
  { id: 'campfire', label: 'Campfire', aliases: ['campfire', 'fire', 'firepit'], dims: [1.4, 1.4, 1.2], create: createCampfire }
];

for (const recipe of recipes) {
  const button = document.createElement('button');
  button.className = 'secondary';
  button.textContent = recipe.label;
  button.addEventListener('click', () => beginPrint(recipe));
  recipeButtons.appendChild(button);
}

function parseCommand(text) {
  const t = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  return recipes.find(r => r.aliases.some(a => t.includes(a))) || null;
}

let preview = null;
let selected = null;
let selectionBox = null;
let activePrint = null;
let activeLayerGroup = null;
let isPrinting = false;
let printIndex = 0;
const placed = [];
const spawnSlots = [
  [0, 2.5], [-4, 2], [4, 2], [-4, 6], [4, 6], [0, 7], [-7, 0], [7, 0], [-7, 6], [7, 6]
];

function slotPosition() {
  const [x, z] = spawnSlots[printIndex % spawnSlots.length];
  printIndex += 1;
  return new THREE.Vector3(x, 0, z);
}

function getPrinterBedWorldPosition(yOffset = 0) {
  return printer.localToWorld(new THREE.Vector3(0, 0.43 + yOffset, 0.4));
}

function getPlayerHandWorldPosition() {
  return playerMarker.localToWorld(new THREE.Vector3(0, 1.55, 0));
}

function clearSelection() {
  if (selectionBox) {
    scene.remove(selectionBox);
    selectionBox.geometry.dispose();
    selectionBox.material.dispose();
    selectionBox = null;
  }
  selected = null;
  setTarget(preview ? `preview ${preview.userData.label}` : activePrint ? `${activePrint.userData.label} on printer bed` : 'none');
}

function selectObject(obj) {
  clearSelection();
  selected = obj;
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  selectionBox = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.18, size.y + 0.18, size.z + 0.18), materials.selection);
  selectionBox.position.copy(center);
  scene.add(selectionBox);
  setTarget(`${obj.userData.label} #${obj.userData.id}`);
}

function updateSelectionBox() {
  if (!selected || !selectionBox) return;
  const box = new THREE.Box3().setFromObject(selected);
  const center = new THREE.Vector3();
  box.getCenter(center);
  selectionBox.position.copy(center);
  selectionBox.rotation.copy(selected.rotation);
}

function targetObject() {
  return preview || selected;
}

function moveTarget(dx, dz) {
  const obj = targetObject();
  if (!obj) { setStatus('No placement preview or selected object. Print and pick something up first.'); return; }
  obj.position.x = Math.round(obj.position.x + dx);
  obj.position.z = Math.round(obj.position.z + dz);
  updateSelectionBox();
}

function rotateTarget(dir) {
  const obj = targetObject();
  if (!obj) { setStatus('No placement preview or selected object. Print and pick something up first.'); return; }
  obj.rotation.y += dir * Math.PI / 8;
  updateSelectionBox();
}

function createLayerContour(width, depth, y) {
  const w = width / 2;
  const d = depth / 2;
  const points = [
    new THREE.Vector3(-w, y, -d), new THREE.Vector3(w, y, -d),
    new THREE.Vector3(w, y, d), new THREE.Vector3(-w, y, d),
    new THREE.Vector3(-w, y, -d)
  ];
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.02);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.018, 6), materials.filament);
  tube.userData.printLayer = true;
  return tube;
}

function createPrintSpark() {
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), materials.filament);
  spark.userData.spark = true;
  return spark;
}

function animateObjectTransform(object, targetPosition, targetScale, duration = 650) {
  const startPosition = object.position.clone();
  const startScale = object.scale.clone();
  const endScale = new THREE.Vector3(targetScale, targetScale, targetScale);
  const t0 = performance.now();
  return new Promise(resolve => {
    function step(now) {
      const raw = Math.min(1, (now - t0) / duration);
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      object.position.lerpVectors(startPosition, targetPosition, eased);
      object.scale.lerpVectors(startScale, endScale, eased);
      if (raw < 1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}

async function runPrinterFabrication(object, recipe) {
  const extruder = printer.userData.extruder;
  const startExtruderPosition = extruder.position.clone();
  const layerGroup = new THREE.Group();
  layerGroup.name = `${recipe.label} print layers`;
  layerGroup.position.copy(object.position);
  scene.add(layerGroup);
  activeLayerGroup = layerGroup;

  const [width, depth, height] = recipe.dims;
  const printDuration = 3600;
  const t0 = performance.now();
  let nextLayer = 0;
  let lastSpark = 0;

  setStatus(`Printing ${recipe.label}: nozzle drawing visible layers on the bed.`);

  return new Promise(resolve => {
    function step(now) {
      const raw = Math.min(1, (now - t0) / printDuration);
      const eased = 1 - Math.pow(1 - raw, 2.35);

      object.scale.setScalar(0.035 + 0.965 * eased);
      object.position.copy(getPrinterBedWorldPosition(0.01));

      const sweep = now * 0.006;
      extruder.position.x = Math.sin(sweep) * 1.65;
      extruder.position.z = 0.4 + Math.cos(sweep * 1.37) * 1.28;
      extruder.position.y = 1.12 + eased * 1.05;

      if (raw >= nextLayer) {
        const layer = createLayerContour(width * 0.78, depth * 0.78, 0.03 + height * raw * 0.92);
        layerGroup.add(layer);
        nextLayer += 1 / 18;
      }

      if (now - lastSpark > 90) {
        const spark = createPrintSpark();
        const sparkWorld = printer.localToWorld(new THREE.Vector3(extruder.position.x, 0.45 + height * raw * 0.62, extruder.position.z));
        spark.position.copy(sparkWorld);
        scene.add(spark);
        setTimeout(() => scene.remove(spark), 360);
        lastSpark = now;
      }

      if (raw < 1) {
        requestAnimationFrame(step);
      } else {
        extruder.position.copy(startExtruderPosition);
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

async function beginPrint(recipe) {
  if (isPrinting) {
    setStatus('Printer is already fabricating. Wait for the current print to finish.');
    return;
  }
  if (activePrint) {
    setStatus('A finished print is still on the bed. Pick it up or cancel it first.');
    return;
  }

  if (preview) {
    scene.remove(preview);
    preview = null;
  }
  clearSelection();

  isPrinting = true;
  pickupButton.disabled = true;
  runCommandButton.disabled = true;
  document.querySelectorAll('#recipeButtons button').forEach(button => { button.disabled = true; });

  const obj = recipe.create();
  obj.userData.label = recipe.label;
  obj.userData.recipeId = recipe.id;
  obj.userData.state = 'printing';
  obj.position.copy(getPrinterBedWorldPosition(0.01));
  obj.rotation.y = 0;
  obj.scale.setScalar(0.035);
  activePrint = obj;
  scene.add(activePrint);
  setTarget(`${recipe.label} printing on bed`);

  try {
    await runPrinterFabrication(activePrint, recipe);
    activePrint.userData.state = 'printed-on-bed';
    setStatus(`${recipe.label} finished printing. Tap “Pick Up Print” to carry it into placement mode.`);
    setTarget(`${recipe.label} finished on printer bed`);
    pickupButton.disabled = false;
  } catch (error) {
    console.error(error);
    setStatus(`Print failed: ${error.message || error}.`);
  } finally {
    isPrinting = false;
    runCommandButton.disabled = false;
    document.querySelectorAll('#recipeButtons button').forEach(button => { button.disabled = false; });
  }
}

async function pickupPrintedObject() {
  if (!activePrint) {
    setStatus('No finished print on the bed yet. Print something first.');
    return;
  }
  if (isPrinting) {
    setStatus('Wait until fabrication finishes before picking it up.');
    return;
  }

  const obj = activePrint;
  activePrint = null;
  pickupButton.disabled = true;
  if (activeLayerGroup) {
    scene.remove(activeLayerGroup);
    activeLayerGroup = null;
  }

  obj.userData.state = 'carried';
  setStatus(`Picking up ${obj.userData.label}: moving it from printer bed to player carry point.`);
  await animateObjectTransform(obj, getPlayerHandWorldPosition(), 0.42, 680);
  await sleep(160);

  obj.userData.state = 'placement-preview';
  obj.position.copy(slotPosition());
  obj.scale.setScalar(1);
  setGhost(obj, true);
  preview = obj;
  clearSelection();
  setTarget(`preview ${obj.userData.label}`);
  setStatus(`${obj.userData.label} picked up. Move/rotate it, tap ground to reposition, then Place.`);
}

function placePreview() {
  if (!preview) {
    setStatus('No placement preview. Print something, then pick it up first.');
    return;
  }
  setGhost(preview, false);
  preview.userData.id = placed.length + 1;
  preview.userData.state = 'placed';
  placed.push(preview);
  selectObject(preview);
  setStatus(`Placed ${preview.userData.label}. It is now a solid world object.`);
  preview = null;
}

function cancelOrDelete() {
  if (isPrinting) {
    setStatus('Cannot cancel while the current layer animation is running yet. Let this print finish, then delete/pick up.');
    return;
  }
  if (preview) {
    scene.remove(preview);
    preview = null;
    setStatus('Placement preview cancelled.');
    setTarget(selected ? `${selected.userData.label} #${selected.userData.id}` : 'none');
    return;
  }
  if (activePrint) {
    scene.remove(activePrint);
    activePrint = null;
    if (activeLayerGroup) {
      scene.remove(activeLayerGroup);
      activeLayerGroup = null;
    }
    pickupButton.disabled = true;
    setStatus('Finished print removed from printer bed.');
    setTarget('none');
    return;
  }
  if (selected) {
    const doomed = selected;
    clearSelection();
    scene.remove(doomed);
    const idx = placed.indexOf(doomed);
    if (idx >= 0) placed.splice(idx, 1);
    setStatus('Selected object deleted.');
    return;
  }
  setStatus('Nothing to cancel or delete.');
}

runCommandButton.addEventListener('click', () => {
  const recipe = parseCommand(commandInput.value);
  if (!recipe) {
    setStatus('No recipe matched. Try cottage, tree, cart, bridge, market stall, boat, or campfire.');
    return;
  }
  beginPrint(recipe);
});

document.querySelector('#pickupPrint').addEventListener('click', pickupPrintedObject);
document.querySelector('#placeObject').addEventListener('click', placePreview);
document.querySelector('#cancelObject').addEventListener('click', cancelOrDelete);
document.querySelector('#moveLeft').addEventListener('click', () => moveTarget(-1, 0));
document.querySelector('#moveRight').addEventListener('click', () => moveTarget(1, 0));
document.querySelector('#moveForward').addEventListener('click', () => moveTarget(0, -1));
document.querySelector('#moveBack').addEventListener('click', () => moveTarget(0, 1));
document.querySelector('#rotateLeft').addEventListener('click', () => rotateTarget(-1));
document.querySelector('#rotateRight').addEventListener('click', () => rotateTarget(1));

commandInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') runCommandButton.click();
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('click', (event) => {
  if (event.target.closest?.('#hud')) return;
  if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const objectHits = raycaster.intersectObjects(placed, true);
  if (objectHits.length && !preview) {
    let root = objectHits[0].object;
    while (root.parent && !root.userData.id) root = root.parent;
    if (root.userData.id) selectObject(root);
    return;
  }

  if (preview) {
    const hits = raycaster.intersectObject(ground);
    if (hits.length) {
      preview.position.x = Math.round(hits[0].point.x);
      preview.position.z = Math.round(hits[0].point.z);
      setStatus(`Moved preview to ${preview.position.x}, ${preview.position.z}.`);
    }
  }
});

window.addEventListener('keydown', (event) => {
  if (document.activeElement === commandInput && event.key !== 'Enter') return;
  const k = event.key.toLowerCase();
  if (k === 'w' || event.key === 'ArrowUp') moveTarget(0, -1);
  if (k === 's' || event.key === 'ArrowDown') moveTarget(0, 1);
  if (k === 'a' || event.key === 'ArrowLeft') moveTarget(-1, 0);
  if (k === 'd' || event.key === 'ArrowRight') moveTarget(1, 0);
  if (k === 'q') rotateTarget(-1);
  if (k === 'e') rotateTarget(1);
  if (event.key === 'Enter' && preview) placePreview();
  if (event.key === 'Delete' || event.key === 'Backspace') cancelOrDelete();
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const voiceButton = document.querySelector('#voiceButton');
if (!SpeechRecognition) {
  voiceButton.disabled = true;
  voiceButton.title = 'Speech recognition is not available in this browser.';
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;
  voiceButton.addEventListener('click', () => {
    setStatus('Listening. Say: make a cottage, print a bridge, spawn a boat...');
    recognition.start();
  });
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    commandInput.value = transcript;
    const recipe = parseCommand(transcript);
    if (recipe) beginPrint(recipe);
    else setStatus(`Heard “${transcript}”, but no recipe matched yet.`);
  };
  recognition.onerror = (event) => setStatus(`Voice error: ${event.error}. Type the command instead.`);
}

const starterA = createCottage();
starterA.position.set(-6, 0, -1.5);
starterA.scale.setScalar(0.78);
starterA.userData.label = 'Starter Cottage';
starterA.userData.id = 1;
starterA.userData.state = 'placed';
placed.push(starterA);
scene.add(starterA);

const starterB = createLayeredTree();
starterB.position.set(-8.5, 0, 1.8);
starterB.userData.label = 'Starter Tree';
starterB.userData.id = 2;
starterB.userData.state = 'placed';
placed.push(starterB);
scene.add(starterB);

const starterC = createBoat();
starterC.position.set(6.4, 0.04, -0.5);
starterC.rotation.y = -0.45;
starterC.userData.label = 'Starter Boat';
starterC.userData.id = 3;
starterC.userData.state = 'placed';
placed.push(starterC);
scene.add(starterC);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

function animate(now) {
  requestAnimationFrame(animate);
  const extruder = printer.userData.extruder;
  if (!preview && !activePrint && !isPrinting) {
    extruder.position.x = Math.sin(now * 0.0011) * 0.45;
    extruder.position.y = 5.15;
    extruder.position.z = Math.cos(now * 0.0009) * 0.18;
  }
  playerMarker.rotation.y = Math.sin(now * 0.001) * 0.08;
  if (selectionBox) updateSelectionBox();
  controls.update();
  renderer.render(scene, camera);
}

setStatus('Ready. Print something and watch it fabricate on the bed before pickup.');
animate(performance.now());
