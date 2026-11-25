import test from 'node:test';
import assert from 'node:assert/strict';
import { quote, scenario, createState, act } from './mesh.mjs';
test('city threshold, costs and partner transfer reconcile', () => {
  const q=quote(scenario('city'));
  assert.equal(q.threshold, 5); assert.equal(q.route,'mesh');
  assert.equal(q.baseline,14500); assert.equal(q.mesh,12300); assert.equal(q.payout,3900);
  assert.equal(q.pvzMargin,1600); assert.equal(q.saving,2200);
});
test('low density, intercity, peak, downtime and aged stock preserve hub choice', () => {
  for(const key of ['thin','hub','peak','outage','aged','full']) assert.equal(quote(scenario(key)).route,'hub',key);
});
test('returns sensitivity can make direct shipping uneconomic', () => {
  const q=quote({...scenario('city'),returnRate:100});
  assert.equal(q.route,'hub');
});
test('same cost chooses hub conservatively', () => {
  const q=quote({...scenario('city'),batch: 8, hubCost:11800});
  assert.equal(q.mesh,q.baseline); assert.equal(q.route,'hub');
});
test('customer price and SLA gate direct shipping', () => {
  assert.equal(quote({...scenario('city'),customerMesh:101}).route,'hub');
  assert.equal(quote({...scenario('city'),meshHours:30}).route,'hub');
});
test('reject bad fields and illegal order transitions', () => {
  assert.throws(()=>quote({...scenario('city'),batch:0}));
  assert.throws(()=>act(createState('city'),'issue'));
});
test('complete flow debits inventory once and pays partner once', () => {
  let s=createState('city');
  for(const action of ['receive','store','order','pack','dispatch','issue','settle']) s=act(s,action);
  assert.equal(s.stage,'settled'); assert.equal(s.stock,0); assert.equal(s.reserved,0);
  assert.equal(s.paidPVZ,3900); assert.equal(s.sellerNet,59000);
  assert.throws(()=>act(s,'settle'));
});
test('hub lifecycle does not create a mesh stock receipt or payout', () => {
  let s=createState('hub');
  for(const action of ['receive','store','order','pack','dispatch','issue','settle']) s=act(s,action);
  assert.equal(s.stock,0); assert.equal(s.paidPVZ,0);
  assert.equal(s.sellerNet,58000);
});
test('return checks stock disposition and cannot charge twice', () => {
  let s=createState('city');
  for(const action of ['receive','store','order','pack','dispatch','issue','settle','return']) s=act(s,action);
  assert.equal(s.stage,'returned'); assert.equal(s.stock,0); assert.equal(s.quarantine,1);
  assert.equal(s.sellerNet,-1000); assert.equal(s.platformActual,21300);
  assert.throws(()=>act(s,'return'));
});
test('failure before delivery routes via hub and preserves earned payout', () => {
  let s=createState('city');
  for(const action of ['receive','store','order','pack','fail','dispatch','issue','settle']) s=act(s,action);
  assert.equal(s.route,'hub'); assert.equal(s.stock,0); assert.equal(s.paidPVZ,3900);
  assert.equal(s.platformActual,17900);
});
