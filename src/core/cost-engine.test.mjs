import assert from 'node:assert/strict';
import { CostEngine } from '../core/mcs-engine.js';
import { DEFAULT_TARIFFS } from '../core/types.js';

const t = DEFAULT_TARIFFS;
const engine = new CostEngine(t);

// Test 1: Base trip cost (1 parcel, 1 stop, 0 wait)
{
  const result = engine.calculateTripCost(1, 1, 0);
  assert.strictEqual(result.total, 48000 + 800, `Expected ${48000 + 800}, got ${result.total}`);
  assert.strictEqual(result.perParcel, 48800);
}

// Test 2: 5 parcels, 1 stop, 5 min wait
{
  const result = engine.calculateTripCost(5, 1, 5);
  const expected = 48000 + 800 * 5 + 0 + 600 * 5;
  assert.strictEqual(result.total, expected, `Expected ${expected}, got ${result.total}`);
  assert.strictEqual(result.perParcel, Math.ceil(expected / 5));
}

// Test 3: Extra stops
{
  const result = engine.calculateTripCost(5, 4, 5);
  const expected = 48000 + 800 * 5 + 4000 * 3 + 600 * 5;
  assert.strictEqual(result.total, expected, `Expected ${expected}, got ${result.total}`);
}

// Test 4: Static wrapper
{
  const result = CostEngine.calculateTripCost(t, 5, 1, 5);
  const instance = new CostEngine(t).calculateTripCost(5, 1, 5);
  assert.strictEqual(result.total, instance.total);
}

// Test 5: Classic cost (actual code value)
{
  const result = engine.calculateClassicCost();
  const expected = t.classicTransport + t.classicStorage + t.classicSorting +
    t.classicLastMile + t.classicPVZ + t.classicReturns + t.classicIT;
  assert.strictEqual(result.total, expected, `Expected ${expected}, got ${result.total}`);
  // Document: actual code = 12000 kop (120₽), JSDoc says 10000 kop (100₽) — DISCREPANCY
}

// Test 6: Mesh variable cost
{
  const result = engine.calculateMeshVariableCost();
  const expected = t.meshPlacement + t.meshStorage + t.meshSorting +
    t.meshLastMile + t.meshPVZ + t.meshReturns + t.meshIT;
  assert.strictEqual(result.total, expected);
}

// Test 7: Break-even threshold
{
  const be = engine.calculateBreakEvenThreshold();
  assert.ok(Number.isFinite(be), 'Break-even should be finite');
  assert.ok(be > 0, 'Break-even should be positive');
}

// Test 8: Progressive storage multiplier
{
  const result = engine.calculateStorageCost(10);
  const free = t.freeStorageDays;
  const base = t.storagePerDay;
  const mult = t.progressiveStorageMultiplier;
  let expected = 0;
  for (let d = 1; d <= 10; d++) {
    expected += d <= free ? base : Math.round(base * mult);
  }
  assert.strictEqual(result.total, expected);
}

// Test 9: PVZ payout and cost
{
  const payout = engine.calculatePvzPayout(3);
  const payoutExpected = t.receiveFee + t.storagePerDay * 3 + t.packFee + t.transferFee;
  assert.strictEqual(payout.total, payoutExpected);

  const cost = engine.calculatePvzCost(3);
  const costExpected = t.partnerOpsCost + t.partnerShelfPerDay * 3 + t.transferFee;
  assert.strictEqual(cost.total, costExpected);
  assert.ok(payout.total > cost.total, 'PVZ margin should be positive');
}

console.log('All CostEngine tests passed.');
