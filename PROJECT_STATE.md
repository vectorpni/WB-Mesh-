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
# WB Mesh V8.0 — временная пауза по команде пользователя

Дата фиксации: 26 ноября 2026, Europe/Moscow.

**Статус: разработка приостановлена, задача не завершена и не отменена.** Часть 12 была запущена преждевременно. Возобновление допускается только после явной команды пользователя `RESUME WB MESH V8.0`. Ожидаются дополнительные требования и актуальная презентация. После безопасного сохранения не запускать команды, тесты или новые этапы разработки.

## Сохранённые изменения и выполненные действия V8

- Все части 1–12 и дополнительная часть 11.1 сохранены в `WB_MESH_V8_TASK.md`; прежние требования остаются действительными.
- Исходный HEAD проекта подтверждён: `ff78cd2`, исходная ветка `feature/v5-development`.
- Существующие наработки, включая ранее не отслеживаемые файлы, сохранены контрольным коммитом `79881ef` и тегом `backup/pre-v8-20261126`.
- Создан резервный архив `C:\Sites\WB-Mesh-backups\pre-v8-20261126.zip` без `.git` и `node_modules`.
- Создана рабочая ветка `feature/codex-v8`.
- Исходный `npm test` выполнен до паузы: прошли 5 тестовых файлов, ошибок запуска тестов не было. Это исходный результат, а не подтверждение готовности V8.
- Прочитаны инструкции frontend-design, test-driven-development, webapp-testing, systematic-debugging, verification-before-completion; чтение остальных запрошенных скиллов начато, часть большого вывода была усечена и требует дочитывания.
- Созданы каркас `PRESENTATION-MATRIX.md` и скрипт `scripts/extract-sources.py` для чтения источников без изменения оригиналов.
- В `evidence/sources/` извлечены тексты дополненного ТЗ, оригинального описания кейса, исправленного отчёта, плана выступления и указанного пользователем PPTX.
- Изучены исходные `mcs-engine.js`, тарифы и структуры `types.js`, начато изучение `app-state.js`, тестов и `server.js`.
- Прочитаны первые 500 строк извлечённого дополненного ТЗ; весь документ ещё не изучен. Прочитан текст пяти найденных XML-слайдов указанного PPTX; визуальная проверка, заметки, диаграммы и соответствие PDF ещё не проверены. Надпись «/6» внутри презентации не доказывает наличие шестого слайда.
- Код приложения в ходе начала V8 не изменялся. После контрольного коммита появились сохранённые рабочие изменения в задании, скрипт извлечения и извлечённые материалы; они не заявляются закоммиченными.

## В процессе на момент паузы

- Восстановление контекста и независимый аудит исходников, документов и истории Git.
- Инвентаризация скиллов и чтение их реальных инструкций.
- Сверка финансовой модели с первоисточником: ТЗ задаёт 100 ₽ против 92,96 ₽ для 40 отправлений и 10 суток, а исходные тарифы программы дают иные суммы. Исправления ещё не внесены.
- Проверка предварительных находок: отсутствие фактической проверки остатка для Mesh, автоматическое снятие карантина в InventoryManager, одно значение прогноза на весь holdout, возможная некорректная инициализация Map. Эти находки требуют воспроизведения и регрессионных тестов; не считать их исправленными.
- Поиск и установление актуальности презентации/PDF, заполнение матрицы соответствия слайдов продукту.

## Ещё не начато в рамках V8

- Изменения экономики, MCS, остатков, резервов, начислений и возвратов.
- Регрессионные тесты V8 и подтверждение контрольных примеров новым кодом.
- Переработка интерфейса и локальных визуальных ресурсов.
- Доработка прогнозирования, рекомендаций, интерактивной сети, симулятора и режима жюри.
- Новые проверки Playwright по браузерам и разрешениям, скриншоты V8 и их визуальное изучение.
- Итоговые финансовая таблица, матрица ТЗ, отчёты, сценарий защиты, финальная презентация и ZIP V8.
- Проверка запуска `npm run dev` и работающего сайта в рамках V8.

## Условия продолжения

Не откатывать и не удалять сохранённую работу. Не публиковать проект. Получение новых материалов само по себе не разрешает разработку. После `RESUME WB MESH V8.0` перечитать этот блок, общее задание и новые требования, проверить фактический Git diff и продолжить аудит с непрочитанных частей источников. Обычный командный запуск ранее не работал из-за `helper_unknown_error: setup refresh had errors`; запуск с отдельным разрешением вне неисправной песочницы работал. Ниже сохранено прежнее состояние проекта как исторический контекст, не как подтверждение результатов V8.

---


## V8 — возобновлено по явной команде RESUME
Ветка feature/codex-v8. Внесены реальные исправления: инициализация Map, единый CostEngine по ТЗ, 100/92,96 рубля, ПВЗ 14/7,50/6,50, маршрутизация по доступному товару, четыре экономических охранных правила, физический остаток и резерв, отдельный транзит, обязательная проверка возврата, идемпотентные выдача/начисление/возврат, rolling-origin прогноз. npm test: 29 проверок, 0 ошибок. В процессе: интерфейс, визуальная синхронизация, сценарии и расширенные проверки. Итоговая готовность не заявляется.
