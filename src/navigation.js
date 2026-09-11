export const OBSTACLES = {
  hub: { x: 0, z: -3, radius: 3.5 },
  // Matches the Tensor fortress footprint, leaving a navigable promenade to the discoveries.
  tensor: { x: 0, z: -2, radius: 3.7 },
  one: { x: 0, z: -2, radius: 3.8 },
};

export function segmentClear(a, b, obstacle, clearance = 0) {
  const dx = b[0] - a[0], dz = b[1] - a[1], lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((obstacle.x - a[0]) * dx + (obstacle.z - a[1]) * dz) / lengthSq)) : 0;
  return Math.hypot(a[0] + t * dx - obstacle.x, a[1] + t * dz - obstacle.z) >= obstacle.radius + clearance - .0001;
}

// A small visibility graph routes click-to-walk around the island's landmark.
// It also handles a character starting against the collision boundary.
export function findRoute(start, destination, obstacle) {
  const distance = p => Math.hypot(p[0] - obstacle.x, p[1] - obstacle.z);
  const outside = (p, r) => { const angle = Math.atan2(p[1] - obstacle.z, p[0] - obstacle.x); return [obstacle.x + Math.cos(angle) * r, obstacle.z + Math.sin(angle) * r]; };
  const safeRadius = obstacle.radius + .28;
  const end = distance(destination) < safeRadius ? outside(destination, safeRadius) : destination;
  const escape = distance(start) < safeRadius ? outside(start, safeRadius) : null;
  const from = escape || start;
  if (segmentClear(from, end, obstacle, .1)) return [...(escape ? [escape] : []), end];
  const nodes = [from, end, ...Array.from({ length: 32 }, (_, i) => {
    const angle = i * Math.PI / 16;
    return [obstacle.x + Math.cos(angle) * (safeRadius + .25), obstacle.z + Math.sin(angle) * (safeRadius + .25)];
  })];
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set(); costs[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
    if (current < 0 || !Number.isFinite(costs[current]) || current === 1) break;
    visited.add(current);
    for (let next = 0; next < nodes.length; next++) {
      if (visited.has(next) || next === current || !segmentClear(nodes[current], nodes[next], obstacle, .1)) continue;
      const cost = costs[current] + Math.hypot(nodes[next][0] - nodes[current][0], nodes[next][1] - nodes[current][1]);
      if (cost < costs[next]) { costs[next] = cost; previous[next] = current; }
    }
  }
  if (!Number.isFinite(costs[1])) return escape ? [escape] : [];
  const route = []; for (let at = 1; at !== 0; at = previous[at]) route.unshift(nodes[at]);
  return [...(escape ? [escape] : []), ...route];
}
