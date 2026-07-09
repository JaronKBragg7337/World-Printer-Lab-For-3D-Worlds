import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

const BUILD = 'v2 experimental — detailed printer + PBR print simulation';
const app = document.querySelector('#app');

app.innerHTML = `
  <canvas id="world"></canvas>
  <section id="hud">
    <div class="topline">
      <h1>World Printer Lab <span style="color:#00ff9d">v2</span></h1>
      <button id="toggleHud" class="secondary">Hide</button>
    </div>
    <div class="hud-body">
      <div style="margin-bottom:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <a href="/" style="color:#00ff9d; text-decoration:none; font-weight:800;">← Back to stable v1</a>
        <span class="pill">experimental</span>
      </div>

      <p class="note"><b>${BUILD}</b>. Root stays stable; this page is where printer fidelity, material response, and fabrication visuals get pushed.</p>

      <div class="section-title">Speak / Type Object</div>
      <div class="row">
        <input id="commandInput" value="make a spiral" aria-label="Object command" />
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

      <div class="section-title">v2 Focus</div>
      <div class="row">
        <span class="pill" id="statePill">ready</span>
        <span class="pill">PBR materials</span>
        <span class="pill">glowing filament</span>
        <span class="pill">gantry details</span>
        <span class="pill">bed first</span>
      </div>

      <div id="status">Ready. Try Spiral, Creature, Cottage, Boat, Tree, Bridge, Cart, Stall, or Campfire.</div>
      <div id="selected">Target: none</div>
    </div>
  </section>
  <aside id="help">v2: high-detail fabrication test. The object must print on the bed before pickup. Drag to orbit. Tap ground only after pickup.</aside>
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
function setState(text) { statePill.textContent = text; }
function setTarget(text) { selectedEl.textContent = `Target: ${text}`; }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071012);
scene.fog = new THREE.Fog(0x071012, 28, 92);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(11.2, 7.2, 12.6);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.1, -1.1);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

function canvasTexture(kind, a, b, size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, size, size);

  if (kind === 'layers') {
    for (let y = 0; y < size; y++) {
      const band = Math.floor(y / 6) % 2;
      ctx.fillStyle = band ? b : a;
      ctx.fillRect(0, y, size, 1);
    }
    for (let i = 0; i < 1400; i++) {
      const v = 210 + Math.random() * 45;
      ctx.fillStyle = `rgba(${v},${v},${v},0.035)`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
  }

  if (kind === 'wood') {
    for (let x = 0; x < size; x++) {
      const wave = Math.sin(x * 0.08) * 10 + Math.sin(x * 0.021) * 16;
      ctx.strokeStyle = x % 9 < 4 ? b : a;
      ctx.globalAlpha = 0.26;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + wave, size * 0.25, x - wave, size * 0.72, x + wave * 0.5, size);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (kind === 'metal') {
    for (let i = 0; i < 1200; i++) {
      const v = 120 + Math.random() * 80;
      ctx.strokeStyle = `rgba(${v},${v},${v},0.18)`;
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, y);
      ctx.lineTo(Math.random() * size, y + Math.random() * 8 - 4);
      ctx.stroke();
    }
  }

  if (kind === 'cloth') {
    ctx.strokeStyle = b;
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < size; i += 10) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const tex = {
  filamentGreen: canvasTexture('layers', '#12f0a1', '#08b979'),
  filamentOrange: canvasTexture('layers', '#ff9b2f', '#db641e'),
  wood: canvasTexture('wood', '#8b5a32', '#5f351f'),
  metal: canvasTexture('metal', '#8d9792', '#48514e'),
  darkMetal: canvasTexture('metal', '#303a37', '#151b1a'),
  cloth: canvasTexture('cloth', '#d56d4f', '#ffe1a6')
};

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x14231f, roughness: 0.92, metalness: 0.02 }),
  bed: new THREE.MeshPhysicalMaterial({ color: 0x003f32, roughness: 0.22, metalness: 0.08, clearcoat: 0.65, clearcoatRoughness: 0.18 }),
  glassBed: new THREE.MeshPhysicalMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.28, roughness: 0.12, metalness: 0, clearcoat: 1 }),
  accent: new THREE.MeshStandardMaterial({ color: 0x00ff9d, roughness: 0.28, metalness: 0.1, emissive: 0x003d2b }),
  accentHot: new THREE.MeshBasicMaterial({ color: 0x25ffb2, transparent: true, opacity: 0.85 }),
  orangeHot: new THREE.MeshBasicMaterial({ color: 0xff9a2f, transparent: true, opacity: 0.86 }),
  printerDark: new THREE.MeshStandardMaterial({ color: 0x1c2523, map: tex.darkMetal, roughness: 0.36, metalness: 0.72 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xa2aaa5, map: tex.metal, roughness: 0.31, metalness: 0.84 }),
  blackRubber: new THREE.MeshStandardMaterial({ color: 0x050706, roughness: 0.74, metalness: 0.02 }),
  filamentGreen: new THREE.MeshStandardMaterial({ color: 0x00e996, map: tex.filamentGreen, roughness: 0.36, metalness: 0.02, emissive: 0x002c20 }),
  filamentOrange: new THREE.MeshStandardMaterial({ color: 0xff8a2d, map: tex.filamentOrange, roughness: 0.38, metalness: 0.02, emissive: 0x2a1000 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x9a683b, map: tex.wood, roughness: 0.62, metalness: 0.02 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x4d2c1d, map: tex.wood, roughness: 0.68, metalness: 0.01 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xcab17b, roughness: 0.75, metalness: 0.01 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x933847, roughness: 0.5, metalness: 0.05 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0xd96f51, map: tex.cloth, roughness: 0.82, metalness: 0.0 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xf5d9a2, roughness: 0.72, metalness: 0.02 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x43bf67, roughness: 0.7, metalness: 0.0 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x236f46, roughness: 0.72, metalness: 0.0 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x7c817b, roughness: 0.9, metalness: 0.04 }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x49c4dc, transparent: true, opacity: 0.35, roughness: 0.08, metalness: 0.0, clearcoat: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9adfff, transparent: true, opacity: 0.62, roughness: 0.05, clearcoat: 1, transmission: 0.25 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xff8a20 }),
  ghost: new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.34, wireframe: true, depthWrite: false }),
  selection: new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: 0.86, wireframe: true, depthWrite: false }),
  freshFilament: new THREE.MeshBasicMaterial({ color: 0x42ffc4, transparent: true, opacity: 0.9, depthWrite: false }),
  player: new THREE.MeshStandardMaterial({ color: 0x65a8ff, roughness: 0.38, metalness: 0.05 })
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
    if (!child.userData.revealMaterial) {
      child.userData.revealMaterial = child.userData.originalMaterial.clone();
      child.userData.revealMaterial.transparent = true;
    }
    child.userData.revealMaterial.opacity = opacity;
    child.userData.revealMaterial.depthWrite = opacity > 0.72;
    child.material = child.userData.revealMaterial;
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

function cyl(radius, length, mat, segments = 24) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, segments), mat);
}

function tube(points, radius, mat, tubularSegments = 48) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), tubularSegments, radius, 10), mat);
}

function extrudedShape(shape, depth, mat, bevel = 0.035) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4
  });
  geometry.center();
  return new THREE.Mesh(geometry, mat);
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

function labelSprite(text, color = '#00ff9d') {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  c.width = 640;
  c.height = 150;
  ctx.fillStyle = 'rgba(0,0,0,.68)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = '#eafff7';
  ctx.font = 'bold 45px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(3.8, 0.9, 1);
  return sprite;
}

scene.add(new THREE.AmbientLight(0x5b6864, 0.46));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(16, 24, 12);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -34;
keyLight.shadow.camera.right = 34;
keyLight.shadow.camera.top = 34;
keyLight.shadow.camera.bottom = -34;
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x8ffff0, 0.45);
rimLight.position.set(-12, 10, -8);
scene.add(rimLight);
scene.add(new THREE.HemisphereLight(0x9fc9ff, 0x302310, 0.42));

const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), materials.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(90, 90, 0x00ff9d, 0x33453f);
grid.material.transparent = true;
grid.material.opacity = 0.24;
grid.position.y = 0.012;
scene.add(grid);

const waterRing = new THREE.Mesh(new THREE.RingGeometry(20, 24, 128), materials.water);
waterRing.rotation.x = -Math.PI / 2;
waterRing.position.y = 0.018;
scene.add(waterRing);

function createDetailedPrinter() {
  const g = new THREE.Group();
  g.name = 'v2 Detailed Cartesian Printer';

  const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.35, 5.8), materials.printerDark);
  base.position.y = 0.17;
  g.add(base);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.11, 4.45), materials.bed);
  bed.position.set(0, 0.44, 0.28);
  g.add(bed);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(4.75, 0.045, 4.15), materials.glassBed);
  glass.position.set(0, 0.53, 0.28);
  g.add(glass);

  for (const x of [-2.25, 2.25]) for (const z of [-1.65, 1.95]) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.18), materials.metal);
    clip.position.set(x, 0.64, z);
    g.add(clip);
  }

  const postGeo = new THREE.CylinderGeometry(0.11, 0.11, 6.25, 24);
  for (const x of [-2.55, 2.55]) for (const z of [-2.1, 2.1]) {
    const post = new THREE.Mesh(postGeo, materials.metal);
    post.position.set(x, 3.25, z);
    g.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 12), materials.accent);
    cap.position.set(x, 6.42, z);
    g.add(cap);
  }

  const gantry = new THREE.Group();
  gantry.name = 'moving x gantry';
  gantry.position.set(0, 5.55, 0.25);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.28, 0.42), materials.printerDark);
  gantry.add(beam);
  const railA = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 5.55, 20), materials.metal);
  railA.rotation.z = Math.PI / 2;
  railA.position.set(0, -0.22, 0.22);
  gantry.add(railA);
  const railB = railA.clone();
  railB.position.z = -0.22;
  gantry.add(railB);

  const beltTop = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.055, 0.055), materials.blackRubber);
  beltTop.position.set(0, 0.22, -0.33);
  gantry.add(beltTop);
  const beltBottom = beltTop.clone();
  beltBottom.position.y = -0.32;
  gantry.add(beltBottom);
  g.add(gantry);

  const carriage = new THREE.Group();
  carriage.name = 'moving carriage and hotend';
  carriage.position.set(0, 5.12, 0.25);
  const carriageBlock = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.86), materials.accent);
  carriage.add(carriageBlock);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 32), materials.printerDark);
  fan.rotation.x = Math.PI / 2;
  fan.position.set(0, 0.05, 0.47);
  carriage.add(fan);
  for (let i = 0; i < 5; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.34), materials.metal);
    fin.position.set(0, -0.28 - i * 0.075, 0);
    carriage.add(fin);
  }
  const heatBlock = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.38), materials.metal);
  heatBlock.position.y = -0.72;
  carriage.add(heatBlock);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 28), materials.printerDark);
  nozzle.position.y = -1.08;
  nozzle.rotation.x = Math.PI;
  carriage.add(nozzle);
  const led = new THREE.PointLight(0x00ff9d, 1.4, 5);
  led.position.set(0, -0.88, 0.2);
  carriage.add(led);
  carriage.add(tube([new THREE.Vector3(-0.28,0.36,-0.3), new THREE.Vector3(-1.1,1.0,-0.65), new THREE.Vector3(-1.8,0.25,-1.45)], 0.035, materials.metal));
  g.add(carriage);
  g.userData.carriage = carriage;

  const spool = new THREE.Group();
  const spoolCore = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 38), materials.filamentGreen);
  spoolCore.rotation.z = Math.PI / 2;
  spool.add(spoolCore);
  const spoolRim1 = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 10, 38), materials.printerDark);
  spoolRim1.rotation.y = Math.PI / 2;
  spoolRim1.position.x = -0.18;
  spool.add(spoolRim1);
  const spoolRim2 = spoolRim1.clone();
  spoolRim2.position.x = 0.18;
  spool.add(spoolRim2);
  spool.position.set(2.95, 5.95, -1.7);
  g.add(spool);
  g.userData.spool = spool;

  const filamentTube = tube([
    new THREE.Vector3(2.9,5.95,-1.7), new THREE.Vector3(1.4,6.45,-1.2), new THREE.Vector3(0.1,5.65,-0.35)
  ], 0.026, materials.accentHot, 40);
  g.add(filamentTube);

  const statusBar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.08), materials.accentHot);
  statusBar.position.set(0, 6.25, -2.18);
  g.add(statusBar);
  const sign = labelSprite('WORLD PRINTER v2');
  sign.position.set(0, 6.52, -2.22);
  g.add(sign);

  return shadow(g);
}

const printer = createDetailedPrinter();
printer.position.set(0, 0, -5.5);
scene.add(printer);

function printerBedWorld(y = 0) {
  return printer.localToWorld(new THREE.Vector3(0, 0.56 + y, 0.28));
}

function createPlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.78, 8, 16), materials.player);
  body.position.y = 0.82;
  g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.025, 8, 44), cloneTransparent(materials.accent, 0.58));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  g.add(ring);
  const label = labelSprite('PLAYER');
  label.scale.set(1.7, 0.42, 1);
  label.position.y = 1.85;
  g.add(label);
  return shadow(g);
}

const player = createPlayer();
player.position.set(0, 0, 5.25);
scene.add(player);
function playerHandWorld() { return player.localToWorld(new THREE.Vector3(0, 1.55, 0)); }

function createSpiral() {
  const pts = [];
  for (let i = 0; i < 180; i++) {
    const t = i / 179;
    const a = t * Math.PI * 7.5;
    const r = 0.55 + Math.sin(t * Math.PI * 4) * 0.16;
    pts.push(new THREE.Vector3(Math.cos(a) * r, t * 2.2, Math.sin(a) * r));
  }
  const g = new THREE.Group();
  g.name = 'Twisting Spiral Print';
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 180, 0.16, 18), materials.filamentGreen));
  const ring = new THREE.Mesh(new THREE.TorusKnotGeometry(0.58, 0.055, 90, 12, 2, 3), materials.filamentOrange);
  ring.position.y = 1.08;
  ring.rotation.x = Math.PI * 0.5;
  g.add(ring);
  return shadow(g);
}

function createCreature() {
  const g = new THREE.Group();
  g.name = 'Printed Creature';
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 2), materials.filamentOrange);
  body.position.y = 0.95;
  body.scale.set(1.1, 0.92, 0.86);
  g.add(body);
  for (const x of [-0.34, 0.34]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), materials.glass);
    eye.position.set(x, 1.14, 0.66);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 10), materials.printerDark);
    pupil.position.set(x, 1.12, 0.79);
    g.add(pupil);
  }
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const leg = tube([
      new THREE.Vector3(Math.cos(a)*0.42,0.62,Math.sin(a)*0.42),
      new THREE.Vector3(Math.cos(a)*0.8,0.35,Math.sin(a)*0.8),
      new THREE.Vector3(Math.cos(a)*1.05,0.16,Math.sin(a)*1.05)
    ], 0.045, materials.filamentGreen, 28);
    g.add(leg);
  }
  return shadow(g);
}

function createCottage() {
  const g = new THREE.Group();
  g.name = 'Layered Cottage';
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.15, 2.7), materials.wall);
  body.position.y = 1.08;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.1, 34, 1, false, 0, Math.PI), materials.roof);
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 2.2;
  g.add(roof);
  for (let i = -3; i <= 3; i++) {
    const rib = cyl(0.032, 3.18, materials.darkWood, 12);
    rib.rotation.x = Math.PI / 2;
    rib.position.set(i * 0.31, 2.34 + Math.cos(i * 0.45) * 0.07, 0);
    g.add(rib);
  }
  const door = extrudedShape(archShape(0.75, 1.25, 0.44), 0.08, materials.darkWood);
  door.position.set(0, 0.64, 1.39);
  g.add(door);
  for (const x of [-0.92, 0.92]) {
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 32), materials.glass);
    win.rotation.x = Math.PI / 2;
    win.position.set(x, 1.33, 1.4);
    g.add(win);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 8, 32), materials.darkWood);
    ring.position.copy(win.position);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 12), materials.stone);
  chimney.position.set(1.05, 2.8, -0.55);
  g.add(chimney);
  return shadow(g);
}

function createTree() {
  const g = new THREE.Group();
  g.name = 'Layered Tree';
  const trunk = tube([
    new THREE.Vector3(0,0,0), new THREE.Vector3(0.12,0.82,0.08), new THREE.Vector3(-0.16,1.72,-0.05), new THREE.Vector3(0.08,2.45,0.06)
  ], 0.16, materials.wood, 36);
  g.add(trunk);
  for (const [x,y,z,s,m] of [[0,2.2,0,1.05,materials.leafDark],[-0.55,2.55,0.1,0.82,materials.leaf],[0.5,2.62,-0.12,0.8,materials.leaf],[0.05,3.02,0.02,0.72,materials.leaf]]) {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), m);
    b.position.set(x,y,z); b.scale.y = 0.82; g.add(b);
  }
  return shadow(g);
}

function createBoat() {
  const g = new THREE.Group();
  g.name = 'Printed Hull Boat';
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.8, 0);
  hullShape.quadraticCurveTo(-1.25, -0.62, 0, -0.68);
  hullShape.quadraticCurveTo(1.25, -0.62, 1.8, 0);
  hullShape.quadraticCurveTo(0.85, 0.42, 0, 0.46);
  hullShape.quadraticCurveTo(-0.85, 0.42, -1.8, 0);
  const hull = extrudedShape(hullShape, 1.34, materials.wood, 0.045);
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.58;
  g.add(hull);
  for (const x of [-0.78, 0, 0.78]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.05), materials.darkWood);
    bench.position.set(x, 0.96, 0); g.add(bench);
  }
  const mast = cyl(0.045, 2.2, materials.darkWood, 12); mast.position.set(0.16, 1.75, 0); g.add(mast);
  const sailShape = new THREE.Shape(); sailShape.moveTo(0,0); sailShape.lineTo(0.85,0.35); sailShape.lineTo(0.05,1.4); sailShape.lineTo(0,0);
  const sail = extrudedShape(sailShape, 0.035, materials.cream); sail.position.set(0.45,1.65,0.02); sail.rotation.y = Math.PI/2; g.add(sail);
  return shadow(g);
}

function createBridge() {
  const g = new THREE.Group();
  g.name = 'Arched Bridge';
  for (let i = -5; i <= 5; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.18, 2.12), materials.wood);
    plank.position.set(i * 0.34, 0.44 + Math.sin((i + 5) / 10 * Math.PI) * 0.55, 0);
    plank.rotation.z = Math.cos((i + 5) / 10 * Math.PI) * 0.17;
    g.add(plank);
  }
  for (const z of [-1.18, 1.18]) {
    g.add(tube([new THREE.Vector3(-2.05,1.08,z), new THREE.Vector3(-0.85,1.6,z), new THREE.Vector3(0,1.78,z), new THREE.Vector3(0.85,1.6,z), new THREE.Vector3(2.05,1.08,z)], 0.05, materials.darkWood));
  }
  return shadow(g);
}

function createCart() {
  const g = new THREE.Group();
  g.name = 'Wood Cart';
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 1.15), materials.wood); base.position.y = 0.75; g.add(base);
  for (const z of [-0.66,0.66]) { const side = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.72,0.12), materials.darkWood); side.position.set(0,1.05,z); g.add(side); }
  for (const x of [-0.86,0.86]) for (const z of [-0.78,0.78]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.18,32), materials.darkWood); w.rotation.x = Math.PI/2; w.position.set(x,0.36,z); g.add(w); }
  g.add(tube([new THREE.Vector3(-1.35,0.92,0), new THREE.Vector3(-2.0,0.86,0), new THREE.Vector3(-2.55,0.6,0)], 0.045, materials.metal));
  return shadow(g);
}

function createStall() {
  const g = new THREE.Group();
  g.name = 'Market Stall';
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.7,0.65,1.2), materials.wood); counter.position.y = 0.55; g.add(counter);
  for (const x of [-1.15,1.15]) for (const z of [-0.45,0.45]) { const p = cyl(0.07,2.4,materials.darkWood,14); p.position.set(x,1.45,z); g.add(p); }
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,2.95,32,1,false,0,Math.PI), materials.cloth); canopy.rotation.z=Math.PI/2; canopy.rotation.y=Math.PI/2; canopy.position.y=2.55; g.add(canopy);
  return shadow(g);
}

function createCampfire() {
  const g = new THREE.Group(); g.name = 'Campfire';
  for (let i=0;i<8;i++) { const a=i/8*Math.PI*2; const st=new THREE.Mesh(new THREE.DodecahedronGeometry(0.18,0),materials.stone); st.position.set(Math.cos(a)*0.55,0.15,Math.sin(a)*0.55); g.add(st); }
  for (const a of [0,Math.PI/2]) { const log=cyl(0.09,1.1,materials.wood,12); log.rotation.z=Math.PI/2; log.rotation.y=a; log.position.y=0.22; g.add(log); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32,0.85,12), materials.flame); flame.position.y=0.64; g.add(flame);
  const light = new THREE.PointLight(0xff8a20,1.6,7); light.position.y=1.2; g.add(light);
  return shadow(g);
}

const recipes = [
  { id:'spiral', label:'Spiral', aliases:['spiral','twist','twisting','knot'], dims:[2.2,2.2,2.6], kind:'organic', create:createSpiral },
  { id:'creature', label:'Creature', aliases:['creature','robot','eyeball','monster','character'], dims:[2.2,2.2,1.8], kind:'organic', create:createCreature },
  { id:'cottage', label:'Cottage', aliases:['cottage','house','home','hut'], dims:[3.8,3.2,3.2], kind:'rect', create:createCottage },
  { id:'boat', label:'Boat', aliases:['boat','ship','sailboat'], dims:[3.7,1.8,2.7], kind:'hull', create:createBoat },
  { id:'tree', label:'Tree', aliases:['tree','forest','oak'], dims:[2.5,2.5,3.4], kind:'organic', create:createTree },
  { id:'bridge', label:'Bridge', aliases:['bridge','arch bridge','wood bridge'], dims:[4.4,2.8,2.0], kind:'rect', create:createBridge },
  { id:'cart', label:'Cart', aliases:['cart','wagon','carriage'], dims:[3.0,1.9,1.8], kind:'rect', create:createCart },
  { id:'stall', label:'Market Stall', aliases:['market','stall','shop','vendor'], dims:[3.4,2.2,3.1], kind:'rect', create:createStall },
  { id:'campfire', label:'Campfire', aliases:['campfire','fire','firepit'], dims:[1.4,1.4,1.2], kind:'organic', create:createCampfire }
];

let phase = 'ready';
let printedOnBed = null;
let carriedPreview = null;
let selected = null;
let selectionBox = null;
let layerGroup = null;
let bead = null;
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

function setPhase(next) { phase = next; setState(next); setButtons(); }

function localToolPath(recipe, raw) {
  const [width, depth, height] = recipe.dims;
  const layers = 34;
  const layerFloat = raw * layers;
  const layer = Math.floor(layerFloat);
  const t = layerFloat - layer;
  const y = 0.03 + height * (layer / layers) * 0.84;

  if (recipe.kind === 'organic') {
    const a = t * Math.PI * 2 + layer * 0.58;
    const r = (Math.min(width, depth) * 0.23) * (0.72 + 0.26 * Math.sin(layer * 0.37));
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  }

  if (recipe.kind === 'hull') {
    const a = t * Math.PI * 2;
    const rx = width * 0.34 * (0.95 - layer / layers * 0.18);
    const rz = depth * 0.31 * (0.55 + 0.25 * Math.sin(a));
    return new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz);
  }

  const w = width * 0.38;
  const d = depth * 0.38;
  const edge = t * 4;
  if (edge < 1) return new THREE.Vector3(-w + edge * 2 * w, y, -d);
  if (edge < 2) return new THREE.Vector3(w, y, -d + (edge - 1) * 2 * d);
  if (edge < 3) return new THREE.Vector3(w - (edge - 2) * 2 * w, y, d);
  return new THREE.Vector3(-w, y, d - (edge - 3) * 2 * d);
}

function createFilamentSegment(a, b, radius = 0.024) {
  const dist = a.distanceTo(b);
  if (dist < 0.015) return null;
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, b]), 4, radius, 7), materials.freshFilament);
  return mesh;
}

function clearSelection() {
  if (selectionBox) { scene.remove(selectionBox); selectionBox.geometry.dispose(); selectionBox.material.dispose(); selectionBox = null; }
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

function movable() { return carriedPreview || selected; }
function moveTarget(dx, dz) {
  const obj = movable();
  if (!obj) { setStatus('Nothing can move yet. Print, pick up, then move the preview.'); return; }
  obj.position.x = Math.round(obj.position.x + dx);
  obj.position.z = Math.round(obj.position.z + dz);
  updateSelectionBox();
}
function rotateTarget(dir) {
  const obj = movable();
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
  if (phase === 'printed-on-bed') { setStatus('Finished print is still on the bed. Pick it up or cancel it first.'); return; }
  if (carriedPreview) { setStatus('Place or cancel the carried preview before printing another object.'); return; }

  commandInput.value = `make a ${recipe.label.toLowerCase()}`;
  clearSelection();
  setPhase('printing');
  setStatus(`v2 printing ${recipe.label}: nozzle is depositing visible glowing filament paths.`);

  const obj = recipe.create();
  obj.userData.label = recipe.label;
  obj.userData.recipeId = recipe.id;
  obj.userData.state = 'printing';
  obj.position.copy(printerBedWorld(0.01));
  obj.scale.setScalar(0.018);
  setObjectOpacity(obj, 0.18);
  scene.add(obj);
  printedOnBed = obj;

  layerGroup = new THREE.Group();
  layerGroup.name = `${recipe.label} glowing filament paths`;
  scene.add(layerGroup);

  const carriage = printer.userData.carriage;
  const startCarriage = carriage.position.clone();
  const duration = 7600;
  const t0 = performance.now();
  let prevLocal = null;
  let lastEmit = 0;
  let segmentCount = 0;

  if (bead) { scene.remove(bead); bead = null; }
  bead = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), materials.accentHot);
  scene.add(bead);

  await new Promise(resolve => {
    function step(now) {
      const raw = clamp01((now - t0) / duration);
      const eased = 1 - Math.pow(1 - raw, 2.05);
      const local = localToolPath(recipe, raw);
      const world = printer.localToWorld(new THREE.Vector3(local.x, 0.56 + local.y, local.z + 0.28));

      obj.position.copy(printerBedWorld(0.01));
      obj.scale.setScalar(0.018 + eased * 0.982);
      setObjectOpacity(obj, 0.16 + eased * 0.84);

      carriage.position.x = local.x;
      carriage.position.z = local.z + 0.28;
      carriage.position.y = 1.2 + local.y + Math.sin(now * 0.012) * 0.025;
      printer.userData.spool.rotation.x += 0.045;
      bead.position.copy(world);

      if (prevLocal && now - lastEmit > 34 && segmentCount < 520) {
        const prevWorld = printer.localToWorld(new THREE.Vector3(prevLocal.x, 0.56 + prevLocal.y, prevLocal.z + 0.28));
        const seg = createFilamentSegment(prevWorld, world, recipe.kind === 'organic' ? 0.028 : 0.022);
        if (seg) { layerGroup.add(seg); segmentCount += 1; }
        lastEmit = now;
      }
      prevLocal = local.clone();

      if (raw < 1) requestAnimationFrame(step);
      else { carriage.position.copy(startCarriage); resolve(); }
    }
    requestAnimationFrame(step);
  });

  if (bead) { scene.remove(bead); bead = null; }
  restoreObjectMaterials(obj);
  obj.scale.setScalar(1);
  obj.position.copy(printerBedWorld(0.01));
  obj.userData.state = 'printed-on-bed';
  setPhase('printed-on-bed');
  setTarget(`${recipe.label} finished on printer bed`);
  setStatus(`${recipe.label} finished with v2 filament deposition. Pick it up to convert it into a placement preview.`);
}

async function pickupPrint() {
  if (phase !== 'printed-on-bed' || !printedOnBed) { setStatus('Nothing finished on the printer bed yet.'); return; }
  const obj = printedOnBed;
  printedOnBed = null;
  if (layerGroup) { scene.remove(layerGroup); layerGroup = null; }
  setPhase('pickup-moving');
  obj.userData.state = 'pickup-moving';
  setStatus(`Picking up ${obj.userData.label}: moving from v2 printer bed to player carry point.`);
  await animateTransform(obj, playerHandWorld(), 0.42, 850);
  await sleep(140);
  obj.userData.state = 'carried-preview';
  obj.scale.setScalar(1);
  const [x, z] = previewSlots[slotIndex % previewSlots.length]; slotIndex += 1;
  obj.position.set(x, 0, z);
  setGhost(obj, true);
  carriedPreview = obj;
  setPhase('carried-preview');
  setTarget(`preview ${obj.userData.label}`);
  setStatus(`${obj.userData.label} picked up. Move/rotate it or tap ground, then Place.`);
}

function placePreview() {
  if (!carriedPreview) { setStatus('No carried preview. Print something, then Pick Up Print first.'); return; }
  const obj = carriedPreview;
  carriedPreview = null;
  setGhost(obj, false);
  restoreObjectMaterials(obj);
  obj.userData.id = ++idCounter;
  obj.userData.state = 'placed';
  placed.push(obj);
  setPhase('ready');
  selectPlaced(obj);
  setStatus(`${obj.userData.label} placed as a solid v2 world object.`);
}

function cancelOrDelete() {
  if (phase === 'printing') { setStatus('Print is mid-fabrication. Let it finish, then cancel/pick up.'); return; }
  if (carriedPreview) { scene.remove(carriedPreview); carriedPreview = null; setPhase('ready'); setTarget('none'); setStatus('Carried preview cancelled.'); return; }
  if (printedOnBed) { scene.remove(printedOnBed); printedOnBed = null; if (layerGroup) { scene.remove(layerGroup); layerGroup = null; } setPhase('ready'); setTarget('none'); setStatus('Finished print removed from the bed.'); return; }
  if (selected) { const doomed = selected; clearSelection(); scene.remove(doomed); const idx = placed.indexOf(doomed); if (idx >= 0) placed.splice(idx, 1); setStatus('Selected placed object deleted.'); return; }
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
  if (!recipe) { setStatus('No recipe matched. Try spiral, creature, cottage, boat, tree, bridge, cart, stall, or campfire.'); return; }
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
    const hits = raycaster.intersectObject(ground);
    if (hits.length) {
      carriedPreview.position.x = Math.round(hits[0].point.x);
      carriedPreview.position.z = Math.round(hits[0].point.z);
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
  voiceButton.addEventListener('click', () => { setStatus('Listening. Say make a spiral, print creature, boat, cottage...'); recognition.start(); });
  recognition.onresult = e => {
    const transcript = e.results[0][0].transcript;
    commandInput.value = transcript;
    const recipe = parseCommand(transcript);
    if (recipe) startPrint(recipe);
    else setStatus(`Heard “${transcript}”, but no recipe matched yet.`);
  };
  recognition.onerror = e => setStatus(`Voice error: ${e.error}. Type the command instead.`);
}

const starterSpiral = createSpiral();
starterSpiral.position.set(-6.2, 0, -1.4);
starterSpiral.scale.setScalar(0.8);
starterSpiral.userData.label = 'Starter Spiral';
starterSpiral.userData.id = ++idCounter;
placed.push(starterSpiral);
scene.add(starterSpiral);

const starterCreature = createCreature();
starterCreature.position.set(-8.3, 0, 1.7);
starterCreature.userData.label = 'Starter Creature';
starterCreature.userData.id = ++idCounter;
placed.push(starterCreature);
scene.add(starterCreature);

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
    const c = printer.userData.carriage;
    c.position.x = Math.sin(now * 0.0011) * 0.55;
    c.position.y = 5.12;
    c.position.z = 0.25 + Math.cos(now * 0.0009) * 0.18;
    printer.userData.spool.rotation.x += 0.008;
  }
  player.rotation.y = Math.sin(now * 0.001) * 0.08;
  updateSelectionBox();
  controls.update();
  renderer.render(scene, camera);
}

setPhase('ready');
setTarget('none');
setStatus(`${BUILD}. This is the separate /v2/ page; stable v1 remains at root.`);
animate(performance.now());
