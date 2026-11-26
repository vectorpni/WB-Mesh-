import {InventoryManager} from './inventory-engine.js';
export function stockProjection(pvzs){
 const result={};
 for(const p of pvzs.values()){
  const products=new Set([...(p.inventory||[]).map(i=>i.productId),...(p.incoming||[]).map(i=>i.productId)]);
  const inventory=new InventoryManager(pvzs);
  for(const productId of products)result[`${p.id}|${productId}`]=inventory.summary(p.id,productId);
 }
 return result;
}
export function auditEvent(state,entry){
 const current=stockProjection(state.pvzs),before=state.stockCheckpoint || state.openingStock || {};
 const deltas={};
 for(const key of new Set([...Object.keys(current),...Object.keys(before)])){
  const delta={};for(const metric of ['physical','available','reserved','quarantine','damaged','inTransit']){
   const d=(current[key]?.[metric]||0)-(before[key]?.[metric]||0);if(d)delta[metric]=d;
  }
  if(Object.keys(delta).length)deltas[key]=delta;
 }
 state.eventLog ||= [];state.eventLog.push({...entry,deltas});state.stockCheckpoint=current;
}
export function reconcileStock(state){
 const expected=structuredClone(state.openingStock || {});
 for(const e of state.eventLog)for(const[key,delta]of Object.entries(e.deltas || {})){
  expected[key] ||= {};for(const[metric,value]of Object.entries(delta))expected[key][metric]=(expected[key][metric]||0)+value;
 }
 const actual=stockProjection(state.pvzs),differences=[];
 for(const key of new Set([...Object.keys(expected),...Object.keys(actual)]))for(const metric of ['physical','available','reserved','quarantine','damaged','inTransit']){
  if((expected[key]?.[metric]||0)!==(actual[key]?.[metric]||0))differences.push({key,metric,expected:expected[key]?.[metric]||0,actual:actual[key]?.[metric]||0});
 }
 return {success:differences.length===0,differences};
}
