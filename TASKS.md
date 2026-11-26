# TASKS.md — WB Mesh Control System V5.0 Development Plan

**Project:** WB Mesh Control System  
**Branch:** `feature/v5-development`  
**Updated:** 2026-11-26  
**Methodology:** АУДИТ → ВОССТАНОВЛЕНИЕ → ЭКОНОМИКА → MCS → БИЗНЕС-ПРОЦЕССЫ → ДИЗАЙН → ТЕСТЫ → KILLCRITIC → ИСПРАВЛЕНИЕ → ПОВТОРНАЯ ПРОВЕРКА → УПАКОВКА

---

## Stage 1: АУДИТ (Full Project Audit) — ✅ COMPLETE

- [x] Check git state — clean on `ultra-dev` @ `8e60c09`
- [x] Verify app launch — HTTP 200 on localhost:3000
- [x] Study dependencies — pure ES modules, playwright dev dep
- [x] Run existing tests — `test-final.cjs` passes (0 errors)
- [x] Open site in browser — verified via Playwright
- [x] Create AUDIT.md — requirements→state→deficiency→priority→verification matrix
- [x] List P0/P1/P2 errors — 4 P0, 5 P1, 6 P2
- [x] Fix P0-2 (Google Fonts removed)
- [x] Fix P0-3 (unit test files added)
- [x] Fix P0-4 (UserRole.OWNER → UserRole.PVZ_OWNER)
- [x] Fix P0-1 (economics mismatch — resolved: JSDoc TariffConfig aligned to DEFAULT_TARIFFS actual values; economy NOT forced to target numbers per directive)

## Stage 2: ВОССТАНОВЛЕНИЕ (Extreme Frontend Recovery) — IN PROGRESS

- [ ] Fix sidebar overlap on mobile
- [ ] Fix empty KPI cards (ensure data renders)
- [ ] Fix text rendering issues
- [ ] Fix content overlap
- [ ] Fix grid alignment
- [ ] Fix header alignment
- [ ] Fix component sizes
- [ ] Fix theme mixing (light/dark consistency)
- [x] Wire PVZ workspace action handlers (P1-1) — processOrderAction wired to StateManager
- [x] Connect forecast panel to DemandForecast (P1-2) — renderSellerForecast uses state.salesHistory + DemandForecast.forecastNextDay
- [x] Wire network visualization to live occupancy (P1-3) — capacity ring reads pvz.occupiedCapacity/capacity
- [x] Add tariff persistence (P1-4) — localStorage wb-mesh-tariffs + restore in initApp
- [x] Verify demo timing 3-5 min (P1-5) — test-final.cjs PASS, 5 demo scenarios

## Stage 3: ЭКОНОМИКА (Extreme Economic Killcritic) — PENDING

- [ ] Audit financial formulas in CostEngine
- [ ] Separate models — do NOT mix old 145/123₽ with new TZ model
- [ ] Verify base economics (Classic vs Mesh)
- [ ] Trip cost formula: C_run = 480 + 8n + 40(k−1) + 6t
- [ ] Storage progressive tariff: ×1 (days 1-14), ×1.5 (days 15-30), ×2.5 (days 31-60)
- [ ] Four-sided economics (marketplace/seller/PVZ/customer)
- [ ] Federal scenario (80M orders, 30% Mesh)
- [ ] Economic simulator with parameters

## Stage 11: MCS ENGINE — PENDING

- [ ] Review CostEngine calculations
- [ ] Review RouteOptimizer constraint checking
- [ ] Review InventoryManager state transitions
- [ ] Review CapacityManager, ConsolidationEngine, ReverseLogistics, OperationsAudit
- [ ] Review MCS facade routeOrder/recalculateAllRoutes/generateReason

## Stage 12: БИЗНЕС-ПРОЦЕССЫ (Business Processes) — PENDING

- [ ] PVZ workspace: receive/store/pack/dispatch/issue/return/quarantine/writeoff
- [ ] Seller cabinet: products/supplies/analytics/forecast
- [ ] Idempotency
- [ ] Constraints: capacity, peak, slots, vehicle overload, downtime

## Stage 13: AI/ФОРМИРОВАНИЕ (Forecasting) — PENDING

- [ ] Compare naive/moving average/EWMA/seasonal methods
- [x] Fixed seed for reproducibility — seeded LCG RNG replaces Math.random() in StateManager (generateSalesHistory, seedInitialInventory); `setDemoSeed()` available
- [x] WAPE/bias evaluation — DemandForecast.evaluate computes WAPE; forecast panel shows bias/hitRate/MAE per product
- [ ] Forecast drives real decisions (storage location, deficit/excess, replenishment, route formation)

## Stage 14: ДЕМО-СЦЕНАРИИ (5 Demo Scenarios) — PENDING

- [ ] City order M1/M2
- [ ] Intercity C2
- [ ] Return flow
- [ ] Route failure
- [ ] Long storage
- [ ] Reproducible, 3-5 min total, 2-min final version

## Stage 15: UX/UI ДИЗАЙН — PENDING

- [ ] Corporate Wildberries design
- [ ] No CDN fonts
- [ ] Manrope/Inter/Golos Text
- [ ] Micro-animations
- [ ] prefers-reduced-motion support

## Stage 16: ЭКСПЕРТНЫЙ СОВЕТ — PENDING

- [ ] Up to 50 professional perspective checks

## Stage 17: KILLCRITIC MAXIMUM — PENDING

- [ ] Math audit
- [ ] Business logic audit
- [ ] Engineering audit
- [ ] Interface audit
- [ ] Reliability audit
- [ ] Reproducible auto tests

## Stage 18: ПРОИЗВОДИТЕЛЬНОСТЬ И БЕЗОПАСНОСТЬ — PENDING

- [ ] Load speed
- [ ] Section switch speed
- [ ] Calc speed
- [ ] No artificial delays
- [ ] No external network required
- [ ] No API keys in source

## Stage 19: ПОДГОТОВКА К ОТПРАВКЕ (Submission Prep) — PENDING

- [ ] README.md — updated
- [ ] Centralized tariffs
- [ ] Demo data
- [ ] Auto tests
- [ ] PROJECT_STATE.md — created
- [ ] AUDIT.md — created
- [ ] TASKS.md — created
- [ ] TEST_REPORT.md — exists
- [ ] DEMO_SCRIPT.md — pending
- [ ] LIMITATIONS.md — pending
- [ ] SKILLS-REPORT.md — exists
- [ ] TZ matrix
- [ ] Source archive
- [ ] Verify `npm run dev` and http://localhost:3000

---

## Skills Journal

| Skill | Task | Result |
|-------|------|--------|
| workflow-authoring | Orchestrate V5.0 development | Applied — using Workflow tool for substantive tasks |
| code-review | Audit codebase | Applied — identified P0/P1/P2 errors |
| test-driven-development | Unit tests for core modules | Applied — 5 test files created, all passing |

---

## Completion Criteria

- [ ] All P0 errors fixed
- [ ] All P1 errors fixed
- [ ] All P2 errors fixed or documented
- [ ] All 7 tabs fully functional
- [ ] 5 demo scenarios runnable and reproducible
- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (`node test-final.cjs`)
- [ ] All required documentation created
- [ ] App verified on http://localhost:3000 in real browser
- [ ] No external network dependencies
- [ ] No API keys in source
## V8 — этап ядра
- [x] Контрольный расчёт 100/92,96 и ПВЗ 6,50.
- [x] Резерв, транзит, выдача и возврат связаны с единым состоянием.
- [x] 29 проверок npm test проходят.
- [ ] Профессиональный интерфейс и синхронизация с презентацией.
- [ ] Playwright, визуальная проверка, упаковка и итоговые матрицы.

- [x] Семь рабочих экранов и интерактивный симулятор.
- [x] Пять реальных демо и прогноз с проверочным периодом.
- [x] План перемещений и подтверждённая будущая вместимость.
- [x] Визуально изучены пять слайдов исходного PPTX.
- [ ] Финальный браузерный аудит, артефакты и ZIP.
