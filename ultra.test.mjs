import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createState, quote, scenario, restoreState } from './mesh.mjs';
import { evaluateForecast, sampleSeries } from './forecast.mjs';
const q=(x={})=>quote({...scenario('city'),...x});
const advance=(s,actions)=>actions.reduce((next,a)=>act(next,a),s);
test('boundary batch sizes reconcile in cents',()=>{
  assert.throws(()=>q({batch:0})); assert.throws(()=>q({batch:-1})); assert.throws(()=>q({batch:1.1})); assert.throws(()=>q({batch:'5'}));
  assert.throws(()=>q({days:100000000,storageDay:100000000}));
  for (const [batch,route,cost] of [[1,'hub',33300],[4,'hub',15300],[5,'mesh',14100],[8,'mesh',12300],[100,'mesh',9540]]) {
    const result=q({batch});assert.equal(result.route,route);assert.equal(result.mesh,cost);
  }
});
test('free dispatch is profitable by one cent, ties still choose hub',()=>{
  assert.equal(q({fixed:0,hubCost:8801}).route,'mesh');
  assert.equal(q({fixed:0,hubCost:8800}).route,'hub');
});
test('stress drivers are incremental and forecast shortfalls preserve hub',()=>{
  const stress=q({fuelRise:50,extraWaitHours:2,waitRate:1000,damageRate:5,damageCost:20000,cancelRate:25,shortfall:1});
  assert.equal(stress.effectiveBatch,5);assert.equal(stress.fixedAdjusted,32000);
  assert.equal(stress.expDamage,1000);assert.equal(stress.mesh,16700);assert.equal(stress.route,'hub');
  assert.equal(q({cancelRate:100}).mesh,null);
  assert.equal(q({shortfall:4}).route,'hub');
  assert.equal(q({extraWaitHours:18}).route,'hub');
  assert.throws(()=>q({cancelRate:101}));
});
test('fall back only within remaining SLA; otherwise preserve stock and accrue work',()=>{
  let s=advance(createState('city',{fallbackDelayHours:1}),['receive','store','order','pack','fail']);
  assert.equal(s.route,'blocked');assert.equal(s.etaHours,25);assert.equal(s.reserved,0);assert.equal(s.stock,1);
  assert.equal(s.platformActual,3900);assert.throws(()=>act(s,'dispatch'));
});
test('cancellation releases reserve and preserves incurred work without transport expense',()=>{
  const s=advance(createState('city'),['receive','store','order','pack','cancel']);
  assert.equal(s.stock,1);assert.equal(s.reserved,0);assert.equal(s.platformActual,3900);assert.equal(s.sellerNet,0);
  assert.throws(()=>act(s,'cancel'));
});
test('confirmed damage charges actual incremental loss once and quarantines товар',()=>{
  const s=advance(createState('city',{damageCost:20000}),['receive','store','order','pack','dispatch','damage']);
  assert.equal(s.quarantine,1);assert.equal(s.stock,0);assert.equal(s.platformActual,31300);
  assert.throws(()=>act(s,'damage'));assert.throws(()=>act(s,'issue'));
});
test('restart replays verified events and rejects injected or impossible history',()=>{
  const s=advance(createState('city'),['receive','store','order','pack','dispatch','issue','settle']);
  const saved={v:1,key:s.key,input:s.input,events:s.events};
  assert.deepEqual(restoreState(saved),s);
  assert.throws(()=>restoreState({...saved,events:[...saved.events,'settle']}));
  assert.throws(()=>restoreState({...saved,v:99}));assert.throws(()=>restoreState({...saved,input:{...saved.input,extra:1}}));
});
test('forecast evaluates chronological holdout and reports baseline plus downside',()=>{
  const rows=sampleSeries();const result=evaluateForecast(rows);
  assert.equal(result.n,28);assert.equal(result.trainN,56);assert.ok(result.mae.seasonal<result.mae.naive);
  assert.ok(result.next.low<=result.next.point);assert.ok(result.coverage>=0&&result.coverage<=1);
  assert.throws(()=>evaluateForecast(rows.slice(0,28)));
});
