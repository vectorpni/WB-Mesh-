/**
 * WB Mesh — Application State Management
 * Single source of truth for the entire application
 */

import {
  OrderStatus,
  RouteType,
  UserRole,
  City,
  PVZType,
  DEMO_CITIES,
  DEMO_PVZS,
  DEMO_PRODUCTS,
  DEMO_SELLERS,
  DEFAULT_TARIFFS,
  generateId,
  deepClone
} from './types.js';

import { MCS, DemandForecast } from './mcs-engine.js';
import { orderOperations } from './order-operations.js';

// ============================================
// SEEDED RNG — reproducible demo data (Stage 13)
// ============================================

/**
 * Deterministic pseudo-random generator (LCG).
 * Fixed seed keeps demo scenarios identical across runs.
 * @type {number}
 */
let _rngSeed = 0x5EED_CAFE;

/** Set the RNG seed (called by demo scenarios for reproducibility). */
export function setDemoSeed(seed) {
  _rngSeed = seed >>> 0;
}

/** @returns {number} in [0, 1) */
function seededRandom() {
  _rngSeed = (_rngSeed * 1664525 + 1013904223) >>> 0;
  return (_rngSeed >>> 0) / 4294967296;
}

// ============================================
// STATE MANAGEMENT
// ============================================

class StateManager {
  constructor() {
    /** @type {Object} */
    this.state = this.createInitialState();
    /** @type {Set<Function>} */
    this.listeners = new Set();
    /** @type {MCS} */
    this.mcs = new MCS({
      pvzs: this.state.pvzs,
      cities: this.state.cities,
      tariffs: this.state.tariffs,
      orders: this.state.orders
    });
    /** @type {number|null} */
    this.virtualTimeTimer = null;
    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Get StateManager singleton instance
   * @returns {StateManager}
   */
  static getInstance() {
    if (!StateManager._instance) {
      StateManager._instance = new StateManager();
    }
    return StateManager._instance;
  }

  /**
   * Async initialization (for compatibility with main.js)
   * @returns {Promise<void>}
   */
  async initialize() {
    this.notify();
  }

  /**
   * Create initial application state
   * @returns {Object}
   */
  createInitialState() {
    /** @type {Map<string, Object>} */
    const cities = new Map();
    /** @type {Map<string, Object>} */
    const pvzs = new Map();
    /** @type {Map<string, Object>} */
    const products = new Map();
    /** @type {Map<string, Object>} */
    const sellers = new Map();
    /** @type {Map<string, Object>} */
    const orders = new Map();
    /** @type {Map<string, Object>} */
    const salesHistory = new Map();

    setDemoSeed(0x5EED_CAFE);

    // Initialize cities
    for (const city of DEMO_CITIES.values()) {
      cities.set(city.id, deepClone(city));
    }

    // Initialize PVZs
    for (const pvz of DEMO_PVZS.values()) {
      const pvzClone = deepClone(pvz);
      pvzClone.inventory = [];
      pvzClone.occupiedCapacity = 0;
      pvzs.set(pvzClone.id, pvzClone);
    }

    // Initialize products
    for (const product of DEMO_PRODUCTS.values()) {
      products.set(product.id, deepClone(product));
    }

    // Initialize sellers
    for (const seller of DEMO_SELLERS.values()) {
      sellers.set(seller.id, deepClone(seller));
    }

    for (const p of pvzs.values()) { p.status = 'active'; p.incoming = []; if(p.type === 'mesh') p.capacity = 400; }

    // Seed initial inventory
    this.seedInitialInventory(pvzs, products);

    // Generate synthetic sales history for forecasting
    this.generateSalesHistory(salesHistory, products);

    return {
      // UI state
      ui: {
        selectedCityId: null,
        selectedPvzId: null,
        selectedSellerId: null,
        activeTab: 'dashboard',
        role: UserRole.PVZ_OWNER
      },

      // Virtual time
      virtualTime: {
        currentTime: 10, // virtual day starts in reception window
        currentDay: 0,
        speed: 0, // 0 = paused, 1 = real-time, 10 = 10x, etc.
        isRunning: false
      },

      // Data
      cities,
      pvzs,
      products,
      sellers,
      orders,
      salesHistory,
      tariffs: deepClone(DEFAULT_TARIFFS),

      // MCS
      mcsStatus: 'ready',
      mcsDecisionLog: [],

      // Demo scenarios
      demoScenarios: this.createDemoScenarios(),

      // Financial snapshots
      financialSnapshots: [],

      // Notifications
      eventLog: [],
      ledger: [],
      notifications: []
    };
  }

  /**
   * Seed initial inventory in PVZs
   */
  seedInitialInventory(pvzs, products) {
    const productArray = Array.from(products.values());
    for (const pvz of pvzs.values()) {
      if (pvz.type !== PVZType.MESH && pvz.type !== PVZType.HUB) continue;

      // Add 3-5 random products to each mesh PVZ
      const numProducts = productArray.length;
      const shuffled = [...productArray].sort(() => seededRandom() - 0.5);

      for (let i = 0; i < Math.min(numProducts, shuffled.length); i++) {
        const product = shuffled[i];
        const quantity = pvz.type === PVZType.HUB ? 100 : 60;
        const batchId = `batch-${product.id}-${generateId().slice(-6)}`;

        pvz.inventory.push({
          id: `inv-${generateId()}`,
          productId: product.id,
          quantity,
          batchId,
          receivedAt: this.state?.virtualTime?.currentTime || 0,
          status: 'available',
          daysStored: Math.floor(seededRandom() * 10)
        });
        pvz.occupiedCapacity += quantity;
      }
    }
  }

  /**
   * Generate synthetic sales history for forecasting
   */
  generateSalesHistory(salesHistory, products) {
    for (const product of products.values()) {
      const history = [];
      const baseDemand = Math.floor(seededRandom() * 10) + 2; // 2-12 per day
      const trend = (seededRandom() - 0.5) * 0.1; // slight trend
      const seasonality = 7; // weekly

      for (let day = 0; day < 84; day++) { // 12 weeks
        const weeklyPattern = 1 + 0.3 * Math.sin((day % seasonality) / seasonality * 2 * Math.PI);
        const trendFactor = 1 + trend * day;
        const noise = 1 + (seededRandom() - 0.5) * 0.4;
        const demand = Math.max(0, Math.round(baseDemand * weeklyPattern * trendFactor * noise));
        history.push(demand);
      }
      salesHistory.set(product.id, history);
    }
  }

  /**
   * Create demo scenarios
   * @returns {Array<Object>}
   */
  createDemoScenarios() {
    return [
      {
        id: 'city_order',
        name: '🏙 Городской заказ (M1/M2)',
        description: 'Заказ внутри Перми: ПВЗ «Плюс Ареал» → тот же ПВЗ. M1 маршрут, 0₽ транспорт.',
        steps: [
          'Создать заказ (3 шт. Samsung Galaxy)',
          'MCS маршрутизация: M1 (в том же ПВЗ)',
          'Приёмка на ПВЗ',
          'Размещение на хранении',
          'Сборка заказа',
          'Отправка (виртуальная)',
          'Выдача покупателю',
          'Начисление 39₽ ПВЗ, маржа 16₽'
        ],
        autoAdvance: true,
        stepDelayMs: 3000
      },
      {
        id: 'intercity_order',
        name: '🚛 Межгородний заказ (C2)',
        description: 'Пермь → Екатеринбург: 5 заказов в рейсе. Точка безубыточности = 5 заказов.',
        steps: [
          'Создать заказ (5 шт. Nike Air Max)',
          'MCS маршрутизация: C2 через хабы',
          'Рейс Пермь-Хаб → Екб-Хаб (магистраль)',
          'Локальная доставка в Екб',
          'Приёмка на ПВЗ «Уральский»',
          'Сборка и выдача',
          'Начисление: Classic 100₽ vs Mesh 93₽',
          'Экономия 7₽ на заказе при 5+ заказах'
        ],
        autoAdvance: true,
        stepDelayMs: 3000
      },
      {
        id: 'return_flow',
        name: '🔄 Возврат через Mesh',
        description: 'Покупатель не забрал: возврат 20₽ через Mesh vs 50₽ через хаб. Карантин 24ч.',
        steps: [
          'Заказ выдан, покупатель не явился',
          'Инициировать возврат',
          'MCS: возврат через Mesh (20₽)',
          'Товар в карантине на ПВЗ',
          'Решение за 24ч: перепродать',
          'Товар снова доступен для продажи',
          'Экономия на возврате: 30₽'
        ],
        autoAdvance: true,
        stepDelayMs: 3000
      },
      {
        id: 'route_failure',
        name: '⚠️ Сбой маршрута',
        description: 'Автомобиль сломался: MCS пересчитывает за 2 сек, меняет C2 → C1, SLA 24ч не нарушен.',
        steps: [
          'Заказ Пермь → Казань (10 шт.)',
          'MCS: маршрут C2 через магистраль',
          'Событие: поломка автомобиля',
          'MCS: мгновенный пересчёт',
          'Новый маршрут: C1 через резерв',
          'SLA 24ч соблюдён',
          'Покупатель не замечает сбоя'
        ],
        autoAdvance: true,
        stepDelayMs: 3000
      },
      {
        id: 'long_storage',
        name: '📦 Долгое хранение',
        description: 'Товар лежит 30 дней: прогрессивный тариф 1× → 1.5× → 2× после 7 бесплатных дней.',
        steps: [
          'Заказ принят на ПВЗ',
          'Товар на хранении 30 дней',
          'Дни 1-7: базовая ставка 15₽/день',
          'Дни 8-14: 1.5× = 22.5₽/день',
          'Дни 15-30: 2× = 30₽/день',
          'Итого хранение: 630₽ vs 450₽',
          'MCS учитывает это в маршрутизации'
        ],
        autoAdvance: true,
        stepDelayMs: 3000
      }
    ];
  }

  // ============================================
  // SUBSCRIPTION & NOTIFICATION
  // ============================================

  /**
   * Subscribe to state changes
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state, this.previousState);
      } catch (e) {
        console.error('Listener error:', e);
      }
    }
  }

  /**
   * Set state property and notify
   * @param {string} path
   * @param {any} value
   */
  setState(path, value) {
    this.previousState = deepClone(this.state);
    const keys = path.split('.');
    let obj = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.notify();
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return this.state;
  }

  // ============================================
  // VIRTUAL TIME
  // ============================================

  startClock() { return this.startVirtualClock(); }
  pauseClock() { return this.pauseVirtualClock(); }

  startVirtualClock() {
    if (this.virtualTimeTimer) return;
    this.state.virtualTime.isRunning = true;
    this.virtualTimeTimer = setInterval(() => {
      if (this.state.virtualTime.speed > 0) {
        const step = this.state.virtualTime.speed / 3600; // hours per second at 1x
        this.state.virtualTime.currentTime += step;
        this.state.virtualTime.currentDay = Math.floor(this.state.virtualTime.currentTime / 24);
        this.ageInventory(step);
        this.notify();
      }
    }, 1000);
  }

  pauseVirtualClock() {
    if (this.virtualTimeTimer) {
      clearInterval(this.virtualTimeTimer);
      this.virtualTimeTimer = null;
    }
    this.state.virtualTime.isRunning = false;
    this.notify();
  }

  setClockSpeed(speed) {
    this.state.virtualTime.speed = speed;
    this.notify();
  }

  stepTime(hours = 1) {
    if (!Number.isFinite(hours) || hours < 0 || hours > 8760) throw new RangeError('Некорректный шаг времени');
    this.state.virtualTime.currentTime += hours;
    this.state.virtualTime.currentDay = Math.floor(this.state.virtualTime.currentTime / 24);
    this.ageInventory(hours);
    this.notify();
  }

  ageInventory(hours) {
    for (const pvz of this.state.pvzs.values()) {
      if (!pvz.inventory) continue;
      for (const item of pvz.inventory) {
        item.daysStored = (item.daysStored || 0) + hours / 24;
        if (item.daysStored > 60 && item.status === 'available') {
          item.status = 'quarantine';
        }
      }
    }
  }

  // ============================================
  // ROLE & SELECTION
  // ============================================

  setRole(role) {
    this.state.ui.role = role;
    this.notify();
  }

  setSelectedCity(cityId) {
    this.state.ui.selectedCityId = cityId;
    this.notify();
  }

  setSelectedPvz(pvzId) {
    this.state.ui.selectedPvzId = pvzId;
    this.notify();
  }

  setSelectedSeller(sellerId) {
    this.state.ui.selectedSellerId = sellerId;
    this.notify();
  }

  setActiveTab(tab) {
    this.state.ui.activeTab = tab;
    this.notify();
  }

  setTariffs(tariffs) {
    this.state.tariffs = tariffs;
    this.mcs = new MCS({
      pvzs: this.state.pvzs,
      cities: this.state.cities,
      tariffs,
      orders: this.state.orders
    });
    this.notify();
  }

  // ============================================
  // ORDER LIFECYCLE
  // ============================================

  /**
   * Create new order
   * @param {Object} params
   * @returns {Object}
   */
  createOrder(...args) { return orderOperations.createOrder.apply(this,args); }
  routeOrder(...args) { return orderOperations.routeOrder.apply(this,args); }
  processOrderAction(...args) { return orderOperations.processOrderAction.apply(this,args); }
  processReturn(...args) { return orderOperations.processReturn.apply(this,args); }
  recordFinancialSnapshot(...args) { return orderOperations.recordFinancialSnapshot.apply(this,args); }
  receiveSupply(...args) { return orderOperations.receiveSupply.apply(this,args); }

  // ============================================
  // DEMO SCENARIOS
  // ============================================

  /**
   * Run demo scenario
   * @param {string} scenarioId
   */
  runDemoScenario(scenarioId) {
    const scenario = this.state.demoScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    // Reset demo state
    this.resetDemo();

    let stepIndex = 0;
    const runStep = () => {
      if (stepIndex >= scenario.steps.length) return;

      const step = scenario.steps[stepIndex];
      console.log(`[Demo ${scenarioId}] Step ${stepIndex + 1}: ${step}`);

      // Execute step based on scenario
      this.executeDemoStep(scenarioId, stepIndex);

      stepIndex++;
      if (scenario.autoAdvance && stepIndex < scenario.steps.length) {
        setTimeout(runStep, scenario.stepDelayMs);
      }
    };

    runStep();
  }

  /**
   * Execute demo step
   */
  executeDemoStep(scenarioId, stepIndex) {
    const state = this.state;
    const pvzs = Array.from(state.pvzs.values()).filter(p => p.type === PVZType.MESH);
    if (pvzs.length === 0) return;

    const permMesh = pvzs.find(p => p.cityId === City.PERM);
    const ekbMesh = pvzs.find(p => p.cityId === City.EKATERINBURG);
    const kazanMesh = pvzs.find(p => p.cityId === City.KAZAN);
    const product = Array.from(state.products.values())[0];

    switch (scenarioId) {
      case 'city_order':
        this.executeCityOrderStep(stepIndex, permMesh, product);
        break;
      case 'intercity_order':
        this.executeIntercityOrderStep(stepIndex, permMesh, ekbMesh, product);
        break;
      case 'return_flow':
        this.executeReturnFlowStep(stepIndex, permMesh, product);
        break;
      case 'route_failure':
        this.executeRouteFailureStep(stepIndex, permMesh, kazanMesh, product);
        break;
      case 'long_storage':
        this.executeLongStorageStep(stepIndex, permMesh, product);
        break;
    }
  }

  executeCityOrderStep(step, pvz, product) {
    switch (step) {
      case 0:
        this.demoOrderId = this.createOrder({
          productId: product.id,
          quantity: 3,
          destinationPvzId: pvz.id,
          sourcePvzId: pvz.id,
          sellerId: product.sellerId
        }).id;
        break;
      case 1: this.routeOrder(this.demoOrderId); break;
      case 2: this.processOrderAction(this.demoOrderId, 'receive'); break;
      case 3: this.processOrderAction(this.demoOrderId, 'store'); break;
      case 4: this.processOrderAction(this.demoOrderId, 'pack'); break;
      case 5: this.processOrderAction(this.demoOrderId, 'dispatch'); break;
      case 6: this.processOrderAction(this.demoOrderId, 'issue'); break;
      case 7: this.processOrderAction(this.demoOrderId, 'settle'); break;
    }
  }

  executeIntercityOrderStep(step, permPvz, ekbPvz, product) {
    switch (step) {
      case 0:
        this.demoOrderId = this.createOrder({
          productId: product.id,
          quantity: 5,
          destinationPvzId: ekbPvz.id,
          sourcePvzId: permPvz.id,
          sellerId: product.sellerId
        }).id;
        break;
      case 1: this.routeOrder(this.demoOrderId); break;
      case 2: this.processOrderAction(this.demoOrderId, 'receive'); break;
      case 3: this.processOrderAction(this.demoOrderId, 'store'); break;
      case 4: this.processOrderAction(this.demoOrderId, 'pack'); break;
      case 5: this.processOrderAction(this.demoOrderId, 'dispatch'); break;
      case 6: this.processOrderAction(this.demoOrderId, 'issue'); break;
      case 7: this.processOrderAction(this.demoOrderId, 'settle'); break;
    }
  }

  executeReturnFlowStep(step, pvz, product) {
    switch (step) {
      case 0:
        this.demoOrderId = this.createOrder({
          productId: product.id,
          quantity: 2,
          destinationPvzId: pvz.id,
          sourcePvzId: pvz.id,
          sellerId: product.sellerId
        }).id;
        break;
      case 1: this.routeOrder(this.demoOrderId); break;
      case 2: this.processOrderAction(this.demoOrderId, 'receive'); break;
      case 3: this.processOrderAction(this.demoOrderId, 'store'); break;
      case 4: this.processOrderAction(this.demoOrderId, 'pack'); break;
      case 5: this.processOrderAction(this.demoOrderId, 'dispatch'); break;
      case 6: this.processOrderAction(this.demoOrderId, 'issue'); break;
      case 7: this.processOrderAction(this.demoOrderId, 'settle'); break;
      case 8: this.processOrderAction(this.demoOrderId, 'return'); break;
    }
  }

  executeRouteFailureStep(step, permPvz, kazanPvz, product) {
    switch (step) {
      case 0:
        this.demoOrderId = this.createOrder({
          productId: product.id,
          quantity: 10,
          destinationPvzId: kazanPvz.id,
          sourcePvzId: permPvz.id,
          sellerId: product.sellerId
        }).id;
        break;
      case 1: this.routeOrder(this.demoOrderId); break;
      case 2: this.processOrderAction(this.demoOrderId, 'cancel'); break; // simulate failure
      case 3:
        // Re-create and re-route
        this.demoOrderId = this.createOrder({
          productId: product.id,
          quantity: 10,
          destinationPvzId: kazanPvz.id,
          sourcePvzId: permPvz.id,
          sellerId: product.sellerId
        }).id;
        this.routeOrder(this.demoOrderId);
        break;
    }
  }

  executeLongStorageStep(step, pvz, product) {
    switch (step) {
      case 0:
        this.demoOrderId = this.createOrder({
          productId: product.id,
          quantity: 1,
          destinationPvzId: pvz.id,
          sourcePvzId: pvz.id,
          sellerId: product.sellerId
        }).id;
        break;
      case 1: this.routeOrder(this.demoOrderId); break;
      case 2: this.processOrderAction(this.demoOrderId, 'receive'); break;
      case 3: this.processOrderAction(this.demoOrderId, 'store'); break;
      case 4:
        // Advance 30 days
        for (let i = 0; i < 30 * 24; i++) this.stepTime(1);
        break;
      case 5: this.processOrderAction(this.demoOrderId, 'pack'); break;
      case 6: this.processOrderAction(this.demoOrderId, 'dispatch'); break;
      case 7: this.processOrderAction(this.demoOrderId, 'issue'); break;
      case 8: this.processOrderAction(this.demoOrderId, 'settle'); break;
    }
  }

  /**
   * Reset demo to initial state
   */
  resetDemo() {
    this.pauseVirtualClock();
    this.state = this.createInitialState();
    this.mcs = new MCS({pvzs:this.state.pvzs,cities:this.state.cities,tariffs:this.state.tariffs,orders:this.state.orders});
    this.notify();
    return;
    // Preserved V7 reset below; V8 uses full deterministic reset.

    // Clear orders
    this.state.orders.clear();
    // Reset inventory
    for (const pvz of this.state.pvzs.values()) {
      pvz.inventory = [];
      pvz.occupiedCapacity = 0;
    }
    this.seedInitialInventory(this.state.pvzs, this.state.products);
    // Clear MCS log
    this.state.mcsDecisionLog = [];
    this.notify();
  }

  // ============================================
  // FORECASTING
  // ============================================

  /**
   * Get demand forecast for product
   * @param {string} productId
   * @returns {Object}
   */
  getForecast(productId) {
    const history = this.state.salesHistory.get(productId);
    if (!history) return null;
    // Import DemandForecast dynamically to avoid circular dependency

    return DemandForecast.forecastNextDay(history, 7, this.state.tariffs);
  }

  // ============================================
  // EXPORT / IMPORT
  // ============================================

  /**
   * Export state to JSON
   * @returns {string}
   */
  exportState() {
    const serializable = {
      ...this.state,
      cities: Array.from(this.state.cities.entries()),
      pvzs: Array.from(this.state.pvzs.entries()),
      products: Array.from(this.state.products.entries()),
      sellers: Array.from(this.state.sellers.entries()),
      orders: Array.from(this.state.orders.entries()),
      salesHistory: Array.from(this.state.salesHistory.entries())
    };
    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Import state from JSON
   * @param {string} json
   */
  importState(json) {
    const data = JSON.parse(json);
    this.state.cities = new Map(data.cities);
    this.state.pvzs = new Map(data.pvzs);
    this.state.products = new Map(data.products);
    this.state.sellers = new Map(data.sellers);
    this.state.orders = new Map(data.orders);
    this.state.salesHistory = new Map(data.salesHistory);
    this.state.tariffs = data.tariffs || deepClone(DEFAULT_TARIFFS);
    this.state.virtualTime = data.virtualTime || this.state.virtualTime;
    this.state.ui = data.ui || this.state.ui;
    this.state.mcsDecisionLog = data.mcsDecisionLog || [];
    this.state.financialSnapshots = data.financialSnapshots || [];
    this.state.ledger = data.ledger || [];
    this.state.eventLog = data.eventLog || [];
    this.state.demoScenarios = this.createDemoScenarios();
    this.mcs = new MCS({
      pvzs: this.state.pvzs,
      cities: this.state.cities,
      tariffs: this.state.tariffs,
      orders: this.state.orders
    });
    this.notify();
  }
}

// Singleton instance
let instance = null;

/**
 * Get StateManager singleton
 * @returns {StateManager}
 */
export function getStateManager() {
  if (!instance) {
    instance = new StateManager();
  }
  return instance;
}

// For backward compatibility
StateManager.getInstance = getStateManager;

export { StateManager };