import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <canvas id="world"></canvas>
  <section id="hud">
    <div class="topline">
      <h1>SYL Modular Ship V2 <span class="badge">section-first experiment</span></h1>
      <button id="toggleHud">Hide</button>
    </div>
    <div class="hud-body">
      <p class="note">The ship is no longer one shell with patches. Each major assembly must become whole from its own printable pieces, then connect through deliberate section collars.</p>
      <div class="section-title">Fabrication</div>
      <div class="row">
        <button id="buildAll" class="primary">Build All Sections</button>
        <button id="buildCurrent">Build Selected</button>
        <button id="instant">Complete Instantly</button>
        <button id="reset" class="warn">Reset</button>
      </div>
      <div class="section-title">Inspection</div>
      <div class="row">
        <button id="explode">Exploded: Off</button>
        <button id="isolate">Isolate: Off</button>
        <button id="cutaway">Cutaway: Off</button>
      </div>
      <div class="row" id="viewButtons" style="margin-top:7px"></div>
      <div class="section-title">Ship sections</div>
      <div id="sectionButtons"></div>
      <div id="status">Select a section, inspect it alone, or assemble the complete ship section by section.</div>
      <div id="progressTrack"><div id="progressBar"></div></div>
      <div id="stats"><span id="partCount">0 pieces</span><span id="location">Outside ship</span></div>
      <div id="dependency"></div>
    </div>
  </section>
  <div id="moduleLabel">Selected: Rear entry</div>
  <div id="joystick"><div id="joyKnob"></div></div>
  <div id="crosshair"></div>
  <aside id="help">Joystick/WASD walks. Drag to look in 1st/3rd person. Build the four pressure modules, then walk from the ramp through cargo, systems, and cockpit. Exploded view reveals how complete sections connect.</aside>
`;

const $ = (q) => document.querySelector(q);
const canvas = $('#world');
const statusEl = $('#status');
const progressBar = $('#progressBar');
const partCountEl = $('#partCount');
const locationEl = $('#location');
const dependencyEl = $('#dependency');
const moduleLabelEl = $('#moduleLabel');
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
scene.background = new THREE.Color(0x02060a);
scene.fog = new THREE.FogExp2(0x02060a, 0.009);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.04, 700);
camera.position.set(22, 15, 26);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = innerWidth > 720;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const orbit = new OrbitControls(camera, canvas);
orbit.target.set(0, 2.4, -0.2);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.minDistance = 6;
orbit.maxDistance = 100;
orbit.maxPolarAngle = Math.PI * 0.495;
orbit.enablePan = true;

scene.add(new THREE.HemisphereLight(0x9bdcff, 0x1f1713, 0.82));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(18, 28, 14);
sun.castShadow = innerWidth > 720;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34;
sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x59ffd0, 0.7);
rim.position.set(-20, 10, -18);
scene.add(rim);

const material = {
  ground: new THREE.MeshStandardMaterial({ color: 0x091318, roughness: 0.98, metalness: 0.02 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x172529, roughness: 0.72, metalness: 0.35 }),
  cargo: new THREE.MeshStandardMaterial({ color: 0x647c82, roughness: 0.36, metalness: 0.58 }),
  systems: new THREE.MeshStandardMaterial({ color: 0x455f69, roughness: 0.4, metalness: 0.62 }),
  cockpit: new THREE.MeshStandardMaterial({ color: 0x7c8f93, roughness: 0.34, metalness: 0.6 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x26363b, roughness: 0.48, metalness: 0.66 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x7a1f29, roughness: 0.38, metalness: 0.48 }),
  deck: new THREE.MeshStandardMaterial({ color: 0x35494e, roughness: 0.72, metalness: 0.26 }),
  interior: new THREE.MeshStandardMaterial({ color: 0x1b2b31, roughness: 0.72, metalness: 0.3 }),
  console: new THREE.MeshStandardMaterial({ color: 0x10262b, roughness: 0.3, metalness: 0.46, emissive: 0x06352e }),
  seat: new THREE.MeshStandardMaterial({ color: 0x4c252b, roughness: 0.83, metalness: 0.05 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x79dcff, transparent: true, opacity: 0.44, roughness: 0.06, metalness: 0.04, clearcoat: 1, transmission: 0.18, side: THREE.DoubleSide }),
  glow: new THREE.MeshBasicMaterial({ color: 0x62ffd0, transparent: true, opacity: 0.95 }),
  engine: new THREE.MeshBasicMaterial({ color: 0xff8a52, transparent: true, opacity: 0.92 }),
  warning: new THREE.MeshStandardMaterial({ color: 0xd6a63a, roughness: 0.48, metalness: 0.42 }),
  player: new THREE.MeshStandardMaterial({ color: 0x78aaff, roughness: 0.42, metalness: 0.08 }),
};

const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), material.ground);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const pad = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 0.3, 96), material.pad);
pad.position.y = 0.14;
pad.receiveShadow = true;
scene.add(pad);
const padRing = new THREE.Mesh(new THREE.TorusGeometry(15.3, 0.08, 10, 120), material.glow.clone());
padRing.rotation.x = Math.PI / 2;
padRing.position.y = 0.31;
scene.add(padRing);

const starCount = 900;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 100 + Math.random() * 260;
  const a = Math.random() * Math.PI * 2;
  const p = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = Math.sin(p) * Math.cos(a) * r;
  starPositions[i * 3 + 1] = Math.cos(p) * r;
  starPositions[i * 3 + 2] = Math.sin(p) * Math.sin(a) * r;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.18, sizeAttenuation: true, fog: false })));

const shipRoot = new THREE.Group();
shipRoot.name = 'SYL_Modular_Pathfinder_V2';
scene.add(shipRoot);

const DECK_Y = 1.55;
const sections = new Map();
const allPieces = [];
let selectedSectionId = 'entry';
let assembling = false;
let exploded = false;
let isolate = false;
let cutaway = false;
let builtCount = 0;

const sectionDefinitions = [
  { id: 'entry', label: 'Rear entry', description: 'Ramp, pressure door and boarding collar', explode: [0, 0, -3.4] },
  { id: 'cargo', label: 'Cargo hall', description: 'Whole pressure module with deck, walls, roof and cargo fittings', explode: [0, 0, -1.2] },
  { id: 'systems', label: 'Systems spine', description: 'Narrow pressure module carrying command and power buses', explode: [0, 0, 1.2] },
  { id: 'cockpit', label: 'Cockpit', description: 'Tapered flight module with complete controls and canopy', explode: [0, 0, 3.8] },
  { id: 'portWing', label: 'Port wing', description: 'Wing skin, spar and hull connector', explode: [-3.2, 0, 0] },
  { id: 'starboardWing', label: 'Starboard wing', description: 'Wing skin, spar and hull connector', explode: [3.2, 0, 0] },
  { id: 'portThruster', label: 'Port thruster', description: 'Printable shroud sectors, core and bus coupler', explode: [-5.2, 0.3, -1.4] },
  { id: 'starboardThruster', label: 'Starboard thruster', description: 'Printable shroud sectors, core and bus coupler', explode: [5.2, 0.3, -1.4] },
  { id: 'gear', label: 'Landing gear', description: 'Four independent strut and foot assemblies', explode: [0, -1.8, 0] },
];

for (const def of sectionDefinitions) {
  const group = new THREE.Group();
  group.name = `section:${def.id}`;
  shipRoot.add(group);
  sections.set(def.id, { ...def, group, pieces: [], roles: new Set() });
}

function createGeometry(vertices, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function quadPrism(points, thickness, inwardCenter = null) {
  const outer = points.map((p) => new THREE.Vector3(...p));
  let inner;
  if (inwardCenter) {
    inner = outer.map((p) => {
      const c = typeof inwardCenter === 'function' ? inwardCenter(p) : inwardCenter;
      const v = p.clone().sub(c).normalize();
      return p.clone().addScaledVector(v, -thickness);
    });
  } else {
    const normal = new THREE.Vector3().subVectors(outer[1], outer[0])
      .cross(new THREE.Vector3().subVectors(outer[3], outer[0])).normalize();
    inner = outer.map((p) => p.clone().addScaledVector(normal, -thickness));
  }
  const vertices = [...outer, ...inner].map((v) => [v.x, v.y, v.z]);
  const indices = [
    0,1,2, 0,2,3,
    4,6,5, 4,7,6,
    0,4,5, 0,5,1,
    1,5,6, 1,6,2,
    2,6,7, 2,7,3,
    3,7,4, 3,4,0,
  ];
  return createGeometry(vertices, indices);
}

function trianglePrism(points, thickness, axis = new THREE.Vector3(0,0,1)) {
  const a = points.map((p) => new THREE.Vector3(...p));
  const b = a.map((p) => p.clone().addScaledVector(axis, -thickness));
  const vertices = [...a, ...b].map((v) => [v.x,v.y,v.z]);
  const indices = [
    0,1,2, 3,5,4,
    0,3,4, 0,4,1,
    1,4,5, 1,5,2,
    2,5,3, 2,3,0,
  ];
  return createGeometry(vertices, indices);
}

function annularSectorGeometry(innerR, outerR, z0, z1, a0, a1, cx = 0, cy = 0) {
  const points = [
    [cx + outerR*Math.cos(a0), cy + outerR*Math.sin(a0), z0],
    [cx + outerR*Math.cos(a1), cy + outerR*Math.sin(a1), z0],
    [cx + outerR*Math.cos(a1), cy + outerR*Math.sin(a1), z1],
    [cx + outerR*Math.cos(a0), cy + outerR*Math.sin(a0), z1],
    [cx + innerR*Math.cos(a0), cy + innerR*Math.sin(a0), z0],
    [cx + innerR*Math.cos(a1), cy + innerR*Math.sin(a1), z0],
    [cx + innerR*Math.cos(a1), cy + innerR*Math.sin(a1), z1],
    [cx + innerR*Math.cos(a0), cy + innerR*Math.sin(a0), z1],
  ];
  const indices = [
    0,1,2, 0,2,3,
    4,6,5, 4,7,6,
    0,4,5, 0,5,1,
    1,5,6, 1,6,2,
    2,6,7, 2,7,3,
    3,7,4, 3,4,0,
  ];
  return createGeometry(points, indices);
}

function addPiece(sectionId, name, geometry, pieceMaterial, options = {}) {
  const section = sections.get(sectionId);
  if (!section) throw new Error(`Unknown section ${sectionId}`);
  const mesh = new THREE.Mesh(geometry, pieceMaterial);
  mesh.name = `${sectionId}:${name}`;
  mesh.castShadow = innerWidth > 720 && options.castShadow !== false;
  mesh.receiveShadow = options.receiveShadow !== false;
  mesh.visible = false;
  mesh.userData = {
    sectionId,
    printedPiece: true,
    built: false,
    order: options.order ?? 0,
    cutaway: !!options.cutaway,
    role: options.role || null,
    connector: options.connector || null,
    finalScale: new THREE.Vector3(1,1,1),
  };
  if (options.position) mesh.position.set(...options.position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.scale) {
    mesh.scale.set(...options.scale);
    mesh.userData.finalScale.copy(mesh.scale);
  }
  section.group.add(mesh);
  section.pieces.push(mesh);
  allPieces.push(mesh);
  if (options.role) section.roles.add(options.role);
  return mesh;
}

const boxGeo = new THREE.BoxGeometry(1,1,1);
function addBox(sectionId, name, position, size, pieceMaterial, options = {}) {
  return addPiece(sectionId, name, boxGeo, pieceMaterial, { ...options, position, scale:size, rotation: options.rotation || [0,0,0] });
}

function pressureDimensions(sectionId, z) {
  if (sectionId === 'cargo') return { width: 3.25, wall: 1.35, roof: 2.45 };
  if (sectionId === 'systems') return { width: 2.82, wall: 1.28, roof: 2.25 };
  if (sectionId === 'cockpit') {
    const t = THREE.MathUtils.clamp((z - 2.0) / 5.2, 0, 1);
    return {
      width: THREE.MathUtils.lerp(2.82, 0.22, Math.pow(t, 1.08)),
      wall: THREE.MathUtils.lerp(1.28, 0.36, t),
      roof: THREE.MathUtils.lerp(2.25, 0.62, t),
    };
  }
  return { width: 3, wall: 1.3, roof: 2.3 };
}

function shellPoint(sectionId, z, theta, outward = 0) {
  const d = pressureDimensions(sectionId, z);
  const cy = DECK_Y + d.wall;
  return [Math.cos(theta) * (d.width + outward), cy + Math.sin(theta) * (d.roof + outward), z];
}

function buildPressureSection(sectionId, z0, z1, zSegments, angleSegments, baseMaterial, options = {}) {
  const zCuts = [];
  for (let i = 0; i <= zSegments; i++) zCuts.push(THREE.MathUtils.lerp(z0, z1, i / zSegments));

  for (let zi = 0; zi < zSegments; zi++) {
    const za = zCuts[zi], zb = zCuts[zi+1];
    const da = pressureDimensions(sectionId, za), db = pressureDimensions(sectionId, zb);
    const columns = 6;
    for (let xi = 0; xi < columns; xi++) {
      const u0 = THREE.MathUtils.lerp(-1, 1, xi / columns);
      const u1 = THREE.MathUtils.lerp(-1, 1, (xi+1) / columns);
      const points = [
        [u0 * da.width, DECK_Y, za],
        [u1 * da.width, DECK_Y, za],
        [u1 * db.width, DECK_Y, zb],
        [u0 * db.width, DECK_Y, zb],
      ];
      addPiece(sectionId, `floor_${zi}_${xi}`, quadPrism(points, 0.13, (p) => new THREE.Vector3(p.x, DECK_Y - 10, p.z)), material.deck, {
        order: 10 + zi * 0.1 + xi * 0.002,
        cutaway: xi >= columns / 2,
      });
    }
  }

  const verticalBands = 3;
  for (let zi = 0; zi < zSegments; zi++) {
    const za = zCuts[zi], zb = zCuts[zi+1];
    const da = pressureDimensions(sectionId, za), db = pressureDimensions(sectionId, zb);
    for (const side of [-1,1]) {
      for (let yi = 0; yi < verticalBands; yi++) {
        const v0 = yi / verticalBands;
        const v1 = (yi+1) / verticalBands;
        const points = [
          [side * da.width, DECK_Y + v0 * da.wall, za],
          [side * da.width, DECK_Y + v1 * da.wall, za],
          [side * db.width, DECK_Y + v1 * db.wall, zb],
          [side * db.width, DECK_Y + v0 * db.wall, zb],
        ];
        const mat = yi === 0 && zi % 2 === 0 ? material.trim : baseMaterial;
        addPiece(sectionId, `wall_${side}_${zi}_${yi}`, quadPrism(points, 0.14, (p) => new THREE.Vector3(0, p.y, p.z)), mat, {
          order: 20 + zi * 0.1 + yi * 0.01,
          cutaway: side > 0,
        });
      }
    }
  }

  for (let zi = 0; zi < zSegments; zi++) {
    const za = zCuts[zi], zb = zCuts[zi+1];
    for (let ai = 0; ai < angleSegments; ai++) {
      const a0 = ai / angleSegments * Math.PI;
      const a1 = (ai+1) / angleSegments * Math.PI;
      const points = [
        shellPoint(sectionId, za, a0),
        shellPoint(sectionId, za, a1),
        shellPoint(sectionId, zb, a1),
        shellPoint(sectionId, zb, a0),
      ];
      const midTheta = (a0+a1)/2;
      const midZ = (za+zb)/2;
      const glass = options.glass && midZ > options.glass.startZ && midTheta > options.glass.thetaMin && midTheta < Math.PI - options.glass.thetaMin;
      const pieceMat = glass ? material.glass : ((ai + zi) % 7 === 0 ? material.dark : baseMaterial);
      addPiece(sectionId, `roof_${zi}_${ai}`, quadPrism(points, 0.14, (p) => {
        const d = pressureDimensions(sectionId, p.z);
        return new THREE.Vector3(0, DECK_Y + d.wall, p.z);
      }), pieceMat, {
        order: 30 + zi * 0.1 + ai * 0.002,
        cutaway: points.some((p) => p[0] > 0.15) && !glass,
        role: glass && options.glass.role ? options.glass.role : null,
      });
    }
  }

  for (let ri = 1; ri < zSegments; ri += 2) {
    const z = zCuts[ri];
    const d = pressureDimensions(sectionId, z);
    for (let ai = 0; ai < angleSegments; ai++) {
      const a0 = ai / angleSegments * Math.PI;
      const a1 = (ai+1) / angleSegments * Math.PI;
      const points = [
        shellPoint(sectionId, z - 0.045, a0, -0.16),
        shellPoint(sectionId, z - 0.045, a1, -0.16),
        shellPoint(sectionId, z + 0.045, a1, -0.16),
        shellPoint(sectionId, z + 0.045, a0, -0.16),
      ];
      addPiece(sectionId, `rib_${ri}_${ai}`, quadPrism(points, 0.16, new THREE.Vector3(0,DECK_Y+d.wall,z)), material.interior, {
        order: 15 + ri * 0.03,
        cutaway: points.some((p) => p[0] > 0.15),
      });
    }
  }
}

function buildInterfaceCollar(ownerSectionId, name, z, sourceSectionId, targetSectionId, role = null) {
  const angleSegments = 12;
  for (let ai = 0; ai < angleSegments; ai++) {
    const a0 = ai / angleSegments * Math.PI;
    const a1 = (ai+1) / angleSegments * Math.PI;
    const p0a = shellPoint(sourceSectionId, z, a0, 0.07);
    const p0b = shellPoint(sourceSectionId, z, a1, 0.07);
    const p1a = shellPoint(targetSectionId, z, a0, 0.07);
    const p1b = shellPoint(targetSectionId, z, a1, 0.07);
    const points = [
      [p0a[0], p0a[1], z-0.1],
      [p0b[0], p0b[1], z-0.1],
      [p1b[0], p1b[1], z+0.1],
      [p1a[0], p1a[1], z+0.1],
    ];
    addPiece(ownerSectionId, `${name}_roof_${ai}`, quadPrism(points, 0.18, new THREE.Vector3(0,DECK_Y+1.3,z)), material.dark, {
      order: 4,
      cutaway: points.some((p) => p[0] > 0.15),
      role,
      connector: `${sourceSectionId}->${targetSectionId}`,
    });
  }
  const source = pressureDimensions(sourceSectionId, z);
  const target = pressureDimensions(targetSectionId, z);
  for (const side of [-1,1]) {
    const sx = side * source.width, tx = side * target.width;
    const points = [
      [sx, DECK_Y, z-0.1],
      [sx, DECK_Y+source.wall, z-0.1],
      [tx, DECK_Y+target.wall, z+0.1],
      [tx, DECK_Y, z+0.1],
    ];
    addPiece(ownerSectionId, `${name}_jamb_${side}`, quadPrism(points, 0.18, (p) => new THREE.Vector3(0,p.y,p.z)), material.dark, {
      order: 4,
      cutaway: side > 0,
      role,
      connector: `${sourceSectionId}->${targetSectionId}`,
    });
  }
  const maxW = Math.max(source.width, target.width);
  addBox(ownerSectionId, `${name}_threshold`, [0,DECK_Y+0.05,z], [maxW*2,0.18,0.26], material.warning, {
    order:4,
    role,
    connector:`${sourceSectionId}->${targetSectionId}`,
  });
}

function buildEntry() {
  const sectionId = 'entry';
  const rampRear = -11.2;
  const rampTop = -6.5;
  const segments = 12;
  const lanes = 4;
  const angle = Math.atan2(DECK_Y-0.22, rampTop-rampRear);
  const length = Math.hypot(rampTop-rampRear, DECK_Y-0.22);
  for (let zi=0; zi<segments; zi++) {
    const t0=zi/segments, t1=(zi+1)/segments;
    const z0=THREE.MathUtils.lerp(rampRear,rampTop,t0), z1=THREE.MathUtils.lerp(rampRear,rampTop,t1);
    const y0=THREE.MathUtils.lerp(0.22,DECK_Y,t0), y1=THREE.MathUtils.lerp(0.22,DECK_Y,t1);
    for (let xi=0; xi<lanes; xi++) {
      const x0=THREE.MathUtils.lerp(-1.65,1.65,xi/lanes), x1=THREE.MathUtils.lerp(-1.65,1.65,(xi+1)/lanes);
      const points=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z1],[x0,y1,z1]];
      addPiece(sectionId,`ramp_${zi}_${xi}`,quadPrism(points,0.14,(p)=>new THREE.Vector3(p.x,p.y-10,p.z)),material.deck,{order:zi*0.1+xi*0.001});
    }
  }
  for (const side of [-1,1]) {
    addBox(sectionId,`ramp_rail_${side}`,[side*1.78,(DECK_Y+0.22)/2,(rampTop+rampRear)/2],[0.14,0.18,length],material.warning,{rotation:[-angle,0,0],order:2});
    addBox(sectionId,`door_jamb_${side}`,[side*1.82,DECK_Y+1.38,rampTop-0.08],[0.34,2.76,0.34],material.dark,{order:3,cutaway:side>0,connector:'entry->cargo'});
  }
  addBox(sectionId,'door_header',[0,DECK_Y+2.78,rampTop-0.08],[3.98,0.34,0.34],material.dark,{order:3,cutaway:true,connector:'entry->cargo'});
  addBox(sectionId,'ground_lip',[0,0.24,rampRear+0.06],[3.5,0.18,0.3],material.warning,{rotation:[-angle,0,0],order:-1});
  addBox(sectionId,'pressure_threshold',[0,DECK_Y+0.04,rampTop-0.05],[3.6,0.18,0.3],material.warning,{rotation:[-angle,0,0],order:3,connector:'entry->cargo'});
}

function buildCargoInterior() {
  const sectionId='cargo';
  for (const side of [-1,1]) {
    for (let z=-5.7; z<=-2.6; z+=1.05) {
      addBox(sectionId,`bench_base_${side}_${z.toFixed(2)}`,[side*1.82,DECK_Y+0.36,z],[0.62,0.3,0.8],material.seat,{order:42,cutaway:side>0});
      addBox(sectionId,`bench_back_${side}_${z.toFixed(2)}`,[side*2.08,DECK_Y+0.92,z],[0.14,0.86,0.8],material.interior,{order:42,cutaway:side>0});
    }
  }
  for (const x of [-0.95,0,0.95]) addBox(sectionId,`tie_rail_${x}`,[x,DECK_Y+0.09,-4.1],[0.08,0.05,4.1],material.warning,{order:40,castShadow:false});
}

function buildSystemsInterior() {
  const sectionId='systems';
  for (const side of [-1,1]) {
    for (let z=-1.25; z<=1.45; z+=0.9) {
      addBox(sectionId,`rack_${side}_${z.toFixed(2)}`,[side*1.72,DECK_Y+0.73,z],[0.62,1.18,0.7],material.console,{order:44,cutaway:side>0,role:'systems-rack'});
      addBox(sectionId,`rack_screen_${side}_${z.toFixed(2)}`,[side*1.39,DECK_Y+0.93,z],[0.04,0.34,0.42],material.glow,{order:45,cutaway:side>0,castShadow:false,role:'systems-display'});
    }
  }
  let bus=0;
  for (let z=-1.55; z<=1.78; z+=0.52) {
    addBox(sectionId,`command_bus_${bus++}`,[0,DECK_Y+0.1,z],[0.26,0.09,0.56],bus%3===0?material.glow:material.console,{order:12+bus*0.01,castShadow:false,role:'command-bus'});
  }
}

function buildCockpitInterior() {
  const sectionId='cockpit';
  for (const side of [-1,1]) {
    addBox(sectionId,`pilot_seat_base_${side}`,[side*0.78,DECK_Y+0.34,4.55],[0.72,0.36,0.78],material.seat,{order:45,cutaway:side>0});
    addBox(sectionId,`pilot_seat_back_${side}`,[side*0.78,DECK_Y+0.92,4.82],[0.72,0.92,0.22],material.seat,{rotation:[-0.16,0,0],order:45,cutaway:side>0});
    addBox(sectionId,`side_console_${side}`,[side*1.55,DECK_Y+0.75,4.85],[0.68,0.62,1.35],material.console,{rotation:[-0.1,0,0],order:46,cutaway:side>0,role:'pilot-console'});
    const stickGeo = new THREE.CylinderGeometry(0.065,0.075,0.52,12);
    addPiece(sectionId,`control_stick_${side}`,stickGeo,material.dark,{position:[side*0.78,DECK_Y+0.72,5.0],rotation:[-0.18,0,side*0.08],order:47,cutaway:side>0,role:'pilot-input'});
  }
  addBox(sectionId,'flight_control_core',[0,DECK_Y+0.48,5.65],[1.5,0.52,0.7],material.console,{rotation:[-0.12,0,0],order:47,cutaway:true,role:'flight-control-core'});
  addBox(sectionId,'flight_display',[0,DECK_Y+1.06,5.91],[1.36,0.52,0.12],material.glow,{rotation:[-0.18,0,0],order:48,cutaway:true,castShadow:false,role:'flight-display'});
  addBox(sectionId,'navigation_table',[0,DECK_Y+0.58,3.0],[1.12,0.18,1.0],material.console,{order:45,cutaway:true,role:'navigation-core'});

  const z=7.2;
  const d=pressureDimensions(sectionId,z);
  const center=[0,DECK_Y+d.wall*0.55,z+0.02];
  const ring=[];
  ring.push([-d.width,DECK_Y,z]);
  ring.push([-d.width,DECK_Y+d.wall,z]);
  const angles=10;
  for(let i=0;i<=angles;i++) ring.push(shellPoint(sectionId,z,Math.PI-i/angles*Math.PI));
  ring.push([d.width,DECK_Y,z]);
  for(let i=0;i<ring.length-1;i++) {
    const glass=i>1 && i<ring.length-3;
    addPiece(sectionId,`nose_cap_${i}`,trianglePrism([center,ring[i],ring[i+1]],0.14,new THREE.Vector3(0,0,1)),glass?material.glass:material.cockpit,{order:38+i*0.01,cutaway:ring[i][0]>0&&!glass,role:glass?'canopy-glass':null});
  }
}

function wingProfile(side, u) {
  const rootX=3.1, tipX=7.6;
  const x=side*THREE.MathUtils.lerp(rootX,tipX,u);
  const lead=THREE.MathUtils.lerp(0.5,-2.7,u);
  const trail=THREE.MathUtils.lerp(-3.7,-5.4,u);
  return {x,lead,trail};
}

function buildWing(sectionId, side) {
  const spans=6, chords=3;
  for(let si=0;si<spans;si++) {
    const u0=si/spans,u1=(si+1)/spans;
    const a=wingProfile(side,u0),b=wingProfile(side,u1);
    for(let ci=0;ci<chords;ci++) {
      const v0=ci/chords,v1=(ci+1)/chords;
      const points=[
        [a.x,DECK_Y+0.18,THREE.MathUtils.lerp(a.lead,a.trail,v0)],
        [a.x,DECK_Y+0.18,THREE.MathUtils.lerp(a.lead,a.trail,v1)],
        [b.x,DECK_Y+0.18,THREE.MathUtils.lerp(b.lead,b.trail,v1)],
        [b.x,DECK_Y+0.18,THREE.MathUtils.lerp(b.lead,b.trail,v0)],
      ];
      addPiece(sectionId,`skin_${si}_${ci}`,quadPrism(points,0.18,(p)=>new THREE.Vector3(p.x,p.y-10,p.z)),((si+ci)%5===0?material.trim:material.systems),{order:20+si*0.1+ci*0.01,cutaway:side>0,role:'wing-skin'});
    }
  }
  const p1=wingProfile(side,1);
  addBox(sectionId,'main_spar',[side*5.25,DECK_Y+0.05,-2.65],[4.3,0.22,0.22],material.dark,{rotation:[0,side*0.2,0],order:8,cutaway:side>0,role:'wing-spar'});
  addBox(sectionId,'root_connector',[side*3.0,DECK_Y+0.18,-1.75],[0.5,0.48,2.9],material.warning,{order:7,cutaway:side>0,role:'wing-connector',connector:`${sectionId}->systems`});
  addBox(sectionId,'tip_cap',[p1.x,DECK_Y+0.18,(p1.lead+p1.trail)/2],[0.34,0.38,Math.abs(p1.trail-p1.lead)],material.dark,{order:25,cutaway:side>0});
}

function buildThruster(sectionId, side) {
  const cx=side*5.2, cy=DECK_Y+0.35;
  const rings=5,sectors=12;
  for(let ri=0;ri<rings;ri++) {
    const z0=-2.15-ri*0.58,z1=z0-0.58;
    for(let si=0;si<sectors;si++) {
      const a0=si/sectors*Math.PI*2,a1=(si+1)/sectors*Math.PI*2;
      const geo=annularSectorGeometry(0.62,0.86,z1,z0,a0,a1,cx,cy);
      addPiece(sectionId,`shroud_${ri}_${si}`,geo,(ri+si)%7===0?material.trim:material.dark,{order:20+ri*0.1+si*0.001,cutaway:side>0,role:'thruster-shroud'});
    }
  }
  const coreGeo=new THREE.CylinderGeometry(0.48,0.48,2.15,24);
  addPiece(sectionId,'thruster_core',coreGeo,material.engine,{position:[cx,cy,-3.45],rotation:[Math.PI/2,0,0],order:10,cutaway:side>0,castShadow:false,role:side<0?'port-thruster-core':'starboard-thruster-core'});
  addBox(sectionId,'mount_pylon',[side*4.15,DECK_Y+0.35,-2.75],[2.15,0.28,0.8],material.systems,{order:8,cutaway:side>0,role:'thruster-mount'});
  addBox(sectionId,'bus_coupler',[side*3.35,DECK_Y+0.18,-3.25],[1.55,0.14,0.22],material.glow,{order:9,cutaway:side>0,castShadow:false,role:'thruster-coupler',connector:'command-bus->thruster-core'});
  const glow=new THREE.Mesh(new THREE.CircleGeometry(0.57,40),material.engine);
  glow.rotation.x=Math.PI;
  glow.position.set(cx,cy,-5.08);
  glow.visible=false;
  glow.userData.sectionId=sectionId;
  sections.get(sectionId).group.add(glow);
  sections.get(sectionId).effect=glow;
  const light=new THREE.PointLight(0xff6d3f,0,9);
  light.position.set(cx,cy,-5.2);
  sections.get(sectionId).group.add(light);
  sections.get(sectionId).light=light;
}

function buildGear() {
  const sectionId='gear';
  for(const [x,z] of [[-2.3,-4.9],[2.3,-4.9],[-2.15,3.0],[2.15,3.0]]) {
    addBox(sectionId,`strut_${x}_${z}`,[x,0.82,z],[0.18,1.38,0.18],material.dark,{rotation:[0,0,x>0?-0.12:0.12],order:5,cutaway:x>0,role:'landing-strut'});
    addBox(sectionId,`foot_${x}_${z}`,[x,0.18,z],[1.0,0.18,0.46],material.dark,{order:6,cutaway:x>0,role:'landing-foot'});
    addBox(sectionId,`brace_${x}_${z}`,[x*0.82,0.7,z+0.12],[0.12,1.0,0.12],material.systems,{rotation:[0,0,x>0?0.45:-0.45],order:5,cutaway:x>0});
  }
}

buildEntry();
buildPressureSection('cargo',-6.5,-1.8,7,12,material.cargo);
buildCargoInterior();
buildPressureSection('systems',-1.8,2.0,6,12,material.systems);
buildSystemsInterior();
buildPressureSection('cockpit',2.0,7.2,8,12,material.cockpit,{glass:{startZ:3.45,thetaMin:0.28,role:'canopy-glass'}});
buildCockpitInterior();
buildInterfaceCollar('cargo','entry_cargo_collar',-6.5,'cargo','cargo','pressure-entry');
buildInterfaceCollar('systems','cargo_systems_collar',-1.8,'cargo','systems','pressure-interface');
buildInterfaceCollar('cockpit','systems_cockpit_collar',2.0,'systems','cockpit','pressure-interface');
buildWing('portWing',-1);
buildWing('starboardWing',1);
buildThruster('portThruster',-1);
buildThruster('starboardThruster',1);
buildGear();

for (const section of sections.values()) section.pieces.sort((a,b)=>a.userData.order-b.userData.order || a.position.z-b.position.z);
allPieces.sort((a,b)=>a.userData.order-b.userData.order || a.userData.sectionId.localeCompare(b.userData.sectionId));
partCountEl.textContent=`${allPieces.length} printable pieces`;

const fabricationBead=new THREE.Mesh(new THREE.SphereGeometry(0.12,14,10),material.glow);
fabricationBead.visible=false;
shipRoot.add(fabricationBead);
const fabricationLight=new THREE.PointLight(0x61ffd0,0,6);
shipRoot.add(fabricationLight);

function pieceVisible(piece) {
  if(!piece.userData.built) return false;
  if(isolate && piece.userData.sectionId!==selectedSectionId) return false;
  if(cutaway && piece.userData.cutaway) return false;
  return true;
}

function applyVisibility() {
  for(const piece of allPieces) piece.visible=pieceVisible(piece);
  for(const section of sections.values()) {
    if(section.effect) section.effect.visible=section.pieces.length>0 && section.pieces.every(p=>p.userData.built) && (!isolate || section.id===selectedSectionId);
    if(section.light) section.light.intensity=section.effect?.visible?1.8:0;
  }
}

function applyExplosion() {
  for(const section of sections.values()) {
    const target=exploded?section.explode:[0,0,0];
    section.group.position.set(...target);
  }
}

function sectionComplete(section) {
  return section.pieces.length>0 && section.pieces.every(p=>p.userData.built);
}

function updateProgress() {
  builtCount=allPieces.filter(p=>p.userData.built).length;
  progressBar.style.width=`${allPieces.length?builtCount/allPieces.length*100:0}%`;
  partCountEl.textContent=`${builtCount}/${allPieces.length} pieces built`;
  renderSectionButtons();
  updateDependency();
}

function resetAll() {
  assembling=false;
  for(const piece of allPieces) {
    piece.userData.built=false;
    piece.visible=false;
    piece.scale.copy(piece.userData.finalScale);
  }
  fabricationBead.visible=false;
  fabricationLight.intensity=0;
  updateProgress();
  applyVisibility();
  statusEl.textContent='Reset. Each section is now only a recipe and connector map.';
}

function completeInstantly() {
  assembling=false;
  for(const piece of allPieces) {
    piece.userData.built=true;
    piece.scale.copy(piece.userData.finalScale);
  }
  fabricationBead.visible=false;
  fabricationLight.intensity=0;
  updateProgress();
  applyVisibility();
  statusEl.textContent='Complete. Every major section is whole before the section collars connect the ship.';
}

function revealPiece(piece) {
  piece.userData.built=true;
  piece.visible=pieceVisible(piece);
  const final=piece.userData.finalScale;
  piece.scale.copy(final).multiplyScalar(0.06);
  piece.getWorldPosition(fabricationBead.position);
  fabricationBead.visible=true;
  fabricationLight.position.copy(fabricationBead.position);
  fabricationLight.intensity=2.4;
  const start=performance.now();
  function grow(now) {
    const t=Math.min(1,(now-start)/120);
    const e=1-Math.pow(1-t,3);
    piece.scale.copy(final).multiplyScalar(0.06+e*0.94);
    if(t<1) requestAnimationFrame(grow);
  }
  requestAnimationFrame(grow);
}

async function buildSection(sectionId) {
  const section=sections.get(sectionId);
  if(!section||assembling) return;
  assembling=true;
  statusEl.textContent=`Building ${section.label}: ${section.description}.`;
  for(const piece of section.pieces) {
    if(!assembling) break;
    if(piece.userData.built) continue;
    revealPiece(piece);
    if(Math.random()<0.33) updateProgress();
    await new Promise(r=>setTimeout(r,Math.max(11,2600/Math.max(1,section.pieces.length))));
  }
  assembling=false;
  fabricationBead.visible=false;
  fabricationLight.intensity=0;
  updateProgress();
  applyVisibility();
  statusEl.textContent=`${section.label} complete as its own assembly. ${section.description}.`;
}

async function buildAll() {
  if(assembling) return;
  assembling=true;
  const order=['entry','cargo','systems','cockpit','portWing','starboardWing','portThruster','starboardThruster','gear'];
  for(const id of order) {
    const section=sections.get(id);
    selectedSectionId=id;
    renderSectionButtons();
    moduleLabelEl.textContent=`Building: ${section.label}`;
    statusEl.textContent=`Section ${order.indexOf(id)+1}/${order.length}: ${section.label}.`;
    for(const piece of section.pieces) {
      if(!assembling) break;
      if(piece.userData.built) continue;
      revealPiece(piece);
      if(Math.random()<0.28) updateProgress();
      await new Promise(r=>setTimeout(r,Math.max(8,7800/allPieces.length)));
    }
    if(!assembling) break;
  }
  assembling=false;
  fabricationBead.visible=false;
  fabricationLight.intensity=0;
  updateProgress();
  applyVisibility();
  moduleLabelEl.textContent=`Selected: ${sections.get(selectedSectionId).label}`;
  statusEl.textContent='All sections complete. Walk the pressure modules, then use Exploded view to inspect how they connect.';
}

function roleBuilt(role) {
  return allPieces.some(p=>p.userData.role===role&&p.userData.built);
}

function updateDependency() {
  const pressureReady=['entry','cargo','systems','cockpit'].every(id=>sectionComplete(sections.get(id)));
  const controlReady=roleBuilt('pilot-input')&&roleBuilt('flight-control-core');
  const busReady=roleBuilt('command-bus');
  const portReady=roleBuilt('port-thruster-core')&&roleBuilt('thruster-coupler');
  const starReady=roleBuilt('starboard-thruster-core')&&roleBuilt('thruster-coupler');
  const mobility=pressureReady&&controlReady&&busReady&&portReady&&starReady;
  const rows=[
    ['Pressure path',pressureReady,'entry → cargo → systems → cockpit'],
    ['Flight controls',controlReady,'pilot input → control core'],
    ['Command bus',busReady,'systems spine'],
    ['Port thruster',portReady,'bus coupler → thruster core'],
    ['Starboard thruster',starReady,'bus coupler → thruster core'],
    ['Mobility state',mobility,mobility?'READY':'INCOMPLETE'],
  ];
  dependencyEl.innerHTML=rows.map(([label,ready,text])=>`<div class="dep ${ready?'ready':'missing'}"><strong>${ready?'✓':'○'} ${label}</strong> — ${text}</div>`).join('');
}

function renderSectionButtons() {
  const root=$('#sectionButtons');
  root.innerHTML='';
  for(const def of sectionDefinitions) {
    const section=sections.get(def.id);
    const built=section.pieces.filter(p=>p.userData.built).length;
    const button=document.createElement('button');
    button.className='section-button';
    button.classList.toggle('active',def.id===selectedSectionId);
    button.innerHTML=`<strong>${def.label}</strong><span>${built}/${section.pieces.length} pieces · ${sectionComplete(section)?'whole':'incomplete'}</span>`;
    button.addEventListener('click',()=>{
      selectedSectionId=def.id;
      moduleLabelEl.textContent=`Selected: ${def.label}`;
      statusEl.textContent=`${def.label}: ${def.description}.`;
      renderSectionButtons();
      applyVisibility();
    });
    root.appendChild(button);
  }
}

$('#buildAll').addEventListener('click',buildAll);
$('#buildCurrent').addEventListener('click',()=>buildSection(selectedSectionId));
$('#instant').addEventListener('click',completeInstantly);
$('#reset').addEventListener('click',resetAll);
$('#explode').addEventListener('click',(e)=>{
  exploded=!exploded;
  e.currentTarget.textContent=`Exploded: ${exploded?'On':'Off'}`;
  e.currentTarget.classList.toggle('active',exploded);
  applyExplosion();
  statusEl.textContent=exploded?'Sections separated to expose their designed connection boundaries.':'Sections returned to assembled positions.';
});
$('#isolate').addEventListener('click',(e)=>{
  isolate=!isolate;
  e.currentTarget.textContent=`Isolate: ${isolate?'On':'Off'}`;
  e.currentTarget.classList.toggle('active',isolate);
  applyVisibility();
});
$('#cutaway').addEventListener('click',(e)=>{
  cutaway=!cutaway;
  e.currentTarget.textContent=`Cutaway: ${cutaway?'On':'Off'}`;
  e.currentTarget.classList.toggle('active',cutaway);
  applyVisibility();
});

const player=new THREE.Group();
const playerBody=new THREE.Mesh(new THREE.CapsuleGeometry(0.3,0.82,7,12),material.player);
playerBody.position.y=0.82;
player.add(playerBody);
const playerRing=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.025,8,36),material.glow);
playerRing.rotation.x=Math.PI/2;
playerRing.position.y=0.04;
player.add(playerRing);
player.position.set(0,0,-13.6);
scene.add(player);

function moduleAtZ(z) {
  if(z>=-6.5&&z<-1.8) return 'cargo';
  if(z>=-1.8&&z<2.0) return 'systems';
  if(z>=2.0&&z<=7.0) return 'cockpit';
  return null;
}
function rampHeight(z) {
  const t=THREE.MathUtils.clamp((z+11.2)/(4.7),0,1);
  return THREE.MathUtils.lerp(0.22,DECK_Y,t);
}
function interiorWidth(z) {
  const id=moduleAtZ(z);
  if(!id) return 0;
  return Math.max(0.5,pressureDimensions(id,z).width-0.32);
}
function walkingReady() {
  return !exploded&&['entry','cargo','systems','cockpit'].every(id=>sectionComplete(sections.get(id)));
}
function surfaceHeight(x,z) {
  if(!walkingReady()) return 0;
  if(Math.abs(x)<=1.7&&z>=-11.2&&z<=-6.5) return rampHeight(z);
  const id=moduleAtZ(z);
  if(id&&Math.abs(x)<=interiorWidth(z)) return DECK_Y;
  return 0;
}
function constrainPlayer(next) {
  if(walkingReady()) {
    if(next.z>=-11.2&&next.z<=-6.5&&next.y>0.08) next.x=THREE.MathUtils.clamp(next.x,-1.65,1.65);
    const id=moduleAtZ(next.z);
    if(id&&next.y>DECK_Y-0.25) {
      const w=interiorWidth(next.z);
      next.x=THREE.MathUtils.clamp(next.x,-w,w);
    }
  }
  next.x=THREE.MathUtils.clamp(next.x,-34,34);
  next.z=THREE.MathUtils.clamp(next.z,-34,34);
  next.y=surfaceHeight(next.x,next.z);
}
function locationName() {
  const {x,z,y}=player.position;
  if(walkingReady()&&z>=-11.2&&z<-6.5&&Math.abs(x)<1.8) return 'Rear entry module';
  if(y>DECK_Y-0.2&&z<-1.8) return 'Cargo hall module';
  if(y>DECK_Y-0.2&&z<2.0) return 'Systems spine module';
  if(y>DECK_Y-0.2) return 'Cockpit module';
  return exploded?'Assembly inspection':'Outside ship';
}

let viewMode='orbit';
let camYaw=0;
let camPitch=0.2;
const viewButtons=$('#viewButtons');
const views={orbit:'Orbit',follow:'3rd Person',first:'1st Person'};
function renderViews() {
  viewButtons.innerHTML='';
  for(const [id,label] of Object.entries(views)) {
    const b=document.createElement('button');
    b.textContent=label;
    b.classList.toggle('active',viewMode===id);
    b.addEventListener('click',()=>setView(id));
    viewButtons.appendChild(b);
  }
}
function setView(mode) {
  viewMode=mode;
  orbit.enabled=mode==='orbit';
  playerBody.visible=mode!=='first';
  playerRing.visible=mode!=='first';
  $('#crosshair').style.display=mode==='first'?'block':'none';
  if(mode==='orbit') {
    camera.position.set(22,15,26);
    orbit.target.set(0,2.4,-0.2);
    orbit.update();
  } else camYaw=player.rotation.y;
  renderViews();
}
renderViews();
setView('orbit');

const keys={forward:0,side:0};
addEventListener('keydown',(e)=>{
  const k=e.key.toLowerCase();
  if(k==='w'||e.key==='ArrowUp') keys.forward=1;
  if(k==='s'||e.key==='ArrowDown') keys.forward=-1;
  if(k==='a'||e.key==='ArrowLeft') keys.side=-1;
  if(k==='d'||e.key==='ArrowRight') keys.side=1;
});
addEventListener('keyup',(e)=>{
  const k=e.key.toLowerCase();
  if(k==='w'||k==='s'||e.key==='ArrowUp'||e.key==='ArrowDown') keys.forward=0;
  if(k==='a'||k==='d'||e.key==='ArrowLeft'||e.key==='ArrowRight') keys.side=0;
});

const joyEl=$('#joystick'),joyKnob=$('#joyKnob');
const joy={x:0,y:0};
let joyId=null,joyCX=0,joyCY=0;
function updateJoy(e) {
  const dx=e.clientX-joyCX,dy=e.clientY-joyCY,max=41;
  const len=Math.min(1,Math.hypot(dx,dy)/max),a=Math.atan2(dy,dx);
  joy.x=Math.cos(a)*len;joy.y=Math.sin(a)*len;
  joyKnob.style.transform=`translate(${joy.x*max}px,${joy.y*max}px)`;
}
joyEl.addEventListener('pointerdown',(e)=>{
  joyId=e.pointerId;
  const r=joyEl.getBoundingClientRect();
  joyCX=r.left+r.width/2;joyCY=r.top+r.height/2;
  joyEl.setPointerCapture?.(e.pointerId);updateJoy(e);
});
joyEl.addEventListener('pointermove',(e)=>{if(e.pointerId===joyId)updateJoy(e);});
function endJoy(e){if(e.pointerId!==joyId)return;joyId=null;joy.x=0;joy.y=0;joyKnob.style.transform='translate(0,0)';}
joyEl.addEventListener('pointerup',endJoy);joyEl.addEventListener('pointercancel',endJoy);

let lookId=null,lastLook=null;
canvas.addEventListener('pointerdown',(e)=>{
  if(viewMode==='orbit')return;
  lookId=e.pointerId;lastLook={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener('pointermove',(e)=>{
  if(e.pointerId!==lookId||!lastLook||viewMode==='orbit')return;
  camYaw-=(e.clientX-lastLook.x)*0.005;
  camPitch=THREE.MathUtils.clamp(camPitch+(e.clientY-lastLook.y)*0.004,-0.82,0.95);
  lastLook={x:e.clientX,y:e.clientY};
});
function endLook(e){if(e.pointerId===lookId){lookId=null;lastLook=null;}}
canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);

const nextPos=new THREE.Vector3();
const eye=new THREE.Vector3();
const lookTarget=new THREE.Vector3();
const clock=new THREE.Clock();
function updatePlayer(dt) {
  let side=keys.side+joy.x,forward=keys.forward-joy.y;
  const len=Math.hypot(side,forward);
  if(len<0.03)return;
  if(len>1){side/=len;forward/=len;}
  const yaw=viewMode==='orbit'?Math.atan2(camera.position.x-orbit.target.x,camera.position.z-orbit.target.z):camYaw;
  const dx=Math.cos(yaw)*side+Math.sin(yaw)*forward;
  const dz=-Math.sin(yaw)*side+Math.cos(yaw)*forward;
  nextPos.copy(player.position);
  const speed=5.4;
  nextPos.x+=dx*speed*dt;nextPos.z+=dz*speed*dt;
  constrainPlayer(nextPos);
  player.position.copy(nextPos);
  player.rotation.y=Math.atan2(dx,dz);
}
function updateCamera() {
  if(viewMode==='orbit')return;
  const cp=Math.cos(camPitch);
  if(viewMode==='first') {
    eye.set(player.position.x,player.position.y+1.55,player.position.z);
    camera.position.copy(eye);
    lookTarget.set(eye.x+Math.sin(camYaw)*cp,eye.y-Math.sin(camPitch),eye.z+Math.cos(camYaw)*cp);
    camera.lookAt(lookTarget);
  } else {
    const dist=5.6;
    camera.position.set(player.position.x-Math.sin(camYaw)*dist*cp,player.position.y+2.0+Math.sin(camPitch)*dist,player.position.z-Math.cos(camYaw)*dist*cp);
    camera.lookAt(player.position.x,player.position.y+1.15,player.position.z);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt=Math.min(0.05,clock.getDelta());
  updatePlayer(dt);
  updateCamera();
  if(viewMode==='orbit')orbit.update();
  locationEl.textContent=locationName();
  padRing.material.opacity=0.58+Math.sin(now*0.002)*0.2;
  renderer.render(scene,camera);
}

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(innerWidth,innerHeight);
});

resetAll();
renderSectionButtons();
updateDependency();
applyExplosion();
if(new URLSearchParams(location.search).get('auto')==='1')setTimeout(buildAll,350);
if(new URLSearchParams(location.search).get('instant')==='1')setTimeout(completeInstantly,180);
animate(performance.now());

window.__SYL_MODULAR_SHIP_V2__={
  sections,allPieces,shipRoot,player,buildAll,buildSection,completeInstantly,resetAll,
  functionalGraph:{
    'pilot-input':['flight-control-core'],
    'flight-control-core':['command-bus'],
    'command-bus':['port-thruster-core','starboard-thruster-core'],
  },
};
