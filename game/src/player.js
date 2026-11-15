import { pointCollides } from './world.js';

export function createPlayer(map, config, input) {
  const spawn = map.spawns.vanguard[0];
  const player = {
    position: { x: spawn.x, y: 0, z: spawn.z }, yaw: spawn.yaw, pitch: 0,
    velocity: { x: 0, y: 0, z: 0 }, health: 100, armour: 0, helmet: false,
    crouched: false, onGround: true, eyeHeight: config.movement.eyeHeight,
    money: config.economy.start, weapons: [config.weapons[0]], currentWeapon: 0,
    grenades: { frag: 0, smoke: 0, flash: 0 },
    update(dt, colliders) {
      const m = config.movement;
      const [mx, my] = input.readMouse();
      this.mouseDelta = { x: mx, y: my };
      this.yaw -= mx * 0.0022;
      this.pitch = Math.max(-1.553, Math.min(1.553, this.pitch - my * 0.0022));
      this.crouched = input.held('ControlLeft') || input.held('ControlRight');
      const targetEye = this.crouched ? m.crouchedEyeHeight : m.eyeHeight;
      this.eyeHeight += (targetEye - this.eyeHeight) * Math.min(1, dt * 12);
      const forward = (input.held('KeyW') ? 1 : 0) - (input.held('KeyS') ? 1 : 0);
      const side = (input.held('KeyD') ? 1 : 0) - (input.held('KeyA') ? 1 : 0);
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      let wx = side * cos + forward * -sin, wz = side * sin - forward * cos;
      const magnitude = Math.hypot(wx, wz);
      if (magnitude) { wx /= magnitude; wz /= magnitude; }
      const wishSpeed = this.crouched ? m.crouch : input.held('ShiftLeft') || input.held('ShiftRight') ? m.slow : m.walk;
      const accel = this.onGround ? m.groundAcceleration : m.airAcceleration;
      if (magnitude) {
        const along = this.velocity.x * wx + this.velocity.z * wz;
        const add = Math.min(wishSpeed - along, accel * dt);
        if (add > 0) { this.velocity.x += wx * add; this.velocity.z += wz * add; }
      } else if (this.onGround) {
        const speed = Math.hypot(this.velocity.x, this.velocity.z);
        const next = Math.max(0, speed - m.groundAcceleration * dt);
        if (speed) { this.velocity.x *= next / speed; this.velocity.z *= next / speed; }
      }
      if (input.held('Space') && this.onGround) { this.velocity.y = m.jump; this.onGround = false; }
      this.velocity.y -= m.gravity * dt;
      const nx = this.position.x + this.velocity.x * dt;
      const nz = this.position.z + this.velocity.z * dt;
      const radius = m.radius;
      if (!pointCollides(nx, this.position.z, radius, colliders)) this.position.x = nx; else this.velocity.x = 0;
      if (!pointCollides(this.position.x, nz, radius, colliders)) this.position.z = nz; else this.velocity.z = 0;
      this.position.y += this.velocity.y * dt;
      if (this.position.y <= 0) { this.position.y = 0; this.velocity.y = 0; this.onGround = true; }
    },
    damage(amount, part = 'body') {
      let damage = amount * (part === 'head' && this.helmet ? 0.5 : 1);
      if (this.armour > 0) { const absorbed = Math.min(this.armour, damage * 0.5); this.armour -= absorbed; damage -= absorbed; }
      this.health = Math.max(0, this.health - damage);
      return this.health <= 0;
    },
    reset(point) { this.position.x = point.x; this.position.y = 0; this.position.z = point.z; this.yaw = point.yaw ?? this.yaw; this.pitch = 0; this.velocity.x = this.velocity.y = this.velocity.z = 0; this.health = 100; this.armour = 0; this.helmet = false; this.onGround = true; },
  };
  return player;
}
