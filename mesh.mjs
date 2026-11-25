const base = Object.freeze({
  sameCity:true, open:true, peak:false, capacity:12, occupied:5, operationalSlots:4,
  days:3, maxDays:7, batch:8, minBatch:2, maxBatch:100, fixed:24000, localVariable:4400,
  cancelRate:0, shortfall:0, fuelShare:50, fuelRise:0, extraWaitHours:0, waitRate:1000,
  damageRate:0, damageCost:0, fallbackDelayHours:0,
  hubCost:14000, meshReturnCost:10000, hubReturnCost:5000, returnRate:10,
  receive:600, storageDay:500, pack:1800, partnerOps:1700, partnerDay:200,
  meshHours:8, hubHours:24, slaHours:24, customerMesh:100, customerHub:100,
  itemPrice:100000, cogs:30000, commission:10000, sellerMeshFee:1000, sellerHubFee:2000
});
export const scenarios = {
  city: ['Городской заказ', {}], thin:['Мало заказов в рейсе', {batch:4}],
  hub:['Межгород через хаб', {sameCity:false,hubHours:36,slaHours:48}],
  peak:['Пик обычной выдачи', {peak:true}], outage:['Точка недоступна', {open:false}],
  aged:['Долгое хранение', {days:12}], full:['ПВЗ заполнен', {occupied:12}]
};
export function scenario(key) {
  if (!Object.hasOwn(scenarios,key)) throw Error('Неизвестный сценарий');
  return {...base, ...scenarios[key][1]};
}
const avg=(rate,value)=>Math.round(rate*value/100);
export function quote(x) {
  for (const k of Object.keys(base)) {
    const v=x[k], kind=typeof base[k];
    if(typeof v!==kind || (kind==='number' && (!Number.isSafeInteger(v) || v<0 || v>100000000))) throw Error('Некорректный параметр: '+k);
  }
  if(x.batch<1 || x.minBatch<1 || x.maxBatch>1000 || x.minBatch>x.maxBatch || x.batch>x.maxBatch || x.occupied>x.capacity || ['returnRate','cancelRate','damageRate','fuelShare'].some(k=>x[k]>100) || x.fuelRise>500) throw Error('Проверьте партию, проценты и свободное место');
  if(x.days>365 || x.maxDays>365 || x.extraWaitHours>168 || x.fallbackDelayHours>168 || x.shortfall>1000) throw Error('Срок или недобор вне диапазона модели');
  const storage=x.days*x.storageDay, partnerCost=x.partnerOps+x.days*x.partnerDay;
  const payout=x.receive+storage+x.pack, pvzMargin=payout-partnerCost;
  const expMeshReturn=avg(x.returnRate,x.meshReturnCost), expHubReturn=avg(x.returnRate,x.hubReturnCost);
  const expDamage=avg(x.damageRate,x.damageCost);
  const effectiveBatch=Math.max(0,Math.floor(x.batch*(100-x.cancelRate)/100)-x.shortfall);
  const fixedAdjusted=x.fixed+Math.round(x.fixed*x.fuelShare*x.fuelRise/10000)+x.extraWaitHours*x.waitRate;
  const meshEta=x.meshHours+x.extraWaitHours;
  const meshVariable=x.localVariable+payout+expMeshReturn+expDamage;
  const baseline=x.hubCost+expHubReturn;
  const mesh=effectiveBatch>0?meshVariable+Math.ceil(fixedAdjusted/effectiveBatch):null;
  const headroom=baseline-meshVariable;
  const candidate=headroom>0?(fixedAdjusted===0?x.minBatch:headroom>1?Math.max(x.minBatch,Math.ceil(fixedAdjusted/(headroom-1))):null):null;
  const threshold=candidate!==null && candidate<=x.maxBatch?candidate:null;
  const blockers=[];
  if(!x.sameCity) blockers.push('Межгород');
  if(!x.open) blockers.push('Точка недоступна');
  if(x.peak || x.operationalSlots<1) blockers.push('Выдача в приоритете: нет операционного слота');
  if(x.occupied>=x.capacity) blockers.push('Нет свободного места');
  if(x.days>x.maxDays) blockers.push('Лимит хранения: остановить пополнение и запланировать вывоз');
  if(meshEta>x.slaHours || meshEta>x.hubHours || x.customerMesh>x.customerHub) blockers.push('Не проходит ограничение цены или срока покупателя');
  if(pvzMargin<0) blockers.push('Отрицательная маржа ПВЗ');
  if(x.sellerMeshFee>x.sellerHubFee) blockers.push('Тариф продавца ухудшился');
  const margin=x.itemPrice-x.cogs-x.commission-x.sellerMeshFee;
  if(margin<0) blockers.push('Отрицательная маржа продавца');
  if(threshold===null || effectiveBatch<threshold) blockers.push('Партия не покрывает затраты локального рейса');
  if(effectiveBatch===0) blockers.push('Нет подтверждённых заказов');
  const route=blockers.length===0?'mesh':effectiveBatch>0&&x.hubHours<=x.slaHours?'hub':'blocked';
  return {route,blockers,threshold,baseline,mesh,saving:mesh===null?null:baseline-mesh,storage,payout,pvzMargin,partnerCost,expMeshReturn,expHubReturn,margin,expDamage,effectiveBatch,fixedAdjusted,meshEta};
}
const expected={receive:'new',store:'received',order:'stored',pack:'ordered',dispatch:'packed',issue:'transit',settle:'issued',return:'settled',fail:'packed'};
const next={receive:'received',store:'stored',order:'ordered',pack:'packed',dispatch:'transit',issue:'issued',settle:'settled',return:'returned'};
const normal={new:'receive',received:'store',stored:'order',ordered:'pack',packed:'dispatch',transit:'issue',issued:'settle',settled:'return'};
export function actionFor(state){return normal[state.stage]??null;}
export function createState(key, overrides={}) {
  const input={...scenario(key),...overrides}, model=quote(input);
  return {input,model,route:model.route,key,stage:'new',stock:0,reserved:0,quarantine:0,paidPVZ:0,sellerNet:null,platformActual:null,events:[],etaHours:model.route==='mesh'?model.meshEta:input.hubHours};
}
export function restoreState(saved){
  if(!saved||saved.v!==1||!Array.isArray(saved.events)||saved.events.length>12||!saved.input||Object.keys(saved.input).some(k=>!Object.hasOwn(base,k))) throw Error('История заказа не поддерживается');
  return saved.events.reduce((s,event)=>act(s,event),createState(saved.key,saved.input));
}
const dispatchCost=s=>s.route==='mesh'?s.input.localVariable+Math.ceil(s.model.fixedAdjusted/s.model.effectiveBatch):s.input.hubCost;
export function act(state,action) {
  const cancelAllowed=action==='cancel'&&['ordered','packed'].includes(state.stage);
  const damageAllowed=action==='damage'&&state.stage==='transit';
  if(!cancelAllowed && !damageAllowed && (!Object.hasOwn(expected,action) || state.stage!==expected[action])) throw Error('Недопустимый переход');
  const s={...state,events:[...state.events,action]};
  if(s.route==='blocked') throw Error('Нет маршрута в пределах SLA');
  const x=s.input;
  if(cancelAllowed) return {...s,stage:'cancelled',reserved:0,platformActual:s.paidPVZ,sellerNet:0};
  if(damageAllowed) return {...s,stage:'damaged',quarantine:1,platformActual:s.paidPVZ+dispatchCost(s)+x.damageCost,sellerNet:null};
  if(action==='fail') {
    if(s.route!=='mesh') throw Error('Сбой переключается только из mesh');
    s.etaHours=x.hubHours+x.fallbackDelayHours;
    s.route=s.etaHours<=x.slaHours?'hub':'blocked';
    if(s.route==='blocked'){s.stage='exception';s.reserved=0;s.platformActual=s.paidPVZ;}
    return s;
  }
  s.stage=next[action];
  if(action==='receive' && s.route==='mesh') {s.stock=1;s.paidPVZ=x.receive;}
  if(action==='store' && s.stock===1) s.paidPVZ+=s.model.storage;
  if(action==='order' && s.stock===1) s.reserved=1;
  if(action==='pack' && s.reserved===1) s.paidPVZ+=x.pack;
  if(action==='dispatch' && s.reserved===1) {s.stock=0;s.reserved=0;}
  if(action==='settle'){
    s.sellerNet=x.itemPrice-x.cogs-x.commission-(s.route==='mesh'?x.sellerMeshFee:x.sellerHubFee);
    s.platformActual=s.paidPVZ+dispatchCost(s);
  }
  if(action==='return'){
    s.quarantine=1;
    s.sellerNet=-(s.route==='mesh'?x.sellerMeshFee:x.sellerHubFee);
    s.platformActual+=s.route==='mesh'?x.meshReturnCost:x.hubReturnCost;
  }
  return s;
}
