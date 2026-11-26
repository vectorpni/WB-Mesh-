import {transportOptions} from './planning-engine.js';
import {auditEvent} from './stock-audit.js';
export function createWithdrawalTasks(state){
 state.withdrawals ||= [];
 for(const p of state.pvzs.values()){
  if(p.type!=='mesh')continue;
  const hub=state.cities.get(p.cityId)?.hubId;
  for(const item of p.inventory)if(item.withdrawalRequired&&item.quantity>0&&!state.withdrawals.some(t=>t.batchId===item.batchId&&t.status!=='cancelled')){
   const quantity=Math.min(item.quantity,state.tariffs.vehicleCapacity);
   const trip=transportOptions(state.scheduledTrips,p.id,hub,quantity,state.virtualTime.currentTime).sort((a,b)=>a.cost-b.cost)[0];
   state.withdrawals.push({id:`withdraw-${state.withdrawals.length+1}`,from:p.id,to:hub,batchId:item.batchId,
    productId:item.productId,quantity,status:'planned',departureTime:trip?.departureTime ?? null,tripId:trip?.id,
    cost:trip?.cost ?? null,reason:'Предельный срок хранения 60 суток превышен; продажа заблокирована'});
  }
 }
}
export function progressWithdrawal(manager,id){
 const s=manager.state,t=s.withdrawals?.find(t=>t.id===id);if(!t)return {success:false,error:'Задание не найдено'};
 if(t.status==='completed')return {success:true,replayed:true};
 let r;
 if(t.status==='planned'){
  const trip=transportOptions(s.scheduledTrips,t.from,t.to,t.quantity,s.virtualTime.currentTime).find(x=>x.id===t.tripId);
  if(!trip)return {success:false,error:'Нет подтверждённого обратного рейса: требуется перепланирование'};
  if(s.virtualTime.currentTime<trip.departureTime)return {success:false,error:`Обратный рейс в ${trip.departureTime%24}:00; продвиньте виртуальное время`};
  r=manager.mcs.inventoryManager.transfer(t.from,t.to,t.batchId,t.quantity,t.id,{withdrawal:true});
  if(r.success){t.status='in_transit';s.scheduledTrips.find(x=>x.id===t.tripId).booked+=t.quantity;}
 }else{
  r=manager.mcs.inventoryManager.arrive(t.to,t.id,s.virtualTime.currentTime);
  if(r.success){t.status='completed';s.ledger.push({id:`${id}:cost`,type:'withdrawal',wbCost:t.cost,sellerAmount:0});}
 }
 if(r.success){auditEvent(s,{id:`${id}:${t.status}`,type:'EXPIRED_WITHDRAWAL',timestamp:s.virtualTime.currentTime,details:{...t}});manager.notify();}
 return r;
}
