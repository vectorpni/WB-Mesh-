# TZ Matrix — WB Mesh Control System (ТЗ Matrix)

**Project:** WB Mesh Control System  
**Branch:** `feature/v5-development`  
**Hackathon:** RWB × PGU "TOP AI START"  
**Date:** 2026-11-26

---

## 1. Requirements → Implementation Coverage Matrix

| # | TZ Requirement | Implementation | File | Status | Verification |
|---|---------------|----------------|------|--------|--------------|
| R1 | App launches on http://localhost:3000 | Static file server `server.js` | `server.js` | ✅ Done | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → 200 |
| R2 | No console errors on load | All tabs render without errors | `src/ui/main.js` | ✅ Done | `node test-final.cjs` → 0 errors |
| R3 | All 7 tabs render | dashboard, pvz, seller, mcs, economics, demo, settings | `index.html` | ✅ Done | Playwright `isVisible()` → true for all 7 |
| R4 | Modal/drawer hidden on load | `display: none` with `.active` gating | `src/ui/design-system.css` | ✅ Done | `.active` selector not visible on load |
| R5 | Role switching (6 roles) | StateManager.setRole() | `src/core/app-state.js` | ✅ Done | Role cycling without errors |
| R6 | Virtual time controls | play/pause/step/speed | `src/core/app-state.js` | ✅ Done | `#timePlay`, `#timePause`, `#timeStep`, `#timeSpeed` |
| R7 | Trip cost `C = 48000 + 800n + 4000(k-1) + 600t` | CostEngine.calculateTripCost | `src/core/mcs-engine.js` | ✅ Done | Unit test passes |
| R8 | Classic vs Mesh unit economics | CostEngine.calculateClassicCost / calculateMeshVariableCost | `src/core/mcs-engine.js` | ✅ Done | Classic 120₽ / Mesh 79₽ |
| R9 | RouteOptimizer M1/M2/C1/C2 | RouteOptimizer.findCandidates / selectRoute | `src/core/mcs-engine.js` | ✅ Done | 4 route types, priority M1>M2>C1>C2 |
| R10 | InventoryManager batch tracking | reserve/release/transfer/processReturn/resolveQuarantine | `src/core/mcs-engine.js` | ✅ Done | Unit tests pass |
| R11 | DemandForecast 4 methods | EWMA, MA, seasonalNaive, seasonalAverage | `src/core/mcs-engine.js` | ✅ Done | Static methods, unit tests pass |
| R12 | 5 demo scenarios | createDemoScenarios() | `src/core/app-state.js` | ✅ Done | 5 scenario cards, reproducible |
| R13 | Economics tab | renderUnitEconomics, renderBreakEvenAnalysis | `src/ui/main.js` | ✅ Done | KPI cards render |
| R14 | PVZ workspace actions | receive/store/pack/dispatch/issue/return | `src/core/app-state.js` processOrderAction | ✅ Done | Wired to StateManager transitions |
| R15 | Seller cabinet forecast | renderSellerForecast → DemandForecast.forecastNextDay | `src/ui/main.js` | ✅ Done | Uses state.salesHistory (real demo data) |
| R16 | MCS network visualization | createNetworkVisualization (SVG) | `src/ui/components.js` | ✅ Done | Capacity rings, live occupancy |
| R17 | Design system: WB palette, system fonts | CSS custom properties | `src/ui/design-system.css` | ✅ Done | #CB11AB, #5421A8, #A020B0; no CDN fonts |
| R18 | No external network, no API keys | Offline-capable, Google Fonts removed | `index.html`, `src/` | ✅ Done | No fetch/XMLHttpRequest in source |
| R19 | Auto tests (reproducible) | 5 unit test files | `src/core/*.test.mjs` | ✅ Done | `npm test` → 5 pass, 0 fail |

---

## 2. Error Resolution Matrix (P0/P1/P2)

| ID | Severity | Issue | Resolution | File(s) | Status |
|----|----------|-------|------------|---------|--------|
| P0-1 | Critical | Economics JSDoc/docs mismatch (Classic 100₽/Mesh 93₽ vs actual 120₽/79₽) | Aligned JSDoc TariffConfig to DEFAULT_TARIFFS actuals; economy NOT forced | `src/core/types.js`, `README.md` | ✅ RESOLVED |
| P0-2 | Critical | Google Fonts preconnect — external network dependency | Removed preconnect and font `<link>` tags | `index.html` | ✅ FIXED |
| P0-3 | Critical | `npm test` references `*.test.js`, no test files | Created 5 `.test.mjs` files; updated package.json script | `src/core/*.test.mjs`, `package.json` | ✅ FIXED |
| P0-4 | Critical | `UserRole.OWNER` not defined in enum | Changed to `UserRole.PVZ_OWNER` | `src/core/app-state.js` | ✅ FIXED |
| P1-1 | High | PVZ workspace action handlers not wired | pvzAction → StateManager.processOrderAction for all 6 actions | `src/ui/main.js` | ✅ FIXED |
| P1-2 | High | Forecast panel not connected to demand data | Uses `state.salesHistory` + `DemandForecast.forecastNextDay` | `src/ui/main.js` | ✅ FIXED |
| P1-3 | High | Network capacity indicators static | Reads `pvz.occupiedCapacity / pvz.capacity` live from state | `src/ui/components.js` | ✅ FIXED |
| P1-4 | High | Tariff changes not persisted | localStorage `wb-mesh-tariffs`, restored in `initApp` | `src/ui/main.js` | ✅ FIXED |
| P1-5 | High | Demo timing not verified | test-final.cjs PASS, 5 demo scenarios, 3-5 min total | `test-final.cjs` | ✅ FIXED |
| P2-1 | Medium | No quarantine lifecycle enforcement | `ageBatches` auto-releases quarantine after 24h | `src/core/mcs-engine.js` | ✅ FIXED |
| P2-2 | Medium | No WAPE/bias holdout evaluation | `DemandForecast.evaluate` computes WAPE; shown in forecast panel | `src/core/mcs-engine.js` | ✅ FIXED |
| P2-3 | Medium | No unit tests | 5 unit test files created | `src/core/*.test.mjs` | ✅ FIXED |
| P2-4 | Medium | Tariff editor not persisted | Same as P1-4 — localStorage persistence | `src/ui/main.js` | ✅ FIXED |
| P2-5 | Medium | No default seller selected | `initApp` auto-selects first seller | `src/ui/main.js` | ✅ FIXED |

---

## 3. Reproducibility Matrix

| Component | Seed | Deterministic | Notes |
|-----------|------|---------------|-------|
| Sales history | `0x5EED_CAFE` | ✅ Yes | Seeded LCG RNG, `setDemoSeed()` available |
| Initial inventory | `0x5EED_CAFE` | ✅ Yes | Same RNG stream |
| Unit economics | N/A | ✅ Yes | Pure functions of tariffs |
| Route selection | N/A | ✅ Yes | Deterministic priority + constraints |
| Forecast methods | N/A | ✅ Yes | Statistical methods, no randomness |

---

## 4. Deliverables Matrix (Stage 19)

| Document | Location | Status |
|----------|----------|--------|
| README.md | `README.md` | ✅ Updated (economics aligned) |
| AUDIT.md | `AUDIT.md` | ✅ Created |
| PROJECT_STATE.md | `PROJECT_STATE.md` | ✅ Created |
| TASKS.md | `TASKS.md` | ✅ Created |
| TEST-REPORT.md | `TEST-REPORT.md` | ✅ Exists |
| DEMO_SCRIPT.md | `DEMO_SCRIPT.md` | ✅ Created |
| LIMITATIONS.md | `LIMITATIONS.md` | ✅ Created |
| SKILLS-REPORT.md | `SKILLS-REPORT.md` | ✅ Exists |
| TZ Matrix | `TZ-MATRIX.md` | ✅ Created (this file) |
| Source archive | — | Pending (packaging step) |

---

## 5. Verification Commands

```bash
# Start server
cd /C/Sites/RWB-Mesh && node server.js

# Verify server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# Run unit tests
npm test

# Run E2E test
node test-final.cjs
```
