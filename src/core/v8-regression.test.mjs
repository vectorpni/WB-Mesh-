import test from 'node:test';
import assert from 'node:assert/strict';
import { CostEngine, InventoryManager, RouteOptimizer, DemandForecast } from './mcs-engine.js';
import { StateManager } from './app-state.js';
import { DEFAULT_TARIFFS } from './types.js';

test('P0: начальное состояние содержит реальные города, узлы и SKU', () => {
  const s = new StateManager().getState();
  assert.equal(s.cities.size, 3);
  assert.ok(s.pvzs.size >= 14);
  assert.ok(s.products.has('prod-1'));
  assert.ok([...s.pvzs.values()].every(p => p.id && p.occupiedCapacity <= p.capacity));
});

test('P0: классическая цепочка ТЗ стоит 100 рублей', () => {
  assert.equal(new CostEngine().calculateClassicCost().total, 10000);
});

test('P0: полная Mesh-цепочка при n=40 d=10 стоит 92,96 рубля', () => {
  const e = new CostEngine();
  assert.equal(e.calculateMeshVariableCost().total + e.calculateTripCost(40, 1, 0).perParcel, 9296);
});

test('P0: дополнительный результат ПВЗ — 14 минус 7,50 = 6,50', () => {
  const e = new CostEngine();
  assert.equal(e.calculatePvzPayout(10).total, 1400);
  assert.equal(e.calculatePvzCost(10).total, 750);
});

test('P0: отрицательные и нулевые партии не дают фиктивной стоимости', () => {
  const e = new CostEngine();
  for (const n of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => e.calculateTripCost(n));
});

test('P0: карантин не становится доступным только от течения времени', () => {
  const nodes = new Map([['p', {id:'p',capacity:100,occupiedCapacity:1,inventory:[{batchId:'b',quantity:1,status:'quarantine'}]}]]);
  new InventoryManager(nodes).ageBatches(48);
  assert.equal(nodes.get('p').inventory[0].status, 'quarantine');
});

test('P0: запрещён повторный резерв одного заказа', () => {
  const nodes = new Map([['p', {id:'p',capacity:100,occupiedCapacity:10,inventory:[{batchId:'b',quantity:10,status:'available'}]}]]);
  const m = new InventoryManager(nodes);
  assert.ok(m.reserve('b', 2, 'o').success);
  const before = JSON.stringify(nodes.get('p'));
  m.reserve('b', 2, 'o');
  assert.equal(JSON.stringify(nodes.get('p')), before);
});

test('P0: отсутствие доступного товара исключает Mesh', () => {
  const nodes = new Map([['p', {id:'p',cityId:'c',type:'mesh',capacity:100,occupiedCapacity:0,operationalSlots:20,inventory:[]}], ['h',{id:'h',cityId:'c',type:'hub',capacity:1000,occupiedCapacity:0,inventory:[]}]]);
  const r = new RouteOptimizer().findCandidates({id:'o',productId:'x',quantity:1,sourcePvzId:'p',destinationPvzId:'p'},nodes,new Map([['c',{hubId:'h'}]]));
  assert.equal(r.find(c => c.type === 'M1')?.available, false);
});
