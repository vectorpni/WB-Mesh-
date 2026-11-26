from pathlib import Path
p=Path('src/ui/workspace-view.js');s=p.read_text(encoding='utf-8')
s=s.replace("${button('Сбросить демо','reset','',true)}</div>","${button('Сбросить демо','reset','',true)}${manager.lastDemoBackup?button('Восстановить до пресета','restore-demo','',true):''}${button(s.mcsStatus==='error'?'Восстановить MCS':'Симулировать сбой MCS','mcs-availability','',true)}</div>")
s=s.replace('Операционных слотов: ${p.operationalSlots}.', 'Заказов узла: ${[...s.orders.values()].filter(o=>o.sourcePvzId===p.id||o.destinationPvzId===p.id).length}. Операций за час: ${operationLoad(p,s.virtualTime.currentTime,s.tariffs).used}/${operationLoad(p,s.virtualTime.currentTime,s.tariffs).limit}.')
p.write_text(s,encoding='utf-8')
p=Path('src/ui/main.js');s=p.read_text(encoding='utf-8').replace("      e.preventDefault();\n      switchTab(link.dataset.tab);", "      if(e.ctrlKey||e.metaKey)return;\n      e.preventDefault();\n      switchTab(link.dataset.tab);")
s=s.replace('if (state.virtualTime.speed > 0) {','if (state.virtualTime.isRunning) {')
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8')
tabs={'dashboard':'Обзор','pvz':'Рабочее место ПВЗ','seller':'Кабинет продавца','mcs':'Сеть MCS','economics':'Экономическая модель','demo':'Демонстрация','settings':'Настройки'}
for tab,label in tabs.items():
 s=s.replace(f'href="#" class="sidebar-link'+(' active'if tab=='dashboard'else'')+f'" data-tab="{tab}"',f'href="#{tab}" class="sidebar-link'+(' active'if tab=='dashboard'else'')+f'" data-tab="{tab}"')
 s=s.replace(f'role="tabpanel" aria-labelledby="tab-{tab}"',f'role="region" aria-label="{label}"')
p.write_text(s,encoding='utf-8')
