/** Five scenarios use the same production operations as the PVZ workspace. */
export const SCENARIOS=[
 {id:'city_order',name:'Городской заказ',subtitle:'M2: партия из 40 отправлений',route:'M2'},
 {id:'intercity_order',name:'Межгород',subtitle:'C2: магистраль остаётся в сети',route:'C2'},
 {id:'return_flow',name:'Возврат',subtitle:'Выдача, сторно, карантин',route:'M1'},
 {id:'route_failure',name:'Сбой логистики',subtitle:'Нет локального товара — нет ложного обхода',route:'blocked'},
 {id:'long_storage',name:'Длительное хранение',subtitle:'40 суток: граница выгоды Mesh',route:'C1'}
];

export function runScenario(manager,id) {
 const scenario=SCENARIOS.find(x=>x.id===id);if(!scenario)throw new Error('Сценарий не найден');
 manager.resetDemo();const s=manager.getState();
 let source='pvz-perm-plus',dest=source,quantity=2,days=10;
 const excludeStock=city=>{
   for(const p of s.pvzs.values())if(p.cityId===city && p.type==='mesh'){
     const removed=p.inventory.filter(i=>i.productId==='prod-1');
     p.inventory=p.inventory.filter(i=>i.productId!=='prod-1');
     p.occupiedCapacity-=removed.reduce((a,i)=>a+i.quantity*(i.units||1),0);
     s.eventLog.push({id:`fixture-${p.id}`,type:'SCENARIO_FIXTURE',pvzId:p.id,details:'Синтетический начальный запас SKU отсутствует'});
   }
 };
 if(id==='city_order') {dest='pvz-perm-krasnov';quantity=40;const p=s.pvzs.get(dest);const removed=p.inventory.filter(i=>i.productId==='prod-1');p.inventory=p.inventory.filter(i=>i.productId!=='prod-1');p.occupiedCapacity-=removed.reduce((a,i)=>a+i.quantity*(i.units||1),0);}
 if(id==='intercity_order') {dest='pvz-ekb-ural';excludeStock('ekaterinburg');}
 if(id==='route_failure') {dest='pvz-kazan-kremlin';excludeStock('kazan');}
 if(id==='long_storage') {days=40;manager.stepTime(40*24);}
 const o=manager.createOrder({productId:'prod-1',sourcePvzId:source,destinationPvzId:dest,quantity,storageDays:days});
 const steps=[];
 let route=manager.routeOrder(o.id);steps.push({action:'Маршрутизация',success:route.success,result:o.routeType});
 if(id==='route_failure') {
   if(o.reservation) {manager.mcs.inventoryManager.releaseReservation(o.reservation.batchId,o.quantity,o.id);o.reservation=null;}
   o.failedRouteTypes=['C2'];s.pvzs.get('pvz-perm-hub').status='down';
   route=manager.routeOrder(o.id);steps.push({action:'Сбой магистрального рейса: повторный расчёт',success:route.success,result:o.routeType});
 }else if(route.success){
   for(const action of ['receive','store','pack','dispatch','arrive','issue','settle']){
     const r=manager.processOrderAction(o.id,action);steps.push({action,success:r.success,result:r.newStatus || r.error});if(!r.success)break;
   }
   if(id==='return_flow'){const r=manager.processOrderAction(o.id,'return');steps.push({action:'Возврат в карантин',success:r.success,result:o.status});}
 }
 s.ui.selectedPvzId=dest;s.ui.selectedSellerId='seller-1';
 const result={scenarioId:id,name:scenario.name,orderId:o.id,route:o.routeType,steps,
   expectedRoute:scenario.route,passed:o.routeType===scenario.route && (id==='route_failure' ? !route.success : steps.every(x=>x.success)),
   stock:manager.mcs.inventoryManager.summary(dest,'prod-1')};
 s.lastDemo=result;manager.notify();return result;
}
