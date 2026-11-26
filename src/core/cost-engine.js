/** All money is integer kopecks. Source: supplied TZ, sections 3.3 and 4.1–4.7. */
import { DEFAULT_TARIFFS } from './types.js';

export function numberInRange(value, name, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) {
    throw new RangeError(`Некорректное значение: ${name}`);
  }
  return value;
}

export class CostEngine {
  constructor(tariffs = DEFAULT_TARIFFS) {
    this.tariffs = { ...DEFAULT_TARIFFS, ...tariffs };
  }

  calculateTripCost(parcelsCount, stops = 1, waitMinutes = 0) {
    numberInRange(parcelsCount, 'посылки', 1, 100000, true);
    numberInRange(stops, 'остановки', 1, 100, true);
    numberInRange(waitMinutes, 'простой', 0, 1440);
    const t = this.tariffs;
    const breakdown = { fixed: t.fixedTripCost, variable: t.variablePerParcel * parcelsCount,
      extraStops: t.extraStopCost * (stops - 1), wait: Math.round(t.courierWaitPerMin * waitMinutes),
      parcels: parcelsCount, stops, waitMinutes };
    const total = breakdown.fixed + breakdown.variable + breakdown.extraStops + breakdown.wait;
    return { total, perParcel: Math.ceil(total / parcelsCount), breakdown,
      formula: `${t.fixedTripCost} + ${t.variablePerParcel} × ${parcelsCount} + ${t.extraStopCost} × (${stops} − 1) + ${t.courierWaitPerMin} × ${waitMinutes}` };
  }

  calculateStorageCost(days = 10, baseRate = this.tariffs.storagePerDay) {
    numberInRange(days, 'срок хранения', 0, 3650);
    numberInRange(baseRate, 'ставка хранения');
    let total = 0;
    const daily = [];
    for (let day = 1; day <= Math.ceil(days); day++) {
      const factor = day <= 14 ? 1 : day <= 30 ? this.tariffs.storageMidMultiplier : this.tariffs.storageLateMultiplier;
      const rate = Math.round(baseRate * factor * Math.min(1, days - day + 1));
      total += rate;
      daily.push({ day, rate, cumulative: total });
    }
    return { total, breakdown: { baseRate, includedSellerDays: 14, paidDays: Math.max(0, days - 14), daily },
      formula: 'r × min(d,14) + 1,5r × min(max(d−14,0),16) + 2,5r × max(d−30,0)' };
  }

  calculatePvzPayout(days = 10) {
    const t = this.tariffs;
    const breakdown = { receive: t.receiveFee, storage: this.calculateStorageCost(days).total,
      pack: t.packFee, bonus: t.pvzBonus };
    return { total: Object.values(breakdown).reduce((a,b) => a+b,0), breakdown };
  }

  calculatePvzCost(days = 10) {
    numberInRange(days, 'срок хранения', 0, 3650);
    const t = this.tariffs;
    const breakdown = { ops: t.partnerOpsCost, shelf: Math.round(days * t.partnerShelfPerDay), risk: t.partnerRiskCost };
    return { total: Object.values(breakdown).reduce((a,b) => a+b,0), breakdown };
  }

  calculateOperationalAdjustments({assemblyMinutes=0,waitMinutes=0,route='M2',hour=10}={}) {
    numberInRange(assemblyMinutes,'минуты сборки');numberInRange(waitMinutes,'простой');
    const t=this.tariffs;
    const fastBonus=assemblyMinutes<=t.assemblySlaMinutes && !(hour>=18&&hour<21)?t.fastAssemblyBonus:0;
    const noWaitBonus=route==='M2'&&waitMinutes===0?t.noWaitBonus:0;
    const late=Math.max(0,assemblyMinutes-t.assemblySlaMinutes,waitMinutes-t.courierMaxWaitMinutes);
    const penalty=late>0?Math.min(t.latePenaltyMax,t.latePenaltyBase+Math.ceil(late)*t.latePenaltyPerMinute):0;
    const bonus=fastBonus+noWaitBonus;
    return {bonus,penalty,net:bonus-t.pvzBonus-penalty,fastBonus,noWaitBonus,
      formula:'Фактический бонус − базовый бонусный пул − min(60 ₽; 10 ₽ + 2 ₽ × минут просрочки). Пул заменяется, не прибавляется повторно.'};
  }

  calculateClassicCost(days = 10, route = 'C1', returnRate = this.tariffs.returnRate) {
    numberInRange(days, 'срок хранения', 0, 3650);
    numberInRange(returnRate, 'возвраты', 0, 1);
    const t = this.tariffs;
    const breakdown = { transport: t.classicTransport + (route === 'C2' ? t.intercitySurcharge : 0),
      storage: Math.round(t.hubStoragePerDay * days), sorting: t.classicSorting,
      lastMile: t.classicLastMile, pvz: t.classicPVZ,
      returns: Math.round(returnRate * t.hubReturnCost + t.classicLossRate * t.damageCost), it: t.classicIT };
    return { total: Object.values(breakdown).reduce((a,b) => a+b,0), breakdown };
  }

  calculateMeshVariableCost(days = 10, route = 'M2', returnRate = this.tariffs.returnRate, resaleShare = this.tariffs.resaleShare) {
    numberInRange(returnRate, 'возвраты', 0, 1);
    numberInRange(resaleShare, 'локальная перепродажа', 0, 1);
    const t = this.tariffs;
    const breakdown = { placement: t.meshPlacement,
      storage: this.calculateStorageCost(days).total + t.receiveFee + t.packFee,
      sorting: route === 'M1' ? t.meshLocalSorting : t.meshSorting,
      lastMile: 0, pvz: t.classicPVZ + t.pvzBonus,
      returns: Math.round(returnRate * (t.returnInspection + t.localRestockCost * resaleShare + t.hubReturnCost * (1-resaleShare)) + t.meshLossRate * t.damageCost),
      it: t.meshIT };
    return { total: Object.values(breakdown).reduce((a,b) => a+b,0), breakdown };
  }

  calculateTransportThreshold(stops = 1, waitMinutes = 0) {
    const t = this.tariffs;
    const fixed = this.calculateTripCost(1, stops, waitMinutes).total - t.variablePerParcel;
    const contribution = t.classicLastMile - t.variablePerParcel;
    return contribution > 0 ? Math.ceil(fixed / contribution) : Infinity;
  }

  calculateBreakEvenThreshold(stops = 1, waitMinutes = 0, days = 10) {
    const t = this.tariffs;
    const fixed = this.calculateTripCost(1, stops, waitMinutes).total - t.variablePerParcel;
    const contribution = this.calculateClassicCost(days).total - this.calculateMeshVariableCost(days).total - t.variablePerParcel;
    return contribution > 0 ? Math.ceil(fixed / contribution) : Infinity;
  }

  calculateOrder({route = 'M2', batchSize = 40, days = 10, stops = 1, waitMinutes = 0,
    returnRate = this.tariffs.returnRate, resaleShare = this.tariffs.resaleShare, price = 100000,
    purchaseCost = 60000, commissionRate = .15, buyerDelivery = 0, promisedHours = 60,baselineRoute} = {}) {
    for (const [name,value] of Object.entries({price,purchaseCost,buyerDelivery})) numberInRange(value,name);
    numberInRange(commissionRate, 'комиссия', 0, 1);
    const t = this.tariffs;
    const classicRoute = baselineRoute || (route === 'C2' ? 'C2' : 'C1');
    const classic = this.calculateClassicCost(days, classicRoute, returnRate);
    const isMesh = route === 'M1' || route === 'M2';
    const variable = isMesh ? this.calculateMeshVariableCost(days, route, returnRate, resaleShare) : classic;
    const trip = route === 'M2' ? this.calculateTripCost(batchSize, stops, waitMinutes) : null;
    const breakdown = {...variable.breakdown};
    if (trip) breakdown.lastMile = trip.perParcel;
    const total = Object.values(breakdown).reduce((a,b) => a+b,0);
    const pvzRevenue = isMesh ? this.calculatePvzPayout(days).total : 0;
    const pvzCost = isMesh ? this.calculatePvzCost(days).total : 0;
    const extraDays = Math.max(0, days - 14);
    const classicFee = t.sellerClassicFee + Math.round(extraDays * t.sellerClassicStorage) + (classicRoute==='C2'?t.intercitySurcharge:0);
    const meshFee = t.sellerMeshFee + Math.round(Math.min(extraDays,16)*t.sellerMeshStorageMid + Math.max(0,days-30)*t.sellerMeshStorageLate);
    const fee = isMesh ? meshFee : classicFee;
    const commission = Math.round(price * commissionRate);
    const sellerBefore = price - purchaseCost - commission - classicFee;
    const sellerAfter = price - purchaseCost - commission - fee;
    const etaHours = {M1:1,M2:6,C1:40,C2:60}[route];
    const savings = classic.total - total;
    return { route, total, breakdown, classic, trip, savings, days, batchSize, etaHours,
      parameters:{route,baselineRoute:classicRoute,batchSize,days,stops,waitMinutes,returnRate,resaleShare,price,purchaseCost,commissionRate,promisedHours},
      formula: 'Σ(перевозка, хранение, сортировка, доставка, ПВЗ, риски, IT)',
      wb: { cost: total, revenue: fee, margin: fee-total, baselineMargin: classicFee-classic.total },
      pvz: { ordinaryReward: t.classicPVZ, revenue: pvzRevenue, cost: pvzCost, result: pvzRevenue-pvzCost },
      seller: { price, purchaseCost, commission, classicFee, fee, before: sellerBefore, after: sellerAfter },
      buyer: { price, delivery: buyerDelivery, baselineDelivery: buyerDelivery, promisedHours, etaHours },
      guards: { wb: savings >= t.minimumSavings && fee-total >= classicFee-classic.total, pvz: pvzRevenue-pvzCost > 0,
        seller: sellerAfter >= sellerBefore, buyer: etaHours <= promisedHours && etaHours <= (classicRoute === 'C2' ? 60 : 40) } };
  }

  calculateScale({monthlyOrders=80000000,meshShare=.3,savings=704,fixedMonthly=0}={}) {
    numberInRange(monthlyOrders,'объём',0,1e12,true); numberInRange(meshShare,'доля Mesh',0,1);
    numberInRange(fixedMonthly,'постоянные затраты');
    const meshOrders = Math.round(monthlyOrders*meshShare);
    const gross = Math.round(meshOrders*savings);
    return {meshOrders,gross,fixedMonthly,net:gross-fixedMonthly,annual:(gross-fixedMonthly)*12};
  }

  calculateInvestment({unitSavings=704,monthlyOrders=80000000,fixedMonthly=0,initialInvestment=9000000000,nodeInvestment=1500000,annualDiscount=.2,months=36}={}) {
    numberInRange(unitSavings,'unitSavings',-1e12,1e12);
    for(const [key,value]of Object.entries({monthlyOrders,fixedMonthly,initialInvestment,nodeInvestment,annualDiscount,months}))numberInRange(value,key);
    let npv=-initialInvestment,balance=-initialInvestment,benefits=0,costs=initialInvestment,nodes=0,payback=null;
    const cashflows=[];
    for(let month=1;month<=months;month++){
      const share=month<=3?.002:month<=9?.02:month<=18?.1:.3;
      const orders=Math.round(monthlyOrders*share),needed=Math.ceil(orders/1000),capex=Math.max(0,needed-nodes)*nodeInvestment;
      nodes=Math.max(nodes,needed);const gross=orders*unitSavings,opex=fixedMonthly*(month<=3?.3:1),cash=gross-opex-capex;
      balance+=cash;npv+=cash/(1+annualDiscount)**(month/12);benefits+=gross;costs+=opex+capex;
      if(payback===null&&balance>=0)payback=month;
      cashflows.push({month,share,orders,gross,opex,capex,cash,balance});
    }
    return {npv:Math.round(npv),roi:costs?(benefits-costs)/costs:null,payback,benefits,costs,cashflows,
      formula:'NPV = −I0 + Σ CFm / (1+r)^(m/12); ROI = (выгода−затраты)/затраты'};
  }

  static calculateTripCost(t,...args) { return new CostEngine(t).calculateTripCost(...args); }
  static calculateStorageCost(t,...args) { return new CostEngine(t).calculateStorageCost(...args); }
  static calculatePvzPayout(t,...args) { return new CostEngine(t).calculatePvzPayout(...args); }
  static calculatePvzCost(t,...args) { return new CostEngine(t).calculatePvzCost(...args); }
  static calculateClassicCost(t,...args) { return new CostEngine(t).calculateClassicCost(...args); }
  static calculateMeshVariableCost(t,...args) { return new CostEngine(t).calculateMeshVariableCost(...args); }
  static calculateBreakEvenThreshold(t,...args) { return new CostEngine(t).calculateBreakEvenThreshold(...args); }
}
