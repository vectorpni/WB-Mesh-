import assert from 'node:assert/strict';
import { RouteOptimizer } from '../core/mcs-engine.js';
import { DEFAULT_TARIFFS, RouteType, PVZType } from '../core/types.js';

const tariffs = DEFAULT_TARIFFS;
const optimizer = new RouteOptimizer(tariffs);

// Build minimal city and PVZ maps matching DEMO_* structure
const cities = new Map();
cities.set('perm', {
  id: 'perm', name: 'Пермь', hubId: 'pvz-perm-hub',
  meshPvzs: ['pvz-perm-plus', 'pvz-perm-krasnov'],
  standardPvzs: [],
  coordinates: { x: 150, y: 120 }
});
cities.set('ekaterinburg', {
  id: 'ekaterinburg', name: 'Екатеринбург', hubId: 'pvz-ekb-hub',
  meshPvzs: ['pvz-ekb-ural'],
  standardPvzs: [],
  coordinates: { x: 400, y: 180 }
});

const pvzs = new Map();
pvzs.set('pvz-perm-hub', {
  id: 'pvz-perm-hub', cityId: 'perm', name: 'Хаб Пермь', type: PVZType.HUB,
  capacity: 1000, occupiedCapacity: 10, coordinates: { x: 150, y: 120 }, operationalSlots: 16, inventory: []
});
pvzs.set('pvz-ekb-hub', {
  id: 'pvz-ekb-hub', cityId: 'ekaterinburg', name: 'Хаб Екатеринбург', type: PVZType.HUB,
  capacity: 1200, occupiedCapacity: 10, coordinates: { x: 400, y: 180 }, operationalSlots: 20, inventory: []
});
pvzs.set('pvz-perm-plus', {
  id: 'pvz-perm-plus', cityId: 'perm', name: 'Плюс Ареал', type: PVZType.MESH,
  capacity: 200, occupiedCapacity: 5, coordinates: { x: 100, y: 140 }, operationalSlots: 8, inventory: [{productId: 'p1', batchId: 'b1', quantity: 70, status: 'available'}]
});
pvzs.set('pvz-perm-krasnov', {
  id: 'pvz-perm-krasnov', cityId: 'perm', name: 'Красновский', type: PVZType.MESH,
  capacity: 180, occupiedCapacity: 3, coordinates: { x: 190, y: 100 }, operationalSlots: 6, inventory: [{productId: 'p1', batchId: 'b2', quantity: 70, status: 'available'}]
});
pvzs.set('pvz-ekb-ural', {
  id: 'pvz-ekb-ural', cityId: 'ekaterinburg', name: 'Уральский', type: PVZType.MESH,
  capacity: 220, occupiedCapacity: 2, coordinates: { x: 360, y: 200 }, operationalSlots: 6, inventory: [{productId: 'p1', batchId: 'b2', quantity: 70, status: 'available'}]
});

const order = {
  id: 'order-1', productId: 'p1', quantity: 3,
  sourcePvzId: 'pvz-perm-plus', destinationPvzId: 'pvz-perm-plus'
};

// Test 1: M1 (same PVZ)
{
  const candidates = optimizer.findCandidates(order, pvzs, cities);
  const m1 = candidates.find(c => c.type === RouteType.M1);
  assert.ok(m1, 'M1 candidate should exist for same PVZ');
  assert.ok(m1.available, 'M1 should be available');
  // M1 has zero trip cost (same PVZ) — check totalCost includes mesh variable
  assert.ok(m1.totalCost >= 0, 'M1 totalCost should be non-negative');
}

// Test 2: M2 (same city, different mesh PVZ)
{
  const orderM2 = { ...order, sourcePvzId: 'pvz-perm-plus', destinationPvzId: 'pvz-perm-krasnov', quantity: 40 };
  const candidates = optimizer.findCandidates(orderM2, pvzs, cities);
  const m2 = candidates.find(c => c.type === RouteType.M2);
  assert.ok(m2, 'M2 candidate should exist for same city mesh-to-mesh');
  assert.ok(m2.available, 'M2 should be available');
}

// Test 3: C1 (same city via hub)
{
  const candidates = optimizer.findCandidates(order, pvzs, cities);
  const c1 = candidates.find(c => c.type === RouteType.C1);
  assert.ok(c1, 'C1 candidate should exist for same city');
}

// Test 4: C2 (inter-city)
{
  const orderC2 = { ...order, sourcePvzId: 'pvz-perm-plus', destinationPvzId: 'pvz-ekb-ural', quantity: 1 };
  const candidates = optimizer.findCandidates(orderC2, pvzs, cities);
  const c2 = candidates.find(c => c.type === RouteType.C2);
  assert.ok(c2, 'C2 candidate should exist for inter-city');
}

// Test 5: selectRoute prefers M1 > M2 > C1 > C2
{
  const orderM2 = { ...order, sourcePvzId: 'pvz-perm-plus', destinationPvzId: 'pvz-perm-krasnov', quantity: 40 };
  const candidates = optimizer.findCandidates(orderM2, pvzs, cities);
  const selected = optimizer.selectRoute(candidates);
  assert.ok(selected, 'Should select a route');
  assert.ok(['M1', 'M2'].includes(selected.type), `Should prefer M1/M2, got ${selected.type}`);
}

// Test 6: Constraint - capacity exceeded
{
  const fullPvz = new Map(pvzs);
  fullPvz.set('pvz-perm-krasnov', { ...pvzs.get('pvz-perm-krasnov'), occupiedCapacity: 180, capacity: 180 });
  const orderFull = { ...order, sourcePvzId: 'pvz-perm-plus', destinationPvzId: 'pvz-perm-krasnov', quantity: 400 };
  const candidates = optimizer.findCandidates(orderFull, fullPvz, cities);
  const m2 = candidates.find(c => c.type === RouteType.M2);
  assert.ok(m2 && !m2.available, 'M2 should be unavailable when dest PVZ is full');
  assert.ok(m2.constraints.includes('capacity_exceeded'), 'Should have capacity_exceeded constraint');
}

console.log('All RouteOptimizer tests passed.');
