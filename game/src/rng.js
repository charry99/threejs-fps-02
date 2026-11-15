export function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6D2B79F5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return Object.freeze({
    next,
    integer(low, high) { return Math.floor(next() * (high - low)) + low; },
    pick(items) { return items[Math.floor(next() * items.length)]; },
    range(low, high) { return low + next() * (high - low); },
    gaussian() { return next() + next() + next() - 1.5; },
  });
}

export function hashSeed(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}
