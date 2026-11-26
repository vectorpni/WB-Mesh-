import {DEFAULT_TARIFFS} from './types.js';
import {InventoryManager} from './inventory-engine.js';
export function validateTariffs(t){
 if(!t || t.schemaVersion!==8)throw new Error('Несовместимая версия тарифов, ожидается V8');
 for(const key of Object.keys(DEFAULT_TARIFFS))if(!Number.isFinite(t[key]) || t[key]<0)throw new Error(`Некорректный тариф: ${key}`);
 for(const key of ['returnRate','resaleShare','classicLossRate','meshLossRate'])if(t[key]>1)throw new Error(`Доля вне диапазона: ${key}`);
 if(!Number.isSafeInteger(t.vehicleCapacity)||t.vehicleCapacity<1)throw new Error('Некорректная вместимость транспорта');
}
export function validateState(data){
 for(const key of ['ledger','eventLog','transfers','withdrawals','financialSnapshots','mcsDecisionLog'])if(data[key]!==undefined&&!Array.isArray(data[key]))throw new Error(`Некорректный журнал: ${key}`);
 for(const key of ['cities','pvzs','products','sellers','orders','salesHistory']){
  if(!Array.isArray(data[key]) || data[key].some(v=>!Array.isArray(v)||v.length!==2||typeof v[0]!=='string'||!v[1]))throw new Error(`Некорректный раздел: ${key}`);
  if(new Set(data[key].map(x=>x[0])).size!==data[key].length)throw new Error(`Дубли ключей: ${key}`);
  if(data[key].some(v=>!/^[-\p{L}\p{N}_.:]+$/u.test(v[0])))throw new Error(`Некорректный идентификатор: ${key}`);
 }
 validateTariffs(data.tariffs);
 const products=new Map(data.products),pvzs=new Map(data.pvzs),batchIds=new Set();
 for(const p of products.values())if(!Number.isSafeInteger(p.units || 1)||(p.units || 1)<1||!Number.isFinite(p.price)||p.price<0)throw new Error('Некорректный товар');
 for(const [id,p]of pvzs){
  if(p.id!==id||!Number.isFinite(p.capacity)||p.capacity<0||!Number.isFinite(p.occupiedCapacity)||p.occupiedCapacity<0||p.occupiedCapacity>p.capacity||!Array.isArray(p.inventory))throw new Error('Некорректный узел или квота');
  let units=0;
  for(const item of p.inventory){
   if(typeof item.batchId!=='string'||!/^[-\p{L}\p{N}_.:]+$/u.test(item.batchId))throw new Error('Некорректный номер партии');
   if(batchIds.has(item.batchId))throw new Error('Повтор номера партии в сети');batchIds.add(item.batchId);
   if(!products.has(item.productId)||!Number.isSafeInteger(item.quantity)||item.quantity<0||!Number.isSafeInteger(item.units||1)||(item.units||1)<1||InventoryManager.reserved(item)>item.quantity||Object.values(item.reservations||{}).some(q=>!Number.isSafeInteger(q)||q<0))throw new Error('Некорректный остаток или резерв');
   units+=item.quantity*(item.units||1);
   if(!['available','quarantine','damaged'].includes(item.status) || (item.status!=='available'&&InventoryManager.reserved(item)>0))throw new Error('Несогласованный статус остатка');
  }
  if(units!==p.occupiedCapacity)throw new Error('Занятость не совпадает с физическим остатком');
  let incomingUnits=0;
  for(const item of p.incoming || []){
   if(!products.has(item.productId)||!InventoryManager.validQuantity(item.quantity)||!Number.isSafeInteger(item.units||1)||(item.units||1)<1||!item.batchId||batchIds.has(item.batchId))throw new Error('Некорректный транзит');
   batchIds.add(item.batchId);incomingUnits+=item.quantity*(item.units||1);
  }
  if(incomingUnits+p.occupiedCapacity>p.capacity)throw new Error('Транзит превышает квоту');
 }
 for(const [id,o]of data.orders)if(o.id!==id||!products.has(o.productId)||!pvzs.has(o.sourcePvzId)||!pvzs.has(o.destinationPvzId)||!InventoryManager.validQuantity(o.quantity))throw new Error('Некорректный заказ');
 if(!data.virtualTime || !Number.isFinite(data.virtualTime.currentTime)||data.virtualTime.currentTime<0)throw new Error('Некорректное виртуальное время');
 if(!data.ui||typeof data.ui!=='object'||!['dashboard','pvz','seller','mcs','economics','demo','settings'].includes(data.ui.activeTab))throw new Error('Некорректное состояние интерфейса');
 for(const [,h]of data.salesHistory)if(!Array.isArray(h)||h.some(x=>!Number.isFinite(x)||x<0))throw new Error('Некорректная история спроса');
 for(const t of data.scheduledTrips || [])if(!Number.isSafeInteger(t.capacity)||!Number.isSafeInteger(t.booked)||t.booked<0||t.capacity<t.booked||!Number.isFinite(t.departureTime)||!Number.isSafeInteger(t.additionalFixed)||t.additionalFixed<0||!Number.isSafeInteger(t.additionalPerUnit)||t.additionalPerUnit<0||!Array.isArray(t.nodes)||t.nodes.some(id=>!pvzs.has(id)))throw new Error('Некорректный рейс');
 if(new Set((data.ledger||[]).map(l=>l.id)).size!==(data.ledger||[]).length)throw new Error('Повторное начисление в журнале');
 for(const l of data.ledger || [])for(const key of ['pvzAmount','pvzCost','sellerAmount','wbRevenue','wbCost'])if(l[key]!==undefined&&!Number.isSafeInteger(l[key]))throw new Error('Некорректное начисление');
}
