/**
 * WB Mesh — MCS Calculation Engine
 * Core routing, cost calculation, and decision logic
 * Independent from UI - pure calculation module
 */

import {
  DEFAULT_TARIFFS,
  OrderStatus,
  RouteType,
  City,
  PVZType,
  ProductSize
} from './types.js';

// ============================================
// COST ENGINE
// ============================================

export class CostEngine {
  /**
   * @param {Object} [tariffs=DEFAULT_TARIFFS]
   */
  constructor(tariffs = DEFAULT_TARIFFS) {
    /** @type {Object} */
    this.tariffs = tariffs;
  }

  /**
   * Calculate trip cost
   * Formula: C = 48000 + 800*n + 4000*(k-1) + 600*t (kopecks)
   * @param {number} parcelsCount
   * @param {number} [stops=1]
   * @param {number} [waitMinutes=0]
   * @returns {{total: number, perParcel: number, breakdown: Object}}
   */
  calculateTripCost(parcelsCount, stops = 1, waitMinutes = 0) {
    const { fixedTripCost, variablePerParcel, extraStopCost, courierWaitPerMin } = this.tariffs;

    const fixedAdjusted = fixedTripCost;
    const variableCost = variablePerParcel * parcelsCount;
    const extraStopsCost = stops > 1 ? extraStopCost * (stops - 1) : 0;
    const waitCost = courierWaitPerMin * waitMinutes;

    const total = fixedAdjusted + variableCost + extraStopsCost + waitCost;
    const perParcel = parcelsCount > 0 ? Math.ceil(total / parcelsCount) : 0;

    return {
      total,
      perParcel,
      breakdown: {
        fixed: fixedAdjusted,
        variable: variableCost,
        extraStops: extraStopsCost,
        wait: waitCost,
        parcels: parcelsCount,
        stops
      }
    };
  }

  /**
   * Calculate trip cost (static wrapper for direct class calls)
   * @param {Object} tariffs
   * @param {number} parcelsCount
   * @param {number} [stops=1]
   * @param {number} [waitMinutes=0]
   * @returns {{total: number, perParcel: number, breakdown: Object}}
   */
  static calculateTripCost(tariffs, parcelsCount, stops = 1, waitMinutes = 0) {
    return new CostEngine(tariffs).calculateTripCost(parcelsCount, stops, waitMinutes);
  }

  /**
   * Calculate storage cost with progressive tariff
   * @param {number} days
   * @param {number} [baseRate]
   * @returns {{total: number, breakdown: Object}}
   */
  calculateStorageCost(days, baseRate) {
    const rate = baseRate || this.tariffs.storagePerDay;
    const freeDays = this.tariffs.freeStorageDays;
    const multiplier = this.tariffs.progressiveStorageMultiplier;

    let total = 0;
    const dailyBreakdown = [];

    for (let day = 1; day <= days; day++) {
      const dayRate = day <= freeDays ? rate : Math.round(rate * multiplier);
      total += dayRate;
      dailyBreakdown.push({ day, rate: dayRate, cumulative: total });
    }

    return {
      total,
      breakdown: {
        freeDays,
        paidDays: Math.max(0, days - freeDays),
        baseRate: rate,
        multiplier,
        daily: dailyBreakdown
      }
    };
  }

  /**
   * Calculate PVZ payout for an order
   * @param {number} storageDays
   * @returns {{total: number, breakdown: Object}}
   */
  calculatePvzPayout(storageDays) {
    const { receiveFee, storagePerDay, packFee, transferFee } = this.tariffs;
    const storage = storageDays * storagePerDay;
    const total = receiveFee + storage + packFee + transferFee;

    return {
      total,
      breakdown: {
        receive: receiveFee,
        storage,
        pack: packFee,
        transfer: transferFee
      }
    };
  }

  /**
   * Calculate PVZ cost for an order
   * @param {number} storageDays
   * @returns {{total: number, breakdown: Object}}
   */
  calculatePvzCost(storageDays) {
    const { partnerOpsCost, partnerShelfPerDay, transferFee } = this.tariffs;
    const shelf = storageDays * partnerShelfPerDay;
    const total = partnerOpsCost + shelf + transferFee;

    return {
      total,
      breakdown: {
        ops: partnerOpsCost,
        shelf,
        transfer: transferFee
      }
    };
  }

  /**
   * Calculate Classic logistics cost per order
   * @returns {{total: number, breakdown: Object}}
   */
  calculateClassicCost() {
    const t = this.tariffs;
    const total = t.classicTransport + t.classicStorage + t.classicSorting +
                  t.classicLastMile + t.classicPVZ + t.classicReturns + t.classicIT;

    return {
      total,
      breakdown: {
        transport: t.classicTransport,
        storage: t.classicStorage,
        sorting: t.classicSorting,
        lastMile: t.classicLastMile,
        pvz: t.classicPVZ,
        returns: t.classicReturns,
        it: t.classicIT
      }
    };
  }

  /**
   * Calculate Mesh variable cost per order (no trip cost)
   * @returns {{total: number, breakdown: Object}}
   */
  calculateMeshVariableCost() {
    const t = this.tariffs;
    const total = t.meshPlacement + t.meshStorage + t.meshSorting +
                  t.meshLastMile + t.meshPVZ + t.meshReturns + t.meshIT;

    return {
      total,
      breakdown: {
        placement: t.meshPlacement,
        storage: t.meshStorage,
        sorting: t.meshSorting,
        lastMile: t.meshLastMile,
        pvz: t.meshPVZ,
        returns: t.meshReturns,
        it: t.meshIT
      }
    };
  }

  /**
   * Calculate break-even threshold for a trip
   * @param {number} [stops=1]
   * @param {number} [waitMinutes=5]
   * @returns {number} minimum parcels for break-even
   */
  calculateBreakEvenThreshold(stops = 1, waitMinutes = 5) {
    const classic = this.calculateClassicCost().total;
    const meshVar = this.calculateMeshVariableCost().total;
    const { fixedTripCost, variablePerParcel, extraStopCost, courierWaitPerMin } = this.tariffs;

    // Find minimum n where: (fixedTripCost + variablePerParcel*n + extraStops + wait) / n + meshVar <= classic
    // fixedTripCost/n + variablePerParcel + (extraStops+wait)/n + meshVar <= classic
    // n >= (fixedTripCost + extraStops + wait) / (classic - meshVar - variablePerParcel)

    const extraStopsCost = stops > 1 ? extraStopCost * (stops - 1) : 0;
    const waitCost = courierWaitPerMin * waitMinutes;
    const fixedTotal = fixedTripCost + extraStopsCost + waitCost;
    const savingsPerParcel = classic - meshVar - variablePerParcel;

    if (savingsPerParcel <= 0) return Infinity;

    return Math.ceil(fixedTotal / savingsPerParcel);
  }

  // ============================================
  // STATIC WRAPPERS (for direct CostEngine.method() calls)
  // ============================================

  static calculateStorageCost(tariffs, days, baseRate) {
    return new CostEngine(tariffs).calculateStorageCost(days, baseRate);
  }

  static calculatePvzPayout(tariffs, storageDays) {
    return new CostEngine(tariffs).calculatePvzPayout(storageDays);
  }

  static calculatePvzCost(tariffs, storageDays) {
    return new CostEngine(tariffs).calculatePvzCost(storageDays);
  }

  static calculateClassicCost(tariffs) {
    return new CostEngine(tariffs).calculateClassicCost();
  }

  static calculateMeshVariableCost(tariffs) {
    return new CostEngine(tariffs).calculateMeshVariableCost();
  }

  static calculateBreakEvenThreshold(tariffs, stops = 1, waitMinutes = 5) {
    return new CostEngine(tariffs).calculateBreakEvenThreshold(stops, waitMinutes);
  }
}

// ============================================
// ROUTE OPTIMIZER
// ============================================

export class RouteOptimizer {
  /**
   * @param {Object} tariffs
   */
  constructor(tariffs = DEFAULT_TARIFFS) {
    this.tariffs = tariffs;
    this.costEngine = new CostEngine(tariffs);
  }

  /**
   * Find all route candidates for an order
   * @param {Object} order
   * @param {Map<string, Object>} pvzs
   * @param {Map<string, Object>} cities
   * @returns {Array<Object>} candidates
   */
  findCandidates(order, pvzs, cities) {
    const sourcePvz = pvzs.get(order.sourcePvzId);
    const destPvz = pvzs.get(order.destinationPvzId);
    if (!sourcePvz || !destPvz) return [];

    const candidates = [];
    const classicCost = this.costEngine.calculateClassicCost().total;

    // M1: Same PVZ
    if (sourcePvz.id === destPvz.id) {
      candidates.push(this.buildCandidate('M1', order, sourcePvz, destPvz, pvzs, {
        tripCost: 0,
        stops: 0,
        waitMinutes: 0,
        etaHours: 0.5,
        meshVariable: true
      }));
    }

    // M2: Direct mesh-to-mesh (same city)
    if (sourcePvz.cityId === destPvz.cityId &&
        sourcePvz.type === PVZType.MESH &&
        destPvz.type === PVZType.MESH &&
        sourcePvz.id !== destPvz.id) {
      candidates.push(this.buildCandidate('M2', order, sourcePvz, destPvz, pvzs, {
        tripCost: this.costEngine.calculateTripCost(order.quantity, 1, 5).total,
        stops: 1,
        waitMinutes: 5,
        etaHours: this.tariffs.meshHours,
        meshVariable: true
      }));
    }

    // C1: Via hub (same city)
    if (sourcePvz.cityId === destPvz.cityId) {
      const city = cities.get(sourcePvz.cityId);
      const hub = pvzs.get(city?.hubId);
      if (hub) {
        const legs = 2; // source->hub, hub->dest
        const tripCost = this.costEngine.calculateTripCost(order.quantity, legs, 10).total;
        candidates.push(this.buildCandidate('C1', order, sourcePvz, destPvz, pvzs, {
          tripCost,
          stops: legs,
          waitMinutes: 10,
          etaHours: this.tariffs.hubHours,
          meshVariable: false
        }));
      }
    }

    // C2: Inter-city via trunk
    if (sourcePvz.cityId !== destPvz.cityId) {
      const srcCity = cities.get(sourcePvz.cityId);
      const dstCity = cities.get(destPvz.cityId);
      const srcHub = pvzs.get(srcCity?.hubId);
      const dstHub = pvzs.get(dstCity?.hubId);
      if (srcHub && dstHub) {
        const legs = 4; // src->srcHub, srcHub->dstHub (trunk), dstHub->dest, + return
        const tripCost = this.costEngine.calculateTripCost(order.quantity, legs, 20).total;
        candidates.push(this.buildCandidate('C2', order, sourcePvz, destPvz, pvzs, {
          tripCost,
          stops: legs,
          waitMinutes: 20,
          etaHours: this.tariffs.hubHours * 2,
          meshVariable: false
        }));
      }
    }

    // Check constraints for each candidate
    return candidates.map(c => this.checkConstraints(c, order, pvzs));
  }

  /**
   * Build route candidate object
   */
  buildCandidate(type, order, sourcePvz, destPvz, pvzs, params) {
    const { tripCost, stops, waitMinutes, etaHours, meshVariable } = params;
    const classicCost = this.costEngine.calculateClassicCost().total;
    const meshVar = meshVariable ? this.costEngine.calculateMeshVariableCost().total : 0;

    const meshCost = meshVariable
      ? Math.ceil(tripCost / Math.max(1, order.quantity)) + meshVar
      : tripCost + classicCost; // fallback

    const savings = classicCost - meshCost;
    const pvzReward = this.costEngine.calculatePvzPayout(3).total; // assume 3 days avg

    // Vehicle load
    const vehicleLoad = order.quantity / this.tariffs.vehicleCapacity;

    // PVZ load at destination
    const destLoad = destPvz.capacity > 0 ? destPvz.occupiedCapacity / destPvz.capacity : 1;

    return {
      type,
      totalCost: meshCost,
      etaHours,
      stops,
      pvzLoad: destLoad,
      vehicleLoad,
      marketplaceEconomics: {
        classicCost,
        meshCost,
        savings
      },
      pvzReward,
      constraints: [],
      rejectionReasons: [],
      available: true,
      selected: false
    };
  }

  /**
   * Check capacity and SLA constraints
   */
  checkConstraints(candidate, order, pvzs) {
    const destPvz = pvzs.get(order.destinationPvzId);
    const sourcePvz = pvzs.get(order.sourcePvzId);

    // PVZ capacity
    if (destPvz && destPvz.occupiedCapacity + order.quantity > destPvz.capacity) {
      candidate.constraints.push('capacity_exceeded');
      candidate.rejectionReasons.push('ПВЗ переполнен');
      candidate.available = false;
    }

    // Vehicle capacity
    if (candidate.vehicleLoad > 1) {
      candidate.constraints.push('vehicle_overload');
      candidate.rejectionReasons.push('Перегруз транспорта');
      candidate.available = false;
    }

    // SLA check
    if (candidate.etaHours > this.tariffs.slaHours) {
      candidate.constraints.push('sla_violation');
      candidate.rejectionReasons.push('Нарушение SLA');
      candidate.available = false;
    }

    // Operational slots at destination
    if (destPvz && destPvz.operationalSlots <= 0) {
      candidate.constraints.push('no_slots');
      candidate.rejectionReasons.push('Нет операционных слотов');
      candidate.available = false;
    }

    // Source PVZ has inventory for M1/M2
    if (candidate.type === RouteType.M1 || candidate.type === RouteType.M2) {
      // Would check actual inventory in real implementation
    }

    return candidate;
  }

  /**
   * Select best available candidate
   * @param {Array<Object>} candidates
   * @returns {Object|null}
   */
  selectRoute(candidates) {
    const available = candidates.filter(c => c.available);
    if (available.length === 0) return null;

    // Prefer: M1 > M2 > C1 > C2 (by cost efficiency)
    const priority = { M1: 0, M2: 1, C1: 2, C2: 3 };
    available.sort((a, b) => {
      const pa = priority[a.type] ?? 99;
      const pb = priority[b.type] ?? 99;
      if (pa !== pb) return pa - pb;
      return a.totalCost - b.totalCost;
    });

    const selected = available[0];
    selected.selected = true;
    return selected;
  }
}

// ============================================
// INVENTORY MANAGER
// ============================================

export class InventoryManager {
  /**
   * @param {Map<string, Object>} pvzs
   */
  constructor(pvzs) {
    this.pvzs = pvzs;
  }

  /**
   * Get inventory item by batch ID
   */
  getItem(batchId) {
    for (const pvz of this.pvzs.values()) {
      const item = pvz.inventory?.find(i => i.batchId === batchId);
      if (item) return { item, pvz };
    }
    return null;
  }

  /**
   * Reserve quantity for an order
   */
  reserve(batchId, quantity, orderId) {
    const found = this.getItem(batchId);
    if (!found) return { success: false, error: 'Batch not found' };
    if (found.item.status !== 'available') return { success: false, error: 'Not available' };
    if (found.item.quantity < quantity) return { success: false, error: 'Insufficient quantity' };

    found.item.quantity -= quantity;
    found.item.status = 'reserved';
    found.item.reservedForOrderId = orderId;
    return { success: true };
  }

  /**
   * Release reservation
   */
  releaseReservation(batchId, quantity) {
    const found = this.getItem(batchId);
    if (!found) return { success: false, error: 'Batch not found' };
    found.item.quantity += quantity;
    found.item.status = 'available';
    found.item.reservedForOrderId = null;
    return { success: true };
  }

  /**
   * Receive new inventory
   */
  receive(pvzId, productId, quantity, batchId) {
    const pvz = this.pvzs.get(pvzId);
    if (!pvz) return { success: false, error: 'PVZ not found' };

    const existing = pvz.inventory?.find(i => i.batchId === batchId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      pvz.inventory = pvz.inventory || [];
      pvz.inventory.push({
        id: `inv-${Date.now()}`,
        productId,
        quantity,
        batchId,
        receivedAt: 0, // will be set by StateManager
        status: 'available'
      });
    }
    pvz.occupiedCapacity += quantity;
    return { success: true };
  }

  /**
   * Transfer between PVZs
   */
  transfer(fromPvzId, toPvzId, batchId, quantity) {
    const from = this.getItem(batchId);
    if (!from || from.pvz.id !== fromPvzId) return { success: false, error: 'Batch not at source' };
    if (from.item.quantity < quantity) return { success: false, error: 'Insufficient quantity' };

    const toPvz = this.pvzs.get(toPvzId);
    if (!toPvz) return { success: false, error: 'Destination PVZ not found' };

    from.item.quantity -= quantity;
    from.pvz.occupiedCapacity -= quantity;

    const existing = toPvz.inventory?.find(i => i.batchId === batchId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      toPvz.inventory = toPvz.inventory || [];
      toPvz.inventory.push({
        ...from.item,
        id: `inv-${Date.now()}`,
        quantity,
        status: 'in_transit'
      });
    }
    toPvz.occupiedCapacity += quantity;

    return { success: true };
  }

  /**
   * Process return
   */
  processReturn(pvzId, batchId, quantity, reason) {
    const pvz = this.pvzs.get(pvzId);
    if (!pvz) return { success: false, error: 'PVZ not found' };

    const item = pvz.inventory?.find(i => i.batchId === batchId);
    if (item) {
      item.quantity += quantity;
      item.status = 'quarantine';
    } else {
      pvz.inventory = pvz.inventory || [];
      pvz.inventory.push({
        id: `inv-${Date.now()}`,
        productId: batchId.split('-')[0], // extract product from batch
        quantity,
        batchId,
        receivedAt: 0,
        status: 'quarantine'
      });
    }
    pvz.occupiedCapacity += quantity;
    return { success: true };
  }

  /**
   * Resolve quarantine
   */
  resolveQuarantine(batchId, resolution) {
    const found = this.getItem(batchId);
    if (!found) return { success: false, error: 'Batch not found' };

    switch (resolution) {
      case 'resell':
        found.item.status = 'available';
        break;
      case 'transfer':
        found.item.status = 'in_transit';
        break;
      case 'writeoff':
        found.pvz.occupiedCapacity -= found.item.quantity;
        found.pvz.inventory = found.pvz.inventory.filter(i => i.batchId !== batchId);
        break;
    }
    return { success: true };
  }

  /**
   * Age all batches (called on time step)
   */
  ageBatches(hoursPerStep) {
    for (const pvz of this.pvzs.values()) {
      if (!pvz.inventory) continue;
      for (const item of pvz.inventory) {
        item.daysStored = (item.daysStored || 0) + hoursPerStep / 24;
        // Auto-move to quarantine if max storage exceeded
        if (item.daysStored > 60 && item.status === 'available') {
          item.status = 'quarantine';
        }
      }
    }
  }
}

// ============================================
// DEMAND FORECAST
// ============================================

export class DemandForecast {
  /**
   * EWMA forecast
   * @param {number[]} history
   * @param {number} [alpha=0.3]
   * @returns {number}
   */
  static ewma(history, alpha = 0.3) {
    if (!history.length) return 0;
    let forecast = history[0];
    for (let i = 1; i < history.length; i++) {
      forecast = alpha * history[i] + (1 - alpha) * forecast;
    }
    return forecast;
  }

  /**
   * Simple moving average
   * @param {number[]} history
   * @param {number} [window=7]
   * @returns {number}
   */
  static movingAverage(history, window = 7) {
    if (!history.length) return 0;
    const slice = history.slice(-window);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  /**
   * Seasonal naive (same day last week)
   * @param {number[]} history
   * @param {number} [seasonality=7]
   * @returns {number}
   */
  static seasonalNaive(history, seasonality = 7) {
    if (history.length < seasonality) return history[history.length - 1] || 0;
    return history[history.length - seasonality];
  }

  /**
   * Seasonal average
   * @param {number[]} history
   * @param {number} [seasonality=7]
   * @param {number} [periods=4]
   * @returns {number}
   */
  static seasonalAverage(history, seasonality = 7, periods = 4) {
    if (history.length < seasonality * periods) return this.seasonalNaive(history, seasonality);
    let sum = 0;
    for (let p = 1; p <= periods; p++) {
      const idx = history.length - p * seasonality;
      if (idx >= 0) sum += history[idx];
    }
    return sum / periods;
  }

  /**
   * Evaluate forecast methods on holdout
   * @param {number[]} history
   * @param {number} [holdout=14]
   * @returns {Object}
   */
  static evaluate(history, holdout = 14) {
    const train = history.slice(0, -holdout);
    const test = history.slice(-holdout);
    if (!train.length || !test.length) return {};

    const methods = {
      ewma: this.ewma(train),
      movingAverage: this.movingAverage(train),
      seasonalNaive: this.seasonalNaive(train),
      seasonalAverage: this.seasonalAverage(train)
    };

    const results = {};
    for (const [name, forecast] of Object.entries(methods)) {
      let mae = 0, bias = 0, hits = 0, falseDispatch = 0, missed = 0;
      for (let i = 0; i < test.length; i++) {
        const error = forecast - test[i];
        mae += Math.abs(error);
        bias += error;
        if (Math.abs(error) <= 2) hits++;
        if (forecast > test[i] + 2) falseDispatch++;
        if (forecast < test[i] - 2) missed++;
      }
      results[name] = {
        mae: mae / test.length,
        bias: bias / test.length,
        hitRate: hits / test.length,
        falseDispatch,
        missed
      };
    }
    return results;
  }

  /**
   * Generate next day forecast using best method
   * @param {number[]} history
   * @param {number} [seasonality=7]
   * @param {Object} [tariffs]
   * @returns {Object}
   */
  static forecastNextDay(history, seasonality = 7, tariffs) {
    const evalResults = this.evaluate(history);
    const methods = {
      ewma: this.ewma(history),
      movingAverage: this.movingAverage(history),
      seasonalNaive: this.seasonalNaive(history, seasonality),
      seasonalAverage: this.seasonalAverage(history, seasonality)
    };

    // Select best by MAE
    let bestMethod = 'seasonalAverage';
    let bestMae = Infinity;
    for (const [name, metrics] of Object.entries(evalResults)) {
      if (metrics.mae < bestMae) {
        bestMae = metrics.mae;
        bestMethod = name;
      }
    }

    const forecast = methods[bestMethod];
    const conservative = Math.max(0, Math.floor(forecast - evalResults[bestMethod]?.mae || 0));

    return {
      method: bestMethod,
      nextDayForecast: Math.round(forecast),
      conservativeEstimate: conservative,
      mae: bestMae,
      bias: evalResults[bestMethod]?.bias || 0,
      hitRate: evalResults[bestMethod]?.hitRate || 0,
      allMethods: methods,
      evaluation: evalResults
    };
  }
}

// ============================================
// CAPACITY MANAGER
// ============================================

export class CapacityManager {
  /**
   * @param {Map<string, Object>} pvzs
   * @param {Object} tariffs
   */
  constructor(pvzs, tariffs = DEFAULT_TARIFFS) {
    this.pvzs = pvzs;
    this.tariffs = tariffs;
  }

  /**
   * Check if PVZ can accept quantity
   */
  canAccept(pvzId, quantity) {
    const pvz = this.pvzs.get(pvzId);
    if (!pvz) return false;
    return pvz.occupiedCapacity + quantity <= pvz.capacity;
  }

  /**
   * Check if vehicle can fit quantity
   */
  canFitInVehicle(quantity) {
    return quantity <= this.tariffs.vehicleCapacity;
  }

  /**
   * Get PVZ load factor
   */
  getPvzLoad(pvzId) {
    const pvz = this.pvzs.get(pvzId);
    if (!pvz || pvz.capacity === 0) return 0;
    return pvz.occupiedCapacity / pvz.capacity;
  }
}

// ============================================
// CONSOLIDATION ENGINE
// ============================================

export class ConsolidationEngine {
  /**
   * @param {Map<string, Object>} orders
   * @param {Map<string, Object>} pvzs
   * @param {Object} tariffs
   */
  constructor(orders, pvzs, tariffs = DEFAULT_TARIFFS) {
    this.orders = orders;
    this.pvzs = pvzs;
    this.tariffs = tariffs;
  }

  /**
   * Find consolidation groups by destination and time window
   * @param {number} timeWindowHours
   * @returns {Array<Object>}
   */
  findConsolidationGroups(timeWindowHours = 4) {
    const pending = Array.from(this.orders.values())
      .filter(o => o.status === 'new' || o.status === 'received');

    const groups = new Map();

    for (const order of pending) {
      const key = `${order.destinationPvzId}-${Math.floor(order.createdAt / timeWindowHours)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(order);
    }

    return Array.from(groups.entries())
      .filter(([_, orders]) => orders.length > 1)
      .map(([key, orders]) => ({
        key,
        destinationPvzId: orders[0].destinationPvzId,
        orders,
        totalQuantity: orders.reduce((sum, o) => sum + o.quantity, 0),
        estimatedSavings: this.estimateSavings(orders)
      }));
  }

  /**
   * Estimate savings from consolidation
   */
  estimateSavings(orders) {
    const totalQty = orders.reduce((sum, o) => sum + o.quantity, 0);
    const classicCost = orders.reduce((sum, o) => sum + 12000, 0); // 120₽ per order
    const meshCost = 48000 + 800 * totalQty; // trip cost
    return Math.max(0, classicCost - meshCost);
  }
}

// ============================================
// REVERSE LOGISTICS
// ============================================

export class ReverseLogistics {
  /**
   * @param {Object} tariffs
   */
  constructor(tariffs = DEFAULT_TARIFFS) {
    this.tariffs = tariffs;
  }

  /**
   * Calculate return cost
   * @param {string} routeType - 'mesh' | 'hub'
   * @param {number} quantity
   * @returns {number}
   */
  calculateReturnCost(routeType, quantity) {
    const baseCost = routeType === 'mesh'
      ? this.tariffs.meshReturnCost
      : this.tariffs.hubReturnCost;
    return baseCost * quantity;
  }

  /**
   * Process return with decision
   * @param {Object} order
   * @param {string} decision - ReturnDecision value
   * @returns {Object}
   */
  processReturn(order, decision) {
    const returnCost = this.calculateReturnCost('mesh', order.quantity);
    const damageCost = this.tariffs.damageCost * 0.02; // 2% damage rate

    return {
      returnCost,
      expectedDamage: damageCost,
      decision,
      refundAmount: order.routeCost - returnCost - damageCost
    };
  }
}

// ============================================
// OPERATIONS AUDIT
// ============================================

export class OperationsAudit {
  constructor() {
    /** @type {Array<Object>} */
    this.decisionLog = [];
  }

  /**
   * Log MCS decision
   */
  logDecision(order, candidates, selected, reason) {
    const entry = {
      id: `log-${Date.now()}`,
      orderId: order.id,
      timestamp: Date.now(),
      candidates: candidates.map(c => ({
        type: c.type,
        totalCost: c.totalCost,
        etaHours: c.etaHours,
        available: c.available,
        rejectionReasons: c.rejectionReasons
      })),
      selectedRoute: selected?.type,
      cost: selected?.totalCost,
      savings: selected?.marketplaceEconomics?.savings,
      reason,
      formulaBreakdown: selected ? this.buildFormulaBreakdown(selected) : null,
      constraintsChecked: selected ? this.buildConstraintsCheck(selected) : {}
    };
    this.decisionLog.push(entry);
    return entry;
  }

  buildFormulaBreakdown(selected) {
    return {
      variableCost: selected.totalCost,
      fixedCostShare: 0,
      pvzPayout: selected.pvzReward,
      expectedReturns: 0,
      expectedDamage: 0,
      total: selected.totalCost,
      baseline: selected.marketplaceEconomics.classicCost,
      savings: selected.marketplaceEconomics.savings
    };
  }

  buildConstraintsCheck(selected) {
    return {
      capacity: !selected.rejectionReasons.includes('ПВЗ переполнен'),
      vehicle: !selected.rejectionReasons.includes('Перегруз транспорта'),
      sla: !selected.rejectionReasons.includes('Нарушение SLA'),
      slots: !selected.rejectionReasons.includes('Нет операционных слотов')
    };
  }

  /**
   * Get decision log
   */
  getDecisionLog() {
    return this.decisionLog;
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.decisionLog.length;
    const byRoute = {};
    for (const entry of this.decisionLog) {
      byRoute[entry.selectedRoute] = (byRoute[entry.selectedRoute] || 0) + 1;
    }
    return { total, byRoute };
  }
}

// ============================================
// MCS FACADE
// ============================================

export class MCS {
  /**
   * @param {Object} dependencies
   */
  constructor({ pvzs, cities, tariffs, orders }) {
    this.pvzs = pvzs;
    this.cities = cities;
    this.tariffs = tariffs;
    this.orders = orders;
    this.costEngine = new CostEngine(tariffs);
    this.routeOptimizer = new RouteOptimizer(tariffs);
    this.inventoryManager = new InventoryManager(pvzs);
    this.capacityManager = new CapacityManager(pvzs, tariffs);
    this.consolidationEngine = new ConsolidationEngine(orders, pvzs, tariffs);
    this.reverseLogistics = new ReverseLogistics(tariffs);
    this.audit = new OperationsAudit();
  }

  /**
   * Route a single order
   */
  routeOrder(order) {
    const candidates = this.routeOptimizer.findCandidates(order, this.pvzs, this.cities);
    const selected = this.routeOptimizer.selectRoute(candidates);
    const reason = this.generateReason(candidates, selected);
    this.audit.logDecision(order, candidates, selected, reason);
    return { candidates, selected, reason };
  }

  /**
   * Recalculate all pending routes
   */
  recalculateAllRoutes() {
    const pending = Array.from(this.orders.values())
      .filter(o => o.status === 'new' || o.status === 'received');

    for (const order of pending) {
      this.routeOrder(order);
    }
  }

  generateReason(candidates, selected) {
    if (!selected) return 'Нет доступных маршрутов';
    const byType = candidates.filter(c => c.type === selected.type);
    return `Выбран ${selected.type}: ${byType.length > 1 ? 'наименьшая стоимость' : 'единственный вариант'}`;
  }
}