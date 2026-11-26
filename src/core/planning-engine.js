import {DemandForecast} from './forecast-engine.js';
import {InventoryManager} from './inventory-engine.js';
import {CostEngine} from './cost-engine.js';
import {auditEvent} from './stock-audit.js';

const profiles={perm:{clothing:1.3,home:1.1,electronics:1,beauty:.85},ekaterinburg:{electronics:1.3,home:1,clothing:.9,beauty:.9},kazan:{beauty:1.3,home:.9,clothing:1,electronics:.9}};
export function localHistory(state,productId,nodeId){
 const product=state.products.get(productId),node=state.pvzs.get(nodeId);
 const factor=profiles[node?.cityId]?.[product?.category] ?? 1;
 const count=[...state.pvzs.values()].filter(p=>p.type==='mesh'&&p.cityId===node.cityId).length || 1;
 return (state.salesHistory.get(productId)||[]).map((v,i)=>Math.max(0,Math.round(v*factor/count)));
}
export function demandIndices(state){
 const cities=[...state.cities.keys()],categories=[...new Set([...state.products.values()].map(p=>p.category))],totals={};
 for(const city of cities)for(const category of categories){
  const nodes=[...state.pvzs.values()].filter(p=>p.type==='mesh'&&p.cityId===city);
  totals[`${city}|${category}`]=[...state.products.values()].filter(p=>p.category===category).reduce((sum,p)=>sum+nodes.reduce((a,n)=>a+localHistory(state,p.id,n.id).slice(-28).reduce((a,b)=>a+b,0),0),0);
 }
 const grand=Object.values(totals).reduce((a,b)=>a+b,0),result=[];
 for(const city of cities){const cityTotal=categories.reduce((a,c)=>a+totals[`${city}|${c}`],0);
  for(const category of categories){const networkCategory=cities.reduce((a,c)=>a+totals[`${c}|${category}`],0);
   result.push({city,category,sales:totals[`${city}|${category}`],index:cityTotal&&networkCategory?totals[`${city}|${category}`]/cityTotal/(networkCategory/grand):null});
  }
 }
 return result;
}
export function transportOptions(trips,from,to,quantity,now=10){
 return (trips||[]).map(t=>({...t,departureTime:t.recurring&&t.booked===0&&t.departureTime<now?t.departureTime+Math.ceil((now-t.departureTime)/24)*24:t.departureTime})).filter(t=>t.status==='planned'&&t.departureTime>=now&&t.departureTime-now<=24&&t.nodes.indexOf(from)>=0&&t.nodes.indexOf(to,t.nodes.indexOf(from)+1)>t.nodes.indexOf(from)&&t.capacity-t.booked>=quantity)
 .map(t=>({id:t.id,kind:t.kind,departureTime:t.departureTime,capacity:t.capacity-t.booked,
  cost:t.additionalFixed+t.additionalPerUnit*quantity,perUnit:Math.ceil((t.additionalFixed+t.additionalPerUnit*quantity)/quantity),
  formula:`${t.additionalFixed} + ${t.additionalPerUnit} × ${quantity} коп. Дополнительные обработка, время и отклонение; базовый рейс не считается бесплатной машиной.`}));
}
export function buildTransferPlan(state){
 const inventory=new InventoryManager(state.pvzs),plans=[];
 for(const product of [...state.products.values()].filter(p=>p.meshEligible!==false))for(const city of state.cities.values()){
  const nodes=[...state.pvzs.values()].filter(p=>p.type==='mesh'&&p.cityId===city.id&&p.status==='active');
  const needs=nodes.map(p=>{const stock=inventory.summary(p.id,product.id);return {p,stock,...DemandForecast.recommend(localHistory(state,product.id,p.id),stock.available,stock.inTransit,p.capacity)};});
  for(const recv of needs.filter(n=>n.deficit>0))for(const donor of needs.filter(n=>n.surplus>0&&n.p.id!==recv.p.id)){
   const free=recv.p.capacity-recv.p.occupiedCapacity-(recv.p.incoming||[]).reduce((a,i)=>a+i.quantity*(i.units||1),0);
   const quantity=Math.floor(Math.min(recv.deficit,donor.surplus,free/(product.units||1),state.tariffs.vehicleCapacity));if(quantity<1)continue;
   const options=transportOptions(state.scheduledTrips,donor.p.id,recv.p.id,quantity,state.virtualTime.currentTime);
   const trip=options.sort((a,b)=>a.cost-b.cost)[0];
   const standalone=new CostEngine(state.tariffs).calculateTripCost(quantity).total;
   const cost=trip?.cost ?? standalone;
   // Conservative: only transferred q units receive the avoidable last-mile saving, never the entire demand.
   const benefit=quantity*state.tariffs.classicLastMile-cost;
   plans.push({id:`plan-${product.id}-${donor.p.id}-${recv.p.id}`,productId:product.id,from:donor.p.id,to:recv.p.id,
    quantity,target:recv.target,deficit:recv.deficit,surplus:donor.surplus,lambda:recv.lambda,cost,benefit,tripId:trip?.id,
    available:benefit>0 && !!trip,reason:trip?'Подтверждённая будущая вместимость; сравнение с доставкой через хаб':'Нет подтверждённого попутного рейса: отдельный рейс проверяется, перемещение отложено'});
  }
 }
 return plans.sort((a,b)=>b.benefit-a.benefit);
}
export function scheduleTransfer(manager,planId){
 const s=manager.state;s.transfers ||= [];
 const old=s.transfers.find(t=>t.planId===planId&&t.status!=='cancelled');if(old)return {success:true,replayed:true,transfer:old};
 const p=buildTransferPlan(s).find(p=>p.id===planId);if(!p?.available)return {success:false,error:'План больше не допустим'};
 const trip=s.scheduledTrips.find(t=>t.id===p.tripId),batch=s.pvzs.get(p.from).inventory.find(i=>i.productId===p.productId&&InventoryManager.available(i)>=p.quantity);
 if(!batch)return {success:false,error:'Доступная партия изменилась'};
 const id=`move-${s.transfers.length+1}`,r=manager.mcs.inventoryManager.reserve(batch.batchId,p.quantity,id);if(!r.success)return r;
 trip.booked+=p.quantity;const t={...p,id,planId:p.id,batchId:batch.batchId,status:'planned',departureTime:trip.departureTime};s.transfers.push(t);
 auditEvent(s,{id:`${id}:reserve`,type:'TRANSFER_RESERVED',timestamp:s.virtualTime.currentTime,details:{...t}});manager.notify();return {success:true,transfer:t};
}
export function progressTransfer(manager,id){
 const s=manager.state,t=s.transfers?.find(t=>t.id===id);if(!t)return {success:false,error:'Перемещение не найдено'};
 if(t.status==='completed')return {success:true,replayed:true};
 if(t.status==='planned' && s.virtualTime.currentTime<t.departureTime)return {success:false,error:`Рейс отправляется в ${t.departureTime%24}:00. Продвиньте виртуальное время.`};
 let r;
 if(t.status==='planned'){r=manager.mcs.inventoryManager.transfer(t.from,t.to,t.batchId,t.quantity,t.id);if(r.success)t.status='in_transit';}
 else {r=manager.mcs.inventoryManager.arrive(t.to,t.id,s.virtualTime.currentTime);if(r.success){manager.mcs.inventoryManager.releaseReservation(r.batchId,t.quantity,t.id);t.status='completed';s.ledger.push({id:`${t.id}:cost`,type:'network_transfer',wbCost:t.cost,sellerAmount:0});}}
 if(r.success){auditEvent(s,{id:`${id}:${t.status}`,type:`TRANSFER_${t.status.toUpperCase()}`,timestamp:s.virtualTime.currentTime,details:{id,quantity:t.quantity,from:t.from,to:t.to,cost:t.cost}});manager.notify();}
 return r;
}
