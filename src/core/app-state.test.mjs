import assert from 'node:assert/strict';
import { StateManager } from '../core/app-state.js';
import { OrderStatus, UserRole } from '../core/types.js';

const state = StateManager.getInstance();

// Test 1: Initial state exists
{
  const s = state.getState();
  assert.ok(s.cities, 'Should have cities');
  assert.ok(s.pvzs, 'Should have pvzs');
  assert.ok(s.orders, 'Should have orders');
  assert.ok(s.tariffs, 'Should have tariffs');
  // Note: UserRole.OWNER is not defined in enum; code uses UserRole.PVZ_OWNER
  // This is a documented bug (see AUDIT.md)
  assert.strictEqual(s.ui.role, 'pvz_owner', 'Default role should be pvz_owner');
}

// Test 2: Initialize is async and resolves
{
  await state.initialize();
  const s = state.getState();
  assert.ok(s, 'State should exist after initialize');
}

// Test 3: Subscribe/notify
{
  let called = false;
  const unsub = state.subscribe(() => { called = true; });
  state.notify();
  assert.strictEqual(called, true, 'Subscriber should be called on notify');
  unsub();
}

// Test 4: Create order
{
  const s = state.getState();
  const pvzId = 'pvz-perm-plus';
  const order = state.createOrder({
    productId: 'prod-1',
    quantity: 3,
    sourcePvzId: pvzId,
    destinationPvzId: pvzId,
    sellerId: 'seller-1'
  });
  assert.ok(order.id, 'Order should have id');
  assert.strictEqual(order.status, OrderStatus.NEW, 'New order should have NEW status');
  assert.ok(s.orders.has(order.id), 'Order should be in state');
}

// Test 5: Route order
{
  const s = state.getState();
  const orderId = Array.from(s.orders.keys()).pop();
  const routed = state.routeOrder(orderId);
  assert.ok(routed, 'Route order should return result');
}

// Test 6: Role switching
{
  state.setRole('pvz_operator');
  assert.strictEqual(state.getState().ui.role, 'pvz_operator');
  state.setRole('seller');
  assert.strictEqual(state.getState().ui.role, 'seller');
  state.setRole('pvz_owner');
}

// Test 7: Export/Import state
{
  const json = state.exportState();
  assert.ok(json, 'Should export state');
  const parsed = JSON.parse(json);
  assert.ok(parsed.tariffs, 'Exported state should have tariffs');
  state.importState(json);
  const after = state.getState();
  assert.ok(after.tariffs, 'State should exist after import');
}

// Test 8: Reset demo
{
  state.resetDemo();
  const s = state.getState();
  assert.ok(s, 'State should exist after reset');
}

console.log('All StateManager tests passed.');
