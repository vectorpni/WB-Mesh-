from pathlib import Path
p=Path('src/core/app-state.js');s=p.read_text(encoding='utf-8')
s=s.replace("import { MCS, DemandForecast } from './mcs-engine.js';", "import { MCS, DemandForecast } from './mcs-engine.js';\nimport { orderOperations } from './order-operations.js';")
a=s.index('  createOrder(');b=s.index('  // DEMO SCENARIOS',a);b=s.rfind('  // ============================================',a,b)
methods=['createOrder','routeOrder','processOrderAction','processReturn','recordFinancialSnapshot','receiveSupply']
s=s[:a]+'\n'.join(f'  {m}(...args) {{ return orderOperations.{m}.apply(this,args); }}' for m in methods)+'\n\n'+s[b:]
s=s.replace('currentTime: 0, // hours since epoch','currentTime: 10, // virtual day starts in reception window')
s=s.replace('    // Seed initial inventory','    for (const p of pvzs.values()) { p.status = \'active\'; p.incoming = []; if(p.type === \'mesh\') p.capacity = 400; }\n\n    // Seed initial inventory',1)
s=s.replace('      notifications: []','      eventLog: [],\n      ledger: [],\n      notifications: []',1)
s=s.replace('const quantity = Math.floor(seededRandom() * 20) + 5;', 'const quantity = pvz.type === PVZType.HUB ? 100 : 60;')
s=s.replace('      const numProducts = Math.floor(seededRandom() * 3) + 3;', '      const numProducts = productArray.length;')
s=s.replace('        receivedAt: 0,', '        receivedAt: 10,')
s=s.replace('  resetDemo() {','  resetDemo() {\n    this.pauseVirtualClock();\n    this.state = this.createInitialState();\n    this.mcs = new MCS({pvzs:this.state.pvzs,cities:this.state.cities,tariffs:this.state.tariffs,orders:this.state.orders});\n    this.notify();\n    return;\n    // Preserved V7 reset below; V8 uses full deterministic reset.\n')
s=s.replace('  startVirtualClock() {','  startClock() { return this.startVirtualClock(); }\n  pauseClock() { return this.pauseVirtualClock(); }\n\n  startVirtualClock() {')
s=s.replace('  stepTime(hours = 1) {','  stepTime(hours = 1) {\n    if (!Number.isFinite(hours) || hours < 0 || hours > 8760) throw new RangeError(\'Некорректный шаг времени\');')
s=s.replace("    this.state.financialSnapshots = data.financialSnapshots || [];", "    this.state.financialSnapshots = data.financialSnapshots || [];\n    this.state.ledger = data.ledger || [];\n    this.state.eventLog = data.eventLog || [];")
p.write_text(s,encoding='utf-8')
