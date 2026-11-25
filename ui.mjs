import { actionFor, act, createState, restoreState, scenarios } from './mesh.mjs';
import { evaluateForecast, sampleSeries } from './forecast.mjs';
const get=id=>document.getElementById(id);
const set=(id,value)=>{get(id).textContent=value;};
const money=n=>n===null?'—':new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(n/100);
const names={receive:'Принять товар',store:'Учесть хранение',order:'Оформить заказ',pack:'Собрать',dispatch:'Отправить',issue:'Выдать',settle:'Начислить',return:'Принять возврат',fail:'Сбой маршрута',cancel:'Отмена',damage:'Повреждение'};
const stateNames={new:'Готов к началу',received:'Принят',stored:'Хранение учтено',ordered:'Заказ оформлен',packed:'Собран',transit:'В доставке',issued:'Выдан',settled:'Начисления рассчитаны',returned:'Возврат принят',exception:'Нет резервного маршрута в SLA',cancelled:'Отменён до отправки',damaged:'Повреждение · на проверке'};
const routes={mesh:'Городской рейс',hub:'Через хаб',blocked:'Нет маршрута в SLA'};
let state,role='pvz';
const key='mesh-gate.order.v1';
const controls={batch:'batch',days:'days',rate:'returnRate',cancels:'cancelRate',shortfall:'shortfall',fuel:'fuelRise',wait:'extraWaitHours','damage-rate':'damageRate','damage-cost':'damageCost',fallback:'fallbackDelayHours'};
const roleIds=['pvz','seller','platform'];
function syncInputs(){for(const [id,field] of Object.entries(controls))get(id).value=state.input[field]/(field==='damageCost'?100:1);}
function persist(){
  try{localStorage.setItem(key,JSON.stringify({v:1,key:state.key,input:state.input,events:state.events}));}
  catch{errors('Сохранение в браузере недоступно. Оставьте вкладку открытой.');}
}
for(const [key,[name]] of Object.entries(scenarios)){const option=document.createElement('option');option.value=key;option.textContent=name;get('scenario').append(option);}
function errors(msg=''){set('error',msg);get('error').hidden=!msg;}
function render(){
  const {model:q,input:x}=state;
  set('route',routes[state.route]);get('route').dataset.route=state.route;
  set('reason',state.events.includes('fail')?'Локальный сегмент недоступен. Начисления за выполненные операции сохранены.':q.blockers.length?q.blockers.join(' · '):'Выдержаны экономика, окно выдачи, свободное место и SLA.');
  set('threshold','После отмен и недобора: '+q.effectiveBatch+'. '+(q.threshold===null?'При заданном лимите рейс не окупается.':'Порог: '+q.threshold+' заказов.'));
  set('hub',money(q.baseline));set('mesh',money(q.mesh));set('saving',money(q.saving));
  const legs=state.route==='mesh'?['ПВЗ хранения','Городской рейс','ПВЗ выдачи']:state.route==='hub'?[state.events.includes('fail')?'ПВЗ хранения':'Продавец','Хаб и магистраль','ПВЗ выдачи']:['Ожидание решения оператора'];
  get('legs').replaceChildren(...legs.map(label=>{const item=document.createElement('span');item.textContent=label;return item;}));
  set('breakdown',q.mesh===null?'Нет заказов для расчёта стоимости рейса.':'Mesh на заказ: рейс '+money(Math.ceil(q.fixedAdjusted/q.effectiveBatch))+' + перевозка '+money(x.localVariable)+' + ПВЗ '+money(q.payout)+' + ожидаемые возвраты '+money(q.expMeshReturn)+' + ожидаемый ущерб '+money(q.expDamage)+'.');
  set('stage',stateNames[state.stage]);const next=state.route==='blocked'?null:actionFor(state);
  set('next',next?names[next]:'Сценарий завершён');get('next').disabled=!next;
  get('fail').hidden=state.stage!=='packed'||state.route!=='mesh';
  get('cancel').hidden=!['ordered','packed'].includes(state.stage);
  get('damage').hidden=state.stage!=='transit';
  get('steps').replaceChildren(...state.events.map(id=>{const el=document.createElement('span');el.textContent=names[id];return el;}));
  set('stock','На полке: '+state.stock+' · В резерве: '+state.reserved+' · На проверке: '+state.quarantine+' · Фактические расходы МП: '+money(state.platformActual));
  for(const id of roleIds)get(id).setAttribute('aria-pressed',id===role);
  const estimate=state.route==='mesh'?q.margin:x.itemPrice-x.cogs-x.commission-x.sellerHubFee;
  const ledgers={
    pvz:[['Начислено ПВЗ',money(state.paidPVZ)],['Затраты ПВЗ по модели',money(q.partnerCost)],['Маржа полного mesh-цикла',money(q.pvzMargin)]],
    seller:[['Маржа по выбранному маршруту',state.route==='blocked'?'—':money(estimate)],['Тариф продавца',state.route==='blocked'?'—':money(state.route==='mesh'?x.sellerMeshFee:x.sellerHubFee)],['Фактический итог в сценарии',money(state.sellerNet)]],
    platform:[['Ожидаемые расходы через хаб',money(q.baseline)],['Ожидаемые расходы mesh',money(q.mesh)],['Фактические расходы в сценарии',money(state.platformActual)]]
  };
  const values=ledgers[role];
  get('finance').replaceChildren(...values.map(([k,v])=>{const el=document.createElement('p'); const b=document.createElement('strong');b.textContent=v;el.append(k+' ',b);return el;}));
  set('customer',state.route==='blocked'?'Для покупателя маршрут не обещан.':'Покупателю: '+money(state.route==='mesh'?x.customerMesh:x.customerHub)+' · '+state.etaHours+' ч · SLA '+x.slaHours+' ч.');
  const forecast=evaluateForecast(sampleSeries(),q.threshold??5);
  const fmt=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:2});
  set('forecast','28 проверочных дней. MAE: вчера '+fmt(forecast.mae.naive)+', сезонная модель '+fmt(forecast.mae.seasonal)+' заказа. Ошибочные рекомендации рейса: '+forecast.stats.naive.falseDispatch+' → '+forecast.stats.seasonal.falseDispatch+'. Следующий день: '+forecast.next.point+' заказа, консервативная оценка '+forecast.next.low+'.');
}
function reset(fromPreset){
  try{const overrides=fromPreset?{}:Object.fromEntries(Object.entries(controls).map(([id,field])=>{const n=get(id).valueAsNumber;return [field,field==='damageCost'?Math.round(n*100):n];}));
  state=createState(get('scenario').value,overrides);
  syncInputs();errors();render();persist();}catch(e){errors(e.message);}
}
function advance(action){try{state=act(state,action);errors();render();persist();}catch(e){errors(e.message);}}
get('scenario').onchange=()=>reset(true);get('reset').onclick=()=>reset(false);
get('next').onclick=()=>advance(actionFor(state));get('fail').onclick=()=>advance('fail');
get('cancel').onclick=()=>advance('cancel');get('damage').onclick=()=>advance('damage');
for(const id of roleIds)get(id).onclick=()=>{role=id;render();};
try{
  const saved=localStorage.getItem(key);
  if(!saved)reset(true);
  else{state=restoreState(JSON.parse(saved));get('scenario').value=state.key;syncInputs();render();}
}catch{reset(true);errors('Предыдущую сессию не удалось восстановить. Открыт новый демонстрационный заказ.');}
