import {CostEngine} from '../core/cost-engine.js';
import {rub,stat,table,chip,heading,escapeHtml} from './view-utils.js';
import {networkSvg} from './network-view.js';

const articles={transport:'Перевозка и размещение',placement:'Перевозка и размещение',storage:'Хранение и обработка',sorting:'Сортировка',lastMile:'Локальная доставка',pvz:'Обычная выдача и бонус',returns:'Возвраты и потери',it:'IT и управление'};
export function evaluateSimulation(state,sim){
 const e=new CostEngine({...state.tariffs,fixedTripCost:sim.fixed*100});
 const mesh=e.calculateOrder({batchSize:sim.n,days:sim.days,stops:sim.stops,waitMinutes:sim.wait,returnRate:sim.returns/100});
 const admitted=Object.values(mesh.guards).every(Boolean) && sim.n<=state.tariffs.vehicleCapacity && sim.wait<=10;
 const route=admitted?'M2':'C1';
 return {e,mesh,admitted,route,scale:e.calculateScale({meshShare:sim.share/100,savings:mesh.savings,fixedMonthly:sim.overhead*100})};
}
export function simulationResults(state,sim){
 const {e,mesh:m,admitted,route,scale}=evaluateSimulation(state,sim);
 const investment=e.calculateInvestment({unitSavings:m.savings,fixedMonthly:sim.overhead*100});
 const c=m.classic.breakdown;
 const rows=Object.entries(m.breakdown).map(([key,value])=>{
  const cv=key==='placement'?c.transport:c[key];
  return [articles[key],rub(cv),rub(value),`<span class="${cv-value>=0?'positive':'negative'}">${rub(cv-value)}</span>`];
 });
 const reasons=[];for(const [key,ok]of Object.entries(m.guards))if(!ok)reasons.push({wb:'Нет достаточной экономии WB',pvz:'Нет положительного результата ПВЗ',seller:'Экономика продавца ухудшается',buyer:'Нарушен срок покупателя'}[key]);
 if(sim.wait>10)reasons.push('Ожидание курьера превышает 10 минут');
 const routeObj={type:route,sourcePvzId:'pvz-perm-plus',destinationPvzId:'pvz-perm-krasnov'};
 return `<div class="v-stats">${stat('Классическая цепочка',rub(m.classic.total),'Те же параметры заказа')}${stat('Полная Mesh-цепочка',rub(m.total),'Все семь статей расходов')}${stat('Экономия на единицу',rub(m.savings),`${(m.savings/m.classic.total*100).toFixed(2).replace('.',',')}% к классике`,m.savings>0?'positive':'negative')}${stat('Доп. результат ПВЗ',rub(m.pvz.result),'Начисления минус труд, площадь и риск')}</div>
 <section class="v-decision ${admitted?'accepted':'rejected'}" id="simDecision"><div>${chip(route)}<h2>${admitted?'Mesh выгоден всем участникам':'Выбран классический маршрут'}</h2><p>${admitted?'Условия WB, ПВЗ, продавца и покупателя выполнены.':escapeHtml(reasons.join('. '))}</p></div><strong>${admitted?'6':'40'} ч<small>расчётный срок</small></strong></section>
 <div class="v-grid two"><section class="v-card"><div class="v-card-head"><h2>Каждая копейка объяснима</h2>${chip('₽ на единицу')}</div>${table(['Статья','Классика','Mesh','Разница'],rows)}<div class="v-total"><span>Полная себестоимость</span><strong>${rub(m.classic.total)} / ${rub(m.total)}</strong></div><details><summary>Как посчитано</summary><p>Рейс в копейках: ${escapeHtml(m.trip.formula)} = ${m.trip.total}; доля = ceil(${m.trip.total} / ${sim.n}) = ${m.trip.perParcel}.</p><p>Хранение: ${escapeHtml(e.calculateStorageCost(sim.days).formula)}. Возвраты Mesh: r × (800 + 500q + 4500(1−q)) + 0,005 × 40000; r=${sim.returns/100}, q=0,5.</p><p>Итого: ${Object.values(m.breakdown).join(' + ')} = ${m.total} коп. Округление доли рейса вверх до копейки; общая стоимость рейса хранится отдельно.</p></details></section>
 <section class="v-card"><div class="v-card-head"><h2>Маршрут меняется вместе с экономикой</h2></div>${networkSvg(state,routeObj)}<p class="v-note">${route==='M2'?'Прямой рейс ПВЗ → ПВЗ':'Перевозка через городской хаб'}. Это расчётный сценарий; реальные заказы создаются в рабочем месте ПВЗ.</p></section></div>
 <div class="v-grid four v-sides">
 <section class="v-card"><h3>Wildberries</h3><strong>${rub(m.wb.margin)}</strong><p>Маржа логистики = ${rub(m.wb.revenue)} − ${rub(m.wb.cost)}. Выручка и себестоимость учитываются отдельно.</p></section>
 <section class="v-card"><h3>ПВЗ</h3><strong>${rub(m.pvz.result)}</strong><p>Дополнительный результат = ${rub(m.pvz.revenue)} − ${rub(m.pvz.cost)}. Обычная выдача ${rub(m.pvz.ordinaryReward)} не считается дополнительным доходом.</p></section>
 <section class="v-card"><h3>Продавец</h3><strong>${rub(m.seller.after-m.seller.before)}</strong><p>Изменение прибыли. До: ${rub(m.seller.before)}; после: ${rub(m.seller.after)}. Цена − закупка − комиссия − логистика.</p></section>
 <section class="v-card"><h3>Покупатель</h3><strong>${rub(m.buyer.delivery)}</strong><p>Доставка без наценки. Цена товара ${rub(m.buyer.price)}; выбранный ПВЗ сохраняется. Обещание: ${m.buyer.promisedHours} ч.</p></section></div>
 <div class="v-grid two"><section class="v-card"><h2>Два разных порога</h2><div class="v-stats">${stat('Транспортный порог',`${e.calculateTransportThreshold(sim.stops,sim.wait)} шт.`,'База 24 ₽ за плечо')}${stat('Полная цепочка',`${e.calculateBreakEvenThreshold(sim.stops,sim.wait,sim.days)} шт.`,'Все статьи, равенство с классикой')}</div><p>При 1 остановке и без простоя транспорт равен альтернативе на 30 отправлениях; положительная экономия начинается с 31. Для всей цепочки базовый порог — 26.</p></section>
 <section class="v-card"><h2>Сценарий масштаба</h2><strong class="v-big">${rub(scale.net)}<small> / месяц</small></strong><p>${scale.meshOrders.toLocaleString('ru-RU')} Mesh-заказов × ${rub(m.savings)} − ${rub(scale.fixedMonthly)} постоянных расходов.</p><p class="v-note">Сценарные 80 млн заказов в месяц. IT уже включён в себестоимость; постоянные расходы задаются отдельно только для непересекающихся затрат. Это операционный эффект, не чистая прибыль и не прогноз WB.</p></section></div>
 <section class="v-card"><h2>Инвестиционный сценарий на 36 месяцев</h2><div class="v-stats">${stat('NPV',rub(investment.npv),'Дисконтирование 20% годовых')}${stat('ROI',investment.roi===null?'Не определён':`${(investment.roi*100).toFixed(1)}%`,'Выгода минус затраты / затраты')}${stat('Окупаемость',investment.payback?`${investment.payback} мес.`:'За 36 мес. не достигнута','С учётом начальных инвестиций')}</div><p class="v-note">Сценарные допущения ТЗ: разработка 90 млн ₽, подготовка точки 15 тыс. ₽ на 1000 Mesh-заказов/месяц, доля 0,2% → 2% → 10% → 30%. GMV не увеличивается автоматически. Для убыточного рейса инвестиционный сценарий предполагает отказ от Mesh (экономия 0). Положительные результаты не являются прогнозом WB.</p><details><summary>Формулы инвестиционного сценария</summary><p>${investment.formula}. CF = экономия − отдельные постоянные расходы − подготовка новых точек. Начальные инвестиции вычитаются один раз. Налоговая и финансовая отчётность не моделируется.</p></details></section>`;
}
export function economicsView(state,sim){
 const slider=(id,label,value,min,max,unit,step=1)=>`<label class="v-control" for="${id}"><span>${label}<output id="${id}Value">${value} ${unit}</output></span><input id="${id}" data-sim="${id}" type="range" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
 return heading('Экономика, которую можно проверить','Измените параметры — стоимость, маршрут и объяснение пересчитаются одним расчётным ядром.')+
 `<section class="v-card v-simulator"><div class="v-card-head"><h2>Параметры одного и того же заказа</h2>${chip('Допущения ТЗ · не тарифы WB')}</div><div class="v-controls">
 ${slider('simBatch','Отправлений в рейсе',sim.n,1,80,'шт.')}${slider('simDays','Хранение',sim.days,0,60,'сут')}${slider('simStops','Остановки',sim.stops,1,4,'')}${slider('simWait','Простой курьера',sim.wait,0,30,'мин')}${slider('simFixed','Выезд машины',sim.fixed,0,1200,'₽',10)}${slider('simReturns','Возвраты',sim.returns,0,60,'%')}${slider('simShare','Доля Mesh в сценарии',sim.share,0,100,'%')}${slider('simOverhead','Постоянные расходы / мес.',sim.overhead,0,50000000,'₽',1000000)}</div></section><div id="simulationResults">${simulationResults(state,sim)}</div>`;
}
