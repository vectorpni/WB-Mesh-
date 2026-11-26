import {DEFAULT_TARIFFS} from './types.js';
import {InventoryManager} from './inventory-engine.js';
export function validateTariffs(t){
 if(!t || t.schemaVersion!==8)throw new Error('Несовместимая версия тарифов, ожидается V8');
 for(const key of Object.keys(DEFAULT_TARIFFS))if(!Number.isFinite(t[key]) || t[key]<0)throw new Error(`Некорректный тариф: ${key}`);
 for(const key of ['returnRate','resaleShare','classicLossRate','meshLossRate'])if(t[key]>1)throw new Error(`Доля вне диапазона: ${key}`);
 if(!Number.isSafeInteger(t.vehicleCapacity)||t.vehicleCapacity<1)throw new Error('Некорректная вместимость транспорта');
}
export function validateState(data){
 for(const key of ['cities','pvzs','products','sellers','orders','salesHistory']){
  if(!Array.isArray(data[key]) || data[key].some(v=>!Array.isArray(v)||v.length!==2||typeof v[0]!=='string'||!v[1]))throw new Error(`Некорректный раздел: ${key}`);
  if(new Set(data[key].map(x=>x[0])).size!==data[key].length)throw new Error(`Дубли ключей: ${key}`);
 }
 validateTariffs(data.tariffs);
 const products=new Map(data.products),pvzs=new Map(data.pvzs),batchIds=new Set();
 for(const p of products.values())if(!Number.isSafeInteger(p.units || 1)||(p.units || 1)<1||!Number.isFinite(p.price)||p.price<0)throw new Error('Некорректный товар');
 for(const [id,p]of pvzs){
  if(p.id!==id||!Number.isFinite(p.capacity)||p.capacity<0||!Number.isFinite(p.occupiedCapacity)||p.occupiedCapacity<0||p.occupiedCapacity>p.capacity||!Array.isArray(p.inventory))throw new Error('Некорректный узел или квота');
  let units=0;
  for(const item of p.inventory){
   if(batchIds.has(item.batchId))throw new Error('Повтор номера партии в сети');batchIds.add(item.batchId);
   if(!products.has(item.productId)||!Number.isSafeInteger(item.quantity)||item.quantity<0||InventoryManager.reserved(item)>item.quantity||Object.values(item.reservations||{}).some(q=>!Number.isSafeInteger(q)||q<0))throw new Error('Некорректный остаток или резерв');
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
 for(const [,h]of data.salesHistory)if(!Array.isArray(h)||h.some(x=>!Number.isFinite(x)||x<0))throw new Error('Некорректная история спроса');
 for(const t of data.scheduledTrips || [])if(!Number.isSafeInteger(t.capacity)||!Number.isSafeInteger(t.booked)||t.booked<0||t.capacity<t.booked||!Number.isFinite(t.departureTime)||!Array.isArray(t.nodes)||t.nodes.some(id=>!pvzs.has(id)))throw new Error('Некорректный рейс');
 for(const l of data.ledger || [])for(const key of ['pvzAmount','pvzCost','sellerAmount','wbRevenue','wbCost'])if(l[key]!==undefined&&!Number.isSafeInteger(l[key]))throw new Error('Некорректное начисление');
}
