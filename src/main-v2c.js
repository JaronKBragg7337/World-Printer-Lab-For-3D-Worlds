import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

const BUILD = 'v2c — component printing, nozzle follows active part math';
const app = document.querySelector('#app');

app.innerHTML = `
  <canvas id="world"></canvas>
  <section id="hud">
    <div class="topline">
      <h1>World Printer Lab <span style="color:#00ff9d">v2c</span></h1>
      <button id="toggleHud" class="secondary">Hide</button>
    </div>
    <div class="hud-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
        <a href="/" style="color:#00ff9d;text-decoration:none;font-weight:800">← Back to stable v1</a>
        <span class="pill">experimental</span>
      </div>
      <p class="note"><b>${BUILD}</b>. The object no longer grows separately from the toolpath. Each part is revealed only while the nozzle is printing that part.</p>
      <div class="section-title">Speak / Type Object</div>
      <div class="row">
        <input id="commandInput" value="make a market stall" aria-label="Object command" />
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
        <span class="pill">component reveal</span>
        <span class="pill">part-local paths</span>
        <span class="pill">variable print time</span>
        <span class="pill">bed first</span>
      </div>
      <div id="status">Ready. Try Stall, Cottage, Boat, Tree, Bridge, Cart, Spiral, Creature, or Campfire.</div>
      <div id="selected">Target: none</div>
    </div>
  </section>
  <aside id="help">v2c: nozzle follows the active part. Future parts stay invisible until reached. Then pick up and place.</aside>
`;

const $ = (q) => document.querySelector(q);
const canvas = $('#world');
const hud = $('#hud');
const toggleHud = $('#toggleHud');
const statusEl = $('#status');
const selectedEl = $('#selected');
const statePill = $('#statePill');
const commandInput = $('#commandInput');
const recipeButtons = $('#recipeButtons');
const runButton = $('#runCommand');
const pickupButton = $('#pickupPrint');
const placeButton = $('#placeObject');
const cancelButton = $('#cancelObject');
const voiceButton = $('#voiceButton');

if (window.innerWidth <= 720) {
  hud.classList.add('collapsed', 'mobile-start');
  toggleHud.textContent = 'Open';
}
toggleHud.addEventListener('click', () => {
  hud.classList.toggle('collapsed');
  hud.classList.remove('mobile-start');
  toggleHud.textContent = hud.classList.contains('collapsed') ? 'Open' : 'Hide';
});

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const setStatus = (t) => { statusEl.textContent = t; };
const setState = (t) => { statePill.textContent = t; };
const setTarget = (t) => { selectedEl.textContent = `Target: ${t}`; };

function texture(kind, base, line, size = 256) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  if (kind === 'layers') {
    for (let y = 0; y < size; y++) {
      x.fillStyle = Math.floor(y / 5) % 2 ? line : base;
      x.fillRect(0, y, size, 1);
    }
    for (let i = 0; i < 1000; i++) {
      x.fillStyle = `rgba(255,255,255,${Math.random() * 0.045})`;
      x.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
  }
  if (kind === 'wood') {
    x.globalAlpha = 0.34;
    for (let px = 0; px < size; px += 2) {
      const w = Math.sin(px * 0.08) * 10 + Math.sin(px * 0.021) * 18;
      x.strokeStyle = px % 12 < 6 ? line : base;
      x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + w, 65, px - w, 180, px + w * 0.3, size); x.stroke();
    }
    x.globalAlpha = 1;
  }
  if (kind === 'metal') {
    for (let i = 0; i < 1200; i++) {
      const v = 85 + Math.random() * 120;
      x.strokeStyle = `rgba(${v},${v},${v},0.2)`;
      const y = Math.random() * size;
      x.beginPath(); x.moveTo(Math.random() * size, y); x.lineTo(Math.random() * size, y + Math.random() * 7 - 3.5); x.stroke();
    }
  }
  if (kind === 'cloth') {
    x.globalAlpha = 0.26; x.strokeStyle = line;
    for (let i = 0; i < size; i += 9) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, size); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(size, i); x.stroke();
    }
    x.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

const tex = {
  green: texture('layers', '#0ee798', '#08b16f'),
  orange: texture('layers', '#ff9738', '#d7601f'),
  cream: texture('layers', '#e6d9bd', '#bfb494'),
  wood: texture('wood', '#8b5a32', '#5b331f'),
  metal: texture('metal', '#89938e', '#39413e'),
  darkMetal: texture('metal', '#2a3431', '#101514'),
  cloth: texture('cloth', '#d66f50', '#ffe0aa')
};

const mat = {
  ground: new THREE.MeshStandardMaterial({ color: 0x12221e, roughness: 0.92, metalness: 0.02 }),
  bed: new THREE.MeshPhysicalMaterial({ color: 0x003f32, roughness: 0.18, metalness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.16 }),
  bedGlass: new THREE.MeshPhysicalMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.28, roughness: 0.08, clearcoat: 1 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x17201e, map: tex.darkMetal, roughness: 0.38, metalness: 0.78 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xa7afaa, map: tex.metal, roughness: 0.28, metalness: 0.86 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x050706, roughness: 0.82, metalness: 0.01 }),
  green: new THREE.MeshStandardMaterial({ color: 0x00e996, map: tex.green, roughness: 0.34, metalness: 0.02, emissive: 0x003020 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff8730, map: tex.orange, roughness: 0.36, metalness: 0.02, emissive: 0x2a1000 }),
  creamPrinted: new THREE.MeshStandardMaterial({ color: 0xe6d9bd, map: tex.cream, roughness: 0.42, metalness: 0.01, emissive: 0x0c0802 }),
  freshGreen: new THREE.MeshBasicMaterial({ color: 0x45ffc6, transparent: true, opacity: 0.92, depthWrite: false }),
  freshOrange: new THREE.MeshBasicMaterial({ color: 0xffb14d, transparent: true, opacity: 0.92, depthWrite: false }),
  wood: new THREE.MeshStandardMaterial({ color: 0x9a683b, map: tex.wood, roughness: 0.62, metalness: 0.02 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x4b2d1e, map: tex.wood, roughness: 0.68, metalness: 0.01 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xcab17b, map: tex.cream, roughness: 0.72, metalness: 0.01 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x943848, map: tex.orange, roughness: 0.48, metalness: 0.04 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0xd96f51, map: tex.cloth, roughness: 0.82, metalness: 0.0 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x43bf67, roughness: 0.72, metalness: 0.0 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x236f46, roughness: 0.74, metalness: 0.0 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x7c817b, roughness: 0.9, metalness: 0.04 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9adfff, transparent: true, opacity: 0.62, roughness: 0.05, clearcoat: 1, transmission: 0.22 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xff8a20 }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x49c4dc, transparent: true, opacity: 0.34, roughness: 0.08, clearcoat: 1 }),
  ghost: new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.34, wireframe: true, depthWrite: false }),
  select: new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: 0.86, wireframe: true, depthWrite: false }),
  player: new THREE.MeshStandardMaterial({ color: 0x65a8ff, roughness: 0.38, metalness: 0.05 })
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071012);
scene.fog = new THREE.Fog(0x071012, 30, 96);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(11.4, 7.4, 12.6);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.1, -1.2);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI * 0.49;
controls.update();

scene.add(new THREE.AmbientLight(0x5e6b66, 0.48));
const key = new THREE.DirectionalLight(0xffffff, 1.65);
key.position.set(17, 25, 12);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -34; key.shadow.camera.right = 34; key.shadow.camera.top = 34; key.shadow.camera.bottom = -34;
scene.add(key);
const rim = new THREE.DirectionalLight(0x8ffff0, 0.48);
rim.position.set(-12, 9, -8); scene.add(rim);
scene.add(new THREE.HemisphereLight(0x9fc9ff, 0x302310, 0.42));

const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat.ground);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(90, 90, 0x00ff9d, 0x33453f);
grid.material.transparent = true; grid.material.opacity = 0.24; grid.position.y = 0.012; scene.add(grid);
const water = new THREE.Mesh(new THREE.RingGeometry(20, 24, 128), mat.water);
water.rotation.x = -Math.PI / 2; water.position.y = 0.018; scene.add(water);

function shadow(root) { root.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return root; }
function cyl(radius, length, material, seg = 24) { return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, seg), material); }
function tube(points, radius, material, seg = 48) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, radius, 10), material); }
function clearMat(material, opacity) { const m = material.clone(); m.transparent = true; m.opacity = opacity; m.depthWrite = opacity > 0.65; return m; }
function archShape(w, h, arch) { const s = new THREE.Shape(); s.moveTo(-w/2,0); s.lineTo(-w/2,h-arch); s.quadraticCurveTo(-w/2,h,0,h); s.quadraticCurveTo(w/2,h,w/2,h-arch); s.lineTo(w/2,0); s.lineTo(-w/2,0); return s; }
function extrude(shape, depth, material, bevel = 0.035) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4 }); g.center(); return new THREE.Mesh(g, material); }
function label(text, color = '#00ff9d') {
  const c = document.createElement('canvas'); c.width = 640; c.height = 150;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.68)'; x.fillRect(0,0,c.width,c.height);
  x.strokeStyle = color; x.lineWidth = 8; x.strokeRect(8,8,c.width-16,c.height-16);
  x.fillStyle = '#eafff7'; x.font = 'bold 45px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text,c.width/2,c.height/2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); s.scale.set(3.8, 0.9, 1); return s;
}

function createPrinter() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.6,0.36,5.9), mat.dark); base.position.y = 0.18; g.add(base);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(5.12,0.12,4.5), mat.bed); bed.position.set(0,0.44,0.28); g.add(bed);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(4.82,0.045,4.18), mat.bedGlass); glass.position.set(0,0.535,0.28); g.add(glass);
  for (const x of [-2.35,2.35]) for (const z of [-1.75,2.0]) { const clip = new THREE.Mesh(new THREE.BoxGeometry(0.42,0.12,0.18), mat.metal); clip.position.set(x,0.64,z); g.add(clip); }
  for (const x of [-2.6,2.6]) for (const z of [-2.1,2.1]) {
    const p = cyl(0.11,6.35,mat.metal,24); p.position.set(x,3.28,z); g.add(p);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16,18,12), mat.green); cap.position.set(x,6.48,z); g.add(cap);
  }
  const gantry = new THREE.Group(); gantry.position.set(0,5.55,0.25);
  gantry.add(new THREE.Mesh(new THREE.BoxGeometry(5.85,0.3,0.45), mat.dark));
  for (const z of [-0.23,0.23]) { const r = cyl(0.055,5.7,mat.metal,20); r.rotation.z = Math.PI/2; r.position.set(0,-0.22,z); gantry.add(r); }
  for (const y of [0.22,-0.33]) { const b = new THREE.Mesh(new THREE.BoxGeometry(5.7,0.055,0.055), mat.rubber); b.position.set(0,y,-0.36); gantry.add(b); }
  g.add(gantry);
  const carriage = new THREE.Group(); carriage.position.set(0,5.1,0.25);
  carriage.add(new THREE.Mesh(new THREE.BoxGeometry(0.95,0.72,0.86), mat.green));
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.09,32), mat.dark); fan.rotation.x = Math.PI/2; fan.position.set(0,0.05,0.49); carriage.add(fan);
  for (let i = 0; i < 6; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.033,0.35), mat.metal); fin.position.set(0,-0.25-i*0.07,0); carriage.add(fin); }
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.22,0.38), mat.metal); block.position.y = -0.72; carriage.add(block);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.18,0.55,30), mat.dark); nozzle.position.y = -1.1; nozzle.rotation.x = Math.PI; carriage.add(nozzle);
  const led = new THREE.PointLight(0x00ff9d, 1.8, 5); led.position.set(0,-0.92,0.1); carriage.add(led);
  carriage.add(tube([new THREE.Vector3(-0.28,0.36,-0.3),new THREE.Vector3(-1.1,1.0,-0.65),new THREE.Vector3(-1.8,0.25,-1.45)],0.035,mat.metal,40));
  g.add(carriage);
  const spool = new THREE.Group(); const spoolBody = cyl(0.44,0.34,mat.green,40); spoolBody.rotation.z = Math.PI/2; spool.add(spoolBody);
  for (const x of [-0.2,0.2]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5,0.035,10,40), mat.dark); r.rotation.y = Math.PI/2; r.position.x = x; spool.add(r); }
  spool.position.set(2.95,5.95,-1.72); g.add(spool);
  g.add(tube([new THREE.Vector3(2.9,5.95,-1.72),new THREE.Vector3(1.4,6.45,-1.2),new THREE.Vector3(0.1,5.65,-0.35)],0.026,mat.freshGreen,44));
  const sign = label('WORLD PRINTER v2c'); sign.position.set(0,6.52,-2.22); g.add(sign);
  g.userData = { carriage, gantry, spool, nozzleTipLocal: new THREE.Vector3(0,-1.13,0), idle: carriage.position.clone(), idleGantry: gantry.position.clone() };
  return shadow(g);
}

const printer = createPrinter(); printer.position.set(0,0,-5.5); scene.add(printer);
function bedWorld(local = new THREE.Vector3(0,0,0)) { return printer.localToWorld(new THREE.Vector3(local.x, 0.56 + local.y, 0.28 + local.z)); }
function nozzleWorld() { return printer.userData.carriage.localToWorld(printer.userData.nozzleTipLocal.clone()); }

function createPlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32,0.78,8,16), mat.player); body.position.y=0.82; g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68,0.025,8,44), clearMat(mat.green,0.58)); ring.rotation.x = Math.PI/2; ring.position.y=0.08; g.add(ring);
  const l = label('PLAYER'); l.scale.set(1.7,0.42,1); l.position.y=1.85; g.add(l); return shadow(g);
}
const player = createPlayer(); player.position.set(0,0,5.25); scene.add(player);
const handWorld = () => player.localToWorld(new THREE.Vector3(0,1.55,0));

function createSpiral() { const pts=[]; for(let i=0;i<190;i++){ const t=i/189,a=t*Math.PI*7.5,r=0.55+Math.sin(t*Math.PI*4)*0.16; pts.push(new THREE.Vector3(Math.cos(a)*r,t*2.2,Math.sin(a)*r)); } const g=new THREE.Group(); g.name='Spiral'; g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),190,0.16,18),mat.green)); const k=new THREE.Mesh(new THREE.TorusKnotGeometry(0.58,0.055,90,12,2,3),mat.orange); k.position.y=1.08; k.rotation.x=Math.PI/2; g.add(k); return shadow(g); }
function createCreature() { const g=new THREE.Group(); g.name='Creature'; const body=new THREE.Mesh(new THREE.DodecahedronGeometry(0.72,2),mat.orange); body.position.y=0.95; body.scale.set(1.1,0.92,0.86); g.add(body); for(const x of [-0.34,0.34]){ const eye=new THREE.Mesh(new THREE.SphereGeometry(0.17,24,16),mat.glass); eye.position.set(x,1.14,0.66); g.add(eye); const pupil=new THREE.Mesh(new THREE.SphereGeometry(0.065,16,10),mat.dark); pupil.position.set(x,1.12,0.79); g.add(pupil); } for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; g.add(tube([new THREE.Vector3(Math.cos(a)*0.42,0.62,Math.sin(a)*0.42),new THREE.Vector3(Math.cos(a)*0.8,0.35,Math.sin(a)*0.8),new THREE.Vector3(Math.cos(a)*1.05,0.16,Math.sin(a)*1.05)],0.045,mat.green,28)); } return shadow(g); }
function createCottage(){ const g=new THREE.Group(); g.name='Cottage'; const body=new THREE.Mesh(new THREE.BoxGeometry(3.2,2.15,2.7),mat.wall); body.position.y=1.08; g.add(body); const roof=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,3.1,36,1,false,0,Math.PI),mat.roof); roof.rotation.z=Math.PI/2; roof.rotation.y=Math.PI/2; roof.position.y=2.2; g.add(roof); for(let i=-3;i<=3;i++){ const r=cyl(0.032,3.18,mat.darkWood,12); r.rotation.x=Math.PI/2; r.position.set(i*0.31,2.34+Math.cos(i*0.45)*0.07,0); g.add(r); } const door=extrude(archShape(0.75,1.25,0.44),0.08,mat.darkWood); door.position.set(0,0.64,1.39); g.add(door); for(const x of [-0.92,0.92]){ const win=new THREE.Mesh(new THREE.CylinderGeometry(0.27,0.27,0.08,32),mat.glass); win.rotation.x=Math.PI/2; win.position.set(x,1.33,1.4); g.add(win); const ring=new THREE.Mesh(new THREE.TorusGeometry(0.29,0.025,8,32),mat.darkWood); ring.position.copy(win.position); ring.rotation.x=Math.PI/2; g.add(ring); } return shadow(g); }
function createTree(){ const g=new THREE.Group(); g.name='Tree'; g.add(tube([new THREE.Vector3(0,0,0),new THREE.Vector3(0.12,0.82,0.08),new THREE.Vector3(-0.16,1.72,-0.05),new THREE.Vector3(0.08,2.45,0.06)],0.16,mat.wood,36)); for(const [x,y,z,s,m] of [[0,2.2,0,1.05,mat.leafDark],[-0.55,2.55,0.1,0.82,mat.leaf],[0.5,2.62,-0.12,0.8,mat.leaf],[0.05,3.02,0.02,0.72,mat.leaf]]){ const b=new THREE.Mesh(new THREE.DodecahedronGeometry(s,1),m); b.position.set(x,y,z); b.scale.y=0.82; g.add(b); } return shadow(g); }
function createBoat(){ const g=new THREE.Group(); g.name='Boat'; const s=new THREE.Shape(); s.moveTo(-1.8,0); s.quadraticCurveTo(-1.25,-0.62,0,-0.68); s.quadraticCurveTo(1.25,-0.62,1.8,0); s.quadraticCurveTo(0.85,0.42,0,0.46); s.quadraticCurveTo(-0.85,0.42,-1.8,0); const hull=extrude(s,1.34,mat.wood,0.045); hull.rotation.x=Math.PI/2; hull.position.y=0.58; g.add(hull); for(const x of [-0.78,0,0.78]){ const bench=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.12,1.05),mat.darkWood); bench.position.set(x,0.96,0); g.add(bench); } const mast=cyl(0.045,2.2,mat.darkWood,12); mast.position.set(0.16,1.75,0); g.add(mast); const sailShape=new THREE.Shape(); sailShape.moveTo(0,0); sailShape.lineTo(0.85,0.35); sailShape.lineTo(0.05,1.4); sailShape.lineTo(0,0); const sail=extrude(sailShape,0.035,mat.creamPrinted); sail.position.set(0.45,1.65,0.02); sail.rotation.y=Math.PI/2; g.add(sail); return shadow(g); }
function createBridge(){ const g=new THREE.Group(); g.name='Bridge'; for(let i=-5;i<=5;i++){ const p=new THREE.Mesh(new THREE.BoxGeometry(0.31,0.18,2.12),mat.wood); p.position.set(i*0.34,0.44+Math.sin((i+5)/10*Math.PI)*0.55,0); p.rotation.z=Math.cos((i+5)/10*Math.PI)*0.17; g.add(p); } for(const z of [-1.18,1.18]) g.add(tube([new THREE.Vector3(-2.05,1.08,z),new THREE.Vector3(-0.85,1.6,z),new THREE.Vector3(0,1.78,z),new THREE.Vector3(0.85,1.6,z),new THREE.Vector3(2.05,1.08,z)],0.05,mat.darkWood)); return shadow(g); }
function createCart(){ const g=new THREE.Group(); g.name='Cart'; const base=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.42,1.15),mat.wood); base.position.y=0.75; g.add(base); for(const z of [-0.66,0.66]){ const side=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.72,0.12),mat.darkWood); side.position.set(0,1.05,z); g.add(side); } for(const x of [-0.86,0.86]) for(const z of [-0.78,0.78]){ const w=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.18,32),mat.darkWood); w.rotation.x=Math.PI/2; w.position.set(x,0.36,z); g.add(w); } g.add(tube([new THREE.Vector3(-1.35,0.92,0),new THREE.Vector3(-2,0.86,0),new THREE.Vector3(-2.55,0.6,0)],0.045,mat.metal)); return shadow(g); }
function createStall(){ const g=new THREE.Group(); g.name='Market Stall'; const counter=new THREE.Mesh(new THREE.BoxGeometry(2.7,0.65,1.2),mat.wood); counter.position.y=0.55; g.add(counter); for(const x of [-1.15,1.15]) for(const z of [-0.45,0.45]){ const p=cyl(0.07,2.4,mat.darkWood,14); p.position.set(x,1.45,z); g.add(p); } const canopy=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,2.95,34,1,false,0,Math.PI),mat.cloth); canopy.rotation.z=Math.PI/2; canopy.rotation.y=Math.PI/2; canopy.position.y=2.55; g.add(canopy); return shadow(g); }
function createCampfire(){ const g=new THREE.Group(); g.name='Campfire'; for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; const s=new THREE.Mesh(new THREE.DodecahedronGeometry(0.18,0),mat.stone); s.position.set(Math.cos(a)*0.55,0.15,Math.sin(a)*0.55); g.add(s); } for(const a of [0,Math.PI/2]){ const log=cyl(0.09,1.1,mat.wood,12); log.rotation.z=Math.PI/2; log.rotation.y=a; log.position.y=0.22; g.add(log); } const f=new THREE.Mesh(new THREE.ConeGeometry(0.32,0.85,12),mat.flame); f.position.y=0.64; g.add(f); const light=new THREE.PointLight(0xff8a20,1.6,7); light.position.y=1.2; g.add(light); return shadow(g); }

const recipes = [
  { id:'stall', label:'Market Stall', aliases:['market','stall','shop','vendor'], dims:[3.4,2.2,3.1], complexity:1.25, create:createStall },
  { id:'cottage', label:'Cottage', aliases:['cottage','house','home','hut'], dims:[3.8,3.2,3.2], complexity:1.2, create:createCottage },
  { id:'boat', label:'Boat', aliases:['boat','ship','sailboat'], dims:[3.7,1.8,2.7], complexity:1.05, create:createBoat },
  { id:'tree', label:'Tree', aliases:['tree','forest','oak'], dims:[2.5,2.5,3.4], complexity:1.15, create:createTree },
  { id:'bridge', label:'Bridge', aliases:['bridge','arch bridge','wood bridge'], dims:[4.4,2.8,2.0], complexity:1.0, create:createBridge },
  { id:'cart', label:'Cart', aliases:['cart','wagon','carriage'], dims:[3.0,1.9,1.8], complexity:0.9, create:createCart },
  { id:'spiral', label:'Spiral', aliases:['spiral','twist','knot'], dims:[2.2,2.2,2.6], complexity:1.35, create:createSpiral },
  { id:'creature', label:'Creature', aliases:['creature','robot','eyeball','monster','character'], dims:[2.2,2.2,1.8], complexity:1.45, create:createCreature },
  { id:'campfire', label:'Campfire', aliases:['campfire','fire','firepit'], dims:[1.4,1.4,1.2], complexity:0.55, create:createCampfire }
];

let phase='ready', printedOnBed=null, carriedPreview=null, selected=null, selectionBox=null, pathGroup=null, liveBead=null, liveThread=null, idCounter=0, slotIndex=0;
const placed=[];
const slots=[[0,2.7],[-4,2.4],[4,2.4],[-4,6],[4,6],[0,7.2],[-7,0],[7,0]];

function parseCommand(text) { const t=text.toLowerCase().replace(/[^a-z0-9\s-]/g,' '); return recipes.find(r => r.aliases.some(a => t.includes(a))) || null; }
function printDuration(recipe, parts) { const [w,d,h]=recipe.dims; return Math.round((3300 + w*d*h*160 + parts.length*330) * recipe.complexity); }
function setButtons(){ const busy=phase==='printing'||phase==='pickup-moving'; runButton.disabled=busy||phase==='printed-on-bed'; pickupButton.disabled=phase!=='printed-on-bed'; placeButton.disabled=phase!=='carried-preview'; recipeButtons.querySelectorAll('button').forEach(b=>{b.disabled=busy||phase==='printed-on-bed';}); }
function setPhase(next){ phase=next; setState(next); setButtons(); }

function collectParts(root) {
  root.updateMatrixWorld(true);
  const parts=[];
  root.traverse((m)=>{
    if(!m.isMesh || m.geometry.type === 'GridHelper') return;
    m.userData.baseMaterial = m.material;
    m.userData.baseVisible = true;
    m.userData.baseScale = m.scale.clone();
    m.userData.basePosition = m.position.clone();
    const b = new THREE.Box3().setFromObject(m);
    if (b.isEmpty()) return;
    const size = new THREE.Vector3(); b.getSize(size);
    if (size.x < 0.001 || size.y < 0.001 || size.z < 0.001) return;
    parts.push({ mesh:m, box:b.clone(), size, minY:b.min.y, maxY:b.max.y, weight: Math.max(0.12, size.x*size.z*size.y) });
    m.visible = false;
  });
  parts.sort((a,b)=> a.minY - b.minY || b.weight - a.weight);
  return parts;
}

function revealPart(part, fraction) {
  const m = part.mesh;
  fraction = clamp01(fraction);
  m.visible = fraction > 0.02;
  m.material = m.userData.baseMaterial;
  const s = m.userData.baseScale;
  const p = m.userData.basePosition;
  m.scale.copy(s);
  m.position.copy(p);
  if (fraction < 0.98) {
    m.material = clearMat(m.userData.baseMaterial, 0.18 + fraction * 0.72);
    // Only vertically reveal compact, mostly-upright parts. Rotated roofs/sails fade instead so they do not distort.
    if (Math.abs(m.rotation.x) < 0.2 && Math.abs(m.rotation.z) < 0.2) {
      const minScale = 0.04;
      m.scale.y = s.y * Math.max(minScale, fraction);
      m.position.y = p.y - part.size.y * (1 - fraction) * 0.5;
    }
  }
}
function applyPrintReveal(parts, activeIndex, localT) {
  parts.forEach((p, i) => {
    if (i < activeIndex) revealPart(p, 1);
    else if (i === activeIndex) revealPart(p, localT);
    else { p.mesh.visible = false; }
  });
}
function restoreFinal(root) { root.traverse((m)=>{ if(m.isMesh){ m.visible=true; if(m.userData.baseMaterial) m.material=m.userData.baseMaterial; if(m.userData.baseScale) m.scale.copy(m.userData.baseScale); if(m.userData.basePosition) m.position.copy(m.userData.basePosition); } }); }
function setGhost(root,on){ root.traverse((m)=>{ if(!m.isMesh)return; m.userData.finalMaterial ||= m.material; m.material = on ? mat.ghost : m.userData.finalMaterial; }); }

function partPath(part, localT) {
  const b = part.box;
  const size = part.size;
  const w = Math.max(size.x * 0.55, 0.12);
  const d = Math.max(size.z * 0.55, 0.12);
  const cx = (b.min.x + b.max.x) / 2;
  const cz = (b.min.z + b.max.z) / 2;
  const printY = b.min.y + size.y * clamp01(localT);
  // Thin posts/poles: orbit their own cylinder footprint so the nozzle visibly makes each post.
  if (size.x < 0.32 && size.z < 0.32 && size.y > 0.8) {
    const a = localT * Math.PI * 18;
    const r = Math.max(size.x, size.z) * 0.75;
    return new THREE.Vector3(cx + Math.cos(a) * r, printY, cz + Math.sin(a) * r);
  }
  // Long rails/planks: fast back-and-forth along their length.
  if (size.x > size.z * 2.2) {
    const s = Math.sin(localT * Math.PI * 14) * 0.5 + 0.5;
    return new THREE.Vector3(b.min.x + s * size.x, printY, cz + Math.sin(localT * Math.PI * 38) * d * 0.22);
  }
  if (size.z > size.x * 2.2) {
    const s = Math.sin(localT * Math.PI * 14) * 0.5 + 0.5;
    return new THREE.Vector3(cx + Math.sin(localT * Math.PI * 38) * w * 0.22, printY, b.min.z + s * size.z);
  }
  // Organic/round shapes: orbit and spiral.
  if (size.x / Math.max(size.z,0.01) < 1.45 && size.z / Math.max(size.x,0.01) < 1.45) {
    const a = localT * Math.PI * 18;
    const r = Math.min(w, d) * (0.55 + 0.35 * Math.sin(localT * Math.PI * 6));
    return new THREE.Vector3(cx + Math.cos(a) * r, printY, cz + Math.sin(a) * r);
  }
  // Blocks/canopies: perimeter plus infill.
  const loop = (localT * 10) % 5;
  if (loop < 1) return new THREE.Vector3(cx - w + loop * 2 * w, printY, cz - d);
  if (loop < 2) return new THREE.Vector3(cx + w, printY, cz - d + (loop - 1) * 2 * d);
  if (loop < 3) return new THREE.Vector3(cx + w - (loop - 2) * 2 * w, printY, cz + d);
  if (loop < 4) return new THREE.Vector3(cx - w, printY, cz + d - (loop - 3) * 2 * d);
  return new THREE.Vector3(cx - w + (loop - 4) * 2 * w, printY, cz + Math.sin(localT * Math.PI * 48) * d * 0.45);
}
function carriageFromPrintPoint(p) { return new THREE.Vector3(p.x, 1.17 + p.y, p.z + 0.28); }
function segment(a,b,material,r=0.024){ if(a.distanceTo(b)<0.012) return null; return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a,b]),5,r,8),material); }
function drip(a,b){ const mid=a.clone().lerp(b,0.5); const len=a.distanceTo(b); const mesh=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,Math.max(0.05,len),8),mat.freshGreen); mesh.position.copy(mid); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), b.clone().sub(a).normalize()); return mesh; }

function clearSelection(){ if(selectionBox){ scene.remove(selectionBox); selectionBox.geometry.dispose(); selectionBox.material.dispose(); selectionBox=null; } selected=null; setTarget(carriedPreview?`preview ${carriedPreview.userData.label}`:printedOnBed?`${printedOnBed.userData.label} on printer bed`:'none'); }
function selectPlaced(obj){ clearSelection(); selected=obj; const box=new THREE.Box3().setFromObject(obj); const size=new THREE.Vector3(), center=new THREE.Vector3(); box.getSize(size); box.getCenter(center); selectionBox=new THREE.Mesh(new THREE.BoxGeometry(size.x+0.18,size.y+0.18,size.z+0.18),mat.select); selectionBox.position.copy(center); scene.add(selectionBox); setTarget(`${obj.userData.label} #${obj.userData.id}`); }
function updateSelectionBox(){ if(!selectionBox||!selected)return; const box=new THREE.Box3().setFromObject(selected), center=new THREE.Vector3(); box.getCenter(center); selectionBox.position.copy(center); selectionBox.rotation.copy(selected.rotation); }
function movable(){ return carriedPreview || selected; }
function moveTarget(dx,dz){ const o=movable(); if(!o){setStatus('Nothing can move yet. Print, pick up, then move the preview.');return;} o.position.x=Math.round(o.position.x+dx); o.position.z=Math.round(o.position.z+dz); updateSelectionBox(); }
function rotateTarget(dir){ const o=movable(); if(!o){setStatus('Nothing can rotate yet. Print, pick up, then rotate the preview.');return;} o.rotation.y += dir*Math.PI/8; updateSelectionBox(); }

async function animateTransform(object,targetPosition,targetScale,duration){ const sPos=object.position.clone(), sScale=object.scale.clone(), eScale=new THREE.Vector3(targetScale,targetScale,targetScale), t0=performance.now(); return new Promise(resolve=>{ function step(now){ const t=clamp01((now-t0)/duration); const e=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; object.position.lerpVectors(sPos,targetPosition,e); object.scale.lerpVectors(sScale,eScale,e); if(t<1)requestAnimationFrame(step); else resolve(); } requestAnimationFrame(step); }); }

async function startPrint(recipe){
  if(phase==='printing'){setStatus('Printer is already working.');return;}
  if(phase==='printed-on-bed'){setStatus('Finished print is still on the bed. Pick it up or cancel it first.');return;}
  if(carriedPreview){setStatus('Place or cancel the carried preview before printing another object.');return;}
  commandInput.value=`make a ${recipe.label.toLowerCase()}`;
  clearSelection(); setPhase('printing');
  const obj=recipe.create(); obj.userData={label:recipe.label, recipeId:recipe.id, state:'printing'}; obj.position.copy(bedWorld()); obj.scale.setScalar(1); scene.add(obj);
  const parts=collectParts(obj);
  printedOnBed=obj;
  const duration=printDuration(recipe, parts);
  setStatus(`v2c printing ${recipe.label}: ${parts.length} separate parts, ${(duration/1000).toFixed(1)}s. Nozzle now follows the active part, not a separate fake growth.`);
  pathGroup=new THREE.Group(); scene.add(pathGroup);
  liveBead=new THREE.Mesh(new THREE.SphereGeometry(0.075,16,10), mat.freshGreen); scene.add(liveBead);
  const carriage=printer.userData.carriage, gantry=printer.userData.gantry, spool=printer.userData.spool;
  const startC=carriage.position.clone(), startG=gantry.position.clone();
  const totalWeight=parts.reduce((sum,p)=>sum+p.weight,0);
  const checkpoints=[]; let acc=0;
  for(const p of parts){ checkpoints.push({start:acc/totalWeight, end:(acc+p.weight)/totalWeight, part:p}); acc+=p.weight; }
  const t0=performance.now(); let prev=null, lastEmit=0, segCount=0, lastActive=-1;
  await new Promise(resolve=>{
    function step(now){
      const raw=clamp01((now-t0)/duration);
      let activeIndex=checkpoints.findIndex(c=>raw>=c.start&&raw<=c.end);
      if(activeIndex<0) activeIndex=checkpoints.length-1;
      const c=checkpoints[activeIndex];
      const localT=clamp01((raw-c.start)/Math.max(0.0001,c.end-c.start));
      if(activeIndex!==lastActive){ prev=null; lastActive=activeIndex; }
      applyPrintReveal(parts, activeIndex, localT);
      const p=partPath(c.part, localT);
      carriage.position.copy(carriageFromPrintPoint(p));
      gantry.position.y = 5.15 + p.y * 0.2;
      spool.rotation.x += 0.045;
      const bedP=bedWorld(p);
      const noz=nozzleWorld();
      liveBead.position.copy(bedP);
      if(liveThread) scene.remove(liveThread);
      liveThread=drip(noz, bedP); scene.add(liveThread);
      if(prev && now-lastEmit>38 && segCount<900){
        const a=bedWorld(prev), b=bedP;
        const material = (recipe.id==='spiral'||recipe.id==='creature'||c.part.mesh.material===mat.roof) ? mat.freshOrange : mat.freshGreen;
        const s=segment(a,b,material,c.part.size.x<0.32&&c.part.size.z<0.32?0.018:0.026);
        if(s){ pathGroup.add(s); segCount++; }
        lastEmit=now;
      }
      prev=p.clone();
      if(raw<1) requestAnimationFrame(step); else { carriage.position.copy(startC); gantry.position.copy(startG); resolve(); }
    }
    requestAnimationFrame(step);
  });
  if(liveBead){scene.remove(liveBead);liveBead=null;} if(liveThread){scene.remove(liveThread);liveThread=null;}
  restoreFinal(obj); obj.position.copy(bedWorld()); obj.userData.state='printed-on-bed';
  setPhase('printed-on-bed'); setTarget(`${recipe.label} finished on printer bed`);
  setStatus(`${recipe.label} finished. The final object is made from the same component sequence the nozzle followed. Pick it up to place it.`);
}

async function pickupPrint(){ if(phase!=='printed-on-bed'||!printedOnBed){setStatus('Nothing finished on the printer bed yet.');return;} const obj=printedOnBed; printedOnBed=null; if(pathGroup){scene.remove(pathGroup);pathGroup=null;} setPhase('pickup-moving'); obj.userData.state='pickup-moving'; setStatus(`Picking up ${obj.userData.label}.`); await animateTransform(obj,handWorld(),0.42,850); await sleep(140); obj.userData.state='carried-preview'; obj.scale.setScalar(1); const [x,z]=slots[slotIndex++%slots.length]; obj.position.set(x,0,z); setGhost(obj,true); carriedPreview=obj; setPhase('carried-preview'); setTarget(`preview ${obj.userData.label}`); setStatus(`${obj.userData.label} picked up. Move/rotate it or tap ground, then Place.`); }
function placePreview(){ if(!carriedPreview){setStatus('No carried preview. Print something, then Pick Up Print first.');return;} const obj=carriedPreview; carriedPreview=null; setGhost(obj,false); restoreFinal(obj); obj.userData.id=++idCounter; obj.userData.state='placed'; placed.push(obj); setPhase('ready'); selectPlaced(obj); setStatus(`${obj.userData.label} placed as a solid v2c printed world object.`); }
function cancelOrDelete(){ if(phase==='printing'){setStatus('Print is mid-fabrication. Let this version finish, then cancel/pick up.');return;} if(carriedPreview){scene.remove(carriedPreview);carriedPreview=null;setPhase('ready');setTarget('none');setStatus('Carried preview cancelled.');return;} if(printedOnBed){scene.remove(printedOnBed);printedOnBed=null;if(pathGroup){scene.remove(pathGroup);pathGroup=null;}setPhase('ready');setTarget('none');setStatus('Finished print removed from the bed.');return;} if(selected){const doomed=selected;clearSelection();scene.remove(doomed);const i=placed.indexOf(doomed);if(i>=0)placed.splice(i,1);setStatus('Selected placed object deleted.');return;} setStatus('Nothing to cancel or delete.'); }

for(const recipe of recipes){ const b=document.createElement('button'); b.className='secondary'; b.textContent=recipe.label; b.addEventListener('click',()=>startPrint(recipe)); recipeButtons.appendChild(b); }
runButton.addEventListener('click',()=>{ const r=parseCommand(commandInput.value); if(!r){setStatus('No recipe matched. Try stall, cottage, boat, tree, bridge, cart, spiral, creature, or campfire.');return;} startPrint(r); });
pickupButton.addEventListener('click',pickupPrint); placeButton.addEventListener('click',placePreview); cancelButton.addEventListener('click',cancelOrDelete);
$('#moveLeft').addEventListener('click',()=>moveTarget(-1,0)); $('#moveRight').addEventListener('click',()=>moveTarget(1,0)); $('#moveForward').addEventListener('click',()=>moveTarget(0,-1)); $('#moveBack').addEventListener('click',()=>moveTarget(0,1)); $('#rotateLeft').addEventListener('click',()=>rotateTarget(-1)); $('#rotateRight').addEventListener('click',()=>rotateTarget(1));
commandInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter') runButton.click(); });

const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(); let down=null;
renderer.domElement.addEventListener('pointerdown',(e)=>{down={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('click',(e)=>{ if(e.target.closest?.('#hud'))return; if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return; pointer.x=e.clientX/window.innerWidth*2-1; pointer.y=-(e.clientY/window.innerHeight)*2+1; raycaster.setFromCamera(pointer,camera); if(carriedPreview){ const hits=raycaster.intersectObject(ground); if(hits.length){ carriedPreview.position.x=Math.round(hits[0].point.x); carriedPreview.position.z=Math.round(hits[0].point.z); setStatus(`Moved carried preview to ${carriedPreview.position.x}, ${carriedPreview.position.z}.`); } return; } const hits=raycaster.intersectObjects(placed,true); if(hits.length){ let root=hits[0].object; while(root.parent&&!root.userData.id) root=root.parent; if(root.userData.id) selectPlaced(root); } });
window.addEventListener('keydown',(e)=>{ if(document.activeElement===commandInput&&e.key!=='Enter')return; const k=e.key.toLowerCase(); if(k==='w'||e.key==='ArrowUp')moveTarget(0,-1); if(k==='s'||e.key==='ArrowDown')moveTarget(0,1); if(k==='a'||e.key==='ArrowLeft')moveTarget(-1,0); if(k==='d'||e.key==='ArrowRight')moveTarget(1,0); if(k==='q')rotateTarget(-1); if(k==='e')rotateTarget(1); if(e.key==='Enter'&&carriedPreview)placePreview(); if(e.key==='Delete'||e.key==='Backspace')cancelOrDelete(); });

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SpeechRecognition){ voiceButton.disabled=true; voiceButton.title='Speech recognition not available in this browser.'; } else { const rec=new SpeechRecognition(); rec.lang='en-US'; rec.interimResults=false; rec.continuous=false; voiceButton.addEventListener('click',()=>{ setStatus('Listening. Say make a stall, cottage, boat, tree...'); rec.start(); }); rec.onresult=(e)=>{ const text=e.results[0][0].transcript; commandInput.value=text; const r=parseCommand(text); if(r)startPrint(r); else setStatus(`Heard “${text}”, but no recipe matched yet.`); }; rec.onerror=(e)=>setStatus(`Voice error: ${e.error}. Type the command instead.`); }

const starter1=createSpiral(); starter1.position.set(-6.2,0,-1.4); starter1.scale.setScalar(0.8); starter1.userData={label:'Starter Spiral',id:++idCounter,state:'placed'}; placed.push(starter1); scene.add(starter1);
const starter2=createCreature(); starter2.position.set(-8.3,0,1.7); starter2.userData={label:'Starter Creature',id:++idCounter,state:'placed'}; placed.push(starter2); scene.add(starter2);
const starter3=createBoat(); starter3.position.set(6.4,0.04,-0.5); starter3.rotation.y=-0.45; starter3.userData={label:'Starter Boat',id:++idCounter,state:'placed'}; placed.push(starter3); scene.add(starter3);

function resize(){ camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); renderer.setSize(window.innerWidth,window.innerHeight); }
window.addEventListener('resize',resize);
function animate(now){ requestAnimationFrame(animate); if(phase==='ready'){ const c=printer.userData.carriage,g=printer.userData.gantry; c.position.x=Math.sin(now*0.0011)*0.55; c.position.y=5.1; c.position.z=0.25+Math.cos(now*0.0009)*0.18; g.position.y=5.55; printer.userData.spool.rotation.x+=0.008; } player.rotation.y=Math.sin(now*0.001)*0.08; updateSelectionBox(); controls.update(); renderer.render(scene,camera); }
setPhase('ready'); setTarget('none'); setStatus(`${BUILD}. This fixes the screenshot issue: part paths now drive the visible build.`); animate(performance.now());
