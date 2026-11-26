from pathlib import Path
p=Path('src/core/app-state.js');s=p.read_text(encoding='utf-8')
s="import {stockProjection,reconcileStock,auditEvent} from './stock-audit.js';\nimport {validateState,validateTariffs} from './state-validation.js';\n"+s
s=s.replace('      eventLog: [],','      openingStock: stockProjection(pvzs),\n      stockCheckpoint: stockProjection(pvzs),\n      eventLog: [],',1)
s=s.replace('  setTariffs(tariffs) {','  reconcile() { return reconcileStock(this.state); }\n\n  resolveReturn(batchId,resolution,inspection) {\n    const r=this.mcs.inventoryManager.resolveQuarantine(batchId,resolution,inspection);\n    if(r.success) {auditEvent(this.state,{id:`inspection-${batchId}`,type:`RETURN_${resolution.toUpperCase()}`,timestamp:this.state.virtualTime.currentTime,details:{batchId,inspection}});this.notify();}\n    return r;\n  }\n\n  setTariffs(tariffs) {\n    validateTariffs(tariffs);')
s=s.replace('    this.state.virtualTime.isRunning = true;', '    if(this.state.virtualTime.speed <= 0) this.state.virtualTime.speed=1;\n    this.state.virtualTime.isRunning = true;',1)
s=s.replace('    const data = JSON.parse(json);','    const data = JSON.parse(json);\n    validateState(data);')
s=s.replace('    this.state.ledger = data.ledger || [];','    this.state.ledger = data.ledger || [];\n    this.state.openingStock = data.openingStock || {};\n    this.state.stockCheckpoint = data.stockCheckpoint || stockProjection(this.state.pvzs);')
s=s.replace('    this.state.ui = data.ui || this.state.ui;',"    this.state.ui = data.ui || this.state.ui;\n    this.state.virtualTime.isRunning=false;")
p.write_text(s,encoding='utf-8')
p=Path('src/ui/workspace-view.js');s=p.read_text(encoding='utf-8')
s=s.replace("manager.mcs.inventoryManager.resolveQuarantine(target.dataset.batch,'resell',{fit:true});manager.state.eventLog.push({id:`inspection-${target.dataset.batch}`,type:'RETURN_RESTOCK',timestamp:manager.state.virtualTime.currentTime,details:{batchId:target.dataset.batch,fit:true}});manager.notify();", "manager.resolveReturn(target.dataset.batch,'resell',{fit:true});")
p.write_text(s,encoding='utf-8')
