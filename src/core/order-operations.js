import { generateId } from './types.js';
import { InventoryManager } from './inventory-engine.js';
import { CostEngine } from './cost-engine.js';
import {auditEvent} from './stock-audit.js';

const fail = error => ({success:false,error});
function event(manager,order,type,details={}) {
  const entry={id:`${order.id}:${type}:${order.events.length}`,orderId:order.id,type,timestamp:manager.state.virtualTime.currentTime,details};
  order.events.push(entry);auditEvent(manager.state,entry);
}

export const orderOperations = {
  createOrder(params) {
    const {productId,quantity,destinationPvzId}=params;
    const product=this.state.products.get(productId), dest=this.state.pvzs.get(destinationPvzId);
    if(!product || !dest || !InventoryManager.validQuantity(quantity)) throw new RangeError('Выберите существующий товар, ПВЗ и положительное целое количество');
    const source=params.sourcePvzId || dest.id;
    if(!this.state.pvzs.has(source)) throw new RangeError('Источник не найден');
    const order={...params,id:generateId('order'),productId,quantity,sourcePvzId:source,destinationPvzId,
      sellerId:product.sellerId,status:'new',createdAt:this.state.virtualTime.currentTime,storageDays:params.storageDays ?? 10,
      promisedHours:params.promisedHours ?? 60,events:[],completedActions:{}};
    this.state.orders.set(order.id,order);event(this,order,'created',{productId,quantity});this.notify();return order;
  },
  routeOrder(orderId) {
    const order=this.state.orders.get(orderId);if(!order) return fail('Заказ не найден');
    if(!['new','received','exception'].includes(order.status)) return fail('Нельзя менять маршрут после начала сборки');
    if(order.reservation) return {success:true,replayed:true,selected:order.decision?.selected};
    const product=this.state.products.get(order.productId), seller=this.state.sellers.get(order.sellerId);
    Object.assign(order,{price:product.price,purchaseCost:product.purchaseCost ?? Math.round(product.price*.6),
      commissionRate:seller?.commission ?? .15,meshEligible:product.meshEligible!==false,
      returnRate:product.returnRate,units:product.units || 1,currentTime:this.state.virtualTime.currentTime,mcsAvailable:this.state.mcsStatus!=='error'});
    const result=this.mcs.routeOrder(order);order.decision=result;
    this.state.mcsDecisionLog.push(this.mcs.audit.getDecisionLog().at(-1));
    if(!result.selected) {
      order.routeType='blocked';order.routeCost=null;order.routeEta=null;delete order.economics;order.failureReason=result.reason;event(this,order,'route_blocked',{reason:result.reason});this.notify();return fail(result.reason);
    }
    const selected=result.selected;
    const batches=selected.batches || [{batchId:selected.batchId,quantity:order.quantity}];
    const completed=[];
    for(const b of batches){const r=this.mcs.inventoryManager.reserve(b.batchId,b.quantity,order.id);if(!r.success){for(const prev of completed)this.mcs.inventoryManager.releaseReservation(prev.batchId,prev.quantity,order.id);return r;}completed.push(b);}
    order.reservation={batchId:selected.batchId,batches,pvzId:selected.sourcePvzId};
    Object.assign(order,{sourcePvzId:selected.sourcePvzId,routeType:selected.type,routeCost:selected.totalCost,
      routeEta:selected.etaHours,classicCost:selected.marketplaceEconomics.classicCost,pvzReward:selected.pvzReward,
      economics:selected.economics});
    event(this,order,'reserved',{...order.reservation,quantity:order.quantity});
    event(this,order,'routed',{routeType:order.routeType,cost:order.routeCost,reason:result.reason});
    this.notify();return {success:true,...result};
  },
  processOrderAction(orderId,action) {
    const o=this.state.orders.get(orderId);if(!o) return fail('Заказ не найден');
    o.completedActions ||= {};
    if(o.completedActions[action]) return {success:true,replayed:true,newStatus:o.status};
    const transitions={new:{receive:'received',cancel:'cancelled'},received:{store:'stored',cancel:'cancelled'},
      stored:{pack:'packed',cancel:'cancelled'},ordered:{pack:'packed',cancel:'cancelled'},
      packed:{dispatch:'in_transit',cancel:'cancelled'},in_transit:{arrive:'dispatched',exception:'exception'},
      dispatched:{issue:'issued'},issued:{settle:'settled',return:'returned'},settled:{return:'returned'}};
    const next=transitions[o.status]?.[action];if(!next) return fail('Действие недоступно для текущего статуса');
    const inventory=this.mcs.inventoryManager;
    if(action==='receive' && !o.reservation) {const r=this.routeOrder(o.id);if(!r.success) return r;}
    if(action==='dispatch') {
      if(!o.reservation || o.routeType==='blocked') return fail('Нет подтверждённого маршрута и резерва');
      const dest=this.state.pvzs.get(o.destinationPvzId);
      if(dest.status==='down' || this.state.pvzs.get(o.sourcePvzId)?.status==='down') return fail('Узел недоступен: требуется пересчёт маршрута');
      const elapsed=this.state.virtualTime.currentTime-o.createdAt;
      if(elapsed+o.routeEta>o.promisedHours)return fail('Обещанный срок недостижим: пересчитайте заказ');
      const hour=this.state.virtualTime.currentTime%24;
      if(o.routeType==='M2'&&(hour<9||hour>=18))return fail('Рейс вне окна 09:00–17:00');
      if(o.sourcePvzId!==o.destinationPvzId) {
        for(const [i,b]of o.reservation.batches.entries()){
          const r=inventory.transfer(o.sourcePvzId,o.destinationPvzId,b.batchId,b.quantity,`${o.id}:part:${i}`,{reservationId:o.id});if(!r.success)return r;
        }
      }
    }
    if(action==='arrive' && o.sourcePvzId!==o.destinationPvzId) {
      const batches=[];
      for(const [i,b]of o.reservation.batches.entries()){
        const key=`${o.id}:part:${i}`,r=inventory.arrive(o.destinationPvzId,key,this.state.virtualTime.currentTime);if(!r.success)return r;
        batches.push({batchId:r.batchId,quantity:b.quantity,reservationKey:key});
      }
      o.reservation={batchId:batches[0].batchId,batches,pvzId:o.destinationPvzId};
    }
    if(action==='issue') {for(const b of o.reservation?.batches || []){const r=inventory.issue(b.batchId,b.quantity,b.reservationKey || o.id);if(!r.success)return r;}o.reservation=null;}
    if(action==='cancel' && o.reservation) {for(const b of o.reservation.batches)inventory.releaseReservation(b.batchId,b.quantity,b.reservationKey || o.id);o.reservation=null;}
    if(action==='return') {const r=this.processReturn(o);if(!r.success)return r;}
    o.status=next;o.completedActions[action]=true;event(this,o,action,{status:next});
    if(action==='settle')this.recordFinancialSnapshot(o);
    this.notify();return {success:true,newStatus:next};
  },
  processReturn(order) {
    if(order.returned) return {success:true,replayed:true};
    if(!['issued','settled'].includes(order.status)) return fail('Возврат разрешён после выдачи');
    const r=this.mcs.inventoryManager.processReturn(order.destinationPvzId,order.id,order.quantity,'customer',order.productId,order.units || 1);
    if(!r.success)return r;
    order.returned=true;order.status='returned';
    event(this,order,'return_received',{quantity:order.quantity,status:'quarantine'});
    this.state.ledger ||= [];
    if(order.settled) {
      this.state.ledger.push({id:`${order.id}:reversal`,orderId:order.id,type:'reversal',sellerAmount:-order.economics.seller.after*order.quantity});
    }
    this.state.ledger.push({id:`${order.id}:return`,orderId:order.id,type:'return',pvzAmount:this.state.tariffs.returnInspection*order.quantity});
    this.notify();return {success:true};
  },
  recordFinancialSnapshot(order) {
    if(order.settled)return {success:true,replayed:true};
    order.settled=true;const e=order.economics,q=order.quantity,day=this.state.virtualTime.currentDay;
    this.state.ledger ||= [];
    this.state.ledger.push({id:`${order.id}:settle`,orderId:order.id,type:'settle',pvzAmount:e.pvz.revenue*q,pvzCost:e.pvz.cost*q,
      sellerAmount:e.seller.after*q,wbRevenue:e.wb.revenue*q,wbCost:e.total*q});
    let s=this.state.financialSnapshots.find(s=>s.day===day);
    if(!s) {s={day,ordersCount:0,revenue:0,meshCost:0,classicCost:0,savings:0,pvzMargin:0,pvzBreakdown:{}};this.state.financialSnapshots.push(s);}
    s.ordersCount++;s.revenue+=e.wb.revenue*q;s.meshCost+=e.total*q;s.classicCost+=order.classicCost;
    s.savings+=order.classicCost-order.routeCost;s.pvzMargin+=e.pvz.result*q;
    s.pvzBreakdown[order.destinationPvzId]=(s.pvzBreakdown[order.destinationPvzId] || 0)+e.pvz.result*q;
    return {success:true};
  },
  receiveSupply(pvzId,productId,quantity,batchId=generateId('supply')) {
    const product=this.state.products.get(productId);if(!product)return fail('Товар не найден');
    const pvz=this.state.pvzs.get(pvzId);
    const hour=this.state.virtualTime.currentTime%24;
    if(!pvz || pvz.status==='down' || pvz.status==='paused')return fail('ПВЗ недоступен');
    if(pvz.type==='mesh' && (hour<9 || hour>=18))return fail('Приёмка доступна с 09:00 до 17:00');
    const r=this.mcs.inventoryManager.receive(pvzId,productId,quantity,batchId,{units:product.units || 1,time:this.state.virtualTime.currentTime});
    if(r.success && !r.replayed) {auditEvent(this.state,{id:batchId,type:'RECEIVE',pvzId,productId,quantity,timestamp:this.state.virtualTime.currentTime});this.notify();}
    return r;
  }
};
