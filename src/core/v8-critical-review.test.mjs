import test from 'node:test';
import assert from 'node:assert/strict';
import {StateManager} from './app-state.js';
import {InventoryManager} from './inventory-engine.js';
import {CostEngine} from './cost-engine.js';

const make=m=>m.createOrder({productId:'prod-1',quantity:2,sourcePvzId:'pvz-perm-plus',destinationPvzId:'pvz-perm-plus'});
test('Убыточная экономика сохраняет отрицательные потоки NPV, без обнуления потерь',()=>{
 const e=new CostEngine(),loss=e.calculateInvestment({unitSavings:-100});
 assert.ok(loss.benefits<0);assert.ok(loss.npv<e.calculateInvestment({unitSavings:0}).npv);
});
test('Возврат без локального спроса остаётся в карантине и получает задание вывоза',()=>{
 const m=new StateManager();m.mcs.inventoryManager.processReturn('pvz-perm-plus','no-demand',2,'customer','prod-1');
 m.state.salesHistory.set('prod-1',Array(60).fill(0));
 const r=m.resolveReturn('return-no-demand','resell',{fit:true});
 assert.ok(r.success);assert.equal(m.mcs.inventoryManager.getItem('return-no-demand').item.status,'quarantine');
 assert.ok(m.state.withdrawals.some(t=>t.batchId==='return-no-demand'));
});
test('Ревью P0: номер партии однозначен во всей сети',()=>{
 const m=new StateManager();assert.ok(m.receiveSupply('pvz-perm-plus','prod-1',2,'same-batch').success);
 assert.equal(m.receiveSupply('pvz-perm-krasnov','prod-1',2,'same-batch').success,false);
});
test('Ревью P0: отрицательный транзит не проходит импорт',()=>{
 const m=new StateManager(),before=m.exportState(),d=JSON.parse(before);d.pvzs[0][1].incoming=[{orderId:'bad',batchId:'bad',productId:'prod-1',quantity:-10,units:1}];
 assert.throws(()=>m.importState(JSON.stringify(d)));assert.equal(m.exportState(),before);
});
test('Ревью P0: старение резерва сохраняет баланс и журнал',()=>{
 const m=new StateManager(),o=make(m);m.routeOrder(o.id);m.stepTime(61*24);const q=m.mcs.inventoryManager.summary(o.sourcePvzId,o.productId);
 assert.equal(q.physical,q.available+q.reserved+q.quarantine+q.damaged);assert.ok(m.reconcile().success);
});
test('Ревью P1: перед отправкой повторно проверяются обещание и окно',()=>{
 const m=new StateManager();const p=m.state.pvzs.get('pvz-perm-krasnov');p.inventory=[];p.occupiedCapacity=0;
 const o=m.createOrder({productId:'prod-1',quantity:40,sourcePvzId:'pvz-perm-plus',destinationPvzId:p.id,promisedHours:6});
 for(const a of ['receive','store','pack'])assert.ok(m.processOrderAction(o.id,a).success);m.stepTime(10);
 assert.equal(m.processOrderAction(o.id,'dispatch').success,false);
});
test('Ревью P1: риск возврата SKU участвует в стоимости маршрута',()=>{
 const m=new StateManager(),o=make(m);m.routeOrder(o.id);
 assert.equal(o.economics.total,new CostEngine().calculateOrder({route:'M1',returnRate:.08}).total);
});
test('Ревью P1: FIFO собирает заказ из двух доступных партий',()=>{
 const m=new StateManager(),p=m.state.pvzs.get('pvz-perm-plus');p.inventory=p.inventory.filter(i=>i.productId!=='prod-1');p.occupiedCapacity=p.inventory.reduce((a,i)=>a+i.quantity*(i.units||1),0);
 assert.ok(m.receiveSupply(p.id,'prod-1',30,'split-a').success);assert.ok(m.receiveSupply(p.id,'prod-1',30,'split-b').success);
 const o=m.createOrder({productId:'prod-1',quantity:40,sourcePvzId:p.id,destinationPvzId:p.id});assert.ok(m.routeOrder(o.id).success);
 for(const a of ['receive','store','pack','dispatch','arrive','issue','settle'])assert.ok(m.processOrderAction(o.id,a).success,a);
 assert.equal(m.mcs.inventoryManager.summary(p.id,'prod-1').physical,20);
});
test('Ревью P1: сбой MCS оставляет C1, а не Mesh',()=>{
 const m=new StateManager();m.state.mcsStatus='error';const o=make(m);assert.ok(m.routeOrder(o.id).success);assert.equal(o.routeType,'C1');
});
test('Ревью P1: после 60 суток создаётся обязательное задание вывоза',()=>{
 const m=new StateManager();m.stepTime(61*24);assert.ok(m.state.withdrawals?.length>0);
 assert.ok(m.state.withdrawals.every(t=>t.status==='planned'&&t.to.includes('hub')));
});
