# LIMITATIONS.md — WB Mesh Control System

**Project:** WB Mesh Control System  
**Branch:** `feature/v5-development`  
**Status:** MVP (hackathon) — not production-ready

---

## Scope limitations

**Single-tenant local demo.** Runs in one browser tab on `localhost:3000`. No multi-user concurrency; role switching is a UI convenience, not production authentication/authorization.

**No real Wildberries API.** The app is offline-capable with zero external network calls (Google Fonts removed). All cities, PVZs, orders, sellers, and tariffs are demo fixtures defined in source (`src/core/types.js`, `src/core/app-state.js`). No live WB order or inventory data is consumed or displayed as real.

**No neural network.** `DemandForecast` uses classical statistical methods only: EWMA, moving average, seasonal naive, seasonal average — plus holdout evaluation (MAE, bias, WAPE, hit rate, false dispatches, misses). No model training or inference.

**Calculation algorithm, not AI.** `RouteOptimizer`, `CostEngine`, and the `MCS` facade are deterministic rule-based algorithms. Results are reproducible for identical inputs.

---

## Data limitations

**Demo / fixture data.** Orders, products, sellers, PVZs, and cities are synthetic seed data for demonstration. They are presented as such and are not passed as real WB data (per the "no synthetic data as real" rule).

**No persistent database.** State lives in memory; only tariffs are persisted to `localStorage` (key `wb-mesh-tariffs`). Refreshing the page loses orders/inventory unless re-seeded via demo scenarios.

**No payment / financial integration.** Economics are model-based unit estimates (Classic vs Mesh per order), not real WB payouts or settlements.

---

## Functionality not yet implemented

- Quarantine auto-release is time-based (24h) and tied to virtual-clock steps; real wall-clock persistence is not implemented.
- WAPE/bias holdout evaluation is computed in `DemandForecast.evaluate` and surfaced in the seller forecast panel, but not wired to auto-trigger replenishment or route decisions.
- PVZ workspace actions (receive/store/pack/dispatch/issue/return) are wired to `StateManager` transitions; inventory reservation/decrement on store/pack is not fully enforced.
- Network visualization capacity rings read live PVZ occupancy, but highlighted-route path drawing and trunk toggles are not yet implemented.

---

## Economics limitations

Tariffs (`DEFAULT_TARIFFS` in `src/core/types.js`) are model assumptions for the demo: Classic 120₽ / Mesh 79₽ per order. The JSDoc `TariffConfig` documentation was aligned to the implementation values; per the directive, the economy was **not forced** to target numbers.

Four-sided economics and the federal scenario (80M orders, 30% Mesh) are documented analysis targets (Stage 3), not simulated at scale.

No sensitive financial data or API keys are stored in source.

---

## Verification
- Unit tests: `node --test src/core/*.test.mjs` — 5 files, 0 failures
- E2E: `node test-final.cjs` — 0 errors, all 7 tabs, modal/drawer hidden, role switching, 5 demo scenarios
- Server: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → 200
