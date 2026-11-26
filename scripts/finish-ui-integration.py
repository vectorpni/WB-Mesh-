from pathlib import Path
p=Path('src/ui/main.js');s=p.read_text(encoding='utf-8')
s=s.replace("  console.log('[WB Mesh] Ready');",'''  document.getElementById('roleSelect').value=window.appState.state.ui.role;
  const initialTab=location.hash.slice(1)||window.appState.state.ui.activeTab;
  if(['dashboard','pvz','seller','mcs','economics','demo','settings'].includes(initialTab)) switchTab(initialTab);
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(e=>console.warn('Автономный кэш недоступен:',e.message));
  console.log('[WB Mesh] Ready');''')
s=s.replace('  window.currentTab = tabName;','''  window.currentTab = tabName;
  window.appState.state.ui.activeTab=tabName;
  history.replaceState(null,'','#'+tabName);''')
p.write_text(s,encoding='utf-8')
