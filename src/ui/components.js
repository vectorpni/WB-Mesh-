/**
 * WB Mesh — UI Components Library
 * Reusable web components for the application
 */

import { money, formatTime, generateId } from '../core/types.js';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') el.className = value;
    else if (key === 'style') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.entries(value).forEach(([k, v]) => el.dataset[k] = v);
    else el.setAttribute(key, value);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child instanceof Node) el.appendChild(child);
  });
  return el;
}

function svgIcon(name, size = 20) {
  const icons = {
    mesh: `<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>`,
    hub: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>`,
    truck: `<path d="M19 17h2c.6 0 1-.4 1-1v-4c0-.6-.4-1-1-1H5c-.6 0-1 .4-1 1v4c0 .6.4 1 1 1h2"/>`,
    package: `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>`,
    wallet: `<path d="M21 12V7H5v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2z"/>`,
    chart: `<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>`,
    settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
    user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
    bell: `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
    chevronDown: `<path d="M6 9l6 6 6-6"/>`,
    chevronRight: `<path d="M9 18l6-6-6-6"/>`,
    chevronLeft: `<path d="M15 18l-6-6 6-6"/>`,
    x: `<path d="M18 6L6 18M6 6l12 12"/>`,
    check: `<path d="M20 6L9 17l-5-5"/>`,
    alert: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
    info: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`,
    minus: `<path d="M5 12h14"/>`,
    refresh: `<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`,
    download: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
    upload: `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`,
    search: `<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>`,
    filter: `<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`,
    menu: `<path d="M3 12h18M3 6h18M3 18h18"/>`,
    home: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
    building: `<path d="M3 21h18"/><path d="M5 21V9"/><path d="M19 21V9"/><path d="M9 21V9"/><path d="M13 21V9"/><path d="M12 2V22"/>`,
    archive: `<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>`,
    clipboard: `<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>`,
    list: `<path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/>`
  };

  const path = icons[name] || icons.package;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-${name}">${path}</svg>`;
}

// ============================================
// KPI CARD COMPONENT
// ============================================

export function createKpiCard({ label, value, delta, deltaLabel, icon, variant = 'default', clickable = false, onClick }) {
  const card = createElement('div', {
    class: `kpi-card ${variant} ${clickable ? 'cursor-pointer' : ''}`,
    onclick: onClick
  });

  const iconEl = icon ? createElement('div', { class: 'kpi-icon', innerHTML: svgIcon(icon, 24) }) : null;

  card.append(
    createElement('div', { class: 'kpi-header' }, [
      createElement('span', { class: 'kpi-label' }, label),
      iconEl
    ].filter(Boolean)),
    createElement('div', { class: 'kpi-value' }, value),
    delta !== undefined ? createElement('div', {
      class: `kpi-delta ${delta >= 0 ? 'positive' : 'negative'}`
    }, [
      createElement('span', { innerHTML: svgIcon(delta >= 0 ? 'chevronRight' : 'chevronLeft', 12) }),
      createElement('span', {}, `${Math.abs(delta).toLocaleString('ru-RU')} ${deltaLabel || ''}`)
    ]) : null
  );

  return card;
}

// ============================================
// ROUTE CANDIDATE CARD
// ============================================

export function createRouteCandidateCard(candidate, onSelect) {
  const routeLabels = {
    M1: 'M1: В том же ПВЗ',
    M2: 'M2: Прямой рейс',
    C1: 'C1: Через хаб',
    C2: 'C2: Межгород',
    blocked: 'Заблокирован'
  };

  const routeColors = {
    M1: 'badge-route-m1',
    M2: 'badge-route-m2',
    C1: 'badge-route-c1',
    C2: 'badge-route-c2',
    blocked: 'badge-route-blocked'
  };

  const card = createElement('div', {
    class: `card route-candidate ${candidate.selected ? 'selected' : ''} ${!candidate.available ? 'unavailable' : ''}`,
    onclick: () => onSelect?.(candidate)
  });

  const badges = [
    createElement('span', { class: `badge ${routeColors[candidate.type] || 'badge-neutral'}` }, routeLabels[candidate.type] || candidate.type)
  ];

  if (!candidate.available) {
    badges.push(createElement('span', { class: 'badge badge-error' }, 'Недоступен'));
  }

  if (candidate.selected) {
    badges.push(createElement('span', { class: 'badge badge-success' }, 'Выбрано'));
  }

  const constraints = candidate.constraints.length > 0
    ? createElement('div', { class: 'constraints mt-3' }, candidate.constraints.map(c =>
      createElement('span', { class: 'badge badge-warning mr-1 mb-1' }, c)
    )) : null;

  const rejection = candidate.rejectionReasons.length > 0
    ? createElement('div', { class: 'rejections mt-3' }, candidate.rejectionReasons.map(r =>
      createElement('span', { class: 'badge badge-error mr-1 mb-1' }, r)
    )) : null;

  card.append(
    createElement('div', { class: 'card-body' }, [
      createElement('div', { class: 'flex justify-between items-start mb-3' }, [
        createElement('div', { class: 'flex items-center gap-2' }, badges),
        createElement('div', { class: 'text-right' }, [
          createElement('div', { class: 'text-2xl font-extrabold text-primary' }, money(candidate.totalCost)),
          createElement('div', { class: 'text-xs text-tertiary' }, 'на заказ')
        ])
      ]),
      createElement('div', { class: 'grid grid-cols-2 gap-3 mb-3' }, [
        createElement('div', {}, [
          createElement('div', { class: 'text-xs text-tertiary' }, 'ETA'),
          createElement('div', { class: 'font-semibold' }, `${candidate.etaHours} ч`)
        ]),
        createElement('div', {}, [
          createElement('div', { class: 'text-xs text-tertiary' }, 'Остановок'),
          createElement('div', { class: 'font-semibold' }, candidate.stops)
        ]),
        createElement('div', {}, [
          createElement('div', { class: 'text-xs text-tertiary' }, 'Загрузка ПВЗ'),
          createElement('div', { class: 'font-semibold' }, `${Math.round(candidate.pvzLoad * 100)}%`)
        ]),
        createElement('div', {}, [
          createElement('div', { class: 'text-xs text-tertiary' }, 'Загрузка трансп.'),
          createElement('div', { class: 'font-semibold' }, `${Math.round(candidate.vehicleLoad * 100)}%`)
        ])
      ]),
      createElement('div', { class: 'grid grid-cols-2 gap-3 mb-3' }, [
        createElement('div', {}, [
          createElement('div', { class: 'text-xs text-tertiary' }, 'Экономия МП'),
          createElement('div', { class: `font-semibold ${candidate.marketplaceEconomics.savings > 0 ? 'text-success' : 'text-error'}` },
            money(candidate.marketplaceEconomics.savings))
        ]),
        createElement('div', {}, [
          createElement('div', { class: 'text-xs text-tertiary' }, 'Маржа ПВЗ'),
          createElement('div', { class: 'font-semibold text-success' }, money(candidate.pvzReward))
        ])
      ]),
      constraints,
      rejection
    ].filter(Boolean))
  );

  return card;
}

// ============================================
// ORDER CARD
// ============================================

export function createOrderCard(order, onClick) {
  const statusLabels = {
    new: 'Новый',
    received: 'Принят',
    stored: 'На хранении',
    ordered: 'Оформлен',
    packed: 'Собран',
    dispatched: 'Отправлен',
    in_transit: 'В пути',
    issued: 'Выдан',
    settled: 'Начислено',
    returned: 'Возвращён',
    cancelled: 'Отменён',
    damaged: 'Повреждён',
    exception: 'Исключение',
    quarantine: 'Карантин'
  };

  const statusBadges = {
    new: 'badge-status-new',
    received: 'badge-status-received',
    stored: 'badge-status-stored',
    ordered: 'badge-status-ordered',
    packed: 'badge-status-packed',
    dispatched: 'badge-status-dispatched',
    in_transit: 'badge-status-transit',
    issued: 'badge-status-issued',
    settled: 'badge-status-settled',
    returned: 'badge-status-returned',
    cancelled: 'badge-status-cancelled',
    damaged: 'badge-status-damaged',
    exception: 'badge-status-exception',
    quarantine: 'badge-status-quarantine'
  };

  const routeLabels = {
    M1: 'M1: Локально',
    M2: 'M2: Прямой',
    C1: 'C1: Хаб',
    C2: 'C2: Межгород',
    blocked: 'Нет маршрута'
  };

  const card = createElement('div', {
    class: `card order-card ${order.id === window.selectedOrderId ? 'selected' : ''}`,
    onclick: () => onClick?.(order.id)
  });

  const product = window.appState?.products?.get?.(order.productId);

  card.append(
    createElement('div', { class: 'card-body' }, [
      createElement('div', { class: 'flex justify-between items-start mb-2' }, [
        createElement('div', {}, [
          createElement('div', { class: 'font-semibold text-primary' }, product?.name || `Товар ${order.productId?.slice(-6)}`),
          createElement('div', { class: 'text-xs text-tertiary' }, `SKU: ${product?.sku || order.productId}`)
        ]),
        createElement('span', { class: `badge ${statusBadges[order.status] || 'badge-neutral'}` }, statusLabels[order.status] || order.status)
      ]),
      createElement('div', { class: 'flex flex-wrap gap-2 mb-2' }, [
        createElement('span', { class: `badge ${order.routeType ? (order.routeType === 'M1' || order.routeType === 'M2' ? 'badge-route-m2' : 'badge-route-c1') : 'badge-neutral'}` },
          routeLabels[order.routeType] || '—'),
        createElement('span', { class: 'badge badge-info' }, `${order.quantity} шт.`),
        order.routeEta && createElement('span', { class: 'badge badge-neutral' }, `${order.routeEta} ч`)
      ].filter(Boolean)),
      createElement('div', { class: 'flex justify-between text-sm' }, [
        createElement('span', { class: 'text-tertiary' }, `ПВЗ: ${order.destinationPvzId}`),
        createElement('span', { class: 'font-semibold text-primary' }, money(order.routeCost))
      ]),
      order.failureReason && createElement('div', { class: 'mt-2 p-2 bg-error-light text-error text-xs rounded-lg' }, order.failureReason)
    ].filter(Boolean))
  );

  return card;
}

// ============================================
// FINANCIAL LEDGER
// ============================================

export function createLedger(title, rows, totals = null) {
  return createElement('div', { class: 'card' }, [
    createElement('div', { class: 'card-header' }, [
      createElement('h3', { class: 'font-semibold text-primary' }, title)
    ]),
    createElement('div', { class: 'card-body' }, [
      createElement('table', { class: 'table' }, [
        createElement('tbody', {}, rows.map(([label, value, highlight]) =>
          createElement('tr', {}, [
            createElement('td', { class: highlight ? 'font-semibold text-primary' : '' }, label),
            createElement('td', { class: 'text-numeric font-mono' + (highlight ? ' font-bold text-primary' : '') }, value)
          ])
        )),
        totals && createElement('tr', { class: 'border-t border-strong font-bold' }, [
          createElement('td', {}, totals.label),
          createElement('td', { class: 'text-numeric font-mono text-primary' }, totals.value)
        ])
      ].filter(Boolean))
    ])
  ]);
}

// ============================================
// MCS DECISION LOG PANEL
// ============================================

export function createDecisionLogPanel(log) {
  if (!log) return createElement('div', { class: 'card' }, [
    createElement('div', { class: 'card-body text-center py-8' }, [
      createElement('div', { class: 'text-tertiary' }, 'Нет данных о решении')
    ])
  ]);

  const candidateCards = log.candidates.map(c => createRouteCandidateCard(c, null));

  return createElement('div', { class: 'card' }, [
    createElement('div', { class: 'card-header' }, [
      createElement('h3', { class: 'font-semibold text-primary' }, 'Журнал решения MCS'),
      createElement('span', { class: 'text-xs text-tertiary' }, formatTime(log.timestamp))
    ]),
    createElement('div', { class: 'card-body' }, [
      createElement('div', { class: 'mb-4 p-3 bg-info-light text-info-dark rounded-lg' }, [
        createElement('div', { class: 'font-medium' }, 'Причина выбора:'),
        createElement('div', { class: 'text-sm mt-1' }, log.selectionReason)
      ]),
      createElement('div', { class: 'mb-4' }, [
        createElement('h4', { class: 'font-semibold text-secondary mb-2' }, 'Расшифровка формулы'),
        createElement('div', { class: 'grid grid-cols-2 gap-2 text-sm' }, [
          createElement('div', {}, [
            createElement('span', { class: 'text-tertiary' }, 'Переменные расходы:'),
            createElement('span', { class: 'font-mono font-semibold ml-2' }, money(log.formulaBreakdown.variableCost))
          ]),
          createElement('div', {}, [
            createElement('span', { class: 'text-tertiary' }, 'Доля фиксированных:'),
            createElement('span', { class: 'font-mono font-semibold ml-2' }, money(log.formulaBreakdown.fixedCostShare))
          ]),
          createElement('div', {}, [
            createElement('span', { class: 'text-tertiary' }, 'Начисления ПВЗ:'),
            createElement('span', { class: 'font-mono font-semibold ml-2 text-success' }, money(log.formulaBreakdown.pvzPayout))
          ]),
          createElement('div', {}, [
            createElement('span', { class: 'text-tertiary' }, 'Ожид. возвраты:'),
            createElement('span', { class: 'font-mono font-semibold ml-2' }, money(log.formulaBreakdown.expectedReturns))
          ]),
          createElement('div', {}, [
            createElement('span', { class: 'text-tertiary' }, 'Ожид. ущерб:'),
            createElement('span', { class: 'font-mono font-semibold ml-2' }, money(log.formulaBreakdown.expectedDamage))
          ]),
          createElement('div', { class: 'col-span-2 border-t pt-2' }, [
            createElement('span', { class: 'text-tertiary' }, 'Итого Mesh:'),
            createElement('span', { class: 'font-mono font-bold ml-2 text-primary' }, money(log.formulaBreakdown.total))
          ]),
          createElement('div', { class: 'col-span-2' }, [
            createElement('span', { class: 'text-tertiary' }, 'База (Хаб):'),
            createElement('span', { class: 'font-mono font-semibold ml-2' }, money(log.formulaBreakdown.baseline))
          ]),
          createElement('div', { class: 'col-span-2 font-bold text-success' }, [
            createElement('span', { class: 'text-tertiary' }, 'Экономия: '),
            createElement('span', { class: 'font-mono ml-2' }, money(log.formulaBreakdown.savings))
          ])
        ])
      ]),
      createElement('div', { class: 'mb-4' }, [
        createElement('h4', { class: 'font-semibold text-secondary mb-2' }, 'Проверка ограничений'),
        createElement('div', { class: 'grid grid-cols-2 gap-2' }, Object.entries(log.constraintsChecked).map(([key, value]) =>
          createElement('div', { class: `flex items-center gap-2 p-2 rounded-lg ${value ? 'bg-success-light' : 'bg-error-light'}` }, [
            createElement('span', { class: `w-2 h-2 rounded-full ${value ? 'bg-success' : 'bg-error'}` }),
            createElement('span', { class: 'text-xs' }, key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()))
          ])
        ))
      ]),
      createElement('div', {}, [
        createElement('h4', { class: 'font-semibold text-secondary mb-2' }, 'Все кандидаты'),
        createElement('div', { class: 'space-y-3' }, candidateCards)
      ])
    ])
  ]);
}

// ============================================
// FORECAST PANEL
// ============================================

export function createForecastPanel(forecast) {
  if (!forecast) return createElement('div', { class: 'card' }, [
    createElement('div', { class: 'card-body text-center py-8' }, [
      createElement('div', { class: 'text-tertiary' }, 'Прогноз недоступен')
    ])
  ]);

  return createElement('div', { class: 'card' }, [
    createElement('div', { class: 'card-header' }, [
      createElement('h3', { class: 'font-semibold text-primary' }, 'Прогноз спроса'),
      createElement('span', { class: `badge badge-${forecast.method === 'seasonalAverage' ? 'primary' : 'info'}` }, forecast.method)
    ]),
    createElement('div', { class: 'card-body' }, [
      createElement('div', { class: 'grid grid-cols-3 gap-4 mb-4' }, [
        createKpiCard({ label: 'След. день', value: forecast.nextDayForecast, icon: 'chart' }),
        createKpiCard({ label: 'Консервативно', value: forecast.conservativeEstimate, variant: 'warning', icon: 'alert' }),
        createKpiCard({ label: 'MAE', value: forecast.mae.toFixed(2), icon: 'chart' })
      ]),
      createElement('div', { class: 'grid grid-cols-2 gap-4 mb-4' }, [
        createKpiCard({ label: 'Смещение', value: forecast.bias.toFixed(2), variant: forecast.bias > 0 ? 'warning' : 'success' }),
        createKpiCard({ label: 'Hit Rate', value: `${(forecast.hitRate * 100).toFixed(1)}%`, icon: 'check' })
      ]),
      createElement('div', { class: 'mb-4' }, [
        createElement('h4', { class: 'font-semibold text-secondary mb-2' }, 'Сравнение методов'),
        createElement('div', { class: 'overflow-x-auto' }, [
          createElement('table', { class: 'table' }, [
            createElement('thead', {}, [
              createElement('tr', {}, [
                'Метод', 'MAE', 'Смещение', 'Hit Rate', 'Ложные рейсы', 'Пропуски'
              ].map(h => createElement('th', {}, h)))
            ]),
            createElement('tbody', {}, Object.entries(forecast.allMethods || {}).map(([method, metrics]) =>
              createElement('tr', { class: method === forecast.method ? 'bg-info-light/50' : '' }, [
                createElement('td', { class: 'font-medium' }, method),
                createElement('td', { class: 'text-numeric font-mono' }, metrics.mae.toFixed(2)),
                createElement('td', { class: 'text-numeric font-mono' }, metrics.bias.toFixed(2)),
                createElement('td', { class: 'text-numeric font-mono' }, `${(metrics.hitRate * 100).toFixed(1)}%`),
                createElement('td', { class: 'text-numeric font-mono' + (metrics.falseDispatch > 0 ? ' text-error' : '') }, metrics.falseDispatch),
                createElement('td', { class: 'text-numeric font-mono' + (metrics.missed > 0 ? ' text-warning' : '') }, metrics.missed)
              ])
            ))
          ])
        ])
      ])
    ])
  ]);
}

// ============================================
// NETWORK VISUALIZATION (SVG)
// ============================================

export function createNetworkVisualization(cities, pvzs, highlightedRoute = null, highlightedPvz = null) {
  const width = 800;
  const height = 500;

  // Create SVG
  const svg = createElementNS('svg', {
    width: '100%',
    height: '100%',
    viewBox: `0 0 ${width} ${height}`,
    class: 'network-svg'
  });

  // Background grid
  const defs = createElementNS('defs', {});
  const pattern = createElementNS('pattern', { id: 'grid', width: 20, height: 20, patternUnits: 'userSpaceOnUse' });
  pattern.appendChild(createElementNS('path', { d: 'M 20 0 L 0 0 0 20', fill: 'none', stroke: '#E8E0ED', 'stroke-width': 0.5 }));
  defs.appendChild(pattern);
  svg.appendChild(defs);
  svg.appendChild(createElementNS('rect', { width: width, height: height, fill: 'url(#grid)' }));

  // Draw trunk lines between cities (hub-to-hub)
  const cityArray = Array.from(cities.values());
  for (let i = 0; i < cityArray.length; i++) {
    for (let j = i + 1; j < cityArray.length; j++) {
      const c1 = cityArray[i];
      const c2 = cityArray[j];
      svg.appendChild(createElementNS('line', {
        x1: c1.coordinates.x, y1: c1.coordinates.y,
        x2: c2.coordinates.x, y2: c2.coordinates.y,
        stroke: '#D4C8DC', 'stroke-width': 2, 'stroke-dasharray': '8,4', opacity: 0.5
      }));
    }
  }

  // Draw local connections (hub to mesh PVZs)
  for (const city of cityArray) {
    const hub = pvzs.get(city.hubId);
    if (!hub) continue;

    for (const meshPvzId of city.meshPvzs) {
      const meshPvz = pvzs.get(meshPvzId);
      if (!meshPvz) continue;

      svg.appendChild(createElementNS('line', {
        x1: hub.coordinates.x, y1: hub.coordinates.y,
        x2: meshPvz.coordinates.x, y2: meshPvz.coordinates.y,
        stroke: '#CB11AB', 'stroke-width': 2, opacity: 0.6
      }));
    }
  }

  // Highlighted route
  if (highlightedRoute) {
    // Draw route path
  }

  // Draw PVZ nodes
  for (const pvz of pvzs.values()) {
    const isHub = pvz.type === 'hub';
    const isMesh = pvz.type === 'mesh';
    const isHighlighted = pvz.id === highlightedPvz;

    const radius = isHub ? 16 : 12;
    const fill = isHub ? '#5421A8' : (isMesh ? '#CB11AB' : '#7D7088');
    const stroke = isHighlighted ? '#10B981' : '#FFFFFF';
    const strokeWidth = isHighlighted ? 3 : 2;

    const circle = createElementNS('circle', {
      cx: pvz.coordinates.x,
      cy: pvz.coordinates.y,
      r: radius,
      fill,
      stroke,
      'stroke-width': strokeWidth,
      class: 'pvz-node',
      'data-pvz-id': pvz.id,
      'data-city': pvz.cityId,
      'data-type': pvz.type
    });
    svg.appendChild(circle);

    // Label
    const text = createElementNS('text', {
      x: pvz.coordinates.x,
      y: pvz.coordinates.y + radius + 14,
      'text-anchor': 'middle',
      'font-size': '10',
      'font-family': 'Inter, sans-serif',
      fill: '#201A29',
      class: 'pvz-label'
    }, pvz.name);
    svg.appendChild(text);

    // Capacity indicator for mesh PVZs
    if (isMesh) {
      const load = pvz.occupiedCapacity / pvz.capacity || 0;
      const indicatorRadius = radius + 6;
      const circumference = 2 * Math.PI * indicatorRadius;
      const offset = circumference * (1 - load);

      svg.appendChild(createElementNS('circle', {
        cx: pvz.coordinates.x,
        cy: pvz.coordinates.y,
        r: indicatorRadius,
        fill: 'none',
        stroke: '#E8E0ED',
        'stroke-width': 3
      }));

      svg.appendChild(createElementNS('circle', {
        cx: pvz.coordinates.x,
        cy: pvz.coordinates.y,
        r: indicatorRadius,
        fill: 'none',
        stroke: load > 0.8 ? '#EF4444' : (load > 0.5 ? '#F59E0B' : '#10B981'),
        'stroke-width': 3,
        'stroke-dasharray': circumference,
        'stroke-dashoffset': offset,
        transform: `rotate(-90 ${pvz.coordinates.x} ${pvz.coordinates.y})`,
        class: 'capacity-indicator'
      }));
    }
  }

  // Legend
  const legend = createElementNS('g', { transform: `translate(20, 20)` });
  const legendItems = [
    { label: 'Хаб', color: '#5421A8', shape: 'circle', size: 12 },
    { label: 'Mesh-ПВЗ', color: '#CB11AB', shape: 'circle', size: 10 },
    { label: 'Обычное ПВЗ', color: '#7D7088', shape: 'circle', size: 10 },
    { label: 'Магистраль', color: '#D4C8DC', shape: 'line', dash: '8,4' },
    { label: 'Локальная связь', color: '#CB11AB', shape: 'line' }
  ];

  legendItems.forEach((item, i) => {
    const y = i * 22;
    if (item.shape === 'circle') {
      legend.appendChild(createElementNS('circle', { cx: 10, cy: y + 8, r: item.size / 2, fill: item.color }));
    } else {
      legend.appendChild(createElementNS('line', {
        x1: 4, y1: y + 8, x2: 20, y2: y + 8,
        stroke: item.color, 'stroke-width': 2,
        'stroke-dasharray': item.dash || 'none'
      }));
    }
    legend.appendChild(createElementNS('text', {
      x: 26, y: y + 12,
      'font-size': '11',
      'font-family': 'Inter, sans-serif',
      fill: '#4A3F55'
    }, item.label));
  });
  svg.appendChild(legend);

  return svg;
}

function createElementNS(tag, attrs, textContent) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs || {}).forEach(([key, value]) => el.setAttribute(key, value));
  if (textContent) el.textContent = textContent;
  return el;
}

// ============================================
// DEMO SCENARIO PANEL
// ============================================

export function createDemoPanel(scenarios, onRun) {
  return createElement('div', { class: 'card' }, [
    createElement('div', { class: 'card-header' }, [
      createElement('h3', { class: 'font-semibold text-primary flex items-center gap-2' }, [
        createElement('span', { innerHTML: svgIcon('play', 18) }),
        'Демонстрация для жюри'
      ])
    ]),
    createElement('div', { class: 'card-body' }, [
      createElement('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3' }, scenarios.map(s =>
        createElement('button', {
          class: 'btn btn-secondary btn-block p-4 text-left',
          onclick: () => onRun(s.id)
        }, [
          createElement('div', { class: 'font-semibold text-primary' }, s.name),
          createElement('div', { class: 'text-sm text-tertiary mt-1' }, s.description)
        ])
      ))
    ])
  ]);
}

// ============================================
// TARIFF EDITOR
// ============================================

export function createTariffEditor(tariffs, onChange) {
  const sections = [
    {
      title: 'Экономика рейса',
      fields: [
        { key: 'fixedTripCost', label: 'Фиксированная стоимость рейса', unit: 'коп', step: 1000 },
        { key: 'variablePerParcel', label: 'Переменные расходы на посылку', unit: 'коп', step: 100 },
        { key: 'extraStopCost', label: 'Дополнительная остановка', unit: 'коп', step: 1000 },
        { key: 'courierWaitPerMin', label: 'Простой курьера (за минуту)', unit: 'коп', step: 100 }
      ]
    },
    {
      title: 'Операции ПВЗ',
      fields: [
        { key: 'receiveFee', label: 'Приёмка', unit: 'коп', step: 100 },
        { key: 'storagePerDay', label: 'Хранение в день', unit: 'коп', step: 100 },
        { key: 'packFee', label: 'Сборка', unit: 'коп', step: 100 },
        { key: 'transferFee', label: 'Передача', unit: 'коп', step: 100 },
        { key: 'partnerOpsCost', label: 'Операционные затраты ПВЗ', unit: 'коп', step: 100 },
        { key: 'partnerShelfPerDay', label: 'Затраты полки в день', unit: 'коп', step: 10 }
      ]
    },
    {
      title: 'Возвраты и ущерб',
      fields: [
        { key: 'meshReturnCost', label: 'Возврат через Mesh', unit: 'коп', step: 1000 },
        { key: 'hubReturnCost', label: 'Возврат через хаб', unit: 'коп', step: 1000 },
        { key: 'damageCost', label: 'Ущерб при повреждении', unit: 'коп', step: 1000 }
      ]
    },
    {
      title: 'Классическая логистика (на заказ)',
      fields: [
        { key: 'classicTransport', label: 'Перевозка', unit: 'коп', step: 100 },
        { key: 'classicStorage', label: 'Хранение', unit: 'коп', step: 100 },
        { key: 'classicSorting', label: 'Сортировка', unit: 'коп', step: 100 },
        { key: 'classicLastMile', label: 'Локальная доставка', unit: 'коп', step: 100 },
        { key: 'classicPVZ', label: 'ПВЗ', unit: 'коп', step: 100 },
        { key: 'classicReturns', label: 'Возвраты и потери', unit: 'коп', step: 100 },
        { key: 'classicIT', label: 'IT', unit: 'коп', step: 100 }
      ]
    },
    {
      title: 'Mesh логистика (на заказ, без рейса)',
      fields: [
        { key: 'meshPlacement', label: 'Размещение', unit: 'коп', step: 100 },
        { key: 'meshStorage', label: 'Хранение', unit: 'коп', step: 100 },
        { key: 'meshSorting', label: 'Сортировка', unit: 'коп', step: 100 },
        { key: 'meshLastMile', label: 'Локальная доставка', unit: 'коп', step: 100 },
        { key: 'meshPVZ', label: 'ПВЗ', unit: 'коп', step: 100 },
        { key: 'meshReturns', label: 'Возвраты', unit: 'коп', step: 100 },
        { key: 'meshIT', label: 'IT', unit: 'коп', step: 100 }
      ]
    },
    {
      title: 'Лимиты и пороги',
      fields: [
        { key: 'maxStorageDays', label: 'Макс. дней хранения', unit: 'дней', step: 1 },
        { key: 'freeStorageDays', label: 'Бесплатных дней', unit: 'дней', step: 1 },
        { key: 'progressiveStorageMultiplier', label: 'Множитель после бесплатного', unit: '×', step: 0.1 },
        { key: 'pvzCapacity', label: 'Вместимость ПВЗ', unit: 'мест', step: 1 },
        { key: 'vehicleCapacity', label: 'Вместимость транспорта', unit: 'мест', step: 1 },
        { key: 'operationalSlots', label: 'Операционные слоты', unit: 'шт', step: 1 },
        { key: 'meshHours', label: 'Время Mesh-доставки', unit: 'ч', step: 1 },
        { key: 'hubHours', label: 'Время хаб-доставки', unit: 'ч', step: 1 },
        { key: 'slaHours', label: 'SLA покупателю', unit: 'ч', step: 1 }
      ]
    }
  ];

  return createElement('div', { class: 'card' }, [
    createElement('div', { class: 'card-header flex justify-between' }, [
      createElement('h3', { class: 'font-semibold text-primary' }, 'Редактор тарифов'),
      createElement('button', { class: 'btn btn-ghost btn-sm', onclick: () => onChange('reset') }, 'Сбросить к умолчанию')
    ]),
    createElement('div', { class: 'card-body' }, sections.map(section =>
      createElement('div', { class: 'mb-6' }, [
        createElement('h4', { class: 'font-medium text-secondary mb-3 pb-2 border-b' }, section.title),
        createElement('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' }, section.fields.map(field =>
          createElement('div', { class: 'form-group' }, [
            createElement('label', { class: 'form-label' }, field.label),
            createElement('input', {
              type: 'number',
              class: 'form-input',
              value: tariffs[field.key],
              step: field.step,
              min: 0,
              onchange: (e) => onChange('update', field.key, parseFloat(e.target.value) || 0)
            }),
            createElement('span', { class: 'form-hint' }, field.unit)
          ])
        ))
      ])
    ))
  ]);
}

// ============================================
// EXPORTS
// ============================================

export { svgIcon, createElement, money, formatTime, generateId };