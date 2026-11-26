import assert from 'node:assert/strict';
import { DemandForecast } from '../core/mcs-engine.js';

// Test 1: Moving average (static method)
{
  const history = [10, 12, 8, 15, 11, 13, 9];
  const result = DemandForecast.movingAverage(history, 3);
  assert.ok(Number.isFinite(result), 'Moving average should be finite');
  assert.ok(result > 0, 'Moving average should be positive');
}

// Test 2: EWMA (static method)
{
  const history = [10, 12, 8, 15, 11, 13, 9];
  const result = DemandForecast.ewma(history, 0.3);
  assert.ok(Number.isFinite(result), 'EWMA should be finite');
  assert.ok(result > 0, 'EWMA should be positive');
}

// Test 3: Seasonal naive (static method)
{
  const history = [10, 12, 8, 15, 11, 13, 9, 14, 16, 10, 12, 11];
  const result = DemandForecast.seasonalNaive(history, 7);
  assert.ok(Number.isFinite(result), 'Seasonal naive should be finite');
}

// Test 4: Seasonal average (static method)
{
  const history = [10, 12, 8, 15, 11, 13, 9, 14, 16, 10, 12, 11];
  const result = DemandForecast.seasonalAverage(history, 7);
  assert.ok(Number.isFinite(result), 'Seasonal average should be finite');
}

// Test 5: Evaluate on holdout (static method)
{
  const history = Array.from({ length: 84 }, (_, i) => 10 + Math.sin(i / 7) * 3 + (i % 2));
  const result = DemandForecast.evaluate(history, 14);
  assert.ok(result.ewma !== undefined, 'Should have ewma result');
  assert.ok(result.movingAverage !== undefined, 'Should have movingAverage result');
  assert.ok(result.seasonalNaive !== undefined, 'Should have seasonalNaive result');
  assert.ok(result.seasonalAverage !== undefined, 'Should have seasonalAverage result');
}

console.log('All DemandForecast tests passed.');
