import { DEFAULT_TARIFFS } from './types.js';
import { CostEngine } from './cost-engine.js';
import { InventoryManager } from './inventory-engine.js';

function fifoStock(node,order){
 let remaining=order.quantity;const allocations=[];
 for(const i of (node.inventory || []).filter(i=>i.productId===order.productId&&i.status==='available').sort((a,b)=>(a.receivedAt||0)-(b.receivedAt||0))){
  const n=Math.min(remaining,InventoryManager.available(i));if(n>0){allocations.push({batchId:i.batchId,quantity:n});remaining-=n;}if(!remaining)break;
 }
 if(remaining)return null;
 return {batchId:allocations[0].batchId,allocations,daysStored:Math.max(...allocations.map(a=>node.inventory.find(i=>i.batchId===a.batchId).daysStored || 0))};
}

export class RouteOptimizer {
  constructor(tariffs=DEFAULT_TARIFFS) {this.tariffs={...DEFAULT_TARIFFS,...tariffs};this.costEngine=new CostEngine(this.tariffs);}
  findCandidates(order,pvzs,cities) {
    const source=pvzs.get(order.sourcePvzId), dest=pvzs.get(order.destinationPvzId);
    if(!source || !dest || !InventoryManager.validQuantity(order.quantity)) return [];
    const intercity=source.cityId!==dest.cityId;
    const candidates=[];
    const locals=[...pvzs.values()].filter(p=>p.cityId===dest.cityId && p.type==='mesh');
    for(const node of locals) {
      const type=node.id===dest.id ? 'M1' : 'M2';
      const stock=fifoStock(node,order);
      // Keep rejected candidates visible, including absence of local stock for C2 orders.
      const c=this.build(type,order,node,dest,stock);
      if(!stock) this.reject(c,'NO_STOCK','Нет подтверждённого доступного товара');
      if(order.mcsAvailable===false)this.reject(c,'MCS_UNAVAILABLE','MCS недоступна: используется классика');
      if(order.meshEligible===false || order.size==='large' || order.returnRate>.35 || (stock?.daysStored || 0)>21) this.reject(c,'NOT_ELIGIBLE','Товар не подходит для Mesh');
      candidates.push(c);
    }
    const srcHub=pvzs.get(cities.get(source.cityId)?.hubId), dstHub=pvzs.get(cities.get(dest.cityId)?.hubId);
    const stock=fifoStock(source,order);
    const classic=this.build(intercity?'C2':'C1',order,source,dest,stock);
    if(!srcHub || (intercity && !dstHub) || srcHub?.status==='down' || dstHub?.status==='down') this.reject(classic,'NODE_DOWN','Хаб недоступен');
    if(!stock) this.reject(classic,'NO_STOCK','В источнике нет товара');
    candidates.push(classic);
    return candidates;
  }
  build(type,order,source,dest,stock) {
    const t=this.tariffs, days=order.storageDays ?? 10;
    const economics=this.costEngine.calculateOrder({route:type,batchSize:order.quantity,days,
      stops:order.stops ?? 1,waitMinutes:order.waitMinutes ?? 0,price:order.price ?? 100000,
      purchaseCost:order.purchaseCost ?? 60000,commissionRate:order.commissionRate ?? .15,
      promisedHours:order.promisedHours ?? t.slaHours,returnRate:order.returnRate ?? t.returnRate});
    const c={type,totalCost:economics.total*order.quantity,unitCost:economics.total,
      sourcePvzId:source.id,destinationPvzId:dest.id,batchId:stock?.batchId,batches:stock?.allocations,
      etaHours:economics.etaHours,stops:type==='M1'?0:order.stops ?? 1,waitMinutes:order.waitMinutes ?? 0,
      vehicleLoad:type==='M1'?0:order.quantity/t.vehicleCapacity,
      pvzLoad:dest.occupiedCapacity/dest.capacity,pvzReward:economics.pvz.revenue*order.quantity,
      marketplaceEconomics:{classicCost:economics.classic.total*order.quantity,meshCost:economics.total*order.quantity,savings:economics.savings*order.quantity},
      economics,constraints:[],rejectionReasons:[],available:true,selected:false,
      formulaBreakdown:economics.breakdown};
    if(source.status==='down' || dest.status==='down' || (['M1','M2'].includes(type) && (source.status==='paused' || dest.status==='paused'))) this.reject(c,'NODE_DOWN','Узел недоступен или Mesh приостановлен');
    const units=order.units || 1;
    const inTransit=(dest.incoming || []).reduce((a,i)=>a+i.quantity*(i.units || 1),0);
    if(source.id!==dest.id && dest.occupiedCapacity+inTransit+order.quantity*units>dest.capacity) this.reject(c,'capacity_exceeded','ПВЗ переполнен');
    if(type==='M2' && order.quantity>t.vehicleCapacity) this.reject(c,'RUN_FULL','Перегруз транспорта');
    if(type==='M2' && (c.stops>4 || c.waitMinutes>10)) this.reject(c,'CUTOFF','Превышен лимит остановок или ожидания курьера');
    if(['M1','M2'].includes(type)) {
      for(const [guard,ok] of Object.entries(economics.guards)) if(!ok) this.reject(c,guard==='buyer'?'BUYER_GUARD':'NOT_PROFITABLE',`Условие выгоды не выполнено: ${{wb:'Wildberries',pvz:'ПВЗ',seller:'продавец',buyer:'покупатель'}[guard]}`);
      const hour=(order.currentTime ?? 10)%24;
      if(type==='M2' && (hour<9 || hour>=18)) this.reject(c,'PEAK','Рейс вне окна приёмки 09:00–17:00');
      if(dest.operationalSlots<=0 || source.operationalSlots<=0) this.reject(c,'NO_SLOTS','Нет операционных слотов');
    }
    if(c.etaHours>(order.promisedHours ?? t.slaHours)) this.reject(c,'BUYER_GUARD','Обещанный срок недостижим');
    if(order.failedRouteTypes?.includes(type)) this.reject(c,'ROUTE_DOWN','Рейс недоступен');
    return c;
  }
  reject(c,code,reason) {c.available=false;c.constraints.push(code);c.rejectionReasons.push(reason);}
  selectRoute(candidates) {
    candidates.forEach(c=>c.selected=false);
    const selected=candidates.filter(c=>c.available).sort((a,b)=>a.totalCost-b.totalCost || a.etaHours-b.etaHours)[0] || null;
    if(selected) selected.selected=true;
    return selected;
  }
}
