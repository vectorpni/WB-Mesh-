import {planningView} from './planning-view.js';
import {buildTransferPlan,scheduleTransfer,progressTransfer,localHistory} from '../core/planning-engine.js';
import {CostEngine} from '../core/cost-engine.js';
import {InventoryManager} from '../core/inventory-engine.js';
import {DemandForecast} from '../core/forecast-engine.js';
import {runScenario,SCENARIOS} from '../core/demo-engine.js';
import {escapeHtml as esc,rub,pct,statusName,chip,stat,table,heading,button} from './view-utils.js';
import {networkSvg} from './network-view.js';
import {progressWithdrawal} from '../core/withdrawal-engine.js';
import {operationLoad} from '../core/operation-policy.js';
import {economicsView,simulationResults} from './economics-view.js';

const view={sim:{n:40,days:10,stops:1,wait:0,fixed:480,returns:12,share:30,overhead:0},node:'pvz-perm-plus',seller:'seller-1',notice:'',demo:null};
let manager,navigate,initialized=false;
const actions={new:['receive','Принять заказ'],received:['store','Разместить'],stored:['pack','Собрать'],packed:['dispatch','Передать курьеру'],in_transit:['arrive','Принять из рейса'],dispatched:['issue','Выдать'],issued:['settle','Начислить'],settled:['return','Возврат']};
const name=(s,id)=>esc(s.pvzs.get(id)?.name || id);
const orderRows=s=>[...s.orders.values()].reverse().map(o=>[
 `<strong>${esc(o.id.slice(-6))}</strong><small>${esc(s.products.get(o.productId)?.name)}</small>`,`${o.quantity} шт.`,
 `${name(s,o.sourcePvzId)}<small>${name(s,o.destinationPvzId)}</small>`,chip(o.routeType || 'Ожидает расчёта'),
 chip(statusName(o.status)),o.economics?rub(o.routeCost):'Ожидает расчёта',
 actions[o.status]?button(actions[o.status][1],'order',`data-order="${o.id}" data-op="${actions[o.status][0]}"`,true):'—',
 `<details><summary>Почему?</summary>${decisionDetails(o.decision)}</details>`]);

function decisionDetails(decision){
 if(!decision)return 'Маршрут ещё не рассчитан.';
 return `<p>${esc(decision.reason)}</p>${table(['Маршрут','Источник','₽ / ед.','Срок','Проверка'],decision.candidates.map(c=>[
  chip(c.type),esc(c.sourcePvzId),rub(c.unitCost),`${c.etaHours} ч`,c.available?'Допустим':`${esc(c.constraints.join(', '))}: ${esc(c.rejectionReasons.join('; '))}`]))}<p>Стоимость кандидатов включает перевозку, хранение, сортировку, ПВЗ, возвраты, потери и IT. Условия проверяются до резервирования.</p>${decision.selected?.economics?`<details><summary>Формула выбранного варианта</summary><p>Параметры: ${esc(JSON.stringify(decision.selected.economics.parameters))}</p><p>Статьи, копейки: ${Object.values(decision.selected.economics.breakdown).join(' + ')} = ${decision.selected.economics.total}. Количество × стоимость единицы = стоимость заказа.</p></details>`:''}`;
}

function dashboard(s){
 const e=new CostEngine(s.tariffs).calculateOrder();
 const orders=[...s.orders.values()],settled=s.ledger.filter(x=>x.type==='settle'),effect=settled.reduce((a,l)=>a+(s.orders.get(l.orderId)?.classicCost||0)-l.wbCost,0);
 const selected=orders.at(-1)?.decision?.selected;
 return `<section class="v-hero has-presentation"><img class="v-presentation-art" src="/assets/mesh-presentation.png" width="1536" height="864" alt="" fetchpriority="high"><div class="v-hero-copy"><span class="v-hero-tag">Vector PNI / RWB × ПГТУ</span><h1>Ближе товар.<br>Сильнее сеть.</h1><p>Не строим новую сеть.<br>Раскрываем потенциал существующей.</p><div class="v-hero-actions">${button('Посмотреть в действии','goto', 'data-tab="demo"')}${button('Проверить экономику','goto','data-tab="economics"',true)}</div><small>Исследовательский MVP. Не является официальным сервисом Wildberries.</small></div></section>
 <div class="v-stats">${stat('Себестоимость классики',rub(e.classic.total),'Контрольный заказ ТЗ')}${stat('Себестоимость Mesh',rub(e.total),'40 отправлений · хранение 10 суток')}${stat('Экономия на заказе',rub(e.savings),'7,04% в контрольном примере','positive')}${stat('Результат ПВЗ',rub(e.pvz.result),'14 ₽ дохода − 7,50 ₽ расходов')}</div>
 <div class="v-grid network-layout"><section class="v-card"><div class="v-card-head"><div><h2>Одна сеть. Четыре маршрута.</h2><p>Нажмите на узел, чтобы увидеть остатки и ограничения</p></div>${chip(`${s.pvzs.size} узлов`)}</div>${networkSvg(s,selected,view.node)}<div class="v-legend"><span><i class="purple"></i>Хаб и магистраль</span><span><i></i>Mesh-ПВЗ</span><span>Синтетическая сеть · фиксированный seed</span></div></section>
 <section class="v-card v-feed"><div class="v-card-head"><h2>Решения MCS</h2>${chip(`${s.mcsDecisionLog.length}`)}</div>${s.mcsDecisionLog.length?s.mcsDecisionLog.slice(-4).reverse().map(l=>`<article>${chip(l.selectedRoute || 'Нет маршрута',l.selectedRoute?'positive':'negative')}<strong>${rub(l.cost)}</strong><p>${esc(l.reason)}</p><small>Заказ ${esc(l.orderId.slice(-6))}</small></article>`).join(''):`<div class="v-empty"><div class="v-empty-symbol">◇</div><h3>Сеть готова к работе</h3><p>Запустите городской заказ: MCS сравнит кандидатов и объяснит решение.</p>${button('Рассчитать первый маршрут','demo','data-scenario="city_order"')}</div>`}<div class="v-feed-footer"><span>${orders.length} заказов</span><span>Эффект по начисленным заказам: <b>${rub(effect)}</b></span></div></section></div>
 <div class="v-grid three"><section class="v-card v-route-story"><span>M1 / M2</span><h2>Товар рядом с покупателем</h2><p>Локальная выдача или прямое перемещение между ПВЗ. Только при наличии доступного стока и выгоде четырёх участников.</p></section><section class="v-card v-route-story"><span>C1 / C2</span><h2>Хаб остаётся основой</h2><p>Пополнение, межгород и резервные маршруты. Сбой не создаёт товар в другом городе.</p></section><section class="v-card v-route-story"><span>Cost Engine</span><h2>Каждое решение в рублях</h2><p>Полная цепочка, срок и ограничения. Существующий рейс тоже имеет стоимость.</p></section></div>`;
}

function stockTable(s,p){
 const i=manager.mcs.inventoryManager;
 return table(['Товар / партия','P','A','R','Q','D','В пути','Возраст','Действие'],[...s.products.values()].map(product=>{
  const q=i.summary(p.id,product.id),b=p.inventory.find(b=>b.productId===product.id);
  return [`${esc(product.name)}<small>${esc(product.sku)}</small>`,q.physical,q.available,q.reserved,q.quarantine,q.damaged,q.inTransit,b?`${Math.floor(b.daysStored || 0)} сут`:'—',
   q.quarantine?button('Проверить возврат','inspect',`data-batch="${p.inventory.find(b=>b.productId===product.id&&b.status==='quarantine').batchId}"`,true):'—'];
 }));
}
function pvz(s){
 const p=s.pvzs.get(s.ui.selectedPvzId || view.node) || s.pvzs.get('pvz-perm-plus');view.node=p.id;
 const q=manager.mcs.inventoryManager.summary(p.id),free=p.capacity-p.occupiedCapacity,load=operationLoad(p,s.virtualTime.currentTime,s.tariffs);
 const ledger=s.ledger.filter(l=>(l.pvzId||s.orders.get(l.orderId)?.sourcePvzId)===p.id),rev=ledger.reduce((a,l)=>a+(l.pvzAmount||0),0),cost=ledger.reduce((a,l)=>a+(l.pvzCost||0),0);
 return heading('Рабочее место ПВЗ','Приёмка, остатки, заказы и начисления связаны единым журналом событий.',`<label>Пункт выдачи<select id="workspaceNode" class="v-select">${[...s.pvzs.values()].map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`)+
 `<div class="v-stats">${stat('Доступно к заказу',q.available,'Физический остаток минус резерв и карантин')}${stat('Резерв / в пути',`${q.reserved} / ${q.inTransit}`,'Не входят в доступный запас')}${stat('Свободная вместимость',`${free} ед.`,`${p.occupiedCapacity} из ${p.capacity} занято`)}${stat('Доп. результат ПВЗ',rub(rev-cost),'Только фактические начисления и расходы')}</div>
 <div class="v-grid operation-layout"><section class="v-card"><div class="v-card-head"><h2>Принять поставку</h2>${chip(statusName(p.status))}</div><form id="receiveForm" class="v-form"><label>Товар<select name="product" class="v-select">${[...s.products.values()].map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label><label>Количество<input name="quantity" type="number" min="1" step="1" value="5" required></label><label>Партия<input name="batch" placeholder="Автоматический номер"></label><button class="v-btn" type="submit">Принять на хранение</button><p class="v-note">Приёмка доступна 09:00–17:00, сверх квоты запрещена. Карантин не доступен для продажи.</p></form></section>
 <section class="v-card"><div class="v-card-head"><h2>Оформить тестовый заказ</h2>${chip('Без платёжного шлюза')}</div><form id="orderForm" class="v-form"><label>Товар<select name="product" class="v-select">${[...s.products.values()].map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label><div class="v-grid two"><label>Количество<input name="quantity" type="number" min="1" step="1" value="1" required></label><label>Обещанный срок, ч<input name="promise" type="number" min="1" max="240" value="60" required></label></div><label>Исходный узел<select name="source" class="v-select">${[...s.pvzs.values()].map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><button class="v-btn" type="submit">Рассчитать маршрут и резерв</button></form></section></div>
 <section class="v-card"><div class="v-card-head"><h2>Остатки по SKU</h2><span class="v-note">P = A + R + Q + D; N = P + T</span></div><p class="v-note">Операций за текущий час: ${load.used}/${load.limit}. ${load.peak?'Вечерний пик: сниженный лимит.':'Обычная выдача имеет приоритет.'} Лимит считается по операциям с партией, а не по количеству её единиц.</p>${stockTable(s,p)}</section>
 <section class="v-card"><div class="v-card-head"><h2>Заказы и операции</h2>${chip('Каждая кнопка — доменная операция')}</div>${table(['Заказ','Кол-во','Путь','Маршрут','Статус','Стоимость','Действие','Решение'],orderRows(s))}</section>
 <section class="v-card"><h2>Начисления, бонусы и штрафы</h2>${table(['Операция','Начисление','Расходы ПВЗ','Факт. бонус','Штраф'],ledger.map(l=>[esc(l.orderId?.slice(-6)||l.id),rub(l.pvzAmount||0),rub(l.pvzCost||0),rub(l.bonus||0),rub(l.penalty||0)]))}<p class="v-note">В контрольной модели бонусный пул — 1 ₽. При начислении он заменяется фактическими бонусами: быстрая сборка 2 ₽, рейс без простоя 1 ₽. Штраф за просрочку: min(60 ₽; 10 ₽ + 2 ₽ × минут просрочки). Эти корректировки не учитываются дважды.</p></section>
 <section class="v-card"><h2>Журнал событий</h2>${table(['Время','Операция','Заказ / партия','Подробности'],s.eventLog.slice(-12).reverse().map(e=>[`${Number(e.timestamp||0).toFixed(1)} ч`,esc(statusName(e.type)),esc((e.orderId||e.id).slice(-12)),esc(JSON.stringify(e.details||{}))]))}</section>`;
}

function forecastChart(history,result){
 const test=result.evaluation[result.method];if(!test)return '<p>Недостаточно истории для проверки.</p>';
 const actual=test.actuals,pred=test.predictions,max=Math.max(...actual,...pred,1);
 const line=arr=>arr.map((y,i)=>`${30+i*600/Math.max(1,arr.length-1)},${180-y/max*145}`).join(' ');
 const errorMax=Math.max(...test.errors.map(Math.abs),1);
 return `<svg viewBox="0 0 660 315" class="v-forecast" role="img" aria-label="Спрос, прогноз и ошибки на проверочных днях"><path d="M30 25V180H630" fill="none" stroke="#ddd3e8"/><polyline points="${line(actual)}" fill="none" stroke="#5421A8" stroke-width="3"/><polyline points="${line(pred)}" fill="none" stroke="#CB11AB" stroke-width="3" stroke-dasharray="6 4"/><text x="5" y="35">${Math.ceil(max)}</text><text x="10" y="180">0</text><text x="30" y="210">Факт</text><text x="130" y="210" fill="#CB11AB">Прогноз</text><text x="430" y="210">${actual.length} проверочных дней</text><line x1="30" x2="630" y1="265" y2="265" stroke="#ddd3e8"/>${test.errors.map((v,i)=>`<rect x="${33+i*600/test.errors.length}" y="${v>0?265-v/errorMax*28:265}" width="${Math.max(4,500/test.errors.length)}" height="${Math.max(1,Math.abs(v)/errorMax*28)}" fill="${v>=0?'#CB11AB':'#5421A8'}"/>`).join('')}<text x="30" y="310">Ошибка: прогноз − факт. Выше нуля — избыток, ниже — дефицит.</text></svg>`;
}
function seller(s){
 const seller=s.sellers.get(s.ui.selectedSellerId || view.seller) || [...s.sellers.values()][0];view.seller=seller.id;
 const ps=[...s.products.values()].filter(p=>p.sellerId===seller.id),orders=[...s.orders.values()].filter(o=>o.sellerId===seller.id);
 const paid=orders.filter(o=>o.settled&&!o.returned),revenue=paid.reduce((a,o)=>a+s.products.get(o.productId).price*o.quantity,0),profit=paid.reduce((a,o)=>a+o.economics.seller.after*o.quantity,0);
 const product=ps[0],history=s.salesHistory.get(product.id)||[],f=DemandForecast.forecastNextDay(history);
 return heading('Кабинет продавца','Где лежит товар, сколько он приносит и что делать с запасами.',`<label>Продавец<select id="workspaceSeller" class="v-select">${[...s.sellers.values()].map(x=>`<option value="${x.id}" ${x.id===seller.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`)+
 `<div class="v-stats">${stat('Товаров в каталоге',ps.length,'Синтетические SKU продавца')}${stat('Выручка по выданным',rub(revenue),'Цена × количество, без возвратов')}${stat('Прибыль по начисленным',rub(profit),'После закупки, комиссии и логистики')}${stat('Логистика: классика / Mesh','112 / 109 ₽','До 14 суток, модельный тариф ТЗ')}</div>
 <section class="v-card"><div class="v-card-head"><h2>Товары и остатки по ПВЗ</h2>${chip('Доступный запас / физический')}</div>${table(['Товар','Цена','Закупка','ПВЗ','A / P','Резерв','Карантин','Возраст'],ps.flatMap(product=>[...s.pvzs.values()].filter(p=>p.inventory.some(i=>i.productId===product.id)).map(p=>{const q=manager.mcs.inventoryManager.summary(p.id,product.id),b=p.inventory.find(i=>i.productId===product.id);return [esc(product.name),rub(product.price),rub(product.purchaseCost??Math.round(product.price*.6)),name(s,p.id),`${q.available} / ${q.physical}`,q.reserved,q.quarantine,`${Math.floor(b.daysStored||0)} сут`];})))}</section>
 <div class="v-grid two"><section class="v-card"><div class="v-card-head"><h2>Спрос и прогноз</h2>${chip('Статистическая модель')}</div>${forecastChart(history,f)}<p>Метод выбран по MAE на отложенном периоде. История синтетическая, seed фиксирован. Качество на реальном спросе не заявляется.</p></section><section class="v-card"><h2>Сравнение методов</h2>${table(['Метод','WAPE','MAE','Смещение'],Object.entries(f.evaluation).map(([method,m])=>[esc({naive:'Последний день',movingAverage:'Среднее за 7 дней',ewma:'EWMA',seasonalNaive:'Та же дата недели',seasonalAverage:'Сезонное среднее'}[method]),pct(m.wape),m.mae.toFixed(2),m.bias.toFixed(2)]))}<p class="v-note">Каждый прогноз использует только прошлые дни. Проверка — rolling-origin, горизонт один день. WAPE не равна доле успешных доставок.</p></section></div>
 <section class="v-card"><h2>Рекомендации по запасам</h2>${table(['ПВЗ','Спрос / день','Запас','Цель T','Рекомендация','Обоснование'],[...s.pvzs.values()].filter(p=>p.type==='mesh').map(p=>{const q=manager.mcs.inventoryManager.summary(p.id,product.id),r=DemandForecast.recommend(localHistory(s,product.id,p.id),q.available,q.inTransit,p.capacity-p.occupiedCapacity+q.available);return [name(s,p.id),r.lambda,q.available,r.target,r.deficit?`Пополнить ${r.quantity} шт.`:r.surplus?`Излишек ${r.surplus} шт.`:'Запас в пределах цели',esc(r.formula)];}))}</section>
 <section class="v-card"><h2>Расходы и результат заказов</h2>${table(['Заказ','Маршрут','Выручка','Закупка','Комиссия','Логистика','Прибыль'],orders.filter(o=>o.economics).map(o=>{const e=o.economics;return [esc(o.id.slice(-6)),chip(o.routeType),rub(e.seller.price*o.quantity),rub(e.seller.purchaseCost*o.quantity),rub(e.seller.commission*o.quantity),rub(e.seller.fee*o.quantity),rub(e.seller.after*o.quantity)];}))}</section>`;
}

function mcs(s){
 const p=s.pvzs.get(view.node),q=p?manager.mcs.inventoryManager.summary(p.id):null;
 return heading('Mesh Control System','Спрос → остатки → кандидаты → ограничения → стоимость → решение.',button('Городской сценарий','demo','data-scenario="city_order"'))+
 `<div class="v-grid network-layout"><section class="v-card"><div class="v-card-head"><h2>Управляемая логистическая сеть</h2>${chip('Схема без GPS')}</div>${networkSvg(s,[...s.orders.values()].at(-1)?.decision?.selected,view.node)}</section><section class="v-card"><h2>${p?esc(p.name):'Выберите узел'}</h2>${p?`${chip(statusName(p.status))}<div class="v-stats compact">${stat('Вместимость',`${p.occupiedCapacity}/${p.capacity}`)}${stat('Доступно',q.available)}${stat('Резерв',q.reserved)}${stat('Карантин',q.quarantine)}</div><p>Заказов узла: ${[...s.orders.values()].filter(o=>o.sourcePvzId===p.id||o.destinationPvzId===p.id).length}. Операций за час: ${operationLoad(p,s.virtualTime.currentTime,s.tariffs).used}/${operationLoad(p,s.virtualTime.currentTime,s.tariffs).limit}. Приём рейсов: 09:00–17:00. Вечерний пик: 18:00–21:00.</p>${button(p.status==='active'?'Приостановить Mesh':'Включить узел','pause-node','',true)} ${button('Смоделировать сбой','fail-node','',true)}`:''}</section></div>
 <section class="v-card"><div class="v-card-head"><h2>Объяснимый журнал решений</h2>${chip(`${s.mcsDecisionLog.length} решений`)}</div>${s.mcsDecisionLog.length?s.mcsDecisionLog.slice(-10).reverse().map(log=>`<details class="v-log"><summary>${chip(log.selectedRoute||'Нет маршрута')} Заказ ${esc(log.orderId.slice(-6))} · ${rub(log.cost)} · ${esc(log.reason)}</summary>${decisionDetails(s.orders.get(log.orderId)?.decision)}</details>`).join(''):'<div class="v-empty">Запустите сценарий или рассчитайте заказ в рабочем месте ПВЗ.</div>'}</section>
 <section class="v-card"><h2>Архитектура MCS</h2><div class="v-flow">${['Network Graph','Demand Forecast','Inventory Manager','Consolidation & Route Optimizer','Capacity Manager','Cost Engine','Operations & Audit'].map((x,i)=>`<div><b>${esc(x)}</b><small>${['Узлы и связи','Прогноз и дефицит','Остатки и резерв','Маршруты и партии','Место и транспорт','Полная стоимость','События и начисления'][i]}</small></div>`).join('')}</div></section>${planningView(s)}`;
}

function demo(s){
 const result=s.lastDemo,o=result?s.orders.get(result.orderId):null;
 return heading('Живая демонстрация','Пять воспроизводимых сценариев. Операции выполняет ядро приложения.',button('Режим жюри','jury','',true))+
 `<div class="v-demo-grid">${SCENARIOS.map((sc,i)=>`<button class="v-demo-card ${result?.scenarioId===sc.id?'selected':''}" data-action="demo" data-scenario="${sc.id}"><span class="v-demo-num">0${i+1}</span><h2>${sc.name}</h2><p>${sc.subtitle}</p><span class="v-demo-open">Запустить сценарий ↗</span></button>`).join('')}</div>
 ${result?`<section class="v-card v-demo-result"><div class="v-card-head"><h2>${esc(result.name)}</h2>${chip(result.passed?'Ожидаемый результат подтверждён':'Требуется проверка',result.passed?'positive':'negative')}</div><div class="v-stats">${stat('Маршрут',result.route,result.route==='blocked'?'Допустимых вариантов нет':`${o.routeEta} ч`)}${stat('Стоимость заказа',o.economics?rub(o.routeCost):'Маршрут недоступен',`${o.quantity} шт.`)}${stat('Резерв / карантин',`${result.stock.reserved} / ${result.stock.quarantine}`,'Фактическое состояние после операций')}${stat('Статус',statusName(o.status),'Результат доменных операций')}</div>${table(['Шаг','Действие','Результат'],result.steps.map((x,i)=>[i+1,esc(statusName(x.action)),esc(statusName(x.result))]))}<details><summary>Кандидаты и ограничения MCS</summary>${decisionDetails(o.decision)}</details></section>`:`<section class="v-demo-intro"><h2>Покажите решение на одном заказе</h2><p>Начните с города: партия из 40 отправлений поедет напрямую. В межгороде без локального товара останется магистраль. Возврат окажется в карантине, а сбой не превратится в фиктивный успех.</p></section>`}
 <section class="v-card"><h2>Две минуты живого показа</h2><div class="v-timeline">${[['0:00–0:30','Город','M2, стоимость и причины выбора'],['0:30–0:50','Межгород','C2 без локального стока'],['0:50–1:15','Возврат','Карантин и одно сторно'],['1:15–1:35','Сбой','Честный отказ при отсутствии пути'],['1:35–2:00','Хранение','Рост затрат и выбор классики']].map(x=>`<div><b>${x[0]}</b><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join('')}</div></section>`;
}

function settings(s){
 return heading('Настройки модели','Прозрачные допущения, локальное сохранение и перенос состояния.')+
 `<div class="v-grid two"><section class="v-card"><h2>Состояние приложения</h2><p>Заказы, резервы, события и начисления сохраняются локально в браузере. Экспорт JSON переносит снимок между запусками.</p><div class="v-buttons">${button('Экспорт JSON','export')}${button('Сбросить демо','reset','',true)}${manager.lastDemoBackup?button('Восстановить до пресета','restore-demo','',true):''}${button(s.mcsStatus==='error'?'Восстановить MCS':'Симулировать сбой MCS','mcs-availability','',true)}</div><label class="v-file">Импорт состояния<input type="file" id="v8Import" accept="application/json"></label><p class="v-note">Импорт проверяется до замены текущего состояния. Реальной серверной синхронизации и авторизации нет.</p></section><section class="v-card"><h2>Честные границы прототипа</h2><p>Все данные синтетические. Тарифы и масштабы — гипотезы из ТЗ. Статистический прогноз не является нейросетью.</p><p>Офлайн: локальные ресурсы и хранилище. Промышленная синхронизация, реальные сканеры, GPS и платежи не подключены.</p>${chip('Vector PNI · исследовательский MVP')}</section></div>
 <section class="v-card"><h2>Тарифы расчётного ядра</h2>${table(['Параметр','Значение','Источник'],[['Выезд рейса',rub(s.tariffs.fixedTripCost),'ТЗ §3.3'],['Посылка в рейсе',rub(s.tariffs.variablePerParcel),'ТЗ §3.3'],['Остановка сверх первой',rub(s.tariffs.extraStopCost),'ТЗ §3.3'],['Простой за минуту',rub(s.tariffs.courierWaitPerMin),'ТЗ §3.3'],['Хранение 1–14 / 15–30 / 31–60','1 / 1,5 / 2,5 ₽ за сутки','ТЗ §4.1'],['IT классика / Mesh','6 / 8 ₽ на единицу','ТЗ §4.2'],['Логистика продавца','112 / 109 ₽ до 14 суток','ТЗ §4.3']])}</section>
 <section class="v-card"><h2>Пилот и масштабирование</h2><div class="v-flow"><div><b>10 ПВЗ / 30 дней</b><small>Контрольная группа, 500–1000 SKU</small></div><div><b>≥5% снижения затрат</b><small>Сопоставимые заказы и расстояния</small></div><div><b>99,5% точности</b><small>Целевая метрика, не результат MVP</small></div><div><b>Масштаб после пилота</b><small>API, БД, очередь, мониторинг, резервирование</small></div></div></section>`;
}

export function renderWorkspace(m,tab,go){
 manager=m;navigate=go;const s=m.getState();
 if(!initialized){setup();initialized=true;}
 const panel=document.getElementById(`panel-${tab}`);if(!panel)return;
 const renders={dashboard,pvz,seller,mcs,economics:state=>economicsView(state,view.sim),demo,settings};
 panel.classList.add('v8');panel.innerHTML=(view.notice?`<div class="v-notice" role="status">${esc(view.notice)}</div>`:'')+renders[tab](s);
 document.body.classList.toggle('jury-mode',s.ui.role==='jury');
}
function notice(text){view.notice=text;renderWorkspace(manager,window.currentTab,navigate);}
function setup(){
 const main=document.getElementById('main');
 main.addEventListener('input',event=>{const id=event.target.dataset.sim;if(!id)return;
  const keys={simBatch:'n',simDays:'days',simStops:'stops',simWait:'wait',simFixed:'fixed',simReturns:'returns',simShare:'share',simOverhead:'overhead'};
  view.sim[keys[id]]=Number(event.target.value);document.getElementById(`${id}Value`).textContent=event.target.value;
  document.getElementById('simulationResults').innerHTML=simulationResults(manager.state,view.sim);
 });
 main.addEventListener('change',async event=>{
  if(event.target.id==='workspaceNode'){manager.state.ui.selectedPvzId=event.target.value;view.node=event.target.value;manager.notify();}
  if(event.target.id==='workspaceSeller'){manager.state.ui.selectedSellerId=event.target.value;manager.notify();}
  if(event.target.id==='v8Import'&&event.target.files[0]){try{manager.importState(await event.target.files[0].text());notice('Состояние импортировано');}catch(e){notice(`Импорт отклонён: ${e.message}`);}}
 });
 main.addEventListener('submit',event=>{
  event.preventDefault();const form=event.target,data=new FormData(form);
  try{
   if(form.id==='receiveForm'){const r=manager.receiveSupply(view.node,data.get('product'),Number(data.get('quantity')),data.get('batch')||undefined);notice(r.success?'Поставка принята, остатки обновлены':r.error);}
   if(form.id==='orderForm'){const o=manager.createOrder({productId:data.get('product'),quantity:Number(data.get('quantity')),sourcePvzId:data.get('source'),destinationPvzId:view.node,promisedHours:Number(data.get('promise'))});const r=manager.routeOrder(o.id);notice(r.success?`Маршрут ${o.routeType} выбран, товар зарезервирован`:r.error);}
  }catch(e){notice(e.message);}
 });
 main.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.dataset.node){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 main.addEventListener('click',event=>{
  const node=event.target.closest('[data-node]');if(node){view.node=node.dataset.node;navigate('mcs');return;}
  const target=event.target.closest('[data-action]');if(!target)return;const a=target.dataset.action;
  try{
   if(a==='goto')navigate(target.dataset.tab);
   if(a==='demo'){view.notice='';runScenario(manager,target.dataset.scenario);navigate('demo');}
   if(a==='plan'){const r=scheduleTransfer(manager,target.dataset.plan);notice(r.success?'Товар и вместимость будущего рейса зарезервированы':r.error);}
   if(a==='plan-all'){const plans=buildTransferPlan(manager.state).filter(p=>p.available);let count=0;for(const p of plans)if(scheduleTransfer(manager,p.id).success)count++;notice(`Запланировано перемещений: ${count}`);}
   if(a==='move'){const r=progressTransfer(manager,target.dataset.move);notice(r.success?'Перемещение обновлено; остатки и журнал согласованы':r.error);}
   if(a==='withdraw'){const r=progressWithdrawal(manager,target.dataset.withdraw);notice(r.success?'Вывоз обновлён, остатки и журнал согласованы':r.error);}
   if(a==='order'){const r=manager.processOrderAction(target.dataset.order,target.dataset.op);notice(r.success?(r.replayed?'Операция уже выполнена':'Операция выполнена, остатки и начисления обновлены'):r.error);}
   if(a==='inspect'){const fit=confirm('Осмотр выполнен, товар пригоден к продаже?');if(fit){const r=manager.resolveReturn(target.dataset.batch,'resell',{fit:true});notice(r.success?(r.message||'Пригодность и локальный спрос подтверждены, товар доступен'):r.error);}}
   if(a==='pause-node'){const p=manager.state.pvzs.get(view.node);manager.setNodeStatus(p.id,p.status==='active'?'paused':'active');}
   if(a==='fail-node'){manager.setNodeStatus(view.node,'down');notice('Сбой узла сохранён. Новые расчёты исключают недоступный путь.');}
   if(a==='jury'){manager.state.ui.role=manager.state.ui.role==='jury'?'pvz_owner':'jury';document.getElementById('roleSelect').value=manager.state.ui.role;manager.notify();}
   if(a==='mcs-availability'){manager.setMcsAvailable(manager.state.mcsStatus==='error');notice(manager.state.mcsStatus==='error'?'Сбой MCS: новые заказы идут по классике C1/C2':'MCS восстановлена');}
   if(a==='restore-demo'&&manager.lastDemoBackup){manager.importState(manager.lastDemoBackup);manager.lastDemoBackup=null;notice('Восстановлен снимок до последнего демо-сценария');}
   if(a==='reset'&&confirm('Сбросить заказы, начисления и виртуальное время?')){manager.lastDemoBackup=manager.exportState();manager.resetDemo();view.notice='Демонстрационные данные восстановлены';manager.notify();}
   if(a==='export'){const blob=new Blob([manager.exportState()],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='WB-Mesh-state.json';link.click();URL.revokeObjectURL(link.href);}
  }catch(e){notice(e.message);}
 });
 window.WBMesh.runScenario=id=>runScenario(manager,id);
}
