# PROJECT_STATE.md — WB Mesh Control System

**Project:** WB Mesh Control System  
**Branch:** `feature/v5-development`  
**Last commit:** `8e60c09` (Fix P0 UI bugs: empty modal overlay, drawer, and blurred interface on load)  
**Updated:** 2026-11-26  
**Stage:** V5.0 Directive — Stage 1 Complete (Audit), Stage 2 Complete (Frontend Recovery), Stage 3 Pending (Economics)

---

## Current State

### Infrastructure
- Static file server on port 3000 (`server.js`), running and responding HTTP 200
- Pure ES module vanilla JS, no build step, zero runtime dependencies
- Dev dependency: `playwright ^1.65.1` for E2E testing
- No external API calls, no API keys in source, offline-capable (Google Fonts removed)

### Source Code (committed, working)
| Module | File | Status |
|--------|------|--------|
| Type definitions | `src/core/types.js` | ✅ Complete (JSDoc @typedef, enums, DEFAULT_TARIFFS) |
| State management | `src/core/app-state.js` | ✅ Complete (StateManager singleton, virtual time, demo scenarios, order lifecycle) |
| Calculation engine | `src/core/mcs-engine.js` | ✅ Complete (CostEngine, RouteOptimizer, InventoryManager, DemandForecast, etc.) |
| Design system | `src/ui/design-system.css` | ✅ Complete (Wildberries palette, components, responsive) |
| UI components | `src/ui/components.js` | ✅ Complete (createElement, svgIcon, cards, charts, network viz) |
| Application entry | `src/ui/main.js` | ✅ Complete (~2400 lines, all tabs, event listeners, rendering) |
| HTML entry | `index.html` | ✅ Complete (7 tabs, header, sidebar, modal/drawer overlays) |
| Server | `server.js` | ✅ Complete (static file serving, SPA fallback, directory traversal protection) |

### Unit Tests (new, passing)
| Test file | Tests | Status |
|-----------|-------|--------|
| `src/core/cost-engine.test.mjs` | Trip cost, classic, mesh, break-even, storage, PVZ payout | ✅ PASS |
| `src/core/route-optimizer.test.mjs` | M1/M2/C1/C2 candidates, selection, constraints | ✅ PASS |
| `src/core/inventory-manager.test.mjs` | Get/reserve/release/transfer/processReturn/resolveQuarantine | ✅ PASS |
| `src/core/demand-forecast.test.mjs` | EWMA, moving average, seasonal naive/average, holdout evaluate | ✅ PASS |
| `src/core/app-state.test.mjs` | Init, subscribe, create/route order, role switch, export/import, reset | ✅ PASS |

### E2E Tests (existing, passing)
| Test file | Status |
|-----------|--------|
| `test-final.cjs` | ✅ PASS (0 errors, all tabs, modal/drawer hidden, role switching, demo scenarios) |
| `test-ui.cjs` | ✅ Previously passed |
| `test-errors.cjs` | ✅ Previously passed |
| `test-ui-full.cjs` | ✅ Previously passed |

---

## Known Issues (from AUDIT.md)

### P0 (Critical)
1. **Economics mismatch** — RESOLVED: JSDoc TariffConfig aligned to DEFAULT_TARIFFS actuals (Classic 120₽/Mesh 79₽); economy NOT forced to target numbers per directive.
2. (FIXED) Google Fonts removed from index.html
3. (FIXED) Unit test files added for `npm test`
4. (FIXED) `UserRole.OWNER` → `UserRole.PVZ_OWNER` in app-state.js

### P1 (High) — all FIXED
1. PVZ workspace action handlers wired to StateManager (processOrderAction) — FIXED
2. Forecast panel connected to DemandForecast (state.salesHistory + forecastNextDay) — FIXED
3. Network visualization capacity indicators live (occupiedCapacity/capacity) — FIXED
4. Tariff editor persisted (localStorage wb-mesh-tariffs, restored in initApp) — FIXED
5. Demo timing verified (test-final.cjs PASS, 5 demo scenarios) — FIXED

### P2 (Medium) — all FIXED
1. Quarantine lifecycle enforced — ageBatches auto-releases quarantine after 24h — FIXED
2. WAPE/bias holdout evaluation added to DemandForecast.evaluate; shown in forecast panel — FIXED
3. Default seller auto-selected in initApp — FIXED
4. Seeded RNG for reproducible demo data — Math.random() replaced with seeded LCG in StateManager — FIXED

---

## Documentation Status

| Document | Status | Location |
|----------|--------|----------|
| README.md | ✅ Updated (economics aligned to DEFAULT_TARIFFS) | README.md |
| AUDIT.md | ✅ Created | AUDIT.md |
| PROJECT_STATE.md | ✅ Created | PROJECT_STATE.md |
| TASKS.md | ✅ Created | TASKS.md |
| TEST_REPORT.md | ✅ Exists | TEST-REPORT.md |
| DEMO_SCRIPT.md | ✅ Created | DEMO_SCRIPT.md |
| LIMITATIONS.md | ✅ Created | LIMITATIONS.md |
| SKILLS-REPORT.md | ✅ Exists | SKILLS-REPORT.md |
| TZ-MATRIX.md | ✅ Created | TZ-MATRIX.md |

---

## Demo Scenarios (5, defined in app-state.js)

| ID | Name | Description | Status |
|----|------|-------------|--------|
| city_order | Городской заказ (M1/M2) | Заказ внутри Перми: ПВЗ «Плюс Ареал» → тот же ПВЗ. M1 маршрут, 0₽ транспорт. | Defined |
| intercity_order | Межгородний заказ (C2) | Пермь → Екатеринбург: 5 заказов в рейсе. Точка безубыточности = 5 заказов. | Defined |
| return_flow | Возврат через Mesh | Покупатель не забрал: возврат 20₽ через Mesh vs 50₽ через хаб. Карантин 24ч. | Defined |
| route_failure | Сбой маршрута | Автомобиль сломался: MCS пересчитывает за 2 сек, меняет C2 → C1, SLA 24ч не нарушен. | Defined |
| long_storage | Долгое хранение | Товар лежит 30 дней: прогрессивный тариф 1× → 1.5× → 2× после 7 бесплатных дней. | Defined |

---

## Verification Commands

```bash
# Start server
cd /C/Sites/RWB-Mesh && node server.js

# Run unit tests
node --test src/core/*.test.mjs

# Run E2E test
node test-final.cjs

# Verify server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000