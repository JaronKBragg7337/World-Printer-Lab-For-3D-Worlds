import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <canvas id="world"></canvas>
  <section id="hud">
    <div class="topline">
      <h1>SYL Walkable Ship <span class="badge">isolated GPT-5.6 experiment</span></h1>
      <button id="toggleHud">Hide</button>
    </div>
    <div class="hud-body">
      <p class="note">A replacement ship study built from hundreds of discrete hull, engine, deck, and interior pieces. Nothing here changes the live printer or SYL game.</p>
      <div class="section-title">Fabrication</div>
      <div class="row">
        <button id="assemble" class="primary">Assemble Piece by Piece</button>
        <button id="instant">Complete Instantly</button>
        <button id="reset" class="warn">Reset</button>
      </div>
      <div class="section-title">View</div>
      <div class="row" id="viewButtons"></div>
      <div class="row" style="margin-top:7px">
        <button id="cutaway">Cutaway: Off</button>
        <button id="lights">Interior Lights: On</button>
      </div>
      <div id="status">Ready. Assemble the ship, then walk up the rear ramp and through the interior.</div>
      <div id="progressTrack"><div id="progressBar"></div></div>
      <div id="stats"><span id="partCount">0 printable pieces</span><span id="location">Outside ship</span></div>
    </div>
  </section>
  <div id="joystick"><div id="joyKnob"></div></div>
  <div id="crosshair"></div>
  <aside id="help">Joystick/WASD walks. Drag to look in 1st/3rd person. The open rear ramp is physically traversable; cargo bay, systems corridor, and cockpit use one continuous deck.</aside>
`;

const $ = (q) => document.querySelector(q);
const canvas = $('#world');
const statusEl = $('#status');
const progressBar = $('#progressBar');
const partCountEl = $('#partCount');
const locationEl = $('#location');
const hud = $('#hud');
const toggleHud = $('#toggleHud');

if (innerWidth <= 720) {
  hud.classList.add('collapsed', 'mobile-start');
  toggleHud.textContent = 'Open';
}
toggleHud.addEventListener('click', () => {
  hud.classList.toggle('collapsed');
  hud.classList.remove('mobile-start');
  toggleHud.textContent = hud.classList.contains('collapsed') ? 'Open' : 'Hide';
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03070c);
scene.fog = new THREE.FogExp2(0x03070c, 0.012);

const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.05, 600);
camera.position.set(18, 12, 22);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.4, -0.4);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI * 0.49;
controls.enablePan = true;

scene.add(new THREE.HemisphereLight(0x9bd6ff, 0x241a12, 0.72));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(16, 25, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x4dffc9, 0.65);
rim.position.set(-18, 8, -16);
scene.add(rim);

const mat = {
  ground: new THREE.MeshStandardMaterial({ color: 0x0b1418, roughness: 0.96, metalness: 0.02 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x1a262a, roughness: 0.68, metalness: 0.38 }),
  hull: new THREE.MeshStandardMaterial({ color: 0x60777d, roughness: 0.38, metalness: 0.58 }),
  hullDark: new THREE.MeshStandardMaterial({ color: 0x28373c, roughness: 0.48, metalness: 0.62 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x7e2028, roughness: 0.4, metalness: 0.45 }),
  deck: new THREE.MeshStandardMaterial({ color: 0x34474b, roughness: 0.74, metalness: 0.22 }),
  interior: new THREE.MeshStandardMaterial({ color: 0x1b292f, roughness: 0.7, metalness: 0.28 }),
  console: new THREE.MeshStandardMaterial({ color: 0x10242a, roughness: 0.32, metalness: 0.45, emissive: 0x062d29 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x4d252a, roughness: 0.82, metalness: 0.06 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x79d8ff, transparent: true, opacity: 0.38, roughness: 0.08, metalness: 0.05, clearcoat: 1, transmission: 0.16, side: THREE.DoubleSide }),
  glow: new THREE.MeshBasicMaterial({ color: 0x61ffd0, transparent: true, opacity: 0.95 }),
  engineGlow: new THREE.MeshBasicMaterial({ color: 0xff8a52, transparent: true, opacity: 0.9 }),
  rampEdge: new THREE.MeshStandardMaterial({ color: 0xd4a63c, roughness: 0.5, metalness: 0.4 }),
  player: new THREE.MeshStandardMaterial({ color: 0x78aaff, roughness: 0.42, metalness: 0.08 }),
};

const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const pad = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.28, 96), mat.pad);
pad.position.y = 0.12;
pad.receiveShadow = true;
scene.add(pad);
const padRing = new THREE.Mesh(new THREE.TorusGeometry(12.8, 0.07, 10, 96), mat.glow.clone());
padRing.rotation.x = Math.PI / 2;
padRing.position.y = 0.29;
scene.add(padRing);

const starMaterial = new THREE.MeshBasicMaterial({ color: 0xbfe5ff });
const starGeometry = new THREE.SphereGeometry(0.02, 5, 4);
for (let i = 0; i < 700; i++) {
  const star = new THREE.Mesh(starGeometry, starMaterial);
  const r = 90 + Math.random() * 180;
  const a = Math.random() * Math.PI * 2;
  const p = Math.acos(2 * Math.random() - 1);
  star.position.set(Math.sin(p) * Math.cos(a) * r, Math.cos(p) * r, Math.sin(p) * Math.sin(a) * r);
  star.scale.setScalar(Math.random() * 1.7 + 0.6);
  scene.add(star);
}

const ship = new THREE.Group();
ship.name = 'SYL_Pathfinder_PieceBuilt';
scene.add(ship);

const DECK_Y = 1.62;
const RAMP_REAR = -11.0;
const RAMP_TOP = -7.0;
const HULL_REAR = -7.0;
const HULL_FRONT = 6.3;
const pieces = [];
const interiorLights = [];
let builtCount = 0;
let assembling = false;
let cutaway = false;
let lightsOn = true;

const shared = {
  box: new THREE.BoxGeometry(1, 1, 1),
};

function addPiece(name, geometry, material, position, rotation = [0,0,0], scale = [1,1,1], options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = options.castShadow !== false;
  mesh.receiveShadow = options.receiveShadow !== false;
  mesh.visible = false;
  mesh.userData = {
    printedPiece: true,
    order: options.order ?? position[1],
    cutaway: !!options.cutaway,
    finalScale: new THREE.Vector3(...scale),
    built: false,
    section: options.section || 'hull',
    lightPanel: false,
  };
  pieces.push(mesh);
  ship.add(mesh);
  return mesh;
}

function boxPiece(name, position, size, material, rotation = [0,0,0], options = {}) {
  return addPiece(name, shared.box, material, position, rotation, size, options);
}

function taperedWidth(z) {
  if (z > 3.0) return THREE.MathUtils.lerp(2.9, 0.62, (z - 3.0) / 3.3);
  if (z < -4.8) return THREE.MathUtils.lerp(2.2, 2.9, (z + 7.0) / 2.2);
  return 2.9;
}
function hullHeight(z) {
  if (z > 3.2) return THREE.MathUtils.lerp(2.35, 1.18, (z - 3.2) / 3.1);
  return 2.35;
}

function buildDeck() {
  let index = 0;
  for (let z = -6.55; z <= 5.45; z += 0.78) {
    const w = Math.max(1.15, taperedWidth(z) - 0.42);
    for (let x = -w; x <= w + 0.01; x += 0.72) {
      boxPiece(`deck_${index++}`, [x, DECK_Y, z], [0.68, 0.16, 0.72], mat.deck, [0,0,0], { order: z + 20, section: 'deck' });
    }
  }

  const rampLen = Math.hypot(RAMP_TOP - RAMP_REAR, DECK_Y - 0.22);
  const rampAngle = Math.atan2(DECK_Y - 0.22, RAMP_TOP - RAMP_REAR);
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9;
    const z = THREE.MathUtils.lerp(RAMP_REAR, RAMP_TOP, t);
    const y = THREE.MathUtils.lerp(0.22, DECK_Y, t);
    for (const x of [-1.15, -0.38, 0.38, 1.15]) {
      boxPiece(`ramp_plate_${i}_${x}`, [x, y, z], [0.7, 0.14, rampLen / 9 * 0.94], mat.deck, [-rampAngle,0,0], { order: -30 + i, section: 'ramp' });
    }
  }
  for (const x of [-1.55, 1.55]) {
    boxPiece(`ramp_edge_${x}`, [x, (DECK_Y + 0.22) / 2 + 0.08, (RAMP_TOP + RAMP_REAR) / 2], [0.12, 0.16, rampLen], mat.rampEdge, [-rampAngle,0,0], { order: -18, section: 'ramp' });
  }
}

function buildHullShell() {
  let index = 0;
  const zStep = 0.78;
  const angleCount = 13;
  for (let z = HULL_REAR + 0.35; z <= HULL_FRONT; z += zStep) {
    const w = taperedWidth(z);
    const h = hullHeight(z);
    for (let ai = 0; ai < angleCount; ai++) {
      const theta = ai / (angleCount - 1) * Math.PI;
      const x = Math.cos(theta) * w;
      const y = DECK_Y + 0.72 + Math.sin(theta) * h;
      const arc = Math.PI * Math.sqrt((w*w + h*h) / 2) / (angleCount - 1) * 1.1;
      const isCockpit = z > 3.55 && theta > 0.38 && theta < Math.PI - 0.38;
      const material = isCockpit ? mat.glass : ((ai + Math.round(z * 2)) % 5 === 0 ? mat.hullDark : mat.hull);
      boxPiece(`shell_${index++}`, [x, y, z], [arc, 0.16, zStep * 0.92], material, [0,0,theta - Math.PI/2], {
        order: 40 + (y * 2) + z * 0.15,
        cutaway: x > 0.12 && !isCockpit,
        section: isCockpit ? 'canopy' : 'hull',
      });
    }
    if (z < 2.8) {
      for (const side of [-1,1]) {
        const x = side * (w + 0.05);
        boxPiece(`trim_${index++}`, [x, DECK_Y + 0.52, z], [0.1, 0.16, zStep * 0.88], mat.trim, [0,0,0], { order: 52 + z * .1, cutaway: side > 0, section: 'trim' });
      }
    }
  }

  for (let x = -2.45; x <= 2.45; x += 0.7) {
    if (Math.abs(x) < 1.55) continue;
    for (let y = DECK_Y + 0.35; y <= DECK_Y + 2.75; y += 0.58) {
      boxPiece(`rear_bulkhead_${x}_${y}`, [x, y, HULL_REAR], [0.62, 0.5, 0.18], mat.hull, [0,0,0], { order: 30 + y, cutaway: x > 0, section: 'hull' });
    }
  }
  for (let x = -1.45; x <= 1.45; x += 0.7) {
    boxPiece(`rear_header_${x}`, [x, DECK_Y + 3.0, HULL_REAR], [0.62, 0.5, 0.18], mat.hullDark, [0,0,0], { order: 35, cutaway: x > 0, section: 'hull' });
  }

  for (let ri = 0; ri < 4; ri++) {
    const z = 5.75 + ri * 0.18;
    const w = Math.max(0.45, taperedWidth(z));
    const h = Math.max(0.8, hullHeight(z));
    const n = 10;
    for (let ai = 0; ai < n; ai++) {
      const theta = ai / (n - 1) * Math.PI;
      const x = Math.cos(theta) * w;
      const y = DECK_Y + 0.65 + Math.sin(theta) * h;
      boxPiece(`nose_cap_${ri}_${ai}`, [x, y, z], [0.48, 0.16, 0.16], ai > 1 && ai < n - 2 ? mat.glass : mat.hull, [0,0,theta-Math.PI/2], { order: 70 + ri, cutaway: x > 0.15 && !(ai > 1 && ai < n - 2), section: 'nose' });
    }
  }
}

function buildWings() {
  for (const side of [-1, 1]) {
    let idx = 0;
    for (let row = 0; row < 7; row++) {
      const z = -0.4 - row * 0.72;
      const span = 2.25 + row * 0.42;
      const count = Math.max(3, Math.round(span / 0.72));
      for (let i = 0; i < count; i++) {
        const x = side * (2.65 + i * 0.68);
        boxPiece(`wing_${side}_${idx++}`, [x, DECK_Y + 0.18 - row * 0.025, z], [0.64, 0.13, 0.64], (i + row) % 4 === 0 ? mat.trim : mat.hull, [0, -side * 0.05, 0], { order: 75 + row, cutaway: side > 0, section: 'wing' });
      }
    }
    boxPiece(`wingtip_${side}`, [side * 6.85, DECK_Y + 0.16, -4.65], [0.36, 0.32, 1.55], mat.hullDark, [0,0,side * 0.08], { order: 84, cutaway: side > 0, section: 'wing' });
  }
}

function buildEngines() {
  for (const side of [-1, 1]) {
    const x = side * 4.55;
    for (let ring = 0; ring < 6; ring++) {
      const z = -2.1 - ring * 0.52;
      for (let seg = 0; seg < 10; seg++) {
        const a0 = seg / 10 * Math.PI * 2;
        const geo = new THREE.CylinderGeometry(0.73, 0.73, 0.46, 3, 1, true, a0, Math.PI * 2 / 10 * 1.04);
        addPiece(`engine_${side}_${ring}_${seg}`, geo, (seg + ring) % 5 === 0 ? mat.trim : mat.hullDark, [x, DECK_Y + 0.28, z], [Math.PI/2,0,0], [1,1,1], { order: 92 + ring, cutaway: side > 0, section: 'engine' });
      }
    }
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.59, 32), mat.engineGlow);
    glow.rotation.x = Math.PI;
    glow.position.set(x, DECK_Y + 0.28, -5.18);
    glow.userData.alwaysVisible = true;
    ship.add(glow);
    const light = new THREE.PointLight(0xff6d3f, 1.7, 8);
    light.position.set(x, DECK_Y + 0.28, -5.35);
    ship.add(light);
    interiorLights.push(light);
  }
}

function buildInterior() {
  let idx = 0;
  for (let z = -5.9; z <= 4.7; z += 1.35) {
    const w = Math.max(1.1, taperedWidth(z) - 0.48);
    for (const side of [-1, 1]) {
      boxPiece(`rib_side_${idx++}`, [side * w, DECK_Y + 1.15, z], [0.14, 2.15, 0.16], mat.interior, [0,0,0], { order: 110 + z, cutaway: side > 0, section: 'interior' });
    }
    boxPiece(`rib_ceiling_${idx++}`, [0, DECK_Y + 3.18, z], [w * 2, 0.12, 0.16], mat.interior, [0,0,0], { order: 113 + z, cutaway: true, section: 'interior' });
  }

  for (const side of [-1, 1]) {
    for (let z = -5.4; z <= -2.1; z += 1.1) {
      boxPiece(`cargo_bench_${side}_${z}`, [side * 1.72, DECK_Y + 0.5, z], [0.62, 0.28, 0.82], mat.seat, [0,0,0], { order: 125 + z, cutaway: side > 0, section: 'cargo' });
      boxPiece(`cargo_back_${side}_${z}`, [side * 2.02, DECK_Y + 1.05, z], [0.14, 0.9, 0.82], mat.interior, [0,0,0], { order: 126 + z, cutaway: side > 0, section: 'cargo' });
    }
  }
  for (const x of [-0.86, 0, 0.86]) {
    boxPiece(`cargo_rail_${x}`, [x, DECK_Y + 0.11, -4.15], [0.08, 0.05, 4.0], mat.rampEdge, [0,0,0], { order: 120, section: 'cargo' });
  }

  for (const side of [-1, 1]) {
    for (let z = -1.25; z <= 1.7; z += 0.9) {
      boxPiece(`system_console_${side}_${z}`, [side * 1.78, DECK_Y + 0.72, z], [0.58, 1.15, 0.7], mat.console, [0,0,0], { order: 135 + z, cutaway: side > 0, section: 'systems' });
      const lightPanel = boxPiece(`system_light_${side}_${z}`, [side * 1.46, DECK_Y + 0.95, z], [0.04, 0.34, 0.42], mat.glow, [0,0,0], { order: 139 + z, cutaway: side > 0, castShadow: false, section: 'systems' });
      lightPanel.userData.lightPanel = true;
    }
  }

  for (const z of [-1.75, 2.35]) {
    for (let x = -2.15; x <= 2.15; x += 0.62) {
      if (Math.abs(x) < 0.82) continue;
      for (let y = DECK_Y + 0.35; y <= DECK_Y + 2.55; y += 0.56) {
        boxPiece(`bulkhead_${z}_${x}_${y}`, [x, y, z], [0.55, 0.48, 0.14], mat.interior, [0,0,0], { order: 145 + y, cutaway: x > 0, section: 'bulkhead' });
      }
    }
    for (const x of [-0.62, 0, 0.62]) {
      boxPiece(`bulkhead_header_${z}_${x}`, [x, DECK_Y + 2.83, z], [0.56, 0.36, 0.14], mat.hullDark, [0,0,0], { order: 150, cutaway: x > 0, section: 'bulkhead' });
    }
  }

  for (const side of [-1, 1]) {
    boxPiece(`pilot_seat_base_${side}`, [side * 0.78, DECK_Y + 0.34, 4.15], [0.72, 0.36, 0.78], mat.seat, [0,0,0], { order: 160, cutaway: side > 0, section: 'cockpit' });
    boxPiece(`pilot_seat_back_${side}`, [side * 0.78, DECK_Y + 0.92, 4.42], [0.72, 0.92, 0.22], mat.seat, [-0.16,0,0], { order: 161, cutaway: side > 0, section: 'cockpit' });
    boxPiece(`side_console_${side}`, [side * 1.62, DECK_Y + 0.76, 4.45], [0.72, 0.62, 1.5], mat.console, [-0.12,0,0], { order: 162, cutaway: side > 0, section: 'cockpit' });
  }
  boxPiece('forward_console', [0, DECK_Y + 0.9, 5.35], [2.45, 0.54, 0.72], mat.console, [-0.18,0,0], { order: 164, cutaway: true, section: 'cockpit' });
  boxPiece('navigation_table', [0, DECK_Y + 0.58, 2.95], [1.12, 0.18, 1.0], mat.console, [0,0,0], { order: 158, cutaway: true, section: 'cockpit' });

  for (let z = -5.4; z <= 4.6; z += 1.65) {
    const panel = boxPiece(`ceiling_light_${z}`, [0, DECK_Y + 3.02, z], [0.75, 0.06, 0.32], mat.glow, [0,0,0], { order: 170 + z, cutaway: true, castShadow: false, section: 'lighting' });
    panel.userData.lightPanel = true;
    const light = new THREE.PointLight(0x7affd6, 1.15, 5.6, 2);
    light.position.set(0, DECK_Y + 2.78, z);
    ship.add(light);
    interiorLights.push(light);
  }
}

function buildLandingGear() {
  for (const [x,z] of [[-2.05,-4.8],[2.05,-4.8],[-2.25,3.15],[2.25,3.15]]) {
    boxPiece(`gear_strut_${x}_${z}`, [x, 0.82, z], [0.16, 1.38, 0.16], mat.hullDark, [0,0,x > 0 ? -0.12 : 0.12], { order: 15, cutaway: x > 0, section: 'gear' });
    boxPiece(`gear_foot_${x}_${z}`, [x, 0.18, z], [0.92, 0.16, 0.42], mat.hullDark, [0,0,0], { order: 14, cutaway: x > 0, section: 'gear' });
  }
}

buildDeck();
buildHullShell();
buildWings();
buildEngines();
buildInterior();
buildLandingGear();
pieces.sort((a,b) => a.userData.order - b.userData.order || a.position.y - b.position.y || a.position.z - b.position.z);
partCountEl.textContent = `${pieces.length} printable pieces`;

const bead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat.glow);
bead.visible = false;
ship.add(bead);
const fabricationLight = new THREE.PointLight(0x61ffd0, 0, 5);
ship.add(fabricationLight);

function pieceShouldShow(piece) {
  if (!piece.userData.built) return false;
  if (!lightsOn && piece.userData.lightPanel) return false;
  return !(cutaway && piece.userData.cutaway);
}
function applyVisibility() {
  for (const piece of pieces) piece.visible = pieceShouldShow(piece);
}
function setProgress() {
  progressBar.style.width = `${pieces.length ? builtCount / pieces.length * 100 : 0}%`;
}
function resetShip() {
  assembling = false;
  builtCount = 0;
  bead.visible = false;
  fabricationLight.intensity = 0;
  for (const piece of pieces) {
    piece.userData.built = false;
    piece.visible = false;
    piece.scale.copy(piece.userData.finalScale);
  }
  setProgress();
  statusEl.textContent = 'Reset. The ship exists only as a recipe until fabrication begins.';
}
function completeInstantly() {
  assembling = false;
  builtCount = pieces.length;
  for (const piece of pieces) {
    piece.userData.built = true;
    piece.scale.copy(piece.userData.finalScale);
  }
  bead.visible = false;
  fabricationLight.intensity = 0;
  applyVisibility();
  setProgress();
  statusEl.textContent = `Complete: ${pieces.length} separate pieces form one connected, walkable ship.`;
}
function revealPiece(piece) {
  piece.userData.built = true;
  builtCount++;
  piece.visible = pieceShouldShow(piece);
  piece.scale.copy(piece.userData.finalScale).multiplyScalar(0.08);
  bead.position.copy(piece.position);
  bead.visible = true;
  fabricationLight.position.copy(piece.position);
  fabricationLight.intensity = 2.2;
  const start = performance.now();
  const final = piece.userData.finalScale;
  function grow(now) {
    const t = Math.min(1, (now - start) / 115);
    const e = 1 - Math.pow(1 - t, 3);
    piece.scale.copy(final).multiplyScalar(0.08 + e * 0.92);
    if (t < 1) requestAnimationFrame(grow);
  }
  requestAnimationFrame(grow);
}
async function assembleShip() {
  if (assembling) return;
  resetShip();
  assembling = true;
  statusEl.textContent = `Fabricating ${pieces.length} pieces: ramp and deck → pressure hull → wings and engines → interior rooms → cockpit.`;
  const delay = Math.max(10, Math.min(28, 8600 / pieces.length));
  for (let i = 0; i < pieces.length && assembling; i++) {
    revealPiece(pieces[i]);
    if (i % 3 === 0) setProgress();
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  if (!assembling) return;
  assembling = false;
  bead.visible = false;
  fabricationLight.intensity = 0;
  setProgress();
  statusEl.textContent = `Ship complete. Walk up the rear ramp at Z ${RAMP_REAR.toFixed(0)}, then inspect cargo, systems, and cockpit spaces.`;
}

$('#assemble').addEventListener('click', assembleShip);
$('#instant').addEventListener('click', completeInstantly);
$('#reset').addEventListener('click', resetShip);
$('#cutaway').addEventListener('click', (e) => {
  cutaway = !cutaway;
  e.currentTarget.textContent = `Cutaway: ${cutaway ? 'On' : 'Off'}`;
  e.currentTarget.classList.toggle('active', cutaway);
  applyVisibility();
});
$('#lights').addEventListener('click', (e) => {
  lightsOn = !lightsOn;
  for (const light of interiorLights) light.visible = lightsOn;
  applyVisibility();
  e.currentTarget.textContent = `Interior Lights: ${lightsOn ? 'On' : 'Off'}`;
  e.currentTarget.classList.toggle('active', lightsOn);
});

const player = new THREE.Group();
const playerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.82, 7, 12), mat.player);
playerBody.position.y = 0.82;
player.add(playerBody);
const playerRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 8, 36), mat.glow);
playerRing.rotation.x = Math.PI / 2;
playerRing.position.y = 0.04;
player.add(playerRing);
player.position.set(0, 0, -13.5);
scene.add(player);

function rampHeight(z) {
  const t = THREE.MathUtils.clamp((z - RAMP_REAR) / (RAMP_TOP - RAMP_REAR), 0, 1);
  return THREE.MathUtils.lerp(0.2, DECK_Y + 0.08, t);
}
function interiorWidth(z) {
  return Math.max(0.72, taperedWidth(z) - 0.62);
}
function surfaceHeight(x,z) {
  if (Math.abs(x) < 1.72 && z >= RAMP_REAR && z <= RAMP_TOP) return rampHeight(z);
  if (z >= HULL_REAR && z <= HULL_FRONT - 0.25 && Math.abs(x) <= interiorWidth(z)) return DECK_Y + 0.08;
  return 0;
}
function constrainPosition(next) {
  if (next.z >= HULL_REAR && next.z <= HULL_FRONT - 0.25 && next.y > DECK_Y - 0.25) {
    const maxX = interiorWidth(next.z);
    next.x = THREE.MathUtils.clamp(next.x, -maxX, maxX);
  }
  if (next.z >= RAMP_REAR && next.z <= RAMP_TOP && next.y > 0.1) {
    next.x = THREE.MathUtils.clamp(next.x, -1.62, 1.62);
  }
  next.x = THREE.MathUtils.clamp(next.x, -28, 28);
  next.z = THREE.MathUtils.clamp(next.z, -28, 28);
  next.y = surfaceHeight(next.x, next.z);
}
function locationName() {
  const {x,z,y} = player.position;
  if (z >= RAMP_REAR && z < HULL_REAR && Math.abs(x) < 1.8) return 'Rear ramp';
  if (y > DECK_Y - 0.2 && z < -1.75) return 'Cargo bay';
  if (y > DECK_Y - 0.2 && z < 2.35) return 'Systems corridor';
  if (y > DECK_Y - 0.2) return 'Cockpit';
  return 'Outside ship';
}

let viewMode = 'orbit';
let camYaw = 0;
let camPitch = 0.25;
const viewButtonsEl = $('#viewButtons');
const VIEW = { orbit:'Orbit', follow:'3rd Person', first:'1st Person' };
function renderViewButtons() {
  viewButtonsEl.innerHTML = '';
  for (const key of Object.keys(VIEW)) {
    const b = document.createElement('button');
    b.textContent = VIEW[key];
    b.classList.toggle('active', viewMode === key);
    b.addEventListener('click', () => setViewMode(key));
    viewButtonsEl.appendChild(b);
  }
}
function setViewMode(mode) {
  viewMode = mode;
  controls.enabled = mode === 'orbit';
  if (mode === 'orbit') {
    camera.position.set(18,12,22);
    controls.target.set(0,2.4,-0.4);
    controls.update();
  } else {
    camYaw = player.rotation.y;
  }
  $('#crosshair').style.display = mode === 'first' ? 'block' : 'none';
  renderViewButtons();
}
renderViewButtons();
setViewMode('orbit');

const keys = { forward:0, side:0 };
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.forward = 1;
  if (k === 's' || e.key === 'ArrowDown') keys.forward = -1;
  if (k === 'a' || e.key === 'ArrowLeft') keys.side = -1;
  if (k === 'd' || e.key === 'ArrowRight') keys.side = 1;
});
addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 's' || e.key === 'ArrowUp' || e.key === 'ArrowDown') keys.forward = 0;
  if (k === 'a' || k === 'd' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') keys.side = 0;
});

const joyEl = $('#joystick');
const joyKnob = $('#joyKnob');
const joy = { x:0, y:0 };
let joyId = null, joyCX = 0, joyCY = 0;
function updateJoy(e) {
  const dx = e.clientX - joyCX;
  const dy = e.clientY - joyCY;
  const max = 43;
  const len = Math.min(1, Math.hypot(dx,dy) / max);
  const a = Math.atan2(dy,dx);
  joy.x = Math.cos(a) * len;
  joy.y = Math.sin(a) * len;
  joyKnob.style.transform = `translate(${joy.x * max}px,${joy.y * max}px)`;
}
joyEl.addEventListener('pointerdown', (e) => {
  joyId = e.pointerId;
  const r = joyEl.getBoundingClientRect();
  joyCX = r.left + r.width/2;
  joyCY = r.top + r.height/2;
  joyEl.setPointerCapture?.(e.pointerId);
  updateJoy(e);
});
joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) updateJoy(e); });
function endJoy(e) {
  if (e.pointerId !== joyId) return;
  joyId = null; joy.x = 0; joy.y = 0; joyKnob.style.transform = 'translate(0,0)';
}
joyEl.addEventListener('pointerup', endJoy);
joyEl.addEventListener('pointercancel', endJoy);

let lookId = null;
let lastLook = null;
canvas.addEventListener('pointerdown', (e) => {
  if (viewMode === 'orbit') return;
  lookId = e.pointerId;
  lastLook = { x:e.clientX, y:e.clientY };
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== lookId || !lastLook || viewMode === 'orbit') return;
  camYaw -= (e.clientX - lastLook.x) * 0.005;
  camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - lastLook.y) * 0.004, -0.85, 0.95);
  lastLook = { x:e.clientX, y:e.clientY };
});
function endLook(e) { if (e.pointerId === lookId) { lookId = null; lastLook = null; } }
canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);

const eye = new THREE.Vector3();
const nextPos = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
function updatePlayer() {
  let side = keys.side + joy.x;
  let forward = keys.forward - joy.y;
  const len = Math.hypot(side,forward);
  if (len < 0.03) return;
  if (len > 1) { side /= len; forward /= len; }
  const yaw = viewMode === 'orbit'
    ? Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z)
    : camYaw;
  const dx = Math.cos(yaw) * side + Math.sin(yaw) * forward;
  const dz = -Math.sin(yaw) * side + Math.cos(yaw) * forward;
  nextPos.copy(player.position);
  nextPos.x += dx * 0.105;
  nextPos.z += dz * 0.105;
  constrainPosition(nextPos);
  player.position.copy(nextPos);
  player.rotation.y = Math.atan2(dx,dz);
}
function updateCamera() {
  if (viewMode === 'orbit') return;
  const cp = Math.cos(camPitch);
  if (viewMode === 'first') {
    eye.set(player.position.x, player.position.y + 1.55, player.position.z);
    camera.position.copy(eye);
    lookTarget.set(eye.x + Math.sin(camYaw) * cp, eye.y - Math.sin(camPitch), eye.z + Math.cos(camYaw) * cp);
    camera.lookAt(lookTarget);
  } else {
    const dist = 5.4;
    camera.position.set(
      player.position.x - Math.sin(camYaw) * dist * cp,
      player.position.y + 2.0 + Math.sin(camPitch) * dist,
      player.position.z - Math.cos(camYaw) * dist * cp,
    );
    camera.lookAt(player.position.x, player.position.y + 1.15, player.position.z);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  updatePlayer();
  updateCamera();
  if (viewMode === 'orbit') controls.update();
  locationEl.textContent = locationName();
  padRing.material.opacity = 0.6 + Math.sin(now * 0.002) * 0.2;
  renderer.render(scene,camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth,innerHeight);
});

resetShip();
if (new URLSearchParams(location.search).get('auto') === '1') setTimeout(assembleShip, 350);
animate(performance.now());

window.__SYL_WALKABLE_SHIP__ = {
  ship, pieces, player, assembleShip, completeInstantly, resetShip,
  dimensions: { deckY:DECK_Y, rear:HULL_REAR, front:HULL_FRONT },
};
