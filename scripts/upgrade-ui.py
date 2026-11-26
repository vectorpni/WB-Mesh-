from pathlib import Path
p=Path('src/ui/main.js');s=p.read_text(encoding='utf-8')
s="import { renderWorkspace } from './workspace-view.js';\n"+s
a=s.index('function onTabActivate(');b=s.index('// ============================================',a)
s=s[:a]+"function onTabActivate(tabName) { renderWorkspace(window.appState,tabName,switchTab); }\n\n"+s[b:]
a=s.index('function renderAll()');b=s.index('\nfunction updateMcsStatus',a)
s=s[:a]+'''function renderAll() {
  updateTimeDisplay(); updateTimeControls(); updateMcsStatus();
  renderWorkspace(window.appState,window.currentTab,switchTab);
}
'''+s[b:]
a=s.index('function updateRoleUI(');b=s.index('// ============================================',a)
s=s[:a]+'''function updateRoleUI(role) {
  document.body.classList.toggle('jury-mode',role === 'jury');
  if(role === 'seller') switchTab('seller');
  else if(role === 'pvz_operator') switchTab('pvz');
  else if(role === 'jury') switchTab('demo');
}

'''+s[b:]
# Restore only compatible V8 state; never reuse stale V7 tariffs.
a=s.index('  // Restore persisted tariffs');b=s.index('  // Auto-select',a)
s=s[:a]+'''  try {
    const stored = localStorage.getItem('wb-mesh-state-v8');
    if(stored) window.appState.importState(stored);
  } catch(e) { console.warn('Сохранённое состояние отклонено:',e.message); }
  window.appState.subscribe(() => {
    try { localStorage.setItem('wb-mesh-state-v8',window.appState.exportState()); }
    catch(e) { console.warn('Локальное сохранение недоступно:',e.message); }
  });

'''+s[b:]
s=s.replace("    populatePvzSelector(e.target.value);", "    populatePvzSelector(e.target.value);\n    renderAll();")
s=s.replace("  const isRunning = vt.speed > 0;", "  const isRunning = vt.isRunning;")
s=s.replace("const hours = vt.currentTime % 24;", "const hours = Math.floor(vt.currentTime % 24);")
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('<title>WB Mesh Control System</title>','<title>WB Mesh — Vector PNI</title>')
s=s.replace('href="src/ui/design-system.css">','href="src/ui/design-system.css">\n  <link rel="stylesheet" href="src/ui/v8.css">\n  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">\n  <meta name="theme-color" content="#CB11AB">\n  <meta name="description" content="WB Mesh — исследовательский MVP команды Vector PNI. Экономика и управление распределённой логистикой.">')
s=s.replace('aria-label="Toggle sidebar"','aria-label="Открыть навигацию"').replace('aria-label="Main navigation"','aria-label="Основная навигация"').replace('value="owner"','value="pvz_owner"').replace('>Дашборд<','>Обзор<').replace('v1.0.0-hackathon','WB Mesh V8.0').replace('RWB × PGU TOP AI START','Vector PNI · ТОП ИИ СТАРТ').replace('Control System</span>','Управление сетью</span>')
p.write_text(s,encoding='utf-8')
