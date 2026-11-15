const weapon = (name, price, magazine, reserve, interval, damage, falloff, extras = {}) => ({
  name, price, magazine, reserve, interval, damage, headMultiplier: 4, spread: 0.18,
  spreadPerShot: 0.09, spreadRecovery: 0.7, movementSpread: 0.8, crouchBonus: 0.12,
  recoilPitch: 0.8, recoilYaw: 0.35, reload: 1800, falloff, sound: 'report', ...extras,
});

export const CONFIG = Object.freeze({
  movement: Object.freeze({ walk: 4.3, slow: 2.4, crouch: 2.2, jump: 5.2, gravity: 14, groundAcceleration: 40, airAcceleration: 12, eyeHeight: 1.62, crouchedEyeHeight: 0.95, radius: 0.35 }),
  rounds: Object.freeze({ freeze: 5, duration: 100, plant: 3.5, defuse: 5, fuse: 40, wins: 7, maximum: 13 }),
  economy: Object.freeze({ start: 800, win: 3250, loss: 1900, lossStreak: 500, lossStreakMaximum: 3, kill: 300, plant: 300, defuse: 300, maximum: 16000 }),
  weapons: Object.freeze([
    weapon('P9 Sparrow', 0, 12, 48, 220, 34, 25, { sound: 'pistol' }),
    weapon('VK-7 Carbine', 2700, 30, 90, 110, 26, 30, { automatic: true, sound: 'rifle' }),
    weapon('Hornet-9 SMG', 1800, 32, 96, 75, 19, 18, { automatic: true, spread: 0.42, spreadPerShot: 0.16, sound: 'smg' }),
    weapon('Longbow .308', 4200, 5, 15, 1100, 88, 50, { boltAction: true, scoped: true, sound: 'longshot' }),
    weapon('Breacher-12', 2200, 6, 24, 800, 11, 12, { pellets: 8, pumpAction: true, spread: 3.2, sound: 'shotgun' }),
  ]),
  grenades: Object.freeze({ frag: Object.freeze({ name: 'Sunder frag', price: 300, radius: 6, damage: 120, fuse: 1.6, bounces: 1 }), smoke: Object.freeze({ name: 'Veil smoke', price: 300, radius: 5, duration: 14, blocksBotSight: true }), flash: Object.freeze({ name: 'Dazzle flash', price: 200, range: 25, duration: 2.5, facingAndDistance: true }) }),
  armour: Object.freeze({ vest: Object.freeze({ price: 650, points: 50, absorption: 0.5 }), helmet: Object.freeze({ price: 350, headMultiplier: 2 }) }),
  bots: Object.freeze({ reactionMin: 350, reactionMax: 700, aimError: 3.5, burstMin: 3, burstMax: 5, pauseMin: 400, pauseMax: 800, hearing: 30, vision: 45, halfAngle: 55, walk: 3.6, run: 4.3 }),
  simulation: Object.freeze({ step: 1 / 60, maxSteps: 4 }),
});
