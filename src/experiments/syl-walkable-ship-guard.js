import * as THREE from 'three';

const GUARD_FLAG = Symbol.for('syl.walkable-ship.guard');

function collapseStarMeshes(scene) {
  const stars = scene.children.filter((child) =>
    child.isMesh &&
    child.geometry?.type === 'SphereGeometry' &&
    child.material?.color?.getHex?.() === 0xbfe5ff
  );
  if (stars.length < 20) return;

  const positions = new Float32Array(stars.length * 3);
  stars.forEach((star, index) => {
    positions[index * 3] = star.position.x;
    positions[index * 3 + 1] = star.position.y;
    positions[index * 3 + 2] = star.position.z;
    scene.remove(star);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xbfe5ff, size: 0.16, sizeAttenuation: true, fog: false })
  );
  points.name = 'Optimized_Starfield';
  scene.add(points);
}

function identifyCompletionEffects(ship) {
  const effects = [];
  ship.traverse((object) => {
    const color = object.isLight ? object.color?.getHex?.() : null;
    const engineGlow = object.isMesh && object.geometry?.type === 'CircleGeometry';
    const completionLight = object.isLight && (color === 0xff6d3f || color === 0x7affd6);
    if (engineGlow || completionLight) effects.push(object);
  });
  return effects;
}

export function installShipPrototypeGuard() {
  if (globalThis[GUARD_FLAG]) return;
  Object.defineProperty(globalThis, GUARD_FLAG, { value: true });

  const prototype = globalThis.__SYL_WALKABLE_SHIP__;
  if (!prototype?.ship || !prototype?.pieces || !prototype?.player) {
    console.error('[SYL ship experiment] Prototype did not expose its debug handle.');
    return;
  }

  const { ship, pieces, player } = prototype;
  const scene = ship.parent;
  if (scene) collapseStarMeshes(scene);

  if (innerWidth <= 720) {
    for (const piece of pieces) piece.castShadow = false;
  }

  const effects = identifyCompletionEffects(ship);
  for (const effect of effects) effect.visible = false;

  const assembleButton = document.querySelector('#assemble');
  const lightsButton = document.querySelector('#lights');
  let completeLastFrame = false;

  function tick() {
    requestAnimationFrame(tick);
    const complete = pieces.length > 0 && pieces.every((piece) => piece.userData.built);
    const lightsOn = lightsButton?.textContent?.includes('On') ?? true;

    for (const effect of effects) {
      const isInteriorLight = effect.isLight && effect.color?.getHex?.() === 0x7affd6;
      effect.visible = complete && (!isInteriorLight || lightsOn);
    }

    if (!complete) player.position.y = 0;
    if (assembleButton) assembleButton.disabled = !complete && pieces.some((piece) => piece.userData.built);

    if (complete !== completeLastFrame) {
      completeLastFrame = complete;
      document.body.dataset.shipComplete = String(complete);
    }
  }
  requestAnimationFrame(tick);
}
