from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/core/mcs-engine.js'
s=p.read_text(encoding='utf-8')
start=s.index('export class CostEngine')
end=s.index('// ROUTE OPTIMIZER',start)
end=s.rfind('// ============================================',start,end)
s=s[:start]+"export { CostEngine } from './cost-engine.js';\nimport { CostEngine } from './cost-engine.js';\n\n"+s[end:]
p.write_text(s,encoding='utf-8')
p=root/'src/core/types.js'; s=p.read_text(encoding='utf-8')
a=s.index('export const DEFAULT_TARIFFS = {'); b=s.index('\n};',a)+3
s=s[:a]+'''export const DEFAULT_TARIFFS = {
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
};'''+s[b:]
p.write_text(s,encoding='utf-8')
p=root/'src/core/app-state.js'; s=p.read_text(encoding='utf-8')
for name in ['CITIES','PVZS','PRODUCTS','SELLERS']:
    s=s.replace('of DEMO_'+name+')','of DEMO_'+name+'.values())')
s=s.replace('    // Initialize cities','    setDemoSeed(0x5EED_CAFE);\n\n    // Initialize cities',1)
s=s.replace('      pvzClone.inventory = pvzClone.inventory || [];','      pvzClone.inventory = [];\n      pvzClone.occupiedCapacity = 0;')
s=s.replace("import { MCS }", "import { MCS, DemandForecast }")
s=s.replace("    const { DemandForecast } = require('./mcs-engine.js');",'')
p.write_text(s,encoding='utf-8')
