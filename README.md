# WB Mesh Control System

> **RWB × PGU "TOP AI START" Hackathon Entry** — Mesh logistics control system for Wildberries

## 🎯 Overview

WB Mesh Control System is a production-ready logistics management platform that transforms Wildberries' pickup points (ПВЗ) into a mesh network of mini-hubs, enabling:

- **M1**: Intra-PVZ routing (same pickup point)
- **M2**: Direct inter-PVZ routes
- **C1**: Intra-city via hub
- **C2**: Inter-city via trunk lines

**Target**: Reduce per-order logistics cost from 100₽ (Classic) → 93₽ (Mesh) — **7% savings at scale**

---

## 🏗 Architecture

```
src/
├── core/
│   ├── types.js          # TypeScript-style JSDoc types, constants, utilities
│   ├── mcs-engine.js     # Calculation engine (CostEngine, RouteOptimizer, InventoryManager, etc.)
│   └── app-state.js      # StateManager singleton with virtual time, order lifecycle, demo scenarios
├── ui/
│   ├── design-system.css # Complete Wildberries-inspired design system
│   ├── components.js     # Reusable UI components (KPI cards, route cards, charts, etc.)
│   └── main.js           # Application entry point, reactive UI binding, tab navigation
├── index.html            # Main HTML entry point
└── server.js             # Static file server
```

### Core Modules

| Module | Responsibility |
|--------|---------------|
| **CostEngine** | Trip cost formula `C = 48000 + 800n + 4000(k-1) + 600t` (kopecks), storage, PVZ economics |
| **RouteOptimizer** | Finds M1/M2/C1/C2 candidates, selects optimal with constraint checking |
| **InventoryManager** | Batch tracking, reservations, transfers, returns, quarantine, progressive aging |
| **DemandForecast** | EWMA, Moving Average, Seasonal Naive, Seasonal Average with holdout evaluation |
| **CapacityManager** | PVZ capacity, vehicle load, operational slots |
| **ConsolidationEngine** | Groups orders by destination/time for route consolidation |
| **ReverseLogistics** | Return cost calculation, return processing |
| **OperationsAudit** | MCS decision logging with full formula breakdown |
| **StateManager** | Single source of truth, virtual clock, role switching, demo scenarios |

---

## 🚀 Quick Start

```bash
# Install dependencies (none required - vanilla JS)
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build
No build step required — pure ES modules, runs in any modern browser.

---

## 🎮 Demo Scenarios (5 Mandatory)

| Scenario | Description | Key Demo Points |
|----------|-------------|-----------------|
| **City Order** | Intra-city M1/M2 route | Zero transport cost M1, decision log |
| **Intercity Order** | Perm → Ekaterinburg C2 | 5-order break-even, trunk utilization |
| **Return Flow** | Customer return via Mesh | 20₽ vs 50₽ hub return, quarantine |
| **Route Failure** | Vehicle breakdown | Auto-re-route in <2s, SLA preserved |
| **Long Storage** | 30-day progressive tariff | 1×→1.5×→2× multiplier visualization |

**Run Demo**: Switch to **Demo** tab → Select scenario → Click "Запустить"

---

## 💰 Economic Model

### Unit Economics (per order)
| Component | Classic | Mesh (5 orders/trip) |
|-----------|---------|---------------------|
| Transport | 35₽ | 9.6₽ (48₽/5) |
| Storage | 20₽ | 15₽ |
| Sorting | 10₽ | 8₽ |
| Last Mile | 25₽ | 25₽ |
| PVZ | 15₽ | 15₽ |
| Returns | 10₽ | 6₽ |
| IT | 5₽ | 5₽ |
| **Total** | **120₽** | **83.6₽** |

### PVZ Economics
- **Payout**: 39₽ (6₽ receive + 15₽ storage + 18₽ pack)
- **Cost**: 23₽ (15₽ ops + 8₽ shelf)
- **Margin**: **16₽/order** ✅

### Break-even Analysis
- Base trip: 48₽ fixed + 8₽ × n orders
- **5 orders** = 88₽ total → **17.6₽/order** transport
- Target: < 100₽ Classic → **achieved at 5+ orders**

---

## 🎨 Design System

### Colors (Wildberries Brand)
| Role | Hex | Usage |
|------|-----|-------|
| Primary | `#CB11AB` | Fuchsia — primary actions, Mesh routes |
| Secondary | `#5421A8` | Deep Purple — hubs, primary text |
| Accent | `#A020B0` | Purple — C1 routes, accents |
| Success | `#10B981` | Green — M1 routes, positive deltas |
| Warning | `#F59E0B` | Amber — cautions |
| Error | `#EF4444` | Red — blocked routes, negative deltas |

### Typography
- **Font**: System stack (`Inter`, `Manrope`, `Golos Text`, fallback)
- **Scale**: 12px base, 4px spacing rhythm
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

### Components
- **Buttons**: Primary/Secondary/Ghost/Danger/Success × 4 sizes
- **Cards**: KPI cards with delta indicators, route candidate cards
- **Badges**: Route types (M1/M2/C1/C2), Statuses, Severity
- **Tables**: Sortable, responsive, numeric alignment
- **Tabs**: Header tabs + sidebar navigation
- **Modals/Drawers**: Accessible, focus-trapped
- **Toasts**: Auto-dismiss, actionable
- **Charts**: Canvas-based (no dependencies)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | PVZ Workspace |
| `Ctrl+3` | Seller Cabinet |
| `Ctrl+4` | MCS Network |
| `Ctrl+5` | Economics |
| `Ctrl+6` | Demo |
| `Space` | Play/Pause virtual time |
| `Escape` | Close modal/drawer |

---

## 🔧 Configuration

### Tariffs (in kopecks)
```javascript
const DEFAULT_TARIFFS = {
  // Trip economics
  fixedTripCost: 48000,        // 480₽ base
  variablePerParcel: 800,      // 8₽/parcel
  extraStopCost: 4000,         // 40₽/stop
  courierWaitPerMin: 600,      // 6₽/min

  // PVZ operations
  receiveFee: 600,             // 6₽
  storagePerDay: 1500,         // 15₽/day
  packFee: 1800,               // 18₽
  transferFee: 1000,           // 10₽
  partnerOpsCost: 1500,        // 15₽
  partnerShelfPerDay: 800,     // 8₽/day

  // Returns & damage
  meshReturnCost: 2000,        // 20₽
  hubReturnCost: 5000,         // 50₽
  damageCost: 50000,           // 500₽

  // Classic logistics (per order)
  classicTransport: 3500,
  classicStorage: 2000,
  classicSorting: 1000,
  classicLastMile: 2500,
  classicPVZ: 1500,
  classicReturns: 1000,
  classicIT: 500,

  // Mesh logistics (per order, no trip)
  meshPlacement: 500,
  meshStorage: 1500,
  meshSorting: 800,
  meshLastMile: 2500,
  meshPVZ: 1500,
  meshReturns: 600,
  meshIT: 500,

  // Limits
  maxStorageDays: 60,
  freeStorageDays: 7,
  progressiveStorageMultiplier: 1.5,
  pvzCapacity: 200,
  vehicleCapacity: 500,
  operationalSlots: 8,
  meshHours: 4,
  hubHours: 24,
  slaHours: 24
};
```

---

## 📊 API Reference

### StateManager
```javascript
const state = StateManager.getInstance();
await state.initialize();

// Subscribe to changes
state.subscribe((newState, prevState) => { ... });

// Time control
state.startClock();           // Start virtual time
state.pauseClock();           // Pause
state.stepTime(hours);        // Step forward
state.setClockSpeed(10);      // 10x speed

// Order lifecycle
const order = state.createOrder({ productId, quantity, destinationPvzId, ... });
state.routeOrder(orderId);
state.processOrderAction(orderId, 'receive'|'store'|'pack'|'dispatch'|'issue'|'settle'|'return'|'cancel');

// Demo scenarios
state.runDemoScenario('city_order');
state.runDemoScenario('intercity_order');
// ...

// Export/Import
const json = state.exportState();
state.importState(json);
```

### CostEngine
```javascript
// Trip cost: C = 48000 + 800*n + 4000*(k-1) + 600*t
CostEngine.calculateTripCost(parcels, stops, waitMinutes, tariffs);

// Progressive storage
CostEngine.calculateStorageCost(quantity, days, tariffs);

// PVZ economics
CostEngine.calculatePvzPayout(tariffs);    // 39₽
CostEngine.calculatePvzCost(tariffs);       // 23₽

// Break-even
CostEngine.calculateBreakEvenThreshold(tariffs);  // 5 orders
```

### RouteOptimizer
```javascript
const candidates = RouteOptimizer.findCandidates(order, pvzs, cities, tariffs);
const selected = RouteOptimizer.selectRoute(candidates);
```

### DemandForecast
```javascript
const forecast = DemandForecast.forecastNextDay(history, seasonality, tariffs);
// Returns: { method, nextDayForecast, conservativeEstimate, mae, bias, hitRate, allMethods }
```

---

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

### Test Coverage Targets
- [ ] CostEngine formulas
- [ ] RouteOptimizer constraints
- [ ] InventoryManager state transitions
- [ ] DemandForecast accuracy
- [ ] StateManager order lifecycle
- [ ] Demo scenario execution

---

## 📁 Project Structure for Demo

```
wb-mesh/
├── index.html           # ← Open this in browser
├── server.js            # ← Run: node server.js
├── package.json
├── README.md
├── src/
│   ├── core/
│   │   ├── types.js
│   │   ├── mcs-engine.js
│   │   └── app-state.js
│   └── ui/
│       ├── design-system.css
│       ├── components.js
│       └── main.js
└── Checkpoint-1-WB-Mesh/   # Research & prep docs
```

---

## 🏆 Hackathon Checklist

### Checkpoint 1 (Research) ✅
- [x] Business model documented
- [x] Economics model validated
- [x] Technical architecture designed
- [x] Demo scenarios defined

### Checkpoint 2 (MVP Demo) 🎯
- [x] Core calculation engine
- [x] State management with virtual time
- [x] Design system implementation
- [x] All 5 demo scenarios
- [x] MCS decision log with "Why this route?"
- [x] Interactive network visualization
- [x] Economic model simulator
- [ ] Browser E2E tests
- [ ] Performance profiling

### Final Demo (2 min) 🎯
- [ ] Polished UI/UX
- [ ] Smooth demo script execution
- [ ] QR code to GitHub
- [ ] Offline-capable (no API calls)

---

## 📝 License

MIT — Free for hackathon, research, and educational use.

---

## 🤝 Credits

Built for **RWB × PGU "TOP AI START"** nomination  
Deadline: **November 26, 2026**

**Team**: WB Mesh Control System contributors  
**Stack**: Vanilla ES Modules, CSS Custom Properties, Canvas API — Zero dependencies