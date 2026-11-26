/** Physical stock never changes on reservation. Transit is separate from shelf stock. */
export class InventoryManager {
  constructor(pvzs) { this.pvzs = pvzs; }
  getItem(batchId) {
    for (const pvz of this.pvzs.values()) {
      const item = pvz.inventory?.find(i => i.batchId === batchId);
      if (item) return {item,pvz};
    }
    return null;
  }
  static validQuantity(q) { return Number.isSafeInteger(q) && q > 0; }
  static reserved(item) { return Object.values(item.reservations || {}).reduce((a,b) => a+b,0); }
  static available(item) { return item.status === 'available' ? item.quantity - this.reserved(item) : 0; }
  summary(pvzId, productId) {
    const p = this.pvzs.get(pvzId);
    const s = {physical:0,available:0,reserved:0,quarantine:0,damaged:0,inTransit:0};
    for (const i of p?.inventory || []) {
      if (productId && i.productId !== productId) continue;
      s.physical += i.quantity;
      s.available += InventoryManager.available(i);
      s.reserved += InventoryManager.reserved(i);
      if(i.status==='quarantine') s.quarantine+=i.quantity;
      if(i.status==='damaged') s.damaged+=i.quantity;
    }
    for (const i of p?.incoming || []) if(!productId || i.productId===productId) s.inTransit+=i.quantity;
    s.network = s.physical+s.inTransit;
    return s;
  }
  reserve(batchId,quantity,orderId) {
    const f=this.getItem(batchId);
    if(!f) return {success:false,error:'Batch not found'};
    if(!InventoryManager.validQuantity(quantity) || !orderId) return {success:false,error:'Некорректный резерв'};
    f.item.reservations ||= {};
    if(f.item.reservations[orderId]===quantity) return {success:true,replayed:true};
    if(f.item.reservations[orderId]) return {success:false,error:'Заказ уже зарезервирован'};
    if(InventoryManager.available(f.item)<quantity) return {success:false,error:'Insufficient quantity'};
    f.item.reservations[orderId]=quantity;
    return {success:true};
  }
  releaseReservation(batchId,quantity,orderId) {
    const f=this.getItem(batchId);
    if(!f) return {success:false,error:'Batch not found'};
    const ids=Object.keys(f.item.reservations || {});
    const id=orderId || (ids.length===1 ? ids[0] : null);
    if(!id || f.item.reservations[id]!==quantity) return {success:false,error:'Резерв не найден'};
    delete f.item.reservations[id];
    return {success:true};
  }
  receive(pvzId,productId,quantity,batchId,options={}) {
    const p=this.pvzs.get(pvzId);
    if(!p) return {success:false,error:'ПВЗ не найден'};
    if(!InventoryManager.validQuantity(quantity)) return {success:false,error:'Количество должно быть положительным целым'};
    const old=p.inventory?.find(i=>i.batchId===batchId);
    if(old) return old.productId===productId && old.originalQuantity===quantity ? {success:true,replayed:true} : {success:false,error:'Партия уже существует'};
    if(this.getItem(batchId))return {success:false,error:'Номер партии уже используется в другом узле'};
    const units=options.units || 1;
    const incoming=(p.incoming || []).reduce((a,i)=>a+i.quantity*(i.units || 1),0);
    if(p.occupiedCapacity+incoming+quantity*units>p.capacity) return {success:false,error:'Превышена вместимость ПВЗ'};
    p.inventory ||= [];
    p.inventory.push({id:batchId,batchId,productId,quantity,originalQuantity:quantity,units,
      receivedAt:options.time || 0,daysStored:0,status:options.status || 'available',reservations:{}});
    p.occupiedCapacity+=quantity*units;
    return {success:true};
  }
  issue(batchId,quantity,orderId) {
    const f=this.getItem(batchId);
    if(!f || f.item.reservations?.[orderId]!==quantity) return {success:false,error:'Нет подтверждённого резерва'};
    f.item.quantity-=quantity; delete f.item.reservations[orderId];
    f.pvz.occupiedCapacity-=quantity*(f.item.units || 1);
    return {success:true};
  }
  transfer(fromPvzId,toPvzId,batchId,quantity,orderId=`transfer-${batchId}`,options={}) {
    const f=this.getItem(batchId), to=this.pvzs.get(toPvzId);
    if(!f || f.pvz.id!==fromPvzId || !to || fromPvzId===toPvzId) return {success:false,error:'Некорректное направление'};
    if(to.incoming?.some(i=>i.orderId===orderId)) return {success:true,replayed:true};
    const units=f.item.units || 1;
    const incoming=(to.incoming || []).reduce((a,i)=>a+i.quantity*(i.units || 1),0);
    if(!InventoryManager.validQuantity(quantity) || to.occupiedCapacity+incoming+quantity*units>to.capacity) return {success:false,error:'Превышена вместимость'};
    const reservationId=options.reservationId || orderId;
    if(options.withdrawal && f.item.withdrawalRequired && f.item.status==='quarantine' && InventoryManager.reserved(f.item)===0 && f.item.quantity>=quantity){
      f.item.quantity-=quantity;f.pvz.occupiedCapacity-=quantity*units;
    }else{
    if(f.item.reservations?.[reservationId]!==quantity) {
      const result=this.reserve(batchId,quantity,reservationId); if(!result.success) return result;
    }
    const result=this.issue(batchId,quantity,reservationId); if(!result.success) return result;
    }
    to.incoming ||= [];
    to.incoming.push({orderId,batchId:`transit-${orderId}`,productId:f.item.productId,quantity,units,fromPvzId,status:options.withdrawal?'quarantine':'available'});
    return {success:true};
  }
  arrive(pvzId,orderId,time=0) {
    const p=this.pvzs.get(pvzId), i=p?.incoming?.find(i=>i.orderId===orderId);
    if(!i) return {success:false,error:'Груз в пути не найден'};
    p.incoming=p.incoming.filter(x=>x!==i);
    const r=this.receive(pvzId,i.productId,i.quantity,i.batchId,{units:i.units,time,status:i.status});
    if(!r.success) {p.incoming.push(i);return r;}
    if(i.status!=='quarantine')this.reserve(i.batchId,i.quantity,orderId);
    return {success:true,batchId:i.batchId};
  }
  processReturn(pvzId,batchId,quantity,reason,productId,units=1) {
    return this.receive(pvzId,productId || this.getItem(batchId)?.item.productId || batchId,quantity,`return-${batchId}`,{status:'quarantine',units});
  }
  resolveQuarantine(batchId,resolution,inspection={}) {
    const f=this.getItem(batchId);
    if(!f || f.item.status!=='quarantine') return {success:false,error:'Карантин не найден'};
    if(resolution==='resell' && (inspection.fit!==true || f.item.withdrawalRequired)) return {success:false,error:'Нужна пригодность; неликвид направляется на хаб'};
    if(resolution==='resell') f.item.status='available';
    else if(resolution==='damaged') f.item.status='damaged';
    else if(resolution==='writeoff') {f.pvz.occupiedCapacity-=f.item.quantity*(f.item.units || 1);f.item.quantity=0;f.item.status='damaged';}
    else return {success:false,error:'Неизвестное решение'};
    return {success:true};
  }
  ageBatches(hours) {
    if(!Number.isFinite(hours) || hours<0) throw new RangeError('Некорректное время');
    for(const p of this.pvzs.values()) for(const i of [...(p.inventory || [])]) {
      i.daysStored=(i.daysStored || 0)+hours/24;
      if(i.status==='available' && i.daysStored>60) {
        const reserved=InventoryManager.reserved(i),expired=i.quantity-reserved;
        if(expired<=0)continue;
        if(reserved){i.quantity=reserved;p.inventory.push({...i,id:`expired-${i.batchId}`,batchId:`expired-${i.batchId}`,quantity:expired,reservations:{},status:'quarantine',withdrawalRequired:true});}
        else {i.withdrawalRequired=true;i.status='quarantine';}
      }
    }
  }
}
