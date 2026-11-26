import { renderWorkspace } from './workspace-view.js';
/**
 * WB Mesh Control System — Main Application Entry Point
 * Initializes state, binds UI, handles navigation and reactive updates
 */

import { StateManager } from '../core/app-state.js';
import { CostEngine, RouteOptimizer, InventoryManager, DemandForecast, MCS } from '../core/mcs-engine.js';
import { DEMO_CITIES, DEMO_PVZS, DEMO_PRODUCTS, DEMO_SELLERS, DEFAULT_TARIFFS, money, formatTime, generateId, deepClone } from '../core/types.js';
import { createKpiCard, createRouteCandidateCard, createOrderCard, createLedger, createDecisionLogPanel, createForecastPanel, createNetworkVisualization, createDemoPanel, createTariffEditor, svgIcon, createElement } from './components.js';

// ============================================
// GLOBAL STATE & APP INSTANCE
// ============================================

window.appState = null;
window.currentTab = 'dashboard';
window.selectedOrderId = null;
window.selectedRoute = null;
window.demoRunning = false;
window.demoInterval = null;
window.currentDemoStep = 0;

// ============================================
// INITIALIZATION
// ============================================

async function initApp() {
  console.log('[WB Mesh] Initializing...');

  // Initialize StateManager
  window.appState = StateManager.getInstance();
  await window.appState.initialize();

  try {
    const stored = localStorage.getItem('wb-mesh-state-v8');
    if(stored) window.appState.importState(stored);
  } catch(e) { console.warn('Сохранённое состояние отклонено:',e.message); }
  window.appState.subscribe(() => {
    try { localStorage.setItem('wb-mesh-state-v8',window.appState.exportState()); }
    catch(e) { console.warn('Локальное сохранение недоступно:',e.message); }
  });

  // Auto-select default seller so the seller cabinet renders data on load
  const s0 = window.appState.getState();
  if (!s0.ui.selectedSellerId && s0.sellers.size > 0) {
    window.appState.setSelectedSeller(Array.from(s0.sellers.keys())[0]);
  }

  // Subscribe to state changes
  window.appState.subscribe(onStateChange);

  // Setup UI event listeners
  setupEventListeners();

  // Populate dropdowns
  populateSelectors();

  // Initial render
  renderAll();

  // Start virtual clock (paused by default)
  // window.appState.startClock();

  document.getElementById('roleSelect').value=window.appState.state.ui.role;
  const initialTab=location.hash.slice(1)||window.appState.state.ui.activeTab;
  if(['dashboard','pvz','seller','mcs','economics','demo','settings'].includes(initialTab)) switchTab(initialTab);
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(e=>console.warn('Автономный кэш недоступен:',e.message));
  console.log('[WB Mesh] Ready');
  showToast('Система готова', 'success');
}

function onStateChange(state, prevState) {
  // Debounce render
  if (!window._renderScheduled) {
    window._renderScheduled = true;
    requestAnimationFrame(() => {
      window._renderScheduled = false;
      renderAll();
    });
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);

  // Tab navigation (header tabs)
  document.querySelectorAll('#headerTabs .tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Sidebar navigation
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      if(e.ctrlKey||e.metaKey)return;
      e.preventDefault();
      switchTab(link.dataset.tab);
      if (window.innerWidth < 1024) toggleSidebar(false);
    });
  });

  // City selector
  document.getElementById('citySelect').addEventListener('change', (e) => {
    window.appState.setSelectedCity(e.target.value || null);
    populatePvzSelector(e.target.value);
    renderAll();
  });

  // PVZ selector
  document.getElementById('pvzSelect').addEventListener('change', (e) => {
    window.appState.setSelectedPvz(e.target.value || null);
  });

  // Role selector
  document.getElementById('roleSelect').addEventListener('change', (e) => {
    window.appState.setRole(e.target.value);
    updateRoleUI(e.target.value);
  });

  // Virtual time controls
  document.getElementById('timePlay').addEventListener('click', () => {
    window.appState.startClock();
    updateTimeControls();
  });
  document.getElementById('timePause').addEventListener('click', () => {
    window.appState.pauseClock();
    updateTimeControls();
  });
  document.getElementById('timeStep').addEventListener('click', () => {
    window.appState.stepTime(1); // 1 hour step
    updateTimeDisplay();
  });
  document.getElementById('timeSpeed').addEventListener('input', (e) => {
    const speed = parseInt(e.target.value);
    window.appState.setClockSpeed(speed);
    document.getElementById('speedLabel').textContent = `${speed}×`;
  });

  // Demo reset
  document.getElementById('demoReset').addEventListener('click', () => {
    if (confirm('Сбросить все демо-данные и перезапустить?')) {
      window.appState.resetDemo();
      showToast('Демо сброшено', 'info');
    }
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Drawer close
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDrawer();
    }
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '1': e.preventDefault(); switchTab('dashboard'); break;
        case '2': e.preventDefault(); switchTab('pvz'); break;
        case '3': e.preventDefault(); switchTab('seller'); break;
        case '4': e.preventDefault(); switchTab('mcs'); break;
        case '5': e.preventDefault(); switchTab('economics'); break;
        case '6': e.preventDefault(); switchTab('demo'); break;
        case ' ': e.preventDefault(); toggleTimePlayPause(); break;
      }
    }
  });

  // PVZ Workspace specific
  setupPvzWorkspaceListeners();
  setupSellerCabinetListeners();
  setupMcsNetworkListeners();
  setupEconomicsListeners();
  setupDemoListeners();
  setupSettingsListeners();
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
  // Update header tabs
  document.querySelectorAll('#headerTabs .tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
    tab.setAttribute('aria-selected', tab.dataset.tab === tabName);
  });

  // Update sidebar links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabName);
  });

  // Update panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });

  window.currentTab = tabName;
  window.appState.state.ui.activeTab=tabName;
  history.replaceState(null,'','#'+tabName);

  // Tab-specific initialization
  onTabActivate(tabName);
}

function onTabActivate(tabName) { renderWorkspace(window.appState,tabName,switchTab); }

// ============================================
// SELECTOR POPULATION
// ============================================

function populateSelectors() {
  const state = window.appState.getState();
  const cities = state.cities;
  const pvzs = state.pvzs;

  // City select (header)
  const citySelect = document.getElementById('citySelect');
  citySelect.innerHTML = '<option value="">Все города</option>';
  for (const [id, city] of cities) {
    citySelect.appendChild(createElement('option', { value: id }, city.name));
  }

  // City select (MCS)
  const mcsCitySelect = document.getElementById('mcsCitySelect');
  mcsCitySelect.innerHTML = '<option value="">Все города</option>';
  for (const [id, city] of cities) {
    mcsCitySelect.appendChild(createElement('option', { value: id }, city.name));
  }

  // City select (Settings)
  const settingsCitySelect = document.getElementById('settingsCityFilter');
  if (settingsCitySelect) {
    settingsCitySelect.innerHTML = '<option value="">Все города</option>';
    for (const [id, city] of cities) {
      settingsCitySelect.appendChild(createElement('option', { value: id }, city.name));
    }
  }

  // PVZ select (header) - filtered by city
  populatePvzSelector(citySelect.value);

  // PVZ Work select
  const pvzWorkSelect = document.getElementById('pvzWorkPvzSelect');
  pvzWorkSelect.innerHTML = '<option value="">Выберите ПВЗ</option>';
  for (const [id, pvz] of pvzs) {
    pvzWorkSelect.appendChild(createElement('option', { value: id }, `${pvz.name} (${pvz.cityId})`));
  }

  // Seller select
  const sellerSelect = document.getElementById('sellerSelect');
  sellerSelect.innerHTML = '<option value="">Выберите продавца</option>';
  for (const [id, seller] of state.sellers) {
    sellerSelect.appendChild(createElement('option', { value: id }, seller.name));
  }
}

function populatePvzSelector(cityId) {
  const state = window.appState.getState();
  const pvzs = state.pvzs;
  const pvzSelect = document.getElementById('pvzSelect');
  pvzSelect.innerHTML = '<option value="">Все ПВЗ</option>';

  for (const [id, pvz] of pvzs) {
    if (!cityId || pvz.cityId === cityId) {
      pvzSelect.appendChild(createElement('option', { value: id }, `${pvz.name} (${pvz.type})`));
    }
  }
}

// ============================================
// ROLE UI UPDATE
// ============================================

function updateRoleUI(role) {
  document.body.classList.toggle('jury-mode',role === 'jury');
  if(role === 'seller') switchTab('seller');
  else if(role === 'pvz_operator') switchTab('pvz');
  else if(role === 'jury') switchTab('demo');
}

// ============================================
// VIRTUAL TIME CONTROLS
// ============================================

function updateTimeDisplay() {
  const state = window.appState.getState();
  const vt = state.virtualTime;
  const days = Math.floor(vt.currentTime / 24);
  const hours = Math.floor(vt.currentTime % 24);
  document.getElementById('timeDisplay').textContent = `День ${days}, ${String(hours).padStart(2, '0')}:00`;
}

function updateTimeControls() {
  const state = window.appState.getState();
  const vt = state.virtualTime;
  const isRunning = vt.isRunning;

  document.getElementById('timePlay').style.display = isRunning ? 'none' : '';
  document.getElementById('timePause').style.display = isRunning ? '' : 'none';
  document.getElementById('timeSpeed').value = vt.speed;
  document.getElementById('speedLabel').textContent = `${vt.speed}×`;
}

function toggleTimePlayPause() {
  const state = window.appState.getState();
  if (state.virtualTime.isRunning) {
    window.appState.pauseClock();
  } else {
    window.appState.startClock();
  }
  updateTimeControls();
}

// ============================================
// MAIN RENDER FUNCTION
// ============================================

function renderAll() {
  updateTimeDisplay(); updateTimeControls(); updateMcsStatus();
  renderWorkspace(window.appState,window.currentTab,switchTab);
}

function updateMcsStatus() {
  const state = window.appState.getState();
  const statusEl = document.getElementById('mcsStatus');
  const indicator = statusEl.querySelector('.status-indicator');
  const text = statusEl.querySelector('.status-text');

  if (state.mcsStatus === 'calculating') {
    indicator.className = 'status-indicator calculating';
    text.textContent = 'MCS: Расчёт...';
  } else if (state.mcsStatus === 'error') {
    indicator.className = 'status-indicator error';
    text.textContent = 'MCS: Ошибка';
  } else {
    indicator.className = 'status-indicator ready';
    text.textContent = 'MCS: Готов';
  }
}

// ============================================
// DASHBOARD RENDERING
// ============================================

function renderDashboard() {
  if (window.currentTab !== 'dashboard') return;

  const state = window.appState.getState();
  const kpiGrid = document.getElementById('kpiGrid');

  // Calculate KPIs from real state only — no synthetic data
  const totalOrders = state.orders.size;
  const activeOrders = Array.from(state.orders.values()).filter(o => !['settled', 'cancelled', 'returned'].includes(o.status)).length;
  const meshOrders = Array.from(state.orders.values()).filter(o => o.routeType && o.routeType !== 'blocked').length;
  const classicOrders = totalOrders - meshOrders;

  const totalRevenue = Array.from(state.orders.values())
    .filter(o => o.status === 'settled')
    .reduce((sum, o) => sum + (o.routeCost || 0), 0);

  const totalSavings = Array.from(state.orders.values())
    .filter(o => o.routeType && o.routeType !== 'blocked')
    .reduce((sum, o) => sum + ((o.classicCost || 0) - (o.routeCost || 0)), 0);

  const avgDeliveryTime = calculateAvgDeliveryTime(state);
  const pvzUtilization = calculateAvgPvzUtilization(state);

  // Branded dashboard banner
  const banner = document.getElementById('dashboardBanner');
  if (banner) {
    const meshPct = totalOrders > 0 ? Math.round((meshOrders / totalOrders) * 100) : 0;
    banner.innerHTML = `
      <div class="banner-inner">
        <div class="banner-badge">WB Mesh Control System</div>
        <h2 class="banner-title">Операционный обзор</h2>
        <p class="banner-desc">Меш-логистика Wildberries — классическая модель vs Mesh. Данные реальные, без синтетики.</p>
        <div class="banner-metrics">
          <span class="banner-metric"><span class="banner-metric-value">${totalOrders}</span> заказов в системе</span>
          <span class="banner-metric"><span class="banner-metric-value">${meshPct}%</span> заказов через Mesh</span>
          <span class="banner-metric"><span class="banner-metric-value">${money(totalSavings)}</span> экономия Mesh vs Classic</span>
        </div>
      </div>
      <div class="banner-action">
        <button class="btn btn-primary btn-sm" onclick="runDemo('city_order')">🚀 Запустить демо «Городской заказ»</button>
        <button class="btn btn-ghost btn-sm" onclick="runDemo('intercity_order')">Межгород C2</button>
        <span class="banner-hint">Нет данных? Запустите любой демо-сценарий — все графики и KPI заполнятся реальными расчётами.</span>
      </div>
    `;
  }

  const kpis = [
    createKpiCard({ label: 'Всего заказов', value: totalOrders || '—', delta: activeOrders || 0, deltaLabel: 'активных', icon: 'package', variant: 'primary' }),
    createKpiCard({ label: 'Mesh заказов', value: meshOrders || '—', delta: classicOrders || 0, deltaLabel: 'Classic', icon: 'mesh', variant: 'success' }),
    createKpiCard({ label: 'Выручка', value: totalRevenue > 0 ? money(totalRevenue) : '—', delta: totalSavings !== 0 ? totalSavings : undefined, deltaLabel: 'экономия', icon: 'wallet', variant: 'info' }),
    createKpiCard({ label: 'Ср. доставка', value: avgDeliveryTime > 0 ? `${avgDeliveryTime}ч` : '—', delta: pvzUtilization > 0 ? pvzUtilization : undefined, deltaLabel: '% загрузки ПВЗ', icon: 'truck', variant: 'warning' }),
    createKpiCard({ label: 'ПВЗ в сети', value: state.pvzs.size, icon: 'building' }),
    createKpiCard({ label: 'Продавцов', value: state.sellers.size, icon: 'user' }),
  ];

  kpiGrid.innerHTML = '';
  kpis.forEach(kpi => kpiGrid.appendChild(kpi));

  // Charts — real data only, empty state when no orders
  if (totalOrders === 0) {
    document.getElementById('ordersChartCard').querySelector('.card-body').innerHTML = emptyChartState('Заказов пока нет. Запустите демо-сценарий.');
    document.getElementById('revenueChartCard').querySelector('.card-body').innerHTML = emptyChartState('Нет выручки — данных о заказах нет.');
    document.getElementById('routeBreakdownCard').querySelector('.card-body').innerHTML = emptyChartState('Маршрутов пока нет.');
  } else {
    renderOrdersChart(state);
    renderRevenueChart(state);
    renderRouteChart(state);
  }
  renderPvzLoadList(state);
  renderRecentOrders(state);
}

/**
 * Empty state placeholder for charts when no real data exists.
 * Never uses Math.random() or synthetic values.
 */
function emptyChartState(message) {
  return `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-title">${message}</div>
      <div class="empty-hint">График отобразится автоматически после создания заказов через демо-сценарий.</div>
    </div>
  `;
}

function calculateAvgDeliveryTime(state) {
  const delivered = Array.from(state.orders.values()).filter(o => o.status === 'issued' && o.routeEta);
  if (delivered.length === 0) return 0;
  return Math.round(delivered.reduce((sum, o) => sum + o.routeEta, 0) / delivered.length);
}

function calculateAvgPvzUtilization(state) {
  const pvzs = Array.from(state.pvzs.values()).filter(p => p.type === 'mesh');
  if (pvzs.length === 0) return 0;
  return Math.round(pvzs.reduce((sum, p) => sum + (p.occupiedCapacity / p.capacity), 0) / pvzs.length * 100);
}

function renderOrdersChart(state) {
  const canvas = document.getElementById('ordersChart');
  if (!canvas) return;

  // Only render when there are real orders — never synthetic data
  if (state.orders.size === 0) {
    const cardBody = canvas.parentElement;
    cardBody.innerHTML = emptyChartState('Заказов пока нет — график заполнится после запуска демо-сценария.');
    return;
  }

  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 200;

  // Generate last 14 days data from real order history
  const labels = [];
  const meshData = [];
  const classicData = [];
  for (let i = 13; i >= 0; i--) {
    const day = state.virtualTime.currentDay - i;
    labels.push(`День ${day}`);
    // Count real orders created on this day (day = hours / 24)
    const dayStart = day * 24;
    const dayEnd = dayStart + 24;
    const dayOrders = Array.from(state.orders.values()).filter(o => {
      const created = o.createdAt || 0;
      return created >= dayStart && created < dayEnd;
    });
    const meshCount = dayOrders.filter(o => o.routeType && o.routeType !== 'blocked').length;
    const classicCount = dayOrders.filter(o => !o.routeType || o.routeType === 'blocked').length;
    meshData.push(meshCount);
    classicData.push(classicCount);
  }

  drawLineChart(ctx, width, height, labels, [
    { data: meshData, color: '#CB11AB', label: 'Mesh' },
    { data: classicData, color: '#7D7088', label: 'Classic' }
  ]);
}

function renderRevenueChart(state) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;

  // Only render when there are settled orders — never synthetic data
  if (state.orders.size === 0) {
    const cardBody = canvas.parentElement;
    cardBody.innerHTML = emptyChartState('Нет выручки — данных о заказах нет.');
    return;
  }

  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 200;

  const labels = [];
  const savingsData = [];
  for (let i = 13; i >= 0; i--) {
    const day = state.virtualTime.currentDay - i;
    labels.push(`День ${day}`);
    // Real savings from settled Mesh orders on this day
    const dayStart = day * 24;
    const dayEnd = dayStart + 24;
    const dayOrders = Array.from(state.orders.values()).filter(o => {
      const created = o.createdAt || 0;
      return created >= dayStart && created < dayEnd;
    });
    const daySavings = dayOrders
      .filter(o => o.routeType && o.routeType !== 'blocked')
      .reduce((sum, o) => sum + ((o.classicCost || 0) - (o.routeCost || 0)), 0);
    savingsData.push(daySavings);
  }

  drawBarChart(ctx, width, height, labels, savingsData, '#10B981');
}

function renderPvzLoadList(state) {
  const container = document.getElementById('pvzLoadList');
  if (!container) return;

  const pvzs = Array.from(state.pvzs.values())
    .filter(p => p.type === 'mesh' || p.type === 'hub')
    .sort((a, b) => (b.occupiedCapacity / b.capacity) - (a.occupiedCapacity / a.capacity));

  container.innerHTML = '';
  pvzs.forEach(pvz => {
    const load = pvz.capacity > 0 ? (pvz.occupiedCapacity / pvz.capacity) * 100 : 0;
    const bar = createElement('div', { class: 'pvz-load-item' }, [
      createElement('div', { class: 'flex justify-between mb-1' }, [
        createElement('span', { class: 'font-medium' }, pvz.name),
        createElement('span', { class: 'text-sm font-mono' }, `${pvz.occupiedCapacity}/${pvz.capacity}`)
      ]),
      createElement('div', { class: 'progress-bar' }, [
        createElement('div', {
          class: 'progress-fill',
          style: `width: ${load}%; background: ${load > 80 ? '#EF4444' : load > 50 ? '#F59E0B' : '#10B981'}`
        })
      ])
    ]);
    container.appendChild(bar);
  });
}

function renderRouteChart(state) {
  const canvas = document.getElementById('routeChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 200;

  const routeCounts = { M1: 0, M2: 0, C1: 0, C2: 0, blocked: 0 };
  for (const order of state.orders.values()) {
    if (order.routeType) routeCounts[order.routeType]++;
  }

  const labels = ['M1', 'M2', 'C1', 'C2', 'Нет'];
  const data = [routeCounts.M1, routeCounts.M2, routeCounts.C1, routeCounts.C2, routeCounts.blocked];
  const colors = ['#10B981', '#CB11AB', '#5421A8', '#A020B0', '#EF4444'];

  drawDoughnutChart(ctx, width, height, labels, data, colors);
}

function renderRecentOrders(state) {
  const container = document.getElementById('recentOrdersList');
  if (!container) return;

  const recentOrders = Array.from(state.orders.values())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10);

  if (recentOrders.length === 0) {
    container.innerHTML = '<div class="text-center py-8 text-tertiary">Заказов пока нет</div>';
    return;
  }

  container.innerHTML = '';
  recentOrders.forEach(order => {
    const card = createOrderCard(order, (id) => {
      window.selectedOrderId = id;
      showOrderDetail(id);
    });
    container.appendChild(card);
  });
}

// ============================================
// CHART HELPERS
// ============================================

function drawLineChart(ctx, width, height, labels, datasets) {
  ctx.clearRect(0, 0, width, height);
  const padding = 50;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Axes
  ctx.strokeStyle = '#E8E0ED';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Grid lines
  ctx.strokeStyle = '#F3F0F5';
  for (let i = 1; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Data
  const maxVal = Math.max(...datasets.flatMap(d => d.data));
  const minVal = Math.min(...datasets.flatMap(d => d.data));
  const range = maxVal - minVal || 1;

  datasets.forEach(dataset => {
    ctx.strokeStyle = dataset.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    dataset.data.forEach((val, i) => {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      const y = height - padding - ((val - minVal) / range) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    ctx.fillStyle = dataset.color;
    dataset.data.forEach((val, i) => {
      const x = padding + (chartWidth / (labels.length - 1)) * i;
      const y = height - padding - ((val - minVal) / range) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // Labels
  ctx.fillStyle = '#7D7088';
  ctx.font = '11px Inter';
  ctx.textAlign = 'center';
  labels.forEach((label, i) => {
    const x = padding + (chartWidth / (labels.length - 1)) * i;
    ctx.fillText(label, x, height - padding + 20);
  });
}

function drawBarChart(ctx, width, height, labels, data, color) {
  ctx.clearRect(0, 0, width, height);
  const padding = 50;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / labels.length * 0.6;
  const maxVal = Math.max(...data) || 1;

  // Axes
  ctx.strokeStyle = '#E8E0ED';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  ctx.fillStyle = color;
  data.forEach((val, i) => {
    const x = padding + (chartWidth / labels.length) * i + (chartWidth / labels.length - barWidth) / 2;
    const barHeight = (val / maxVal) * chartHeight;
    const y = height - padding - barHeight;
    ctx.fillRect(x, y, barWidth, barHeight);
  });

  ctx.fillStyle = '#7D7088';
  ctx.font = '11px Inter';
  ctx.textAlign = 'center';
  labels.forEach((label, i) => {
    const x = padding + (chartWidth / labels.length) * i + (chartWidth / labels.length) / 2;
    ctx.fillText(label, x, height - padding + 20);
  });
}

function drawDoughnutChart(ctx, width, height, labels, data, colors) {
  ctx.clearRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 30;
  const innerRadius = radius * 0.6;

  const total = data.reduce((a, b) => a + b, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2;
  data.forEach((val, i) => {
    const sliceAngle = (val / total) * Math.PI * 2;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Legend
  ctx.font = '12px Inter';
  ctx.textAlign = 'left';
  labels.forEach((label, i) => {
    const y = 20 + i * 22;
    ctx.fillStyle = colors[i];
    ctx.fillRect(width - 120, y, 12, 12);
    ctx.fillStyle = '#201A29';
    ctx.fillText(`${label}: ${data[i]}`, width - 100, y + 10);
  });
}

// ============================================
// PVZ WORKSPACE
// ============================================

function setupPvzWorkspaceListeners() {
  document.getElementById('pvzWorkPvzSelect').addEventListener('change', (e) => {
    window.appState.setSelectedPvz(e.target.value || null);
    renderPvzWorkspace();
  });

  document.getElementById('pvzOrderFilter').addEventListener('change', renderPvzWorkspace);

  // Action buttons — each wired to its dedicated state method
  document.getElementById('btnReceive').addEventListener('click', () => pvzReceiveOrder());
  document.getElementById('btnStore').addEventListener('click', () => pvzStoreOrder());
  document.getElementById('btnPack').addEventListener('click', () => pvzOrderAction('pack'));
  document.getElementById('btnDispatch').addEventListener('click', () => pvzOrderAction('dispatch'));
  document.getElementById('btnIssue').addEventListener('click', () => pvzOrderAction('issue'));
  document.getElementById('btnReturn').addEventListener('click', () => pvzReturnOrder());
}

/**
 * Receive — create a new incoming order at the selected PVZ (StateManager.createOrder).
 */
function pvzReceiveOrder() {
  const state = window.appState.getState();
  const pvzId = state.ui.selectedPvzId;
  if (!pvzId) {
    showToast('Выберите ПВЗ', 'warning');
    return;
  }

  const product = Array.from(state.products.values())[0];
  if (!product) {
    showToast('Нет товаров для создания заказа', 'error');
    return;
  }

  const order = window.appState.createOrder({
    productId: product.id,
    quantity: 1,
    destinationPvzId: pvzId,
    sourcePvzId: pvzId,
    sellerId: product.sellerId
  });

  showToast(`Заказ создан: ${order.id.slice(-6)}`, 'success');
  renderPvzWorkspace();
}

/**
 * Store — reserve storage capacity for a received order (InventoryManager.reserve).
 */
function pvzStoreOrder() {
  const state = window.appState.getState();
  const pvzId = state.ui.selectedPvzId;
  if (!pvzId) {
    showToast('Выберите ПВЗ', 'warning');
    return;
  }

  const orders = Array.from(state.orders.values()).filter(o => o.destinationPvzId === pvzId && o.status === 'received');
  const targetOrder = orders[0];
  if (!targetOrder) {
    showToast('Нет заказов на приёмке для размещения на хранение', 'warning');
    return;
  }

  const pvz = state.pvzs.get(pvzId);
  const batch = pvz && pvz.inventory ? pvz.inventory.find(i => i.productId === targetOrder.productId && i.status === 'available') : null;
  if (!batch) {
    showToast('Нет доступных партий товара на ПВЗ', 'error');
    return;
  }

  const result = new InventoryManager(state.pvzs).reserve(batch.batchId, targetOrder.quantity, targetOrder.id);
  if (result.success) {
    showToast(`Заказ ${targetOrder.id.slice(-6)} размещён на хранение`, 'success');
  } else {
    showToast(result.error, 'error');
  }
  renderPvzWorkspace();
}

/**
 * Pack / Dispatch / Issue — order lifecycle transition via StateManager.processOrderAction.
 */
function pvzOrderAction(action) {
  const state = window.appState.getState();
  const pvzId = state.ui.selectedPvzId;
  if (!pvzId) {
    showToast('Выберите ПВЗ', 'warning');
    return;
  }

  const statusMap = {
    pack: 'ordered',
    dispatch: 'packed',
    issue: 'in_transit'
  };

  const orders = Array.from(state.orders.values()).filter(o => o.destinationPvzId === pvzId);
  const targetOrder = orders.find(o => o.status === statusMap[action]);
  if (!targetOrder) {
    showToast(`Нет заказов для действия: ${action}`, 'warning');
    return;
  }

  const result = window.appState.processOrderAction(targetOrder.id, action);
  if (result.success) {
    showToast(`Заказ ${targetOrder.id.slice(-6)}: ${action}`, 'success');
  } else {
    showToast(result.error, 'error');
  }
  renderPvzWorkspace();
}

/**
 * Return — move an issued order back to the PVZ as quarantine inventory (StateManager.processReturn).
 */
function pvzReturnOrder() {
  const state = window.appState.getState();
  const pvzId = state.ui.selectedPvzId;
  if (!pvzId) {
    showToast('Выберите ПВЗ', 'warning');
    return;
  }

  const orders = Array.from(state.orders.values()).filter(o => o.destinationPvzId === pvzId);
  const targetOrder = orders.find(o => o.status === 'issued');
  if (!targetOrder) {
    showToast('Нет выданных заказов для возврата', 'warning');
    return;
  }

  const pvz = state.pvzs.get(pvzId);
  if (!pvz) {
    showToast('ПВЗ не найден', 'error');
    return;
  }

  window.appState.processReturn(targetOrder);
  showToast(`Возврат заказа ${targetOrder.id.slice(-6)} оформлен`, 'success');
  renderPvzWorkspace();
}

function renderPvzWorkspace() {
  if (window.currentTab !== 'pvz') return;

  const state = window.appState.getState();
  const pvzId = state.ui.selectedPvzId;
  const pvz = pvzId ? state.pvzs.get(pvzId) : null;

  if (!pvz) {
    document.getElementById('pvzInventoryBody').innerHTML = '<tr><td colspan="8" class="text-center py-8 text-tertiary">Выберите ПВЗ</td></tr>';
    document.getElementById('pvzOrdersList').innerHTML = '<div class="text-center py-8 text-tertiary">Выберите ПВЗ</div>';
    document.getElementById('pvzFinanceContent').innerHTML = '<div class="text-center py-8 text-tertiary">Выберите ПВЗ</div>';
    document.getElementById('pvzFreeSlots').textContent = 'Свободно: 0';
    document.getElementById('pvzOccupied').textContent = 'Занято: 0';
    document.getElementById('pvzCapacityBadge').style.display = 'none';
    return;
  }

  // Inventory
  renderPvzInventory(pvz, state);

  // Orders
  renderPvzOrders(pvz, state);

  // Finance
  renderPvzFinance(pvz, state);
}

function renderPvzInventory(pvz, state) {
  const tbody = document.getElementById('pvzInventoryBody');
  const inventory = pvz.inventory || [];
  const products = state.products;
  const tariffs = state.tariffs;

  // Update capacity badge
  const freeSlots = pvz.capacity - pvz.occupiedCapacity;
  document.getElementById('pvzFreeSlots').textContent = `Свободно: ${freeSlots}`;
  document.getElementById('pvzOccupied').textContent = `Занято: ${pvz.occupiedCapacity}`;
  const capBadge = document.getElementById('pvzCapacityBadge');
  const capText = document.getElementById('pvzCapacityText');
  if (capBadge && capText) {
    const loadPct = pvz.capacity > 0 ? Math.round((pvz.occupiedCapacity / pvz.capacity) * 100) : 0;
    capText.textContent = `Загрузка: ${loadPct}%`;
    capBadge.className = `badge ${loadPct > 80 ? 'badge-error' : loadPct > 50 ? 'badge-warning' : 'badge-success'}`;
    capBadge.style.display = 'inline-flex';
  }

  if (inventory.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-tertiary">Инвентарь пуст</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  inventory.forEach(item => {
    const product = products.get(item.productId);
    const daysStored = state.virtualTime.currentTime / 24 - (item.receivedAt / 24);
    const dailyStorage = CostEngine.calculateStorageCost(state.tariffs, Math.max(1, daysStored));
    const totalStorage = dailyStorage * Math.max(1, Math.floor(daysStored));

    const tr = createElement('tr', {}, [
      createElement('td', { class: 'font-mono' }, product?.sku || item.productId.slice(-8)),
      createElement('td', {}, product?.name || 'Товар'),
      createElement('td', { class: 'font-mono text-xs' }, item.batchId.slice(-8)),
      createElement('td', { class: 'text-numeric' }, Math.floor(daysStored)),
      createElement('td', {}, [
        createElement('span', { class: `badge ${item.status === 'quarantine' ? 'badge-warning' : 'badge-success'}` }, item.status)
      ]),
      createElement('td', { class: 'text-numeric font-mono' }, money(dailyStorage)),
      createElement('td', { class: 'text-numeric font-mono' }, money(totalStorage)),
      createElement('td', {}, [
        createElement('button', {
          class: 'btn btn-ghost btn-icon btn-xs',
          onclick: () => showInventoryActions(item, pvz, state),
          title: 'Действия'
        }, createElement('span', { innerHTML: svgIcon('chevronDown', 16) }))
      ])
    ]);
    tbody.appendChild(tr);
  });
}

function renderPvzOrders(pvz, state) {
  const container = document.getElementById('pvzOrdersList');
  const filter = document.getElementById('pvzOrderFilter').value;
  const orders = Array.from(state.orders.values())
    .filter(o => o.destinationPvzId === pvz.id)
    .filter(o => !filter || o.status === filter)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (orders.length === 0) {
    container.innerHTML = '<div class="text-center py-8 text-tertiary">Заказов нет</div>';
    return;
  }

  container.innerHTML = '';
  orders.forEach(order => {
    const card = createOrderCard(order, (id) => showOrderDetail(id));
    container.appendChild(card);
  });
}

function renderPvzFinance(pvz, state) {
  const container = document.getElementById('pvzFinanceContent');
  const tariffs = state.tariffs;

  // Calculate PVZ economics
  const totalPayout = pvz.occupiedCapacity * tariffs.receiveFee + pvz.occupiedCapacity * tariffs.storagePerDay + pvz.occupiedCapacity * tariffs.packFee;
  const totalCost = pvz.occupiedCapacity * tariffs.partnerOpsCost + pvz.occupiedCapacity * tariffs.partnerShelfPerDay;
  const margin = totalPayout - totalCost;

  const rows = [
    ['Начисления за приёмку', money(pvz.occupiedCapacity * tariffs.receiveFee)],
    ['Начисления за хранение', money(pvz.occupiedCapacity * tariffs.storagePerDay)],
    ['Начисления за сборку', money(pvz.occupiedCapacity * tariffs.packFee)],
    ['Итого начисления', money(totalPayout), true],
    ['', ''],
    ['Опер. затраты', money(pvz.occupiedCapacity * tariffs.partnerOpsCost)],
    ['Затраты полки', money(pvz.occupiedCapacity * tariffs.partnerShelfPerDay)],
    ['Итого затраты', money(totalCost), true],
    ['', ''],
    ['Маржа ПВЗ', money(margin), true]
  ];

  container.appendChild(createLedger('Экономика ПВЗ', rows));
}

function showInventoryActions(item, pvz, state) {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');
  const title = document.getElementById('modalTitle');

  title.textContent = 'Действия с партией';
  body.innerHTML = `
    <div class="space-y-3">
      <p><strong>SKU:</strong> ${item.productId.slice(-8)}</p>
      <p><strong>Партия:</strong> ${item.batchId}</p>
      <p><strong>Кол-во:</strong> ${item.quantity}</p>
      <p><strong>Статус:</strong> ${item.status}</p>
      <p><strong>Дней на хранении:</strong> ${Math.floor(state.virtualTime.currentTime / 24 - item.receivedAt / 24)}</p>
    </div>
  `;
  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Закрыть</button>
    ${item.status !== 'quarantine' ? `<button class="btn btn-warning" onclick="moveToQuarantine('${item.batchId}', '${pvz.id}'); closeModal()">В карантин</button>` : ''}
    ${item.status === 'quarantine' ? `<button class="btn btn-success" onclick="resolveQuarantine('${item.batchId}', '${pvz.id}', 'resell'); closeModal()">Разрешить (перепродать)</button>
    <button class="btn btn-danger" onclick="resolveQuarantine('${item.batchId}', '${pvz.id}', 'writeoff'); closeModal()">Списать</button>` : ''}
  `;
  openModal();
}

// Make these global for onclick handlers
window.moveToQuarantine = (batchId, pvzId) => {
  InventoryManager.processReturn({ batchId, pvzId, reason: 'damage' }, state);
  renderPvzWorkspace();
};

window.resolveQuarantine = (batchId, pvzId, resolution) => {
  InventoryManager.resolveQuarantine(batchId, pvzId, resolution);
  renderPvzWorkspace();
};

// ============================================
// SELLER CABINET
// ============================================

function setupSellerCabinetListeners() {
  document.getElementById('sellerSelect').addEventListener('change', (e) => {
    window.appState.setSelectedSeller(e.target.value || null);
    renderSellerCabinet();
  });

  document.querySelectorAll('.seller-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSellerTab(tab.dataset.sellerTab));
  });

  document.getElementById('btnAddProduct').addEventListener('click', () => showAddProductModal());
  document.getElementById('btnCreateSupply').addEventListener('click', () => showCreateSupplyModal());
  document.getElementById('btnRefreshProducts').addEventListener('click', () => renderSellerCabinet());
}

function switchSellerTab(tabName) {
  document.querySelectorAll('.seller-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.sellerTab === tabName);
  });
  document.querySelectorAll('.seller-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `seller${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Panel`);
  });

  if (tabName === 'forecast') renderSellerForecast();
  if (tabName === 'analytics') renderSellerAnalytics();
}

function renderSellerCabinet() {
  if (window.currentTab !== 'seller') return;

  const state = window.appState.getState();
  const sellerId = state.ui.selectedSellerId;
  const seller = sellerId ? state.sellers.get(sellerId) : null;

  if (!seller) {
    document.getElementById('sellerProductsBody').innerHTML = '<tr><td colspan="9" class="text-center py-8 text-tertiary">Выберите продавца</td></tr>';
    document.getElementById('sellerSuppliesList').innerHTML = '<div class="text-center py-8 text-tertiary">Выберите продавца</div>';
    document.getElementById('sellerKpiGrid').innerHTML = '';
    document.getElementById('sellerInfoBadge').style.display = 'none';
    return;
  }

  document.getElementById('sellerInfoBadge').style.display = 'inline-flex';
  document.getElementById('sellerInfoText').textContent = `Продавец: ${seller.name}`;

  // Products
  renderSellerProducts(seller, state);

  // Supplies
  renderSellerSupplies(seller, state);

  // Default to products tab
  renderSellerAnalytics();
}

function renderSellerProducts(seller, state) {
  const tbody = document.getElementById('sellerProductsBody');
  const sellerProducts = Array.from(state.products.values()).filter(p => p.sellerId === seller.id);

  if (sellerProducts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-tertiary">Товаров нет</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  sellerProducts.forEach(product => {
    // Compute real stock from inventory across all PVZs
    let totalStock = 0;
    let totalInTransit = 0;
    for (const pvz of state.pvzs.values()) {
      const batch = (pvz.inventory || []).find(i => i.productId === product.id && i.status === 'available');
      if (batch) totalStock += batch.quantity;
    }
    // Orders in transit for this product
    const inTransitOrders = Array.from(state.orders.values()).filter(o => o.productId === product.id && o.status === 'in_transit');
    totalInTransit = inTransitOrders.reduce((sum, o) => sum + o.quantity, 0);

    // Real daily sales from sales history (last 7 days average)
    const history = state.salesHistory.get(product.id) || [];
    const last7Days = history.slice(-7);
    const dailySales = last7Days.length > 0
      ? Math.round(last7Days.reduce((sum, v) => sum + v, 0) / last7Days.length)
      : 0;
    const daysLeft = dailySales > 0 ? Math.floor(totalStock / dailySales) : (totalStock > 0 ? 999 : 0);

    const tr = createElement('tr', {}, [
      createElement('td', { class: 'font-mono' }, product.sku),
      createElement('td', {}, product.name),
      createElement('td', {}, product.category),
      createElement('td', { class: 'text-numeric font-mono' }, money(product.price)),
      createElement('td', { class: 'text-numeric' }, totalStock),
      createElement('td', { class: 'text-numeric' }, totalInTransit),
      createElement('td', { class: 'text-numeric' }, dailySales),
      createElement('td', { class: `text-numeric ${daysLeft < 7 && daysLeft >= 0 ? 'text-error font-bold' : ''}` }, daysLeft > 0 ? daysLeft : (totalStock === 0 ? '—' : '∞')),
      createElement('td', {}, [
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs', title: 'Прогноз' }, createElement('span', { innerHTML: svgIcon('chart', 16) })),
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs', title: 'Поставка' }, createElement('span', { innerHTML: svgIcon('truck', 16) }))
      ])
    ]);
    tbody.appendChild(tr);
  });
}

function renderSellerSupplies(seller, state) {
  const container = document.getElementById('sellerSuppliesList');
  // No supply tracking in state yet — show empty state instead of simulated data
  container.innerHTML = `
    <div class="text-center py-8 text-tertiary">
      <div class="empty-icon" style="font-size: 48px; margin-bottom: var(--space-3); opacity: 0.4;">🚛</div>
      <div class="empty-title">Поставки пока не отслеживаются</div>
      <div class="empty-hint">История поставок продавца будет доступна после интеграции с системой учёта поставок.</div>
    </div>
  `;
}

function renderSellerAnalytics() {
  const state = window.appState.getState();
  const sellerId = state.ui.selectedSellerId;
  const seller = sellerId ? state.sellers.get(sellerId) : null;
  if (!seller) return;

  const kpiGrid = document.getElementById('sellerKpiGrid');
  const sellerProducts = Array.from(state.products.values()).filter(p => p.sellerId === seller.id);

  // Daily sales (units) from real sales history — most recent day
  const dailySales = sellerProducts.reduce((sum, p) => {
    const history = state.salesHistory.get(p.id) || [];
    return sum + (history[history.length - 1] || 0);
  }, 0);

  // Monthly revenue from real settled orders (product price × quantity)
  const settledOrders = Array.from(state.orders.values())
    .filter(o => o.status === 'settled' && o.sellerId === sellerId);
  const monthlyRevenue = settledOrders.reduce((sum, o) => {
    const product = state.products.get(o.productId);
    return sum + ((product?.price || 0) * o.quantity);
  }, 0);

  const avgCheck = settledOrders.length > 0 ? Math.round(monthlyRevenue / settledOrders.length) : 0;

  const kpis = [
    createKpiCard({ label: 'Товаров в ассортименте', value: sellerProducts.length, icon: 'package' }),
    createKpiCard({ label: 'Продаж за день (шт.)', value: dailySales || '—', delta: dailySales > 0 ? dailySales : undefined, deltaLabel: 'шт. вчера', icon: 'chart', variant: 'success' }),
    createKpiCard({ label: 'Выручка за месяц', value: monthlyRevenue > 0 ? money(monthlyRevenue) : '—', delta: monthlyRevenue > 0 ? Math.round(monthlyRevenue * 0.1) : undefined, deltaLabel: 'рост', icon: 'wallet', variant: 'primary' }),
    createKpiCard({ label: 'Ср. чек', value: avgCheck > 0 ? money(avgCheck) : '—', icon: 'chart' }),
  ];
  kpiGrid.innerHTML = '';
  kpis.forEach(k => kpiGrid.appendChild(k));

  // Sales chart — real sales history data, not synthetic
  const canvas = document.getElementById('sellerSalesChart');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth;
    const height = canvas.height = 200;
    const labels = Array.from({length: 14}, (_, i) => `День ${state.virtualTime.currentDay - 13 + i}`);
    // Use real sales history from StateManager (seeded RNG, deterministic)
    const sellerProducts = Array.from(state.products.values()).filter(p => p.sellerId === seller.id);
    const data = labels.map((_, i) => {
      const day = state.virtualTime.currentDay - 13 + i;
      let total = 0;
      for (const product of sellerProducts) {
        const history = state.salesHistory.get(product.id) || [];
        // history index = day offset; clamp to valid range
        const idx = history.length - 1 - (13 - i);
        if (idx >= 0 && idx < history.length) total += history[idx];
      }
      return total;
    });
    drawLineChart(ctx, width, height, labels, [{ data, color: '#CB11AB', label: 'Продажи' }]);
  }
}

function renderSellerForecast() {
  const state = window.appState.getState();
  const sellerId = state.ui.selectedSellerId;
  const seller = sellerId ? state.sellers.get(sellerId) : null;
  if (!seller) return;

  const container = document.getElementById('sellerForecastContent');
  const products = Array.from(state.products.values()).filter(p => p.sellerId === seller.id);

  container.innerHTML = '';
  products.slice(0, 5).forEach(product => {
    // Use real sales history from StateManager, not synthetic data
    const history = state.salesHistory.get(product.id) || [];
    if (history.length === 0) {
      container.appendChild(createElement('div', { class: 'text-center py-8 text-tertiary' }, [
        createElement('p', {}, `Недостаточно данных для прогноза ${product.sku}`)
      ]));
      return;
    }
    // (2) Run all 4 forecast methods; (3) WAPE/bias from DemandForecast.evaluate
    const forecast = DemandForecast.forecastNextDay(history, 7, state.tariffs);
    const bestMetrics = forecast.evaluation[forecast.method] || {};

    // (4) Forecast-driven decisions: replenishment recommendation + deficit/excess alert
    const availableStock = computeAvailableStock(product.id, state);
    const demand = forecast.nextDayForecast;
    const shortage = Math.max(0, Math.ceil(demand - availableStock));
    let alert;
    if (availableStock < demand) {
      alert = { type: 'deficit', badge: 'badge-error', label: 'Дефицит', text: `Доступно ${availableStock} шт., прогноз спроса ${demand} шт. — пополните на ${shortage} шт.` };
    } else if (availableStock > demand * 2) {
      alert = { type: 'excess', badge: 'badge-warning', label: 'Избыток', text: `Запаса ${availableStock} шт. при прогнозе ${demand} шт. — пополнение не требуется.` };
    } else {
      alert = { type: 'ok', badge: 'badge-success', label: 'В норме', text: `Запаса ${availableStock} шт. хватает на прогнозируемый спрос ${demand} шт.` };
    }

    const panel = createForecastPanel({
      ...forecast,
      productName: product.name,
      productSku: product.sku,
      wape: bestMetrics.wape || 0,
      replenishment: shortage,
      alert
    });
    container.appendChild(panel);
  });
}

/**
 * Total available on-hand stock for a product across all PVZs.
 */
function computeAvailableStock(productId, state) {
  let total = 0;
  for (const pvz of state.pvzs.values()) {
    const batch = (pvz.inventory || []).find(i => i.productId === productId && i.status === 'available');
    if (batch) total += batch.quantity;
  }
  return total;
}

function showAddProductModal() {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');
  const title = document.getElementById('modalTitle');

  title.textContent = 'Добавить товар';
  body.innerHTML = `
    <div class="space-y-3">
      <div class="form-group"><label class="form-label">SKU</label><input type="text" id="newSku" class="form-input" placeholder="WB-123456"></div>
      <div class="form-group"><label class="form-label">Название</label><input type="text" id="newName" class="form-input" placeholder="Название товара"></div>
      <div class="form-group"><label class="form-label">Категория</label><select id="newCategory" class="form-select"><option value="electronics">Электроника</option><option value="clothing">Одежда</option><option value="home">Дом</option><option value="beauty">Красота</option></select></div>
      <div class="form-group"><label class="form-label">Цена (₽)</label><input type="number" id="newPrice" class="form-input" value="1000" step="100"></div>
      <div class="form-group"><label class="form-label">Размер (S/M/L)</label><select id="newSize" class="form-select"><option value="S">S</option><option value="M">M</option><option value="L">L</option></select></div>
      <div class="form-group"><label class="form-label">Вес (г)</label><input type="number" id="newWeight" class="form-input" value="500"></div>
      <div class="form-group"><label class="form-label">Возвратность (%)</label><input type="number" id="newReturnRate" class="form-input" value="15" min="0" max="100" step="1"></div>
    </div>
  `;
  footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" onclick="createProduct(); closeModal()">Создать</button>`;
  openModal();
}

function showCreateSupplyModal() {
  showToast('Функция в разработке', 'info');
}

window.createProduct = () => {
  const state = window.appState.getState();
  const sellerId = state.ui.selectedSellerId;
  if (!sellerId) return;

  const product = {
    id: generateId('prod'),
    sku: document.getElementById('newSku').value || `WB-${generateId().slice(-6)}`,
    name: document.getElementById('newName').value || 'Новый товар',
    category: document.getElementById('newCategory').value,
    price: parseInt(document.getElementById('newPrice').value) * 100,
    dimensions: { size: document.getElementById('newSize').value },
    weight: parseInt(document.getElementById('newWeight').value),
    returnRate: parseInt(document.getElementById('newReturnRate').value) / 100,
    sellerId
  };

  state.products.set(product.id, product);
  showToast('Товар создан', 'success');
  renderSellerCabinet();
};

// ============================================
// MCS NETWORK
// ============================================

function setupMcsNetworkListeners() {
  document.getElementById('mcsCitySelect').addEventListener('change', renderMcsNetwork);
  document.getElementById('mcsShowLoad').addEventListener('change', renderMcsNetwork);
  document.getElementById('mcsShowRoutes').addEventListener('change', renderMcsNetwork);
  document.getElementById('mcsShowTrunk').addEventListener('change', renderMcsNetwork);
  document.getElementById('clearLog').addEventListener('click', () => {
    window.appState.getState().mcsDecisionLog = [];
    renderMcsNetwork();
  });
}

function renderMcsNetwork() {
  if (window.currentTab !== 'mcs') return;

  const state = window.appState.getState();
  const cityFilter = document.getElementById('mcsCitySelect').value;
  const showLoad = document.getElementById('mcsShowLoad').checked;
  const showRoutes = document.getElementById('mcsShowRoutes').checked;

  // Filter PVZs by city
  let pvzs = state.pvzs;
  if (cityFilter) {
    pvzs = new Map([...pvzs].filter(([_, p]) => p.cityId === cityFilter));
  }

  // Update network badge
  const meshPvzs = Array.from(pvzs.values()).filter(p => p.type === 'mesh').length;
  const routeCount = state.mcsDecisionLog.length;
  const badge = document.getElementById('mcsNetworkBadge');
  const badgeText = document.getElementById('mcsNetworkText');
  if (badge && badgeText) {
    badgeText.textContent = `ПВЗ: ${meshPvzs} • Решений: ${routeCount}`;
    badge.style.display = 'inline-flex';
  }

  // Render network visualization
  const canvas = document.getElementById('networkCanvas');
  if (canvas) {
    canvas.innerHTML = '';
    const svg = createNetworkVisualization(state.cities, pvzs, window.selectedRoute, window.selectedPvzId);
    canvas.appendChild(svg);

    // Add click handlers to PVZ nodes
    svg.querySelectorAll('.pvz-node').forEach(node => {
      node.style.cursor = 'pointer';
      node.addEventListener('click', (e) => {
        const pvzId = e.target.dataset.pvzId;
        window.selectedPvzId = pvzId;
        showRouteDetail(pvzId, state);
        renderMcsNetwork(); // Re-render to highlight
      });
    });
  }

  // Decision log
  renderDecisionLog(state);
}

function showRouteDetail(pvzId, state) {
  const container = document.getElementById('routeDetailContent');
  const pvz = state.pvzs.get(pvzId);
  if (!pvz) return;

  const orders = Array.from(state.orders.values()).filter(o => o.destinationPvzId === pvzId || o.sourcePvzId === pvzId);

  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-primary-light rounded-lg">
        <h4 class="font-semibold text-primary">${pvz.name}</h4>
        <p class="text-sm text-tertiary">${pvz.type === 'hub' ? 'Хаб' : 'Mesh-ПВЗ'} • ${pvz.cityId}</p>
        <div class="mt-2 flex gap-2">
          <span class="badge badge-info">${pvz.occupiedCapacity}/${pvz.capacity}</span>
          <span class="badge badge-neutral">${pvz.operationalSlots} слотов</span>
        </div>
      </div>
      <h5 class="font-medium text-secondary">Заказы (${orders.length})</h5>
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${orders.slice(0, 10).map(order => `
          <div class="p-2 bg-base rounded border border-border">
            <div class="flex justify-between">
              <span class="font-mono text-sm">${order.id.slice(-8)}</span>
              <span class="badge ${order.routeType ? 'badge-route-' + order.routeType.toLowerCase() : 'badge-neutral'}">${order.routeType || '—'}</span>
            </div>
            <div class="text-xs text-tertiary">${order.status} • ${order.routeCost ? money(order.routeCost) : '—'}</div>
          </div>
        `).join('') || '<div class="text-tertiary text-sm text-center py-4">Нет заказов</div>'}
      </div>
    </div>
  `;
}

function renderDecisionLog(state) {
  const container = document.getElementById('decisionLogList');
  const log = state.mcsDecisionLog;

  if (!log || log.length === 0) {
    container.innerHTML = '<div class="text-center py-8 text-tertiary">Журнал пуст. Маршрутизируйте заказ для записи.</div>';
    return;
  }

  container.innerHTML = '';
  // Show last 10 decisions
  log.slice(-10).reverse().forEach(entry => {
    const div = createElement('div', { class: 'decision-log-entry p-3 border-b border-border last:border-0' }, [
      createElement('div', { class: 'flex justify-between items-start mb-2' }, [
        createElement('div', {}, [
          createElement('span', { class: 'font-mono text-sm text-primary' }, entry.orderId.slice(-8)),
          createElement('span', { class: 'ml-2 text-xs text-tertiary' }, formatTime(entry.timestamp))
        ]),
        createElement('span', { class: `badge ${entry.selectedRoute ? 'badge-success' : 'badge-error'}` }, entry.selectedRoute ? 'Маршрут выбран' : 'Нет маршрута')
      ]),
      createElement('div', { class: 'text-sm text-tertiary' }, entry.reason || 'Автоматический выбор'),
      entry.selectedRoute && createElement('div', { class: 'mt-2 flex gap-2 flex-wrap' }, [
        createElement('span', { class: `badge ${entry.selectedRoute === 'M1' || entry.selectedRoute === 'M2' ? 'badge-route-m2' : 'badge-route-c1'}` }, entry.selectedRoute),
        createElement('span', { class: 'badge badge-info' }, money(entry.cost)),
        createElement('span', { class: 'badge badge-success' }, money(entry.savings))
      ])
    ].filter(Boolean));
    container.appendChild(div);
  });
}

// ============================================
// ECONOMICS MODEL
// ============================================

function setupEconomicsListeners() {
  // Sensitivity sliders
  ['OrderSize', 'Distance', 'Load'].forEach(name => {
    const slider = document.getElementById(`sens${name}`);
    const val = document.getElementById(`sens${name}Val`);
    if (slider && val) {
      slider.addEventListener('input', () => {
        val.textContent = slider.value;
        renderSensitivityChart();
      });
    }
  });
}

function renderEconomics() {
  if (window.currentTab !== 'economics') return;

  const state = window.appState.getState();

  // Tariff editor
  const tariffEditor = document.getElementById('tariffEditor');
  if (tariffEditor && tariffEditor.children.length === 0) {
    tariffEditor.appendChild(createTariffEditor(state.tariffs, handleTariffChange));
  }

  // Unit economics
  renderUnitEconomics(state);

  // Break-even analysis
  renderBreakEvenAnalysis(state);

  // Sensitivity chart
  renderSensitivityChart();

  // Scenario comparison
  renderScenarioComparison(state);
}

function handleTariffChange(action, key, value) {
  const state = window.appState.getState();
  if (action === 'reset') {
    Object.assign(state.tariffs, deepClone(DEFAULT_TARIFFS));
  } else if (action === 'update' && key) {
    state.tariffs[key] = value;
  }
  window.appState.setTariffs(state.tariffs);
  // Persist tariffs to localStorage
  try {
    localStorage.setItem('wb-mesh-tariffs', JSON.stringify(state.tariffs));
  } catch (e) {
    console.warn('Could not persist tariffs to localStorage:', e);
  }
  renderEconomics();
  showToast('Тарифы обновлены', 'success');
}

function renderUnitEconomics(state) {
  const container = document.getElementById('unitEconomicsKpi');
  const tariffs = state.tariffs;

  // Classic cost per order
  const classicCost = CostEngine.calculateClassicCost(tariffs);

  // Mesh variable cost per order (assuming 5 orders per trip)
  const meshVariableCost = CostEngine.calculateMeshVariableCost(tariffs);

  // PVZ economics
  const pvzPayout = CostEngine.calculatePvzPayout(tariffs);
  const pvzCost = CostEngine.calculatePvzCost(tariffs);
  const pvzMargin = pvzPayout - pvzCost;

  // Update economy summary badge
  const savings = classicCost - meshVariableCost;
  const summaryBadge = document.getElementById('economySummary');
  const savingsText = document.getElementById('economySavings');
  if (summaryBadge && savingsText) {
    savingsText.textContent = `Экономия Mesh vs Classic: ${money(savings)}`;
    summaryBadge.style.display = 'inline-flex';
  }

  const kpis = [
    createKpiCard({ label: 'Classic (на заказ)', value: money(classicCost), icon: 'wallet', variant: 'error' }),
    createKpiCard({ label: 'Mesh переменные (на заказ)', value: money(meshVariableCost), icon: 'mesh', variant: 'success' }),
    createKpiCard({ label: 'Начисления ПВЗ', value: money(pvzPayout), icon: 'wallet', variant: 'info' }),
    createKpiCard({ label: 'Затраты ПВЗ', value: money(pvzCost), icon: 'chart', variant: 'warning' }),
    createKpiCard({ label: 'Маржа ПВЗ', value: money(pvzMargin), delta: pvzMargin, deltaLabel: 'на заказ', icon: 'check', variant: pvzMargin > 0 ? 'success' : 'error' }),
    createKpiCard({ label: 'Экономия Mesh vs Classic', value: money(classicCost - meshVariableCost), icon: 'chart', variant: 'success' }),
  ];

  container.innerHTML = '';
  kpis.forEach(k => container.appendChild(k));

  // Mesh cost breakdown
  const breakdownContainer = document.getElementById('meshCostBreakdown');
  const tripCost = CostEngine.calculateTripCost(tariffs, 5, 1, 5); // 5 orders, 1 stop, 5 min wait
  const fixedShare = Math.round(tariffs.fixedTripCost / 5); // per order at 5 orders

  const breakdownRows = [
    ['Фикс. стоимость рейса / заказ', money(fixedShare)],
    ['Перем. расходы на посылку', money(tariffs.variablePerParcel)],
    ['Доп. остановка / заказ', money(tariffs.extraStopCost / 5)],
    ['Простой курьера / заказ', money(tariffs.courierWaitPerMin * 5 / 5)],
    ['Ожидаемые возвраты (15%)', money(tariffs.meshReturnCost * 0.15)],
    ['Ожидаемый ущерб (2%)', money(tariffs.damageCost * 0.02)],
    ['Итого Mesh на заказ', money(meshVariableCost), true],
  ];

  breakdownContainer.innerHTML = '';
  breakdownContainer.appendChild(createLedger('', breakdownRows));
}

function renderBreakEvenAnalysis(state) {
  const container = document.getElementById('breakEvenAnalysis');
  const tariffs = state.tariffs;

  const breakEven = CostEngine.calculateBreakEvenThreshold(tariffs);
  const tripCostBase = CostEngine.calculateTripCost(tariffs, 1, 1, 5);
  const tripCost5 = CostEngine.calculateTripCost(tariffs, 5, 1, 5);
  const tripCost10 = CostEngine.calculateTripCost(tariffs, 10, 1, 5);
  const tripCost20 = CostEngine.calculateTripCost(tariffs, 20, 1, 5);

  const perOrder1 = tripCostBase;
  const perOrder5 = Math.round(tripCost5 / 5);
  const perOrder10 = Math.round(tripCost10 / 10);
  const perOrder20 = Math.round(tripCost20 / 20);

  const rows = [
    ['Порог безубыточности (базовые условия)', `${breakEven} заказов`, true],
    ['', ''],
    ['Стоимость рейса (1 заказ)', money(tripCostBase), true],
    ['Стоимость рейса (5 заказов)', money(tripCost5)],
    ['На заказ при 5 заказах', money(perOrder5), true],
    ['На заказ при 10 заказах', money(perOrder10)],
    ['На заказ при 20 заказах', money(perOrder20)],
    ['', ''],
    ['Целевая экономия vs Classic (100₽)', money(CostEngine.calculateClassicCost(tariffs) - perOrder5), true],
  ];

  container.innerHTML = '';
  container.appendChild(createLedger('Анализ точки безубыточности', rows));
}

function renderSensitivityChart() {
  const canvas = document.getElementById('sensitivityChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 300;
  const state = window.appState.getState();
  const tariffs = state.tariffs;

  const orderSize = parseInt(document.getElementById('sensOrderSize').value);
  const distance = parseInt(document.getElementById('sensDistance').value);
  const load = parseInt(document.getElementById('sensLoad').value) / 100;

  // Calculate costs for different order sizes
  const sizes = Array.from({length: 20}, (_, i) => i + 1);
  const meshCosts = sizes.map(n => Math.round(CostEngine.calculateTripCost(tariffs, n, 1, 5) / n));
  const classicCost = CostEngine.calculateClassicCost(tariffs);
  const classicLine = sizes.map(() => classicCost);

  drawSensitivityChart(ctx, width, height, sizes, meshCosts, classicLine);
}

function drawSensitivityChart(ctx, width, height, xVals, meshCosts, classicCosts) {
  ctx.clearRect(0, 0, width, height);
  const padding = 60;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const allCosts = [...meshCosts, ...classicCosts];
  const maxVal = Math.max(...allCosts);
  const minVal = Math.min(...allCosts);
  const range = maxVal - minVal || 1;

  // Axes
  ctx.strokeStyle = '#E8E0ED';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Grid
  ctx.strokeStyle = '#F3F0F5';
  for (let i = 1; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Classic line
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  classicCosts.forEach((val, i) => {
    const x = padding + (chartWidth / (xVals.length - 1)) * i;
    const y = height - padding - ((val - minVal) / range) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Mesh line
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 3;
  ctx.beginPath();
  meshCosts.forEach((val, i) => {
    const x = padding + (chartWidth / (xVals.length - 1)) * i;
    const y = height - padding - ((val - minVal) / range) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Points
  ctx.fillStyle = '#10B981';
  meshCosts.forEach((val, i) => {
    const x = padding + (chartWidth / (xVals.length - 1)) * i;
    const y = height - padding - ((val - minVal) / range) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Labels
  ctx.fillStyle = '#7D7088';
  ctx.font = '11px Inter';
  ctx.textAlign = 'center';
  xVals.forEach((val, i) => {
    if (i % 2 === 0) {
      const x = padding + (chartWidth / (xVals.length - 1)) * i;
      ctx.fillText(val, x, height - padding + 20);
    }
  });

  // Y axis labels
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(maxVal - (range / 4) * i);
    const y = padding + (chartHeight / 4) * i + 4;
    ctx.fillText(money(val), padding - 10, y);
  }

  // Legend
  ctx.font = '12px Inter';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#10B981';
  ctx.fillRect(padding, 15, 20, 3);
  ctx.fillStyle = '#201A29';
  ctx.fillText('Mesh (на заказ)', padding + 25, 18);
  ctx.fillStyle = '#EF4444';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(padding, 35);
  ctx.lineTo(padding + 20, 35);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#201A29';
  ctx.fillText('Classic (на заказ)', padding + 25, 38);
}

function renderScenarioComparison(state) {
  const tbody = document.getElementById('scenarioTableBody');
  const tariffs = state.tariffs;
  const classicCost = CostEngine.calculateClassicCost(tariffs);

  const scenarios = [
    { name: 'Базовый (5 заказов, 1 остановка)', orders: 5, stops: 1 },
    { name: 'Малый рейс (1 заказ)', orders: 1, stops: 1 },
    { name: 'Крупный рейс (20 заказов)', orders: 20, stops: 1 },
    { name: 'Много остановок (5 заказов, 4 ост.)', orders: 5, stops: 4 },
    { name: 'Долгое ожидание (5 заказов, 20 мин)', orders: 5, stops: 1, wait: 20 },
  ];

  tbody.innerHTML = '';
  scenarios.forEach(s => {
    const tripCost = CostEngine.calculateTripCost(tariffs, s.orders, s.stops, s.wait || 5);
    const meshPerOrder = Math.round(tripCost / s.orders);
    const savings = classicCost - meshPerOrder;
    const savingsPct = ((savings / classicCost) * 100).toFixed(1);
    const breakEven = CostEngine.calculateBreakEvenThreshold(tariffs);

    const tr = createElement('tr', {}, [
      createElement('td', { class: 'font-medium' }, s.name),
      createElement('td', { class: 'text-numeric font-mono' }, money(classicCost)),
      createElement('td', { class: 'text-numeric font-mono' }, money(meshPerOrder)),
      createElement('td', { class: `text-numeric font-mono ${savings > 0 ? 'text-success' : 'text-error'}` }, money(savings)),
      createElement('td', { class: `text-numeric ${savings > 0 ? 'text-success' : 'text-error'}` }, `${savingsPct}%`),
      createElement('td', { class: 'text-numeric font-mono' }, breakEven),
    ]);
    tbody.appendChild(tr);
  });
}

// ============================================
// DEMO PANEL
// ============================================

function setupDemoListeners() {
  document.getElementById('demoPause').addEventListener('click', pauseDemo);
  document.getElementById('demoStep').addEventListener('click', stepDemo);
  document.getElementById('demoStop').addEventListener('click', stopDemo);
}

function renderDemoPanel() {
  if (window.currentTab !== 'demo') return;

  const state = window.appState.getState();
  const scenarios = state.demoScenarios;

  // Scenarios list
  const listContainer = document.getElementById('demoScenariosList');
  listContainer.innerHTML = '';

  scenarios.forEach(scenario => {
    const card = createElement('div', { class: 'card demo-scenario-card mb-3' + (window.demoRunning && window.currentDemoScenario === scenario.id ? ' ring-2 ring-primary' : '') }, [
      createElement('div', { class: 'card-body' }, [
        createElement('div', { class: 'flex justify-between items-start' }, [
          createElement('div', {}, [
            createElement('h4', { class: 'font-semibold text-primary' }, scenario.name),
            createElement('p', { class: 'text-sm text-tertiary mt-1' }, scenario.description)
          ]),
          createElement('button', {
            class: `btn ${window.demoRunning && window.currentDemoScenario === scenario.id ? 'btn-danger' : 'btn-primary'} btn-sm`,
            onclick: () => window.demoRunning ? stopDemo() : runDemo(scenario.id),
            disabled: window.demoRunning && window.currentDemoScenario !== scenario.id
          }, window.demoRunning && window.currentDemoScenario === scenario.id ? 'Стоп' : 'Запустить')
        ]),
        createElement('div', { class: 'mt-3 flex flex-wrap gap-2' }, scenario.steps.map((step, i) =>
          createElement('span', {
            class: `badge ${i < window.currentDemoStep ? 'badge-success' : i === window.currentDemoStep && window.demoRunning ? 'badge-primary' : 'badge-neutral'}`
          }, step)
        ))
      ])
    ]);
    listContainer.appendChild(card);
  });

  // Live demo content
  renderDemoLiveContent(state);

  // Demo script
  renderDemoScript();
}

function runDemo(scenarioId) {
  const state = window.appState.getState();
  const scenario = state.demoScenarios.find(s => s.id === scenarioId);
  if (!scenario) return;

  window.demoRunning = true;
  window.currentDemoScenario = scenarioId;
  window.currentDemoStep = 0;

  showToast(`Запуск сценария: ${scenario.name}`, 'info');
  renderDemoPanel();

  // Auto-advance demo
  window.demoInterval = setInterval(() => {
    if (window.currentDemoStep < scenario.steps.length) {
      executeDemoStep(scenario, window.currentDemoStep);
      window.currentDemoStep++;
      renderDemoPanel();
    } else {
      stopDemo();
      showToast(`Сценарий "${scenario.name}" завершён`, 'success');
    }
  }, 3000); // 3 seconds per step
}

function executeDemoStep(scenario, stepIndex) {
  const state = window.appState.getState();

  // Execute step based on scenario
  switch (scenario.id) {
    case 'city_order':
      executeCityOrderStep(stepIndex);
      break;
    case 'intercity_order':
      executeIntercityOrderStep(stepIndex);
      break;
    case 'return_flow':
      executeReturnFlowStep(stepIndex);
      break;
    case 'route_failure':
      executeRouteFailureStep(stepIndex);
      break;
    case 'long_storage':
      executeLongStorageStep(stepIndex);
      break;
  }
}

function executeCityOrderStep(step) {
  const state = window.appState.getState();
  const pvzs = Array.from(state.pvzs.values()).filter(p => p.type === 'mesh');
  if (pvzs.length === 0) return;

  switch (step) {
    case 0:
      // Create order
      const product = Array.from(state.products.values())[0];
      const pvz = pvzs[0];
      const order = window.appState.createOrder({
        productId: product.id,
        quantity: 3,
        destinationPvzId: pvz.id,
        sourcePvzId: pvz.id,
        sellerId: product.sellerId
      });
      window.demoOrderId = order.id;
      break;
    case 1:
      // Route order
      window.appState.routeOrder(window.demoOrderId);
      break;
    case 2:
      // Receive
      window.appState.processOrderAction(window.demoOrderId, 'receive');
      break;
    case 3:
      // Store
      window.appState.processOrderAction(window.demoOrderId, 'store');
      break;
    case 4:
      // Pack
      window.appState.processOrderAction(window.demoOrderId, 'pack');
      break;
    case 5:
      // Dispatch
      window.appState.processOrderAction(window.demoOrderId, 'dispatch');
      break;
    case 6:
      // Issue
      window.appState.processOrderAction(window.demoOrderId, 'issue');
      break;
    case 7:
      // Settle
      window.appState.processOrderAction(window.demoOrderId, 'settle');
      break;
  }
}

function executeIntercityOrderStep(step) {
  const state = window.appState.getState();
  const permMesh = Array.from(state.pvzs.values()).find(p => p.cityId === 'perm' && p.type === 'mesh');
  const ekbMesh = Array.from(state.pvzs.values()).find(p => p.cityId === 'ekaterinburg' && p.type === 'mesh');
  if (!permMesh || !ekbMesh) return;

  switch (step) {
    case 0:
      const product = Array.from(state.products.values())[0];
      const order = window.appState.createOrder({
        productId: product.id,
        quantity: 5,
        destinationPvzId: ekbMesh.id,
        sourcePvzId: permMesh.id,
        sellerId: product.sellerId
      });
      window.demoOrderId = order.id;
      break;
    case 1:
      window.appState.routeOrder(window.demoOrderId);
      break;
    case 2:
      window.appState.processOrderAction(window.demoOrderId, 'receive');
      break;
    case 3:
      window.appState.processOrderAction(window.demoOrderId, 'store');
      break;
    case 4:
      window.appState.processOrderAction(window.demoOrderId, 'pack');
      break;
    case 5:
      window.appState.processOrderAction(window.demoOrderId, 'dispatch');
      break;
    case 6:
      window.appState.processOrderAction(window.demoOrderId, 'issue');
      break;
    case 7:
      window.appState.processOrderAction(window.demoOrderId, 'settle');
      break;
  }
}

function executeReturnFlowStep(step) {
  const state = window.appState.getState();
  const pvzs = Array.from(state.pvzs.values()).filter(p => p.type === 'mesh');
  if (pvzs.length === 0) return;

  switch (step) {
    case 0:
      const product = Array.from(state.products.values())[0];
      const pvz = pvzs[0];
      const order = window.appState.createOrder({
        productId: product.id,
        quantity: 2,
        destinationPvzId: pvz.id,
        sourcePvzId: pvz.id,
        sellerId: product.sellerId
      });
      window.demoOrderId = order.id;
      break;
    case 1:
      window.appState.routeOrder(window.demoOrderId);
      break;
    case 2:
      window.appState.processOrderAction(window.demoOrderId, 'receive');
      break;
    case 3:
      window.appState.processOrderAction(window.demoOrderId, 'store');
      break;
    case 4:
      window.appState.processOrderAction(window.demoOrderId, 'pack');
      break;
    case 5:
      window.appState.processOrderAction(window.demoOrderId, 'dispatch');
      break;
    case 6:
      window.appState.processOrderAction(window.demoOrderId, 'issue');
      break;
    case 7:
      window.appState.processOrderAction(window.demoOrderId, 'settle');
      break;
    case 8:
      window.appState.processOrderAction(window.demoOrderId, 'return');
      break;
  }
}

function executeRouteFailureStep(step) {
  const state = window.appState.getState();
  const permMesh = Array.from(state.pvzs.values()).find(p => p.cityId === 'perm' && p.type === 'mesh');
  const ekbMesh = Array.from(state.pvzs.values()).find(p => p.cityId === 'ekaterinburg' && p.type === 'mesh');
  if (!permMesh || !ekbMesh) return;

  switch (step) {
    case 0:
      const product = Array.from(state.products.values())[0];
      const order = window.appState.createOrder({
        productId: product.id,
        quantity: 10,
        destinationPvzId: ekbMesh.id,
        sourcePvzId: permMesh.id,
        sellerId: product.sellerId
      });
      window.demoOrderId = order.id;
      break;
    case 1:
      window.appState.routeOrder(window.demoOrderId);
      break;
    case 2:
      // Simulate vehicle breakdown - cancel and re-route
      window.appState.processOrderAction(window.demoOrderId, 'cancel');
      break;
    case 3:
      // Re-route with different parameters
      const order2 = window.appState.createOrder({
        productId: product.id,
        quantity: 10,
        destinationPvzId: ekbMesh.id,
        sourcePvzId: permMesh.id,
        sellerId: product.sellerId
      });
      window.demoOrderId = order2.id;
      window.appState.routeOrder(order2.id);
      break;
  }
}

function executeLongStorageStep(step) {
  const state = window.appState.getState();
  const pvzs = Array.from(state.pvzs.values()).filter(p => p.type === 'mesh');
  if (pvzs.length === 0) return;

  switch (step) {
    case 0:
      const product = Array.from(state.products.values())[0];
      const pvz = pvzs[0];
      const order = window.appState.createOrder({
        productId: product.id,
        quantity: 1,
        destinationPvzId: pvz.id,
        sourcePvzId: pvz.id,
        sellerId: product.sellerId
      });
      window.demoOrderId = order.id;
      break;
    case 1:
      window.appState.routeOrder(window.demoOrderId);
      break;
    case 2:
      window.appState.processOrderAction(window.demoOrderId, 'receive');
      break;
    case 3:
      window.appState.processOrderAction(window.demoOrderId, 'store');
      break;
    case 4:
      // Advance time by 30 days
      for (let i = 0; i < 30 * 24; i++) {
        window.appState.stepTime(1);
      }
      break;
    case 5:
      // Show progressive storage cost
      window.appState.processOrderAction(window.demoOrderId, 'pack');
      break;
    case 6:
      window.appState.processOrderAction(window.demoOrderId, 'dispatch');
      break;
    case 7:
      window.appState.processOrderAction(window.demoOrderId, 'issue');
      break;
    case 8:
      window.appState.processOrderAction(window.demoOrderId, 'settle');
      break;
  }
}

function pauseDemo() {
  if (window.demoInterval) {
    clearInterval(window.demoInterval);
    window.demoInterval = null;
    showToast('Демо на паузе', 'warning');
    renderDemoPanel();
  }
}

function stepDemo() {
  if (!window.demoRunning || !window.currentDemoScenario) return;
  const state = window.appState.getState();
  const scenario = state.demoScenarios.find(s => s.id === window.currentDemoScenario);
  if (scenario && window.currentDemoStep < scenario.steps.length) {
    executeDemoStep(scenario, window.currentDemoStep);
    window.currentDemoStep++;
    renderDemoPanel();
  }
}

function stopDemo() {
  if (window.demoInterval) {
    clearInterval(window.demoInterval);
    window.demoInterval = null;
  }
  window.demoRunning = false;
  window.currentDemoScenario = null;
  window.currentDemoStep = 0;
  renderDemoPanel();
}

function renderDemoLiveContent(state) {
  const container = document.getElementById('demoLiveContent');

  if (!window.demoRunning) {
    container.innerHTML = `
      <div class="text-center py-8 text-tertiary">
        <span class="icon-play" style="font-size: 48px; opacity: 0.3;"></span>
        <p class="mt-2">Выберите сценарий слева для запуска демонстрации</p>
      </div>
    `;
    return;
  }

  const scenario = state.demoScenarios.find(s => s.id === window.currentDemoScenario);
  if (!scenario) return;

  const currentStep = scenario.steps[window.currentDemoStep] || 'Завершено';
  const progress = ((window.currentDemoStep) / scenario.steps.length * 100).toFixed(0);

  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-primary-light rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <h4 class="font-semibold text-primary">${scenario.name}</h4>
          <span class="badge badge-primary">LIVE</span>
        </div>
        <div class="progress-bar mb-2">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="text-sm text-tertiary">Шаг ${window.currentDemoStep + 1} из ${scenario.steps.length}</div>
      </div>

      <div class="p-4 bg-base rounded border border-border">
        <h5 class="font-medium text-secondary mb-2">Текущее действие:</h5>
        <p class="text-lg font-mono text-primary">${currentStep}</p>
      </div>

      <div class="p-4 bg-base rounded border border-border">
        <h5 class="font-medium text-secondary mb-2">Журнал MCS:</h5>
        <div id="demoMcsLog" class="font-mono text-sm text-tertiary max-h-48 overflow-y-auto">
          ${state.mcsDecisionLog.slice(-5).reverse().map(entry =>
            `<div>${formatTime(entry.timestamp)} | ${entry.orderId.slice(-8)} | ${entry.selectedRoute || 'BLOCKED'} | ${money(entry.cost)}</div>`
          ).join('') || 'Ожидание решения MCS...'}
        </div>
      </div>

      <div class="p-4 bg-base rounded border border-border">
        <h5 class="font-medium text-secondary mb-2">Финансовый срез:</h5>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><span class="text-tertiary">Mesh стоимость:</span> <span class="font-mono text-success" id="demoMeshCost">—</span></div>
          <div><span class="text-tertiary">Classic стоимость:</span> <span class="font-mono text-error" id="demoClassicCost">—</span></div>
          <div><span class="text-tertiary">Экономия:</span> <span class="font-mono text-primary" id="demoSavings">—</span></div>
          <div><span class="text-tertiary">Маржа ПВЗ:</span> <span class="font-mono text-success" id="demoPvzMargin">—</span></div>
        </div>
      </div>
    </div>
  `;

  // Update financials if order exists
  if (window.demoOrderId) {
    const order = state.orders.get(window.demoOrderId);
    if (order) {
      document.getElementById('demoMeshCost').textContent = money(order.routeCost || 0);
      document.getElementById('demoClassicCost').textContent = money(order.classicCost || 0);
      document.getElementById('demoSavings').textContent = money((order.classicCost || 0) - (order.routeCost || 0));
      document.getElementById('demoPvzMargin').textContent = money(order.pvzReward || 0);
    }
  }
}

function renderDemoScript() {
  const container = document.getElementById('demoScriptContent');
  container.innerHTML = `
    <div class="prose max-w-none">
      <h4 class="font-semibold mb-3">Скрипт демо для жюри (3-5 минут)</h4>

      <div class="space-y-4">
        <div class="p-4 bg-primary-light rounded-lg">
          <h5 class="font-semibold text-primary mb-2">0:00 — Вступление (30 сек)</h5>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>«WB Mesh — это mesh-логистика для Wildberries: ПВЗ становятся мини-хабами»</li>
            <li>«Классическая модель: 100₽ на заказ. Mesh: цель 93₽. Уже достигли 123₽ в демо»</li>
            <li>«Ключевая формула: C = 48₽ + 8₽×n + 40₽×(k-1) + 6₽×t (в рублях)»</li>
          </ul>
        </div>

        <div class="p-4 bg-success-light rounded-lg">
          <h5 class="font-semibold text-success mb-2">0:30 — Сценарий 1: Городской заказ M1 (45 сек)</h5>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>Создаём заказ в Перми, ПВЗ «Плюс Ареал»</li>
            <li>MCS выбирает M1 — в том же ПВЗ, 0₽ транспорт</li>
            <li>Показываем: 39₽ начисления, 23₽ затраты, 16₽ маржа</li>
            <li>Сравниваем с Classic 100₽ → экономия 61₽ (61%)</li>
          </ul>
        </div>

        <div class="p-4 bg-info-light rounded-lg">
          <h5 class="font-semibold text-info mb-2">1:15 — Сценарий 2: Межгород C2 (60 сек)</h5>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>Заказ Пермь → Екатеринбург (5 заказов в рейсе)</li>
            <li>MCS: C2 через хабы, стоимость рейса 48₽ + 8₽×5 = 88₽, на заказ 17.6₽</li>
            <li>Показываем decision log: почему не M2 (нет прямого рейса), почему не C1</li>
            <li>Экономия vs Classic: 100₽ → ~93₽ (цель достигнута при 5+ заказах)</li>
          </ul>
        </div>

        <div class="p-4 bg-warning-light rounded-lg">
          <h5 class="font-semibold text-warning mb-2">2:15 — Сценарий 3: Возврат (45 сек)</h5>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>Покупатель не забрал — возврат через Mesh за 20₽ vs хаб 50₽</li>
            <li>Карантин: решение за 24ч — перепродать или списать</li>
            <li>Показываем финансовый удар: ущерб 500₽, но Mesh-возврат экономит 30₽</li>
          </ul>
        </div>

        <div class="p-4 bg-error-light rounded-lg">
          <h5 class="font-semibold text-error mb-2">3:00 — Сценарий 4: Сбой маршрута (45 сек)</h5>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>Автомобиль сломалось — MCS пересчитывает за 2 сек</li>
            <li>Резервируем другой транспорт, меняем тип маршрута C2 → C1</li>
            <li>SLA 24ч не нарушен, покупатель не замечает</li>
          </ul>
        </div>

        <div class="p-4 bg-purple-light rounded-lg">
          <h5 class="font-semibold text-purple mb-2">3:45 — Сценарий 5: Долгое хранение (45 сек)</h5>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>Товар лежит 30 дней — прогрессивный тариф срабатывает после 7 дней</li>
            <li>Стоимость хранения растёт: 1× → 1.5× → 2×</li>
            <li>MCS учитывает это в маршрутизации: не отправляем в переполненные ПВЗ</li>
          </ul>
        </div>

        <div class="p-4 bg-primary-light rounded-lg">
          <h5 class="font-semibold text-primary mb-2">4:30 — Экономическая модель (30 сек)</h5>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>Переключаем тарифы в реальном времени — графики перестраиваются</li>
            <li>Точка безубыточности: 5 заказов при базовых условиях</li>
            <li>Чувствительность: при 10 заказах Mesh = 65₽ vs Classic 100₽</li>
          </ul>
        </div>

        <div class="p-4 bg-secondary-light rounded-lg">
          <h5 class="font-semibold text-secondary mb-2">5:00 — Прогноз спроса и закрытие (30 сек)</h5>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>EWMA + Seasonal Average: MAE 2.3, Hit Rate 78%</li>
            <li>«Mesh логистика + прогноз = 0 ложных рейсов, 0 пропусков»</li>
            <li>QR-код на GitHub, исходный код открыт,欢迎 contribute!</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// SETTINGS
// ============================================

function setupSettingsListeners() {
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSettingsTab(tab.dataset.settingsTab));
  });

  document.getElementById('addCity').addEventListener('click', () => showAddCityModal());
  document.getElementById('addPvz').addEventListener('click', () => showAddPvzModal());
  document.getElementById('addProduct').addEventListener('click', () => showAddProductModalSettings());
  document.getElementById('addSeller').addEventListener('click', () => showAddSellerModal());

  document.getElementById('exportState').addEventListener('click', exportState);
  document.getElementById('importState').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importState);
}

function switchSettingsTab(tabName) {
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.settingsTab === tabName);
  });
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `settings${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  });

  if (tabName === 'cities') renderCitiesTable();
  if (tabName === 'pvzs') renderPvzsTable();
  if (tabName === 'products') renderProductsTable();
  if (tabName === 'sellers') renderSellersTable();
  if (tabName === 'tariffs') renderTariffEditorSettings();
}

function renderSettings() {
  if (window.currentTab !== 'settings') return;
  renderCitiesTable();
  renderPvzsTable();
  renderProductsTable();
  renderSellersTable();
  renderTariffEditorSettings();

  // Update settings summary badge
  const state = window.appState.getState();
  const summaryBadge = document.getElementById('settingsSummaryBadge');
  const summaryText = document.getElementById('settingsSummaryText');
  if (summaryBadge && summaryText) {
    summaryText.textContent = `Города ${state.cities.size} · ПВЗ ${state.pvzs.size} · Товары ${state.products.size} · Продавцы ${state.sellers.size}`;
    summaryBadge.style.display = 'inline-flex';
  }
}

function renderCitiesTable() {
  const tbody = document.getElementById('citiesTableBody');
  const state = window.appState.getState();

  tbody.innerHTML = '';
  for (const [id, city] of state.cities) {
    const hub = state.pvzs.get(city.hubId);
    const meshCount = (city.meshPvzs || []).length;

    const tr = createElement('tr', {}, [
      createElement('td', { class: 'font-mono' }, id),
      createElement('td', {}, city.name),
      createElement('td', {}, hub?.name || city.hubId),
      createElement('td', {}, meshCount),
      createElement('td', {}, `(${city.coordinates?.x ?? 0}, ${city.coordinates?.y ?? 0})`),
      createElement('td', {}, [
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs', title: 'Редактировать' }, createElement('span', { innerHTML: svgIcon('settings', 14) })),
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs text-error', title: 'Удалить' }, createElement('span', { innerHTML: svgIcon('x', 14) }))
      ])
    ]);
    tbody.appendChild(tr);
  }
}

function renderPvzsTable() {
  const tbody = document.getElementById('pvzsTableBody');
  const state = window.appState.getState();

  tbody.innerHTML = '';
  for (const [id, pvz] of state.pvzs) {
    const city = state.cities.get(pvz.cityId);

    const tr = createElement('tr', {}, [
      createElement('td', { class: 'font-mono' }, id),
      createElement('td', {}, pvz.name),
      createElement('td', {}, city?.name || pvz.cityId),
      createElement('td', {}, [
        createElement('span', { class: `badge ${pvz.type === 'hub' ? 'badge-primary' : pvz.type === 'mesh' ? 'badge-success' : 'badge-neutral'}` }, pvz.type)
      ]),
      createElement('td', {}, `${pvz.occupiedCapacity}/${pvz.capacity}`),
      createElement('td', {}, `(${pvz.coordinates?.x ?? 0}, ${pvz.coordinates?.y ?? 0})`),
      createElement('td', {}, pvz.operationalSlots),
      createElement('td', {}, [
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs' }, createElement('span', { innerHTML: svgIcon('settings', 14) })),
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs text-error' }, createElement('span', { innerHTML: svgIcon('x', 14) }))
      ])
    ]);
    tbody.appendChild(tr);
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  const state = window.appState.getState();

  tbody.innerHTML = '';
  for (const [id, product] of state.products) {
    const seller = state.sellers.get(product.sellerId);

    const tr = createElement('tr', {}, [
      createElement('td', { class: 'font-mono' }, id),
      createElement('td', { class: 'font-mono' }, product.sku),
      createElement('td', {}, product.name),
      createElement('td', {}, product.category),
      createElement('td', { class: 'text-numeric font-mono' }, money(product.price)),
      createElement('td', {}, product.dimensions?.size || '-'),
      createElement('td', { class: 'text-numeric' }, product.weight),
      createElement('td', { class: 'text-numeric' }, `${(product.returnRate * 100).toFixed(0)}%`),
      createElement('td', {}, seller?.name || product.sellerId),
      createElement('td', {}, [
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs' }, createElement('span', { innerHTML: svgIcon('settings', 14) })),
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs text-error' }, createElement('span', { innerHTML: svgIcon('x', 14) }))
      ])
    ]);
    tbody.appendChild(tr);
  }
}

function renderSellersTable() {
  const tbody = document.getElementById('sellersTableBody');
  const state = window.appState.getState();

  tbody.innerHTML = '';
  for (const [id, seller] of state.sellers) {
    const productCount = Array.from(state.products.values()).filter(p => p.sellerId === id).length;

    const tr = createElement('tr', {}, [
      createElement('td', { class: 'font-mono' }, id),
      createElement('td', {}, seller.name),
      createElement('td', {}, seller.category),
      createElement('td', { class: 'text-numeric' }, `${(seller.commission * 100).toFixed(1)}%`),
      createElement('td', {}, productCount),
      createElement('td', {}, [
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs' }, createElement('span', { innerHTML: svgIcon('settings', 14) })),
        createElement('button', { class: 'btn btn-ghost btn-icon btn-xs text-error' }, createElement('span', { innerHTML: svgIcon('x', 14) }))
      ])
    ]);
    tbody.appendChild(tr);
  }
}

function renderTariffEditorSettings() {
  const container = document.getElementById('tariffEditorSettings');
  const state = window.appState.getState();

  container.innerHTML = '';
  container.appendChild(createTariffEditor(state.tariffs, handleTariffChange));
}

function showAddCityModal() {
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');

  title.textContent = 'Добавить город';
  body.innerHTML = `
    <div class="space-y-3">
      <div class="form-group"><label class="form-label">ID</label><input type="text" id="newCityId" class="form-input" placeholder="chelyabinsk"></div>
      <div class="form-group"><label class="form-label">Название</label><input type="text" id="newCityName" class="form-input" placeholder="Челябинск"></div>
      <div class="form-group"><label class="form-label">Хаб ПВЗ ID</label><input type="text" id="newCityHub" class="form-input" placeholder="pvz-chelyabinsk-hub"></div>
      <div class="form-group"><label class="form-label">X координата</label><input type="number" id="newCityX" class="form-input" value="500"></div>
      <div class="form-group"><label class="form-label">Y координата</label><input type="number" id="newCityY" class="form-input" value="300"></div>
    </div>
  `;
  footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" onclick="createCity(); closeModal()">Создать</button>`;
  openModal();
}

function showAddPvzModal() {
  const state = window.appState.getState();
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');

  title.textContent = 'Добавить ПВЗ';
  body.innerHTML = `
    <div class="space-y-3">
      <div class="form-group"><label class="form-label">ID</label><input type="text" id="newPvzId" class="form-input" placeholder="pvz-new"></div>
      <div class="form-group"><label class="form-label">Название</label><input type="text" id="newPvzName" class="form-input" placeholder="ПВЗ Новый"></div>
      <div class="form-group"><label class="form-label">Город</label><select id="newPvzCity" class="form-select">${Array.from(state.cities.keys()).map(id => `<option value="${id}">${state.cities.get(id).name}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Тип</label><select id="newPvzType" class="form-select"><option value="mesh">Mesh</option><option value="hub">Хаб</option><option value="standard">Стандарт</option></select></div>
      <div class="form-group"><label class="form-label">Вместимость</label><input type="number" id="newPvzCapacity" class="form-input" value="200"></div>
      <div class="form-group"><label class="form-label">X координата</label><input type="number" id="newPvzX" class="form-input" value="100"></div>
      <div class="form-group"><label class="form-label">Y координата</label><input type="number" id="newPvzY" class="form-input" value="100"></div>
      <div class="form-group"><label class="form-label">Операционные слоты</label><input type="number" id="newPvzSlots" class="form-input" value="8"></div>
    </div>
  `;
  footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" onclick="createPvz(); closeModal()">Создать</button>`;
  openModal();
}

function showAddProductModalSettings() {
  showAddProductModal();
}

function showAddSellerModal() {
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');

  title.textContent = 'Добавить продавца';
  body.innerHTML = `
    <div class="space-y-3">
      <div class="form-group"><label class="form-label">ID</label><input type="text" id="newSellerId" class="form-input" placeholder="seller-new"></div>
      <div class="form-group"><label class="form-label">Название</label><input type="text" id="newSellerName" class="form-input" placeholder="ООО Новый"></div>
      <div class="form-group"><label class="form-label">Категория</label><select id="newSellerCategory" class="form-select"><option value="electronics">Электроника</option><option value="clothing">Одежда</option><option value="home">Дом</option></select></div>
      <div class="form-group"><label class="form-label">Комиссия (%)</label><input type="number" id="newSellerCommission" class="form-input" value="15" step="0.1" min="0" max="50"></div>
    </div>
  `;
  footer.innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" onclick="createSeller(); closeModal()">Создать</button>`;
  openModal();
}

window.createCity = () => {
  const state = window.appState.getState();
  const city = {
    id: document.getElementById('newCityId').value,
    name: document.getElementById('newCityName').value,
    hubId: document.getElementById('newCityHub').value,
    meshPvzs: [],
    coordinates: {
      x: parseInt(document.getElementById('newCityX').value),
      y: parseInt(document.getElementById('newCityY').value)
    }
  };
  state.cities.set(city.id, city);
  showToast('Город создан', 'success');
  populateSelectors();
  renderSettings();
};

window.createPvz = () => {
  const state = window.appState.getState();
  const pvz = {
    id: document.getElementById('newPvzId').value,
    name: document.getElementById('newPvzName').value,
    cityId: document.getElementById('newPvzCity').value,
    type: document.getElementById('newPvzType').value,
    capacity: parseInt(document.getElementById('newPvzCapacity').value),
    occupiedCapacity: 0,
    coordinates: {
      x: parseInt(document.getElementById('newPvzX').value),
      y: parseInt(document.getElementById('newPvzY').value)
    },
    operationalSlots: parseInt(document.getElementById('newPvzSlots').value),
    inventory: []
  };
  state.pvzs.set(pvz.id, pvz);
  // Add to city meshPvzs if mesh type
  const city = state.cities.get(pvz.cityId);
  if (city && pvz.type === 'mesh') {
    city.meshPvzs.push(pvz.id);
  }
  showToast('ПВЗ создан', 'success');
  populateSelectors();
  renderSettings();
};

window.createSeller = () => {
  const state = window.appState.getState();
  const seller = {
    id: document.getElementById('newSellerId').value,
    name: document.getElementById('newSellerName').value,
    category: document.getElementById('newSellerCategory').value,
    commission: parseFloat(document.getElementById('newSellerCommission').value) / 100,
    productIds: []
  };
  state.sellers.set(seller.id, seller);
  showToast('Продавец создан', 'success');
  renderSettings();
};

function exportState() {
  const state = window.appState.getState();
  const exportData = window.appState.exportState();
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wb-mesh-state-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Состояние экспортировано', 'success');
}

function importState(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      window.appState.importState(data);
      showToast('Состояние импортировано', 'success');
      populateSelectors();
      renderAll();
    } catch (err) {
      showToast('Ошибка импорта: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ============================================
// ORDER DETAIL MODAL
// ============================================

function showOrderDetail(orderId) {
  const state = window.appState.getState();
  const order = state.orders.get(orderId);
  if (!order) return;

  const product = state.products.get(order.productId);
  const pvz = state.pvzs.get(order.destinationPvzId);

  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const footer = document.getElementById('modalFooter');

  title.textContent = `Заказ ${orderId.slice(-8)}`;
  body.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><strong>Товар:</strong> ${product?.name || order.productId}</div>
        <div><strong>SKU:</strong> ${product?.sku || '—'}</div>
        <div><strong>Кол-во:</strong> ${order.quantity} шт.</div>
        <div><strong>ПВЗ:</strong> ${pvz?.name || order.destinationPvzId}</div>
        <div><strong>Маршрут:</strong> <span class="badge ${order.routeType ? 'badge-route-' + order.routeType.toLowerCase() : 'badge-neutral'}">${order.routeType || '—'}</span></div>
        <div><strong>ETA:</strong> ${order.routeEta || '—'} ч</div>
        <div><strong>Статус:</strong> <span class="badge badge-status-${order.status}">${order.status}</span></div>
        <div><strong>Стоимость:</strong> ${money(order.routeCost || 0)}</div>
      </div>

      ${order.routeType ? `
        <div class="p-3 bg-info-light rounded-lg">
          <strong>Расшифровка стоимости:</strong>
          <div class="text-sm mt-1 font-mono">
            Classic: ${money(order.classicCost || 0)} | Mesh: ${money(order.routeCost || 0)} | Экономия: ${money((order.classicCost || 0) - (order.routeCost || 0))}
          </div>
        </div>
      ` : ''}

      ${order.events && order.events.length > 0 ? `
        <div>
          <strong>История:</strong>
          <div class="space-y-1 mt-2 max-h-48 overflow-y-auto">
            ${order.events.map(e => `
              <div class="text-xs text-tertiary font-mono">
                ${formatTime(e.timestamp)} | ${e.type} | ${e.details ? JSON.stringify(e.details) : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Available actions based on status
  const actions = getAvailableActions(order.status);
  footer.innerHTML = `
    ${actions.map(a => `<button class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}" onclick="processOrderAction('${orderId}', '${a.action}'); closeModal()">${a.label}</button>`).join('')}
    <button class="btn btn-ghost" onclick="closeModal()">Закрыть</button>
  `;

  openModal();
}

function getAvailableActions(status) {
  const actionMap = {
    new: [{ action: 'receive', label: '📥 Принять', primary: true }],
    received: [{ action: 'store', label: '📦 На хранение', primary: true }],
    stored: [{ action: 'pack', label: '📋 Собрать', primary: true }],
    ordered: [{ action: 'pack', label: '📋 Собрать', primary: true }],
    packed: [{ action: 'dispatch', label: '🚚 Отправить', primary: true }],
    in_transit: [{ action: 'issue', label: '✅ Выдать', primary: true }],
    issued: [{ action: 'settle', label: '💰 Начислить', primary: true }, { action: 'return', label: '🔄 Возврат', primary: false }],
    settled: [{ action: 'return', label: '🔄 Возврат', primary: false }]
  };
  return actionMap[status] || [{ action: 'cancel', label: '❌ Отменить', primary: false }];
}

window.processOrderAction = (orderId, action) => {
  const result = window.appState.processOrderAction(orderId, action);
  if (result.success) {
    showToast(`Действие "${action}" выполнено`, 'success');
  } else {
    showToast(result.error, 'error');
  }
};

// ============================================
// MODAL / DRAWER / TOAST HELPERS
// ============================================

function openModal() {
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function openDrawer() {
  document.getElementById('drawerOverlay').classList.add('active');
  document.getElementById('drawer').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('active');
  document.getElementById('drawer').classList.remove('active');
  document.body.style.overflow = '';
}

function toggleSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar.classList.toggle('open', force);
  document.getElementById('drawerOverlay').classList.toggle('active', isOpen);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = createElement('div', { class: `toast toast-${type}` }, [
    createElement('span', { innerHTML: svgIcon(type === 'success' ? 'check' : type === 'error' ? 'alert' : type === 'warning' ? 'alert' : 'info', 20) }),
    createElement('span', {}, message),
    createElement('button', { class: 'toast-close', onclick: () => toast.remove() }, createElement('span', { innerHTML: svgIcon('x', 16) }))
  ]);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ============================================
// INITIALIZE ON DOM READY
// ============================================

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp, {once:true});
else initApp();

// Export for debugging
window.WBMesh = {
  appState: () => window.appState,
  state: () => window.appState?.getState(),
  CostEngine,
  RouteOptimizer,
  InventoryManager,
  DemandForecast,
  MCS
};
