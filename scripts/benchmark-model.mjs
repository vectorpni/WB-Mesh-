import {StateManager} from '../src/core/app-state.js';
import {CostEngine} from '../src/core/cost-engine.js';
import {RouteOptimizer} from '../src/core/route-engine.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
let seed=20261126;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const state=new StateManager().state,products=[...state.products.values()],cities=[...state.cities.values()],nodes=[...state.pvzs.values()].filter(p=>p.type!=='hub');
const start=performance.now(),rows=[],routes={M1:0,M2:0,C1:0,C2:0,blocked:0};let classic=0,optimized=0;
for(let i=0;i<2000;i++){
 const product=products[Math.floor(random()*products.length)],city=cities[Math.floor(random()*cities.length)],dest=nodes[Math.floor(random()*nodes.length)],quantity=1+Math.floor(random()*3),days=1+Math.floor(random()*40);
 const order={id:`benchmark-${i}`,productId:product.id,quantity,sourcePvzId:city.hubId,destinationPvzId:dest.id,storageDays:days,
  currentTime:10,promisedHours:60,price:product.price,purchaseCost:product.purchaseCost,commissionRate:state.sellers.get(product.sellerId).commission,
  units:product.units,returnRate:product.returnRate,meshEligible:product.meshEligible};
 const baselineRoute=city.id===dest.cityId?'C1':'C2';
 const tariffs={...state.tariffs,intercitySurcharge:baselineRoute==='C2'&&[city.id,dest.cityId].includes('kazan')?state.tariffs.intercityKazanSurcharge:state.tariffs.intercitySurcharge};
 const base=new CostEngine(tariffs).calculateOrder({...order,route:baselineRoute,days:order.storageDays}).total*quantity;
 const optimizer=new RouteOptimizer(state.tariffs),candidates=optimizer.findCandidates(order,state.pvzs,state.cities),selected=optimizer.selectRoute(candidates);
 assert.ok(selected,'All benchmark source hubs contain confirmed stock');assert.ok(Number.isFinite(base)&&Number.isFinite(selected.totalCost));
 assert.ok(selected.totalCost<=base,'Same-order comparison must not silently change storage days or risk parameters');
 classic+=base;optimized+=selected.totalCost;routes[selected.type]++;
 rows.push([i+1,product.sku,quantity,order.sourcePvzId,dest.id,days,baselineRoute,selected.type,base,selected.totalCost,base-selected.totalCost]);
}
const elapsedMs=performance.now()-start;
const summary={seed:20261126,orders:2000,nodes:state.pvzs.size,sku:state.products.size,classic,optimized,savings:classic-optimized,routes,elapsedMs,
 protocol:'Independent orders evaluated against the same immutable network snapshot. No stock depletion or concurrency throughput claim. Money: integer kopecks.',
 operationalBonuses:'Expected pool at routing. Actual bonuses/penalties settle later in workflow scenarios.'};
mkdirSync('deliverables',{recursive:true});
writeFileSync('deliverables/benchmark-2000.csv','\uFEFF'+[['№','SKU','Количество','Источник','Получатель','Хранение','База','Выбрано','База, коп','Оптимизация, коп','Экономия, коп'],...rows].map(r=>r.join(';')).join('\n'));
writeFileSync('deliverables/benchmark-summary.json',JSON.stringify(summary,null,2));
writeFileSync('assets/benchmark-summary.json',JSON.stringify(summary));
console.log(JSON.stringify(summary,null,2));
