# WB Mesh V10 — система инженерных компетенций

Восстановлено 26.11.2026 из части 1/5 `WB_MESH_V10_TASK.md` и `docs/v10/PREPARATION.md`; ранее отдельного `ENGINEERING_SYSTEM` по имени в проекте не обнаружено. Таблица описывает **роли проверки для программных агентов и исполнителя**, не штат реальных людей и не доказательство, что все роли уже исполнялись. Подготовка разрешает чтение и проектирование; реализация требует частей 3–5 и отдельного `START WB MESH V10.0 ABSOLUTE MAXIMUM`.

| Компетенция | Вход / ответственность | Доступный скилл или средство | Критерий будущей приёмки |
|---|---|---|---|
| System Architect | ТЗ, презентация, V8/Core V2; единые границы данных | web-product-architect, Git | Один Backend/MCS и трассируемые решения |
| Senior Frontend Developer | Текущий JS UI; карта/навигация в общей системе | web-frontend-engineering, frontend-design | Семь разделов и GIS используют один контракт |
| Senior Backend Developer | Операции/валидация/API | web-backend-data, Node | Серверные инварианты и реальные ответы |
| UI/UX Designer | WB палитра, презентация, роли | web-ui-ux-design, web-design-guidelines | Доступный русский интерфейс, проверенный в браузере |
| QA Engineer | Требования/сценарии/дефекты | webapp-testing, web-browser-qa, Playwright | Воспроизведение и повторный тест каждого P0 |
| Security Engineer | Публичные API, данные, зависимости | web-security-review | Проверены доступ, ввод, секреты и XSS |
| Performance Engineer | Карта, API, OSRM, крупная сеть | web-performance-accessibility | Замеренные задержки и пределы нагрузки |
| DevOps Engineer | Запуск/конфиг/backup/rollback | web-release-devops | Повторяемый локальный и серверный запуск |
| Product Manager | Части 1–5, ТЗ/презентация, JTBD | web-product-architect, jobs-to-be-done | Матрица обязательных и расширенных функций |
| Marketing Specialist | Подтверждённые преимущества | product-marketing, copywriting | Формулировки без вымышленных фактов |
| Code Reviewer | Diff, контракты, инварианты | code-review-and-quality, systematic-debugging | Независимые замечания и подтверждённое исправление |
| Financial Analyst | ТЗ, XLSX, CostEngine | xlsx, verification-before-completion | 100/92,96 и 14/7,5/6,5, без двойного учёта |
| Logistics Engineer | Узлы, товар, SLA, рейсы | route/inventory modules, web-product-architect | Допустимость движения и запасов |
| AI & Data Science Engineer | Seed, спрос, validation | research-deep, forecast-engine | Нет утечки будущего; метрики воспроизводимы |
| GIS Engineer | WGS84, OSM, происхождение объектов | общие web/backend skills; специальный GIS skill не подтверждён | Валидные координаты, атрибуция, режимы маршрута |
| Navigation Engineer | OSRM Route/Trip/Table, манёвры | systematic-debugging, GIS план | Дорожная геометрия, ETA, отказ и M1=0 |
| Mathematical Optimization Engineer | Вместимость, окна, VRP/CVRP | test-driven-development, route modules | Эталонные задачи и проверенная допустимость |
| Database Engineer | CSV/JSON, события, резервы | web-backend-data, SQLite | Миграция/транзакции/восстановление |
| API Architect | Операции V8 и Core V2 | web-backend-data, web-product-architect | Единый OpenAPI и идемпотентность |
| Presentation Specialist | Утверждённый PPTX, показатели, сайт | pptx, xlsx, frontend-design | Каждое утверждение связано с проверенным экраном |

## Реальные исполнители и правило работы

На момент текущего снимка активен только основной программный агент `/root`. В предыдущей подготовке работали два read-only агента по контексту и скиллам; их фактические выводы сохранены в `docs/v10/PREPARATION.md`. Описание агента в конфигурации само по себе не означает запущенную сессию. При будущей делегации назначать непересекающиеся файлы и проверять результаты основным агентом. Имена компетенций не означают привлечённых людей.

## Инвентаризация возможностей на 26.11.2026

- `docs/v10/SKILLS_INVENTORY.json` и `.md`: сохранён полный машинный реестр **265 файлов SKILL.md**, включая версии/копии. В трёх локальных корнях `.agents/skills`, `.codex/skills`, `.claude/skills` ранее найдено 76+11+62=149 файлов без плагинного кэша. Машинное чтение не равно полному смысловому изучению или проверке запуска каждого навыка.
- Плагинные каталоги существуют: `.claude/plugins/{marketplaces,store}` и `.codex/plugins/{.plugin-appserver,.remote-plugin-install-staging,cache}`. В текущей сессии объявлены инструменты Spaces, Document Control, Plugin Management, Sites, Search Service и Pets. Объявленность не подтверждает подключение аккаунта или работоспособность каждой операции.
- По прямому запросу Plugin Management найден GitHub plugin: `ENABLED` в каталоге, `installed=false`. Его не подключали и не устанавливали. Для анализа локального проекта он не требуется.
- Локальные определения агентов: `.claude/agents/web-search-agent.md` и `.codex/agents/web-researcher.toml`, плюс по пять файлов модулей поиска в каждом каталоге. Это конфигурации, не активные исполнители.
- Локальный MCP-конфиг Codex содержит сервер `node_repl`; секция `node_repl.env` — его настройки, не отдельный сервер. Конфиденциальные значения не копировались. В `.claude` конфигурациях верхнеуровневые имена MCP-серверов не найдены; это не доказывает полного отсутствия иных настроек.
- В текущем снимке `ALL_TOOLS` доступно **107 описаний вложенных инструментов**; сохранённый `docs/v10/SESSION_TOOLS.json` содержит 153 описания предыдущей сессии. Часть инструментов объявлена отдельно (collaboration/CUA); численность и состав зависят от сессии. Фактическую работоспособность всех MCP не проверяли.
- CLI ранее проверены командами версии: Node, npm, Python, Git, uv, Codex CLI и Claude Code. Docker/gh/pwsh тогда не найдены через PATH. Python `sqlite3`, `openpyxl`, `pptx` обнаружены; Flask в текущем Python отсутствует. Никаких новых компонентов не установлено.

Подробные ограничения и версии — в `docs/v10/PREPARATION.md` и реестрах. Эти возможности используются только по конкретной необходимости и в разрешённых пределах.
