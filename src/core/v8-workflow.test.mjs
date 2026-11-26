import test from 'node:test';
import assert from 'node:assert/strict';
import {StateManager} from './app-state.js';
import {InventoryManager, CostEngine, DemandForecast} from './mcs-engine.js';

function order(m, params={}) {return m.createOrder({productId:'prod-1',quantity:2,sourcePvzId:'pvz-perm-plus',destinationPvzId:'pvz-perm-plus',...params});}
function complete(m,o) {for(const a of ['receive','store','pack','dispatch','arrive','issue','settle']) assert.ok(m.processOrderAction(o.id,a).success,a);}

test('Сквозной M1: резерв не уменьшает физический запас, выдача уменьшает',()=>{
 const m=new StateManager(),i=m.mcs.inventoryManager,before=i.summary('pvz-perm-plus','prod-1');
 const o=order(m);assert.ok(m.routeOrder(o.id).success);
 const r=i.summary('pvz-perm-plus','prod-1');assert.equal(r.physical,before.physical);assert.equal(r.available,before.available-2);assert.equal(r.reserved,2);
 complete(m,o);const after=i.summary('pvz-perm-plus','prod-1');assert.equal(after.physical,before.physical-2);assert.equal(after.reserved,0);assert.equal(m.state.ledger.length,1);
});
test('Повторная выдача и начисление не списывают товар и деньги повторно',()=>{
 const m=new StateManager(),o=order(m);complete(m,o);const before=m.exportState();m.processOrderAction(o.id,'issue');m.processOrderAction(o.id,'settle');assert.equal(m.exportState(),before);
});
test('Возврат и повторный возврат: только карантин и одно сторно',()=>{
 const m=new StateManager(),o=order(m);complete(m,o);assert.ok(m.processOrderAction(o.id,'return').success);const before=m.exportState();m.processOrderAction(o.id,'return');assert.equal(m.exportState(),before);
 const stock=m.mcs.inventoryManager.summary(o.destinationPvzId,o.productId);assert.equal(stock.quarantine,2);assert.equal(m.state.ledger.filter(x=>x.type==='reversal').length,1);
 assert.equal(m.mcs.inventoryManager.resolveQuarantine(`return-${o.id}`,'resell').success,false);
 assert.ok(m.mcs.inventoryManager.resolveQuarantine(`return-${o.id}`,'resell',{fit:true}).success);
});
test('M2: груз в пути не считается физическим остатком получателя',()=>{
 const m=new StateManager();m.state.pvzs.get('pvz-perm-krasnov').inventory=m.state.pvzs.get('pvz-perm-krasnov').inventory.filter(x=>x.productId!=='prod-1');m.state.pvzs.get('pvz-perm-krasnov').occupiedCapacity=180;
 const o=order(m,{quantity:40,destinationPvzId:'pvz-perm-krasnov'});assert.ok(m.routeOrder(o.id).success);assert.equal(o.routeType,'M2');
 for(const a of ['receive','store','pack','dispatch'])assert.ok(m.processOrderAction(o.id,a).success);
 const s=m.mcs.inventoryManager.summary(o.destinationPvzId,o.productId);assert.equal(s.physical,0);assert.equal(s.inTransit,40);
 assert.ok(m.processOrderAction(o.id,'arrive').success);assert.equal(m.mcs.inventoryManager.summary(o.destinationPvzId,o.productId).physical,40);
});
test('Межгород без локального товара остаётся C2',()=>{
 const m=new StateManager();for(const p of m.state.pvzs.values())if(p.cityId==='ekaterinburg') {p.inventory=[];p.occupiedCapacity=0;}
 const o=order(m,{destinationPvzId:'pvz-ekb-ural'});assert.ok(m.routeOrder(o.id).success);assert.equal(o.routeType,'C2');assert.equal(o.routeEta,60);
});
test('Все маршруты недоступны: заказ не выдаётся с фиктивным успехом',()=>{
 const m=new StateManager();for(const p of m.state.pvzs.values())p.status='down';const o=order(m);
 assert.equal(m.routeOrder(o.id).success,false);assert.equal(o.routeType,'blocked');assert.equal(m.processOrderAction(o.id,'receive').success,false);
});
test('Отмена освобождает резерв без прироста физического товара',()=>{
 const m=new StateManager(),o=order(m);m.routeOrder(o.id);const i=m.mcs.inventoryManager,before=i.summary(o.sourcePvzId,o.productId);m.processOrderAction(o.id,'cancel');const after=i.summary(o.sourcePvzId,o.productId);assert.equal(after.physical,before.physical);assert.equal(after.reserved,0);
});
test('Перезапуск через экспорт/импорт сохраняет резерв и запрет двойного начисления',()=>{
 const m=new StateManager(),o=order(m);complete(m,o);const n=new StateManager();n.importState(m.exportState());const before=n.exportState();n.processOrderAction(o.id,'settle');assert.equal(n.exportState(),before);
});
test('Сброс очищает начисления и восстанавливает воспроизводимый спрос',()=>{
 const m=new StateManager(),history=JSON.stringify([...m.state.salesHistory]);const o=order(m);complete(m,o);m.resetDemo();assert.equal(m.state.ledger.length,0);assert.equal(m.state.orders.size,0);assert.equal(JSON.stringify([...m.state.salesHistory]),history);
});
test('Транспортный порог 30 и полная цепочка 26 различаются',()=>{
 const e=new CostEngine();assert.equal(e.calculateTransportThreshold(),30);assert.equal(e.calculateBreakEvenThreshold(),26);
 assert.equal(e.calculateTripCost(30).total,2400*30);assert.ok(e.calculateTripCost(31).total<2400*31);
});
test('Хранение: границы 14/15/30/31 суток',()=>{
 const e=new CostEngine();assert.deepEqual([14,15,30,31].map(d=>e.calculateStorageCost(d).total),[1400,1550,3800,4050]);
});
test('Четыре стороны контрольного примера и M1/C2',()=>{
 const e=new CostEngine(),m=e.calculateOrder();assert.equal(m.total,9296);assert.equal(m.savings,704);assert.equal(m.wb.margin,1604);assert.equal(m.pvz.result,650);assert.equal(m.seller.after-m.seller.before,300);
 assert.equal(e.calculateOrder({route:'M1'}).total,6696);assert.equal(e.calculateOrder({route:'C2'}).total,12800);
 assert.ok(Object.values(m.guards).every(Boolean));
});
test('Малый рейс и длительное хранение честно убыточны',()=>{
 const e=new CostEngine();assert.ok(e.calculateOrder({batchSize:10}).savings<0);assert.ok(e.calculateOrder({days:40}).savings<0);
});
test('Приёмка сверх вместимости и отрицательные операции атомарно отклоняются',()=>{
 const m=new StateManager(),p=m.state.pvzs.get('pvz-perm-plus');const before=JSON.stringify(p);
 assert.equal(m.receiveSupply(p.id,'prod-1',10000).success,false);assert.equal(m.receiveSupply(p.id,'prod-1',-1).success,false);assert.equal(JSON.stringify(p),before);
});
test('Сезонный прогноз проверяется по каждому дню, а не одним числом',()=>{
 const h=Array.from({length:70},(_,i)=>[2,4,6,8,10,12,14][i%7]);const r=DemandForecast.evaluate(h,14);assert.equal(r.seasonalNaive.mae,0);assert.equal(r.seasonalNaive.wape,0);
});
test('В прогнозе есть наивный baseline и воспроизводимая проверочная выборка',()=>{
 const h=Array.from({length:70},(_,i)=>i%7+1);const r=DemandForecast.evaluate(h,14);assert.ok(r.naive);assert.equal(r.naive.actuals.length,14);assert.equal(r.naive.predictions.length,14);
});
