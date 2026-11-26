from pathlib import Path
p=Path('src/core/app-state.js');s=p.read_text(encoding='utf-8')
s="import {SCENARIOS,runScenario} from './demo-engine.js';\n"+s
s=s.replace('  createDemoScenarios() {', '''  createDemoScenarios() {
    return SCENARIOS.map(s=>({...s,description:s.subtitle,steps:['Создать заказ','Рассчитать маршрут','Резерв и обработка','Проверить результат'],autoAdvance:false}));
  }

  legacyCreateDemoScenarios() {''')
s=s.replace('  runDemoScenario(scenarioId) {','  runDemoScenario(scenarioId) { return runScenario(this,scenarioId); }\n\n  legacyRunDemoScenario(scenarioId) {')
s=s.replace('const batchId = `batch-${product.id}-${generateId().slice(-6)}`;', 'const batchId = `seed-${pvz.id}-${product.id}`;')
s=s.replace('    const data = JSON.parse(json);\n    validateState(data);',"    const data = JSON.parse(json);\n    if(data.tariffs?.schemaVersion===8)data.tariffs={...DEFAULT_TARIFFS,...data.tariffs};\n    validateState(data);")
s=s.replace('    this.state.mcsDecisionLog = data.mcsDecisionLog || [];', "    this.state.mcsDecisionLog = data.mcsDecisionLog || [];\n    this.state.mcsStatus = data.mcsStatus==='error'?'error':'ready';")
s=s.replace('  setNodeStatus(id,status) {', '''  setMcsAvailable(available) {
    this.state.mcsStatus=available?'ready':'error';
    for(const o of this.state.orders.values())if(['new','received'].includes(o.status)){
      if(o.reservation){for(const b of o.reservation.batches)this.mcs.inventoryManager.releaseReservation(b.batchId,b.quantity,b.reservationKey||o.id);o.reservation=null;}
      this.routeOrder(o.id);
    }
    auditEvent(this.state,{id:`mcs-${this.state.eventLog.length}`,type:'MCS_STATUS_CHANGED',timestamp:this.state.virtualTime.currentTime,details:{available}});
    this.notify();
  }

  setNodeStatus(id,status) {''')
s=s.replace('    node.status=status;', "    node.status=status;\n    auditEvent(this.state,{id:`node-${this.state.eventLog.length}`,type:'NODE_STATUS_CHANGED',timestamp:this.state.virtualTime.currentTime,details:{id,status}});")
p.write_text(s,encoding='utf-8')
