export function createWeaponState(definition) {
  return { definition, magazine: definition.magazine, reserve: definition.reserve, lastShot: -Infinity, reloading: false, reloadEnd: 0, bloom: 0 };
}

export function tryFire(state, now, conditions, rng) {
  if (state.magazine <= 0 || state.reloading || now - state.lastShot < state.definition.interval) return false;
  const definition = state.definition;
  state.magazine--;
  state.lastShot = now;
  state.bloom += definition.spreadPerShot;
  return { pellets: definition.pellets || 1, spread: currentSpread(state, conditions, 0), recoil: { pitch: definition.recoilPitch, yaw: (rng.next() * 2 - 1) * definition.recoilYaw } };
}

export function startReload(state, now) {
  if (state.reloading || state.magazine >= state.definition.magazine || state.reserve <= 0) return false;
  state.reloading = true;
  state.reloadEnd = now + state.definition.reload;
  return true;
}

export function updateReload(state, now) {
  if (!state.reloading || now < state.reloadEnd) return false;
  const amount = Math.min(state.definition.magazine - state.magazine, state.reserve);
  state.magazine += amount;
  state.reserve -= amount;
  state.reloading = false;
  return true;
}

export function switchWeapon(owner, index) {
  if (!Number.isInteger(index) || index < 0 || index >= owner.weapons.length) return false;
  owner.currentWeapon = index;
  return owner.weapons[index];
}

export function currentSpread(state, conditions, dt) {
  const d = state.definition;
  state.bloom = Math.max(0, state.bloom - d.spreadRecovery * dt);
  return Math.max(0, d.spread + state.bloom + (conditions.moving ? d.movementSpread : 0) + (conditions.airborne ? d.movementSpread : 0) - (conditions.crouched ? d.crouchBonus : 0));
}

export function muzzlePosition(cameraPosition, facing, definition) {
  const right = { x: facing.z, y: 0, z: -facing.x };
  return { x: cameraPosition.x + facing.x * (definition.muzzleForward ?? .55) + right.x * .18, y: cameraPosition.y - .16, z: cameraPosition.z + facing.z * (definition.muzzleForward ?? .55) + right.z * .18 };
}

export function throwGrenade(owner, type, position, direction, rng) {
  const definition = owner.grenades[type];
  if (!definition || definition <= 0) return false;
  owner.grenades[type]--;
  const speed = 10 + rng.next() * 1.5;
  return { type, position: { ...position }, velocity: { x: direction.x * speed, y: direction.y * speed + 2, z: direction.z * speed }, fuse: type === 'frag' ? 1.6 : type === 'flash' ? 1.2 : 1.1 };
}
