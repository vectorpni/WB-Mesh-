from pathlib import Path
p=Path('src/core/app-state.js');s=p.read_text(encoding='utf-8')
s=s.replace('      eventLog: [],','''      scheduledTrips: [...cities.values()].flatMap((city,i) => {
        const nodes=[...pvzs.values()].filter(p=>p.type==='mesh' && p.cityId===city.id);
        return nodes.length>1 ? [{id:`existing-${city.id}`,kind:'backhaul',status:'planned',nodes:[city.hubId,...nodes.map(p=>p.id),city.hubId],departureTime:13,capacity:80,booked:0,additionalFixed:500,additionalPerUnit:300}] : [];
      }),
      transfers: [],
      eventLog: [],''',1)
s=s.replace('      products.set(product.id, deepClone(product));', "      const copy=deepClone(product);\n      copy.units=product.id==='prod-2'?3:product.id==='prod-3'?8:1;\n      copy.meshEligible=copy.units<=3;\n      copy.purchaseCost=Math.round(product.price*.6);\n      products.set(product.id,copy);")
s=s.replace('const quantity = pvz.type === PVZType.HUB ? 100 : 60;', "const quantity = pvz.type === PVZType.HUB ? Math.floor(100/(product.units||1)) : Math.floor((pvz.id.endsWith('krasnov') || pvz.id.endsWith('greenwich') || pvz.id.endsWith('airport') ? 4 : 60)/(product.units||1));")
s=s.replace('          quantity,\n          batchId,','          quantity,\n          units: product.units || 1,\n          batchId,')
s=s.replace('        pvz.occupiedCapacity += quantity;','        pvz.occupiedCapacity += quantity*(product.units || 1);')
s=s.replace('    this.state.ledger = data.ledger || [];','    this.state.ledger = data.ledger || [];\n    this.state.scheduledTrips = data.scheduledTrips || [];\n    this.state.transfers = data.transfers || [];')
s=s.replace('  setRole(role) {', '''  setNodeStatus(id,status) {
    const node=this.state.pvzs.get(id); if(!node) return;
    node.status=status;
    for(const o of this.state.orders.values()) if(['new','received'].includes(o.status)) {
      if(o.reservation) {this.mcs.inventoryManager.releaseReservation(o.reservation.batchId,o.quantity,o.id);o.reservation=null;}
      this.routeOrder(o.id);
    }
    this.notify();
  }

  setRole(role) {''')
p.write_text(s,encoding='utf-8')
p=Path('src/ui/workspace-view.js');s=p.read_text(encoding='utf-8')
s="import {planningView} from './planning-view.js';\nimport {buildTransferPlan,scheduleTransfer,progressTransfer,localHistory} from '../core/planning-engine.js';\n"+s
s=s.replace("const q=manager.mcs.inventoryManager.summary(p.id,product.id),r=DemandForecast.recommend(history,", "const q=manager.mcs.inventoryManager.summary(p.id,product.id),r=DemandForecast.recommend(localHistory(s,product.id,p.id),")
s=s.replace("</div></section>`;\n}\n\nfunction demo(s)", "</div></section>${planningView(s)}`;\n}\n\nfunction demo(s)")
s=s.replace("p.status=p.status==='active'?'paused':'active';manager.notify();", "manager.setNodeStatus(p.id,p.status==='active'?'paused':'active');")
s=s.replace("manager.state.pvzs.get(view.node).status='down';manager.notify();", "manager.setNodeStatus(view.node,'down');")
s=s.replace("   if(a==='order'){", "   if(a==='plan'){const r=scheduleTransfer(manager,target.dataset.plan);notice(r.success?'Товар и вместимость будущего рейса зарезервированы':r.error);}\n   if(a==='plan-all'){const plans=buildTransferPlan(manager.state).filter(p=>p.available);let count=0;for(const p of plans)if(scheduleTransfer(manager,p.id).success)count++;notice(`Запланировано перемещений: ${count}`);}\n   if(a==='move'){const r=progressTransfer(manager,target.dataset.move);notice(r.success?'Перемещение обновлено; остатки и журнал согласованы':r.error);}\n   if(a==='order'){")
p.write_text(s,encoding='utf-8')
