/**
 * WB Mesh — Core Type Definitions
 * Centralized type definitions for the entire system
 * Uses JSDoc @typedef for type annotations (valid in plain JS modules)
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

/** @enum {string} */
export const OrderStatus = {
  NEW: 'new',
  RECEIVED: 'received',
  STORED: 'stored',
  ORDERED: 'ordered',
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  IN_TRANSIT: 'in_transit',
  ISSUED: 'issued',
  SETTLED: 'settled',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
  DAMAGED: 'damaged',
  EXCEPTION: 'exception',
  QUARANTINE: 'quarantine'
};

/** @enum {string} */
export const RouteType = {
  M1: 'M1',           // Товар уже в ПВЗ покупателя
  M2: 'M2',           // Прямое перемещение из другого Mesh-ПВЗ города
  C1: 'C1',           // Классическая доставка внутри города через хаб
  C2: 'C2',           // Междугородняя доставка через хабы и магистраль
  HUB: 'hub',         // Legacy alias for C1
  MESH: 'mesh',       // Legacy alias for M1/M2
  BLOCKED: 'blocked'
};

/** @enum {string} */
export const UserRole = {
  PVZ_OPERATOR: 'pvz_operator',
  PVZ_OWNER: 'pvz_owner',
  SELLER: 'seller',
  MCS_DISPATCHER: 'mcs_dispatcher',
  ANALYST: 'analyst',
  JURY: 'jury'
};

/** @enum {string} */
export const City = {
  PERM: 'perm',
  EKATERINBURG: 'ekaterinburg',
  KAZAN: 'kazan',
  MOSCOW: 'moscow'
};

/** @enum {string} */
export const PVZType = {
  MESH: 'mesh',
  STANDARD: 'standard',
  HUB: 'hub'
};

/** @enum {string} */
export const ProductSize = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  XLARGE: 'xlarge'
};

/** @enum {string} */
export const ReturnDecision = {
  RESTOCK_LOCAL: 'restock_local',
  TRANSFER_OTHER_PVZ: 'transfer_other_pvz',
  RETURN_TO_HUB: 'return_to_hub',
  RETURN_TO_SELLER: 'return_to_seller',
  WRITE_OFF: 'write_off'
};

// ============================================
// TYPE DEFINITIONS (JSDoc @typedef)
// ============================================

/**
 * @typedef {Object} TariffConfig
 * @property {number} fixedTripCost - 48000 копеек = 480 ₽
 * @property {number} variablePerParcel - 800 копеек = 8 ₽
 * @property {number} extraStopCost - 4000 копеек = 40 ₽
 * @property {number} courierWaitPerMin - 600 копеек = 6 ₽/мин
 * @property {number} receiveFee - 600 копеек = 6 ₽
 * @property {number} storagePerDay - 1500 копеек = 15 ₽/день (прогрессивный)
 * @property {number} packFee - 1800 копеек = 18 ₽
 * @property {number} partnerOpsCost - 1500 копеек = 15 ₽
 * @property {number} partnerShelfPerDay - 800 копеек = 8 ₽/день
 * @property {number} transferFee - 1000 копеек = 10 ₽
 * @property {number} meshReturnCost - 2000 копеек = 20 ₽
 * @property {number} hubReturnCost - 5000 копеек = 50 ₽
 * @property {number} damageCost - 50000 копеек = 500 ₽
 * @property {number} classicTransport - 3500 копеек = 35 ₽
 * @property {number} classicStorage - 2000 копеек = 20 ₽
 * @property {number} classicSorting - 1000 копеек = 10 ₽
 * @property {number} classicLastMile - 2500 копеек = 25 ₽
 * @property {number} classicPVZ - 1500 копеек = 15 ₽
 * @property {number} classicReturns - 1000 копеек = 10 ₽
 * @property {number} classicIT - 500 копеек = 5 ₽
 * @property {number} meshPlacement - 500 копеек = 5 ₽
 * @property {number} meshStorage - 1500 копеек = 15 ₽
 * @property {number} meshSorting - 800 копеек = 8 ₽
 * @property {number} meshLastMile - 2500 копеек = 25 ₽
 * @property {number} meshPVZ - 1500 копеек = 15 ₽
 * @property {number} meshReturns - 600 копеек = 6 ₽
 * @property {number} meshIT - 500 копеек = 5 ₽
 * @property {number} maxStorageDays - 60 дней
 * @property {number} freeStorageDays - 7 дней
 * @property {number} progressiveStorageMultiplier - 1.5 после бесплатного периода
 * @property {number} pvzCapacity - 200 мест
 * @property {number} vehicleCapacity - 500 мест
 * @property {number} operationalSlots - 8 слотов
 * @property {number} meshHours - 4 часа
 * @property {number} hubHours - 24 часа
 * @property {number} slaHours - 24 часа
 */

/**
 * @typedef {Object} CityConfig
 * @property {string} id
 * @property {string} name
 * @property {string} hubId
 * @property {string[]} meshPvzs - IDs of mesh PVZs
 * @property {string[]} standardPvzs - IDs of standard PVZs
 * @property {{x: number, y: number}} coordinates - For visualization
 */

/**
 * @typedef {Object} PVZConfig
 * @property {string} id
 * @property {string} cityId
 * @property {string} name
 * @property {string} type - 'mesh' | 'standard' | 'hub'
 * @property {number} capacity
 * @property {number} occupiedCapacity
 * @property {{x: number, y: number}} coordinates
 * @property {number} operationalSlots
 * @property {Object[]} inventory
 */

/**
 * @typedef {Object} ProductConfig
 * @property {string} id
 * @property {string} sku
 * @property {string} name
 * @property {string} category
 * @property {number} price - in kopecks
 * @property {{width: number, height: number, depth: number}} dimensions
 * @property {number} weight - grams
 * @property {number} returnRate - 0-1
 * @property {string} sellerId
 */

/**
 * @typedef {Object} SellerConfig
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} commission - 0-1
 * @property {string[]} productIds
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} productId
 * @property {number} quantity
 * @property {string} sourcePvzId
 * @property {string} destinationPvzId
 * @property {string} sellerId
 * @property {string} status - OrderStatus value
 * @property {number} createdAt - virtual time hours
 * @property {string} [routeType] - RouteType value
 * @property {number} [routeCost] - in kopecks
 * @property {number} [routeEta] - hours
 * @property {number} [classicCost] - in kopecks
 * @property {number} [pvzReward] - in kopecks
 * @property {string} [failureReason]
 * @property {Object[]} [events]
 */

/**
 * @typedef {Object} OrderEvent
 * @property {string} type
 * @property {number} timestamp
 * @property {Object} [details]
 */

/**
 * @typedef {Object} InventoryItem
 * @property {string} id
 * @property {string} productId
 * @property {number} quantity
 * @property {string} batchId
 * @property {number} receivedAt - virtual time hours
 * @property {string} status - 'available' | 'reserved' | 'quarantine' | 'damaged'
 * @property {string} [reservedForOrderId]
 */

/**
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} type - 'trunk' | 'local' | 'mesh'
 * @property {string} fromPvzId
 * @property {string} toPvzId
 * @property {string[]} orderIds
 * @property {number} parcels
 * @property {number} stops
 * @property {number} waitMinutes
 * @property {number} cost - kopecks
 * @property {number} etaHours
 * @property {number} departureTime
 * @property {string} status - 'planned' | 'in_progress' | 'completed' | 'failed'
 */

/**
 * @typedef {Object} RouteCandidate
 * @property {string} type - 'M1' | 'M2' | 'C1' | 'C2' | 'blocked'
 * @property {number} totalCost - kopecks
 * @property {number} etaHours
 * @property {number} stops
 * @property {number} pvzLoad - 0-1
 * @property {number} vehicleLoad - 0-1
 * @property {Object} marketplaceEconomics
 * @property {number} marketplaceEconomics.savings
 * @property {number} pvzReward
 * @property {string[]} constraints
 * @property {string[]} rejectionReasons
 * @property {boolean} available
 * @property {boolean} selected
 */

/**
 * @typedef {Object} MCSDecisionLog
 * @property {string} orderId
 * @property {number} timestamp
 * @property {RouteCandidate[]} candidates
 * @property {string} selectedRoute
 * @property {number} cost
 * @property {number} savings
 * @property {string} reason
 * @property {Object} formulaBreakdown
 * @property {Object} constraintsChecked
 */

/**
 * @typedef {Object} FinancialSnapshot
 * @property {number} day
 * @property {number} ordersCount
 * @property {number} revenue
 * @property {number} meshCost
 * @property {number} classicCost
 * @property {number} savings
 * @property {number} pvzMargin
 * @property {Object.<string, number>} pvzBreakdown
 */

/**
 * @typedef {Object} ForecastResult
 * @property {string} method
 * @property {number} nextDayForecast
 * @property {number} conservativeEstimate
 * @property {number} mae
 * @property {number} bias
 * @property {number} hitRate
 * @property {Object} allMethods
 */

/**
 * @typedef {Object} DemoScenario
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} steps
 * @property {boolean} autoAdvance
 * @property {number} stepDelayMs
 */

/**
 * @typedef {Object} AppState
 * @property {Map<string, CityConfig>} cities
 * @property {Map<string, PVZConfig>} pvzs
 * @property {Map<string, ProductConfig>} products
 * @property {Map<string, SellerConfig>} sellers
 * @property {Map<string, Order>} orders
 * @property {TariffConfig} tariffs
 * @property {Object} virtualTime
 * @property {string} ui.selectedCityId
 * @property {string} ui.selectedPvzId
 * @property {string} ui.selectedSellerId
 * @property {string} ui.activeTab
 * @property {UserRole} ui.role
 * @property {MCSDecisionLog[]} mcsDecisionLog
 * @property {DemoScenario[]} demoScenarios
 * @property {Object} notifications
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} type - 'success' | 'error' | 'warning' | 'info'
 * @property {string} message
 * @property {number} timestamp
 * @property {number} duration
 */

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

/** @type {TariffConfig} */
export const DEFAULT_TARIFFS = {
  schemaVersion: 8,
  fixedTripCost: 48000, variablePerParcel: 800, extraStopCost: 4000, courierWaitPerMin: 600,
  receiveFee: 200, storagePerDay: 100, packFee: 100, transferFee: 0, pvzBonus: 100,
  partnerOpsCost: 300, partnerShelfPerDay: 35, partnerRiskCost: 100,
  meshReturnCost: 3300, hubReturnCost: 4500, damageCost: 40000,
  returnInspection: 800, localRestockCost: 500, returnRate: .12, resaleShare: .5,
  classicLossRate: .004, meshLossRate: .005,
  classicTransport: 2400, classicStorage: 1200, hubStoragePerDay: 120,
  classicSorting: 1400, classicLastMile: 2400, classicPVZ: 1300,
  classicReturns: 700, classicIT: 600,
  meshPlacement: 2200, meshStorage: 1300, meshSorting: 1000, meshLocalSorting: 400,
  meshLastMile: 0, meshPVZ: 1400, meshReturns: 596, meshIT: 800,
  sellerClassicFee: 11200, sellerMeshFee: 10900, intercitySurcharge: 2800,
  minimumSavings: 100, maxStorageDays: 60, freeStorageDays: 14,
  progressiveStorageMultiplier: 1.5, pvzCapacity: 400, vehicleCapacity: 80,
  operationalSlots: 20, meshHours: 6, hubHours: 40, slaHours: 60
};

/** @type {Map<string, CityConfig>} */
export const DEMO_CITIES = new Map([
  ['perm', {
    id: 'perm',
    name: 'Пермь',
    hubId: 'pvz-perm-hub',
    meshPvzs: ['pvz-perm-plus', 'pvz-perm-krasnov'],
    standardPvzs: ['pvz-perm-standard-1', 'pvz-perm-standard-2'],
    coordinates: { x: 150, y: 120 }
  }],
  ['ekaterinburg', {
    id: 'ekaterinburg',
    name: 'Екатеринбург',
    hubId: 'pvz-ekb-hub',
    meshPvzs: ['pvz-ekb-ural', 'pvz-ekb-greenwich'],
    standardPvzs: ['pvz-ekb-standard-1', 'pvz-ekb-standard-2'],
    coordinates: { x: 400, y: 180 }
  }],
  ['kazan', {
    id: 'kazan',
    name: 'Казань',
    hubId: 'pvz-kazan-hub',
    meshPvzs: ['pvz-kazan-kremlin', 'pvz-kazan-airport'],
    standardPvzs: ['pvz-kazan-standard-1'],
    coordinates: { x: 650, y: 150 }
  }]
]);

/** @type {Map<string, PVZConfig>} */
export const DEMO_PVZS = new Map([
  // PERM
  ['pvz-perm-hub', {
    id: 'pvz-perm-hub',
    cityId: 'perm',
    name: 'Хаб Пермь',
    type: 'hub',
    capacity: 1000,
    occupiedCapacity: 0,
    coordinates: { x: 150, y: 120 },
    operationalSlots: 16,
    inventory: []
  }],
  ['pvz-perm-plus', {
    id: 'pvz-perm-plus',
    cityId: 'perm',
    name: 'Плюс Ареал',
    type: 'mesh',
    capacity: 200,
    occupiedCapacity: 45,
    coordinates: { x: 100, y: 140 },
    operationalSlots: 8,
    inventory: []
  }],
  ['pvz-perm-krasnov', {
    id: 'pvz-perm-krasnov',
    cityId: 'perm',
    name: 'Красновский',
    type: 'mesh',
    capacity: 180,
    occupiedCapacity: 62,
    coordinates: { x: 190, y: 100 },
    operationalSlots: 6,
    inventory: []
  }],
  ['pvz-perm-standard-1', {
    id: 'pvz-perm-standard-1',
    cityId: 'perm',
    name: 'Пермь Центр',
    type: 'standard',
    capacity: 150,
    occupiedCapacity: 80,
    coordinates: { x: 130, y: 160 },
    operationalSlots: 4,
    inventory: []
  }],
  ['pvz-perm-standard-2', {
    id: 'pvz-perm-standard-2',
    cityId: 'perm',
    name: 'Пермь Заводской',
    type: 'standard',
    capacity: 120,
    occupiedCapacity: 40,
    coordinates: { x: 170, y: 80 },
    operationalSlots: 4,
    inventory: []
  }],

  // EKATERINBURG
  ['pvz-ekb-hub', {
    id: 'pvz-ekb-hub',
    cityId: 'ekaterinburg',
    name: 'Хаб Екатеринбург',
    type: 'hub',
    capacity: 1200,
    occupiedCapacity: 0,
    coordinates: { x: 400, y: 180 },
    operationalSlots: 20,
    inventory: []
  }],
  ['pvz-ekb-ural', {
    id: 'pvz-ekb-ural',
    cityId: 'ekaterinburg',
    name: 'Уральский',
    type: 'mesh',
    capacity: 220,
    occupiedCapacity: 78,
    coordinates: { x: 360, y: 200 },
    operationalSlots: 8,
    inventory: []
  }],
  ['pvz-ekb-greenwich', {
    id: 'pvz-ekb-greenwich',
    cityId: 'ekaterinburg',
    name: 'Гринвич',
    type: 'mesh',
    capacity: 200,
    occupiedCapacity: 55,
    coordinates: { x: 440, y: 160 },
    operationalSlots: 8,
    inventory: []
  }],
  ['pvz-ekb-standard-1', {
    id: 'pvz-ekb-standard-1',
    cityId: 'ekaterinburg',
    name: 'Екб Центр',
    type: 'standard',
    capacity: 180,
    occupiedCapacity: 95,
    coordinates: { x: 380, y: 220 },
    operationalSlots: 4,
    inventory: []
  }],
  ['pvz-ekb-standard-2', {
    id: 'pvz-ekb-standard-2',
    cityId: 'ekaterinburg',
    name: 'Екб Уралмаш',
    type: 'standard',
    capacity: 150,
    occupiedCapacity: 60,
    coordinates: { x: 420, y: 140 },
    operationalSlots: 4,
    inventory: []
  }],

  // KAZAN
  ['pvz-kazan-hub', {
    id: 'pvz-kazan-hub',
    cityId: 'kazan',
    name: 'Хаб Казань',
    type: 'hub',
    capacity: 800,
    occupiedCapacity: 0,
    coordinates: { x: 650, y: 150 },
    operationalSlots: 12,
    inventory: []
  }],
  ['pvz-kazan-kremlin', {
    id: 'pvz-kazan-kremlin',
    cityId: 'kazan',
    name: 'Кремлевский',
    type: 'mesh',
    capacity: 180,
    occupiedCapacity: 35,
    coordinates: { x: 620, y: 130 },
    operationalSlots: 6,
    inventory: []
  }],
  ['pvz-kazan-airport', {
    id: 'pvz-kazan-airport',
    cityId: 'kazan',
    name: 'Аэропорт',
    type: 'mesh',
    capacity: 160,
    occupiedCapacity: 28,
    coordinates: { x: 680, y: 170 },
    operationalSlots: 6,
    inventory: []
  }],
  ['pvz-kazan-standard-1', {
    id: 'pvz-kazan-standard-1',
    cityId: 'kazan',
    name: 'Казань Центр',
    type: 'standard',
    capacity: 150,
    occupiedCapacity: 70,
    coordinates: { x: 640, y: 180 },
    operationalSlots: 4,
    inventory: []
  }]
]);

/** @type {Map<string, ProductConfig>} */
export const DEMO_PRODUCTS = new Map([
  ['prod-1', {
    id: 'prod-1',
    sku: 'WB-123456',
    name: 'Смартфон Samsung Galaxy A54',
    category: 'electronics',
    price: 2500000, // 25000 ₽
    dimensions: { width: 15, height: 8, depth: 1 },
    weight: 200,
    returnRate: 0.08,
    sellerId: 'seller-1'
  }],
  ['prod-2', {
    id: 'prod-2',
    sku: 'WB-789012',
    name: 'Кроссовки Nike Air Max',
    category: 'clothing',
    price: 1200000, // 12000 ₽
    dimensions: { width: 30, height: 20, depth: 12 },
    weight: 800,
    returnRate: 0.18,
    sellerId: 'seller-2'
  }],
  ['prod-3', {
    id: 'prod-3',
    sku: 'WB-345678',
    name: 'Кофемашина DeLonghi',
    category: 'home',
    price: 4500000, // 45000 ₽
    dimensions: { width: 40, height: 35, depth: 30 },
    weight: 5000,
    returnRate: 0.05,
    sellerId: 'seller-3'
  }],
  ['prod-4', {
    id: 'prod-4',
    sku: 'WB-901234',
    name: 'Крем для лица La Roche-Posay',
    category: 'beauty',
    price: 180000, // 1800 ₽
    dimensions: { width: 5, height: 5, depth: 4 },
    weight: 50,
    returnRate: 0.12,
    sellerId: 'seller-4'
  }]
]);

/** @type {Map<string, SellerConfig>} */
export const DEMO_SELLERS = new Map([
  ['seller-1', {
    id: 'seller-1',
    name: 'ООО "ТехноМаркет"',
    category: 'electronics',
    commission: 0.15,
    productIds: ['prod-1']
  }],
  ['seller-2', {
    id: 'seller-2',
    name: 'ИП Иванов А.А.',
    category: 'clothing',
    commission: 0.12,
    productIds: ['prod-2']
  }],
  ['seller-3', {
    id: 'seller-3',
    name: 'ООО "ДомТех"',
    category: 'home',
    commission: 0.18,
    productIds: ['prod-3']
  }],
  ['seller-4', {
    id: 'seller-4',
    name: 'ИП Петрова М.С.',
    category: 'beauty',
    commission: 0.10,
    productIds: ['prod-4']
  }]
]);

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format kopecks to rubles string
 * @param {number} kopecks
 * @returns {string}
 */
export function money(kopecks) {
  const rubles = (kopecks / 100).toFixed(kopecks % 100 === 0 ? 0 : 2);
  return `${rubles} ₽`;
}

/**
 * Format virtual time hours to readable string
 * @param {number} hours
 * @returns {string}
 */
export function formatTime(hours) {
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  if (days > 0) return `${days}д ${h}ч`;
  return `${h}ч`;
}

/**
 * Generate unique ID with prefix
 * @param {string} [prefix='id']
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Deep clone an object
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Round to kopecks (integer)
 * @param {number} value
 * @returns {number}
 */
export function roundToKop(value) {
  return Math.round(value);
}

/**
 * Ceiling division
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function divCeil(a, b) {
  return Math.ceil(a / b);
}