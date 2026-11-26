from pathlib import Path
p=Path('src/core/app-state.js');s=p.read_text(encoding='utf-8')
s="import {createWithdrawalTasks} from './withdrawal-engine.js';\n"+s
a=s.index('  ageInventory(hours) {');b=s.index('  // ============================================',a)
s=s[:a]+'''  ageInventory(hours) {
    this.mcs.inventoryManager.ageBatches(hours);
    createWithdrawalTasks(this.state);
    auditEvent(this.state,{id:`time-${this.state.eventLog.length}`,type:'TIME_ADVANCED',timestamp:this.state.virtualTime.currentTime,details:{hours}});
  }

'''+s[b:]
s=s.replace("kind:'backhaul',status:'planned'", "kind:'backhaul',status:'planned',recurring:true")
s=s.replace("      transfers: [],", "      transfers: [],\n      withdrawals: [],")
s=s.replace("    this.state.transfers = data.transfers || [];", "    this.state.transfers = data.transfers || [];\n    this.state.withdrawals = data.withdrawals || [];")
s=s.replace("if(o.reservation) {this.mcs.inventoryManager.releaseReservation(o.reservation.batchId,o.quantity,o.id);o.reservation=null;}", "if(o.reservation) {for(const b of o.reservation.batches)this.mcs.inventoryManager.releaseReservation(b.batchId,b.quantity,b.reservationKey || o.id);o.reservation=null;}")
p.write_text(s,encoding='utf-8')
