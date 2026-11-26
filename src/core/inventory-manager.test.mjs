import assert from 'node:assert/strict';
import { InventoryManager } from '../core/mcs-engine.js';
import { PVZType } from '../core/types.js';

const pvzs = new Map();
pvzs.set('pvz-1', {
  id: 'pvz-1', type: PVZType.MESH, capacity: 100, occupiedCapacity: 10,
  inventory: [
    { id: 'inv-1', productId: 'p1', quantity: 20, batchId: 'batch-1', receivedAt: 0, status: 'available' },
    { id: 'inv-2', productId: 'p2', quantity: 5, batchId: 'batch-2', receivedAt: 0, status: 'available' },
  ]
});

const mgr = new InventoryManager(pvzs);

// Test 1: Get item by batch
{
  const found = mgr.getItem('batch-1');
  assert.ok(found, 'Should find batch-1');
  assert.strictEqual(found.item.quantity, 20);
  assert.strictEqual(found.pvz.id, 'pvz-1');
}

// Test 2: Get non-existent item
{
  const found = mgr.getItem('batch-nonexistent');
  assert.strictEqual(found, null);
}

// Test 3: Reserve quantity
{
  const result = mgr.reserve('batch-1', 5, 'order-1');
  assert.strictEqual(result.success, true);
  const item = pvzs.get('pvz-1').inventory.find(i => i.batchId === 'batch-1');
  assert.strictEqual(item.quantity, 15);
  assert.strictEqual(item.status, 'reserved');
  assert.strictEqual(item.reservedForOrderId, 'order-1');
}

// Test 4: Reserve more than available
{
  const result = mgr.reserve('batch-2', 100, 'order-2');
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, 'Insufficient quantity');
}

// Test 5: Release reservation
{
  const result = mgr.releaseReservation('batch-1', 5);
  assert.strictEqual(result.success, true);
  const item = pvzs.get('pvz-1').inventory.find(i => i.batchId === 'batch-1');
  assert.strictEqual(item.quantity, 20);
  assert.strictEqual(item.status, 'available');
  assert.strictEqual(item.reservedForOrderId, null);
}

// Test 6: Release non-existent
{
  const result = mgr.releaseReservation('batch-nonexistent', 1);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error, 'Batch not found');
}

console.log('All InventoryManager tests passed.');
