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

export { CostEngine } from './cost-engine.js';
import { CostEngine } from './cost-engine.js';

// ============================================
// ROUTE OPTIMIZER
// ============================================

export { RouteOptimizer } from './route-engine.js';
import { RouteOptimizer } from './route-engine.js';

export { InventoryManager } from './inventory-engine.js';
import { InventoryManager } from './inventory-engine.js';

export { DemandForecast } from './forecast-engine.js';
import { DemandForecast } from './forecast-engine.js';

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
    if (!pvz || !InventoryManager.validQuantity(quantity)) return false;
    return pvz.occupiedCapacity + quantity <= pvz.capacity;
  }

  /**
   * Check if vehicle can fit quantity
   */
  canFitInVehicle(quantity) {
    return InventoryManager.validQuantity(quantity) && quantity <= this.tariffs.vehicleCapacity;
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
      const key = `${order.sourcePvzId}-${order.destinationPvzId}-${Math.floor(order.createdAt / timeWindowHours)}`;
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
    if(totalQty<1)return 0;
    const engine=new CostEngine(this.tariffs);
    const classicCost=engine.calculateClassicCost().total*totalQty;
    const meshCost=engine.calculateMeshVariableCost().total*totalQty+engine.calculateTripCost(totalQty).total;
    return classicCost-meshCost;
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
    const damageCost = Math.round(this.tariffs.damageCost * this.tariffs.meshLossRate * order.quantity);
    const price=order.economics?.seller?.price ?? order.price;
    if(!Number.isFinite(price))throw new Error('Для возврата нужна цена товара, а не стоимость логистики');

    return {
      returnCost,
      expectedDamage: damageCost,
      decision,
      refundAmount: price*order.quantity
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
      id: `log-${order.id}-${this.decisionLog.length}`,
      orderId: order.id,
      timestamp: order.currentTime ?? 0,
      input:{productId:order.productId,quantity:order.quantity,sourcePvzId:order.sourcePvzId,destinationPvzId:order.destinationPvzId,tariffVersion:8},
      candidates: structuredClone(candidates),
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
      parameters:selected.economics?.parameters,
      breakdown:selected.economics?.breakdown,
      trip:selected.economics?.trip,
      pvzPayout: selected.pvzReward,
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
    const count=candidates.filter(c=>c.available).length;
    return `Выбран ${selected.type}: минимальная полная стоимость среди ${count} допустимых вариантов; срок ${selected.etaHours} ч`;
  }
}
