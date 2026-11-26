# DEMO_SCRIPT.md — WB Mesh Control System Demo Scenarios

**Project:** WB Mesh Control System  
**Branch:** `feature/v5-development`  
**Total time:** 3–5 min (full) / ~2 min (final cut)  
**Environment:** http://localhost:3000 — offline-capable, no external network, no API keys

---

## Prerequisites
1. `node server.js` running on port 3000 (`curl http://localhost:3000` → 200).
2. Open http://localhost:3000 in a browser.
3. Role selector in header; Demo tab contains 5 scenario cards.

All scenarios are driven by `StateManager` demo scenarios (`src/core/app-state.js`) and the virtual time clock — reproducible, no real waiting.

---

## Scenario 1 — Городской заказ (M1/M2)
**Goal:** Intra-city delivery with M1 route, zero transport cost.

**Steps**
1. Select role `pvz_owner` or `mcs_dispatcher`.
2. Demo tab → "Городской заказ (M1/M2)".
3. System creates an order within Perm: ПВЗ «Плюс Ареал» → same ПВЗ.
4. MCS selects M1 route (hub-to-PVZ local); transport cost = 0₽.
5. Run PVZ actions: receive → store → pack → dispatch → issue → settle.

**Expected:** Order reaches ISSUED/SETTLED; mesh economics apply; transport 0₽.  
**Time:** ~45 sec

---

## Scenario 2 — Межгородний заказ (C2)
**Goal:** Intercity delivery with cost consolidation across a trunk route.

**Steps**
1. Demo tab → "Межгородний заказ (C2)".
2. 5 orders consolidated into one trip Perm → Екатеринбург.
3. MCS selects C2 route (trunk line between cities).
4. Break-even = 5 orders per trip.

**Expected:** C2 route selected; per-order transport amortized; break-even at 5 orders.  
**Time:** ~45 sec

---

## Scenario 3 — Возврат через Mesh (return_flow)
**Goal:** Mesh return cheaper than hub return; quarantine lifecycle.

**Steps**
1. Demo tab → "Возврат через Mesh".
2. Customer does not pick up → order status ISSUED.
3. Action "return" → item moves to quarantine (24h hold).
4. Compare: Mesh return 20₽ vs hub return 50₽.
5. Quarantine auto-releases after 24h (virtual time).

**Expected:** Mesh return cheaper; item held in quarantine then auto-released.  
**Time:** ~45 sec

---

## Scenario 4 — Сбой маршрута (route_failure)
**Goal:** Automatic route recalculation on vehicle failure, SLA preserved.

**Steps**
1. Demo tab → "Сбой маршрута".
2. Vehicle breaks down mid-route (C2).
3. MCS recalculates in ~2 sec, switches C2 → C1.
4. SLA 24h not violated.

**Expected:** Route recalculated < 2 sec; SLA preserved.  
**Time:** ~45 sec

---

## Scenario 5 — Долгое хранение (long_storage)
**Goal:** Progressive storage tariff over time.

**Steps**
1. Demo tab → "Долгое хранение".
2. Item stored 30 days.
3. Tariff: ×1 (days 1–14), ×1.5 (days 15–30), ×2.5 (days 31–60); first 7 days free.
4. Watch storage cost grow progressively.

**Expected:** Storage cost scales with the progressive multiplier after the free period.  
**Time:** ~45 sec

---

## 2-minute final demo (recommended)
1. Dashboard → KPIs + live network map (~15 sec)
2. Scenario 1 city order M1 (~30 sec)
3. Scenario 3 return via Mesh (~30 sec)
4. Scenario 4 route failure recalculation (~30 sec)
5. Economics tab → Classic vs Mesh unit economics (~15 sec)
6. Closing savings summary (~15 sec)

---

## Notes
- All 5 scenarios reproducible via `StateManager` demo scenarios; deterministic outputs.
- Virtual clock accelerates storage aging; no real-time waiting required.
- Zero external network calls; works fully offline.
- E2E verification: `node test-final.cjs` → 0 errors, 5 demo scenarios confirmed.
