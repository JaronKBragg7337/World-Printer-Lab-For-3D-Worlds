import * as THREE from 'three';

const SEAL_FLAG = Symbol.for('syl.walkable-ship.sealed-skin');

function materialFrom(pieces, section, fallback) {
  return pieces.find((piece) => piece.userData.section === section)?.material || fallback;
}

export function installSealedPrintableShipSkin() {
  if (globalThis[SEAL_FLAG]) return;
  Object.defineProperty(globalThis, SEAL_FLAG, { value: true });

  const prototype = globalThis.__SYL_WALKABLE_SHIP__;
  if (!prototype?.ship || !prototype?.pieces || !prototype?.dimensions) {
    throw new Error('SYL walkable ship prototype is unavailable.');
  }

  const { ship, pieces, dimensions } = prototype;
  const DECK_Y = dimensions.deckY;
  const HULL_REAR = dimensions.rear;
  const HULL_FRONT = dimensions.front;
  const RAMP_REAR = -11;
  const RAMP_TOP = HULL_REAR;
  const zStep = 0.78;
  const angleCount = 13;
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

  const fallback = {
    hull: new THREE.MeshStandardMaterial({ color: 0x60777d, roughness: 0.38, metalness: 0.58 }),
    hullDark: new THREE.MeshStandardMaterial({ color: 0x28373c, roughness: 0.48, metalness: 0.62 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x7e2028, roughness: 0.4, metalness: 0.45 }),
    deck: new THREE.MeshStandardMaterial({ color: 0x34474b, roughness: 0.74, metalness: 0.22 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x1b292f, roughness: 0.7, metalness: 0.28 }),
    console: new THREE.MeshStandardMaterial({ color: 0x10242a, roughness: 0.32, metalness: 0.45, emissive: 0x062d29 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x79d8ff, transparent: true, opacity: 0.42, roughness: 0.08, clearcoat: 1, transmission: 0.16, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ color: 0x61ffd0 }),
    engine: new THREE.MeshBasicMaterial({ color: 0xff8a52 }),
  };

  const material = {
    hull: materialFrom(pieces, 'hull', fallback.hull),
    hullDark: materialFrom(pieces, 'trim', fallback.hullDark),
    trim: materialFrom(pieces, 'ramp', fallback.trim),
    deck: materialFrom(pieces, 'deck', fallback.deck),
    interior: materialFrom(pieces, 'interior', fallback.interior),
    console: materialFrom(pieces, 'systems', fallback.console),
    glass: materialFrom(pieces, 'canopy', fallback.glass),
    glow: pieces.find((piece) => piece.userData.lightPanel)?.material || fallback.glow,
    engine: ship.children.find((child) => child.isMesh && child.geometry?.type === 'CircleGeometry')?.material || fallback.engine,
  };

  function addPiece(name, geometry, pieceMaterial, position, rotation = [0, 0, 0], scale = [1, 1, 1], options = {}) {
    const mesh = new THREE.Mesh(geometry, pieceMaterial);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    mesh.visible = false;
    mesh.castShadow = innerWidth > 720 && options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    mesh.userData = {
      printedPiece: true,
      order: options.order ?? 80,
      cutaway: !!options.cutaway,
      finalScale: new THREE.Vector3(...scale),
      built: false,
      section: options.section || 'seal',
      lightPanel: !!options.lightPanel,
      functionalModule: options.functionalModule || null,
      connectorFor: options.connectorFor || null,
    };
    pieces.push(mesh);
    ship.add(mesh);
    return mesh;
  }

  function addBox(name, position, size, pieceMaterial, rotation = [0, 0, 0], options = {}) {
    return addPiece(name, boxGeometry, pieceMaterial, position, rotation, size, options);
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

  function shellPoint(z, theta, outward = 0) {
    const w = taperedWidth(z);
    const h = hullHeight(z);
    return {
      w,
      h,
      x: Math.cos(theta) * (w + outward),
      y: DECK_Y + 0.72 + Math.sin(theta) * (h + outward),
    };
  }

  const ringZ = [];
  for (let z = HULL_REAR + 0.35; z <= HULL_FRONT + 0.001; z += zStep) ringZ.push(z);

  // Lower pressure-wall pieces close the open band between the deck and the
  // springline of the curved shell. They overlap both surfaces, so seams remain
  // readable without becoming holes.
  for (let zi = 0; zi < ringZ.length; zi++) {
    const z = ringZ[zi];
    const w = taperedWidth(z);
    const cockpitSide = z > 3.55;
    for (const side of [-1, 1]) {
      addBox(
        `sealed_lower_side_${side}_${zi}`,
        [side * (w + 0.025), DECK_Y + 0.38, z],
        [0.17, 0.82, zStep * 1.07],
        cockpitSide ? material.glass : material.hull,
        [0, 0, 0],
        { order: 44 + zi * 0.02, cutaway: side > 0, section: cockpitSide ? 'canopy' : 'hull-seal' },
      );
      addBox(
        `sealed_chine_${side}_${zi}`,
        [side * (w + 0.09), DECK_Y + 0.76, z],
        [0.13, 0.24, zStep * 1.11],
        zi % 4 === 0 ? material.trim : material.hullDark,
        [0, 0, 0],
        { order: 47 + zi * 0.02, cutaway: side > 0, section: 'hull-seal' },
      );
    }
  }

  // Cottage-roof principle applied to a pressure hull: one set of tiles bridges
  // around the circumference, and a second staggered set bridges between the
  // longitudinal courses. Every bridge is still its own printable plate.
  for (let zi = 0; zi < ringZ.length; zi++) {
    const z = ringZ[zi];
    const w = taperedWidth(z);
    const h = hullHeight(z);
    const arc = Math.PI * Math.sqrt((w * w + h * h) / 2) / (angleCount - 1) * 1.1;
    for (let ai = 0; ai < angleCount - 1; ai++) {
      const theta = (ai + 0.5) / (angleCount - 1) * Math.PI;
      const p = shellPoint(z, theta, 0.075);
      const cockpit = z > 3.55 && theta > 0.26 && theta < Math.PI - 0.26;
      addBox(
        `circumference_overlap_${zi}_${ai}`,
        [p.x, p.y, z],
        [arc * 0.62, 0.13, zStep * 1.08],
        cockpit ? material.glass : material.hull,
        [0, 0, theta - Math.PI / 2],
        { order: 55 + zi * 0.03 + ai * 0.001, cutaway: p.x > 0.12 && !cockpit, section: cockpit ? 'canopy' : 'hull-seal' },
      );
    }
  }

  for (let zi = 0; zi < ringZ.length - 1; zi++) {
    const z = (ringZ[zi] + ringZ[zi + 1]) / 2;
    const w = taperedWidth(z);
    const h = hullHeight(z);
    const arc = Math.PI * Math.sqrt((w * w + h * h) / 2) / (angleCount - 1) * 1.1;
    for (let ai = 0; ai < angleCount; ai++) {
      const theta = ai / (angleCount - 1) * Math.PI;
      const p = shellPoint(z, theta, 0.105);
      const cockpit = z > 3.55 && theta > 0.30 && theta < Math.PI - 0.30;
      addBox(
        `longitudinal_overlap_${zi}_${ai}`,
        [p.x, p.y, z],
        [arc * 1.1, 0.11, zStep * 0.32],
        cockpit ? material.glass : (ai === 0 || ai === angleCount - 1 ? material.hullDark : material.hull),
        [0, 0, theta - Math.PI / 2],
        { order: 58 + zi * 0.03 + ai * 0.001, cutaway: p.x > 0.12 && !cockpit, section: cockpit ? 'canopy' : 'hull-seal' },
      );
    }

    // Canopy mullions make the glass a connected flight-capable module instead
    // of disconnected transparent tiles.
    if (z > 3.55) {
      for (const theta of [0.34, Math.PI / 2, Math.PI - 0.34]) {
        const p = shellPoint(z, theta, 0.135);
        addBox(
          `canopy_mullion_${zi}_${theta.toFixed(2)}`,
          [p.x, p.y, z],
          [0.13, 0.12, zStep * 0.38],
          material.hullDark,
          [0, 0, theta - Math.PI / 2],
          { order: 61 + zi * 0.02, cutaway: p.x > 0.1, section: 'canopy-frame' },
        );
      }
    }
  }

  // Roof spine plates hide the last top seam and establish a printable structural
  // rail that the ceiling ribs and cockpit canopy can connect to.
  for (let zi = 0; zi < ringZ.length; zi++) {
    const z = ringZ[zi];
    const p = shellPoint(z, Math.PI / 2, 0.15);
    addBox(`roof_spine_${zi}`, [0, p.y, z], [0.34, 0.14, zStep * 1.12], material.hullDark, [0, 0, 0], {
      order: 63 + zi * 0.02,
      cutaway: true,
      section: 'hull-spine',
    });
  }

  // A staggered under-deck is a structural layer beneath the visible floor tiles.
  // The floor keeps its panel seams, but no seam exposes open space beneath it.
  let deckIndex = 0;
  for (let z = -6.25; z <= 5.25; z += 1.34) {
    const w = Math.max(1.05, taperedWidth(z) - 0.52);
    const offset = deckIndex % 2 ? 0.64 : 0;
    for (let x = -w - offset; x <= w + 0.01; x += 1.28) {
      const clippedX = THREE.MathUtils.clamp(x, -w, w);
      addBox(`deck_underplate_${deckIndex}_${x.toFixed(2)}`, [clippedX, DECK_Y - 0.1, z], [1.36, 0.08, 1.46], material.hullDark, [0, 0, 0], {
        order: 18 + deckIndex * 0.02,
        section: 'deck-structure',
      });
    }
    deckIndex++;
  }

  // Ramp plates retain visible divisions, while four printable under-rails and
  // two lips close the course gaps from the landing pad to the pressure deck.
  const rampLength = Math.hypot(RAMP_TOP - RAMP_REAR, DECK_Y - 0.22);
  const rampAngle = Math.atan2(DECK_Y - 0.22, RAMP_TOP - RAMP_REAR);
  for (const x of [-1.15, -0.38, 0.38, 1.15]) {
    addBox(`ramp_underrail_${x}`, [x, (DECK_Y + 0.22) / 2 - 0.08, (RAMP_TOP + RAMP_REAR) / 2], [0.58, 0.08, rampLength * 1.02], material.hullDark, [-rampAngle, 0, 0], {
      order: -32,
      section: 'ramp-structure',
    });
  }
  addBox('ramp_ground_lip', [0, 0.25, RAMP_REAR + 0.08], [3.28, 0.18, 0.34], material.trim, [-rampAngle, 0, 0], { order: -34, section: 'ramp-structure' });
  addBox('ramp_pressure_threshold', [0, DECK_Y + 0.02, RAMP_TOP - 0.06], [3.36, 0.18, 0.34], material.trim, [-rampAngle, 0, 0], { order: -14, section: 'ramp-structure' });

  // Rear pressure collar closes the visible transition around the open door while
  // keeping the central opening and ramp traversable.
  for (const side of [-1, 1]) {
    addBox(`rear_door_jamb_${side}`, [side * 1.72, DECK_Y + 1.42, HULL_REAR - 0.08], [0.28, 2.82, 0.32], material.hullDark, [0, 0, 0], {
      order: 34,
      cutaway: side > 0,
      section: 'pressure-door-frame',
    });
  }
  addBox('rear_door_header', [0, DECK_Y + 2.84, HULL_REAR - 0.08], [3.72, 0.34, 0.32], material.hullDark, [0, 0, 0], {
    order: 35,
    cutaway: true,
    section: 'pressure-door-frame',
  });

  // Backing shells make the internal bulkheads pressure-tight while the smaller
  // face tiles remain individually printable and visually legible.
  for (const z of [-1.75, 2.35]) {
    addBox(`bulkhead_backing_left_${z}`, [-1.55, DECK_Y + 1.4, z + 0.09], [1.35, 2.72, 0.08], material.interior, [0, 0, 0], {
      order: 141,
      section: 'bulkhead-seal',
    });
    addBox(`bulkhead_backing_right_${z}`, [1.55, DECK_Y + 1.4, z + 0.09], [1.35, 2.72, 0.08], material.interior, [0, 0, 0], {
      order: 141,
      cutaway: true,
      section: 'bulkhead-seal',
    });
    addBox(`bulkhead_backing_header_${z}`, [0, DECK_Y + 2.78, z + 0.09], [1.78, 0.34, 0.08], material.interior, [0, 0, 0], {
      order: 142,
      cutaway: true,
      section: 'bulkhead-seal',
    });
  }

  // Functional chain: the cockpit controls are a complete printable module, then
  // a segmented command/power bus physically links them to two printable thruster
  // cores. The prototype does not fly yet, but its future dependency graph is no
  // longer implied by disconnected decoration.
  addBox('flight_control_core', [0, DECK_Y + 0.46, 5.16], [1.42, 0.52, 0.62], material.console, [-0.12, 0, 0], {
    order: 163,
    cutaway: true,
    section: 'flight-control',
    functionalModule: 'flight-control-core',
  });
  addBox('flight_control_display', [0, DECK_Y + 1.04, 5.38], [1.32, 0.52, 0.12], material.glow, [-0.18, 0, 0], {
    order: 165,
    cutaway: true,
    castShadow: false,
    section: 'flight-control',
    functionalModule: 'flight-control-display',
    connectorFor: 'flight-control-core',
  });
  for (const side of [-1, 1]) {
    const stick = new THREE.CylinderGeometry(0.065, 0.075, 0.52, 12);
    addPiece(`pilot_control_stick_${side}`, stick, material.hullDark, [side * 0.78, DECK_Y + 0.71, 4.82], [-0.18, 0, side * 0.08], [1, 1, 1], {
      order: 164,
      cutaway: side > 0,
      section: 'flight-control',
      functionalModule: 'pilot-input',
      connectorFor: 'flight-control-core',
    });
  }

  let busIndex = 0;
  for (let z = 4.55; z >= -4.75; z -= 0.82) {
    addBox(`command_bus_${busIndex++}`, [0, DECK_Y - 0.015, z], [0.24, 0.1, 0.9], busIndex % 3 === 0 ? material.glow : material.console, [0, 0, 0], {
      order: 19 + busIndex * 0.01,
      section: 'control-bus',
      functionalModule: 'command-power-bus',
      connectorFor: 'flight-control-core',
      castShadow: false,
    });
  }

  for (const side of [-1, 1]) {
    const core = new THREE.CylinderGeometry(0.46, 0.46, 1.78, 18);
    addPiece(`thruster_core_${side}`, core, material.engine, [side * 4.55, DECK_Y + 0.28, -3.62], [Math.PI / 2, 0, 0], [1, 1, 1], {
      order: 96,
      cutaway: side > 0,
      section: 'thruster-core',
      functionalModule: side < 0 ? 'port-thruster-core' : 'starboard-thruster-core',
      connectorFor: 'command-power-bus',
      castShadow: false,
    });
    addBox(`thruster_bus_coupler_${side}`, [side * 3.62, DECK_Y + 0.26, -3.62], [1.72, 0.14, 0.18], material.glow, [0, 0, 0], {
      order: 95,
      cutaway: side > 0,
      section: 'control-bus',
      functionalModule: 'thruster-coupler',
      connectorFor: side < 0 ? 'port-thruster-core' : 'starboard-thruster-core',
      castShadow: false,
    });
  }

  pieces.sort((a, b) => a.userData.order - b.userData.order || a.position.y - b.position.y || a.position.z - b.position.z);
  const partCount = document.querySelector('#partCount');
  if (partCount) partCount.textContent = `${pieces.length} printable pieces`;
  const note = document.querySelector('#hud .note');
  if (note) note.textContent = 'Sealed-skin revision: overlapping printable hull plates close the pressure shell while cockpit controls, command bus, and thruster cores remain distinct connected modules.';

  prototype.functionalGraph = {
    'pilot-input': ['flight-control-core'],
    'flight-control-display': ['flight-control-core'],
    'flight-control-core': ['command-power-bus'],
    'command-power-bus': ['port-thruster-core', 'starboard-thruster-core'],
  };
  prototype.sealedSkinInstalled = true;
}
