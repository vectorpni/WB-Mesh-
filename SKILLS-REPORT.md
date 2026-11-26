# Реальное применение скиллов

Инвентаризация:116 файлов SKILL.md в глобальных .agents/.codex, кэше плагинов и доступной локальной .agents. Полные пути, размер и SHA256 — evidence/skills-inventory.json. Четыре указанных репозитория проверены через GitHub, реальные upstream SKILL.md сохранены в evidence/upstream-skills; evidence/skill-repository-check.json. Локальные файлы не идентичны upstream побайтно; обновление/идентичность не имитировались.

| Скилл | Применение и доказательство |
|---|---|
|frontend-design|7 разных композиций, WB палитра, локальный GolosText, SVG сеть, responsive; src/ui/v8.css и скриншоты|
|web-design-guidelines|Реальные локальные правила и references/command.md; focus/skip-link/labels/reduced-motion, проверка overflow и шапки|
|web-asset-generator|Запущен настоящий generate_favicons.py из установленного скилла; локальные favicon/PWA иконки и валидация форматов|
|webapp-testing|Реальный PlaywrightFirefox/Chromium/Edge/Chrome, сценарии/состояние/офлайн/скриншоты|
|systematic-debugging|Воспроизведение дефектов до исправления:Map, reserve, import, FIFO, SLA, DOMready, header|
|test-driven-development|Регрессионные тесты сначала падали, затем исправления; v8-critical-review.test.mjs и остальные|
|code-review-and-quality|Независимые read-only ревизии ядра/источников, diffcheck, реальная mutation-проверка guard|
|verification-before-completion|Команды и фактические результаты до утверждений/коммитов; evidence/unit-tests.txt и JSON|
|research/research-deep|Реальный outline/fields, два независимых агента, JSON результаты и валидатор 5/5; research-v8/|
|jobs-to-be-done|Функциональные задачи ПВЗ/продавца/WB/покупателя определяют действия и 4guards; вымышленных интервью нет|
|Marketing Skills: product-marketing/copywriting|Ясная ценность, девиз, ограничения доказательств; сценарные цифры не названы фактами рынка|
|xlsx|XLSX с формулами, источниками/цветами, фактический пересчёт Excel и проверка 651 формулы; LibreOffice скрипт несовместим с WindowsAF_UNIX|
|pptx|Чтение исходного OOXML, реальные PowerPointPDF/PNG всехслайдов; новый отдельный 8 слайдовыйдек, office/validate.py PASS|
|documents/pdf|Чтение входных DOCX/PDF; оригиналы не редактировались|

Python-pptx использован как доступный генератор нового дека: установка pptxgenjs через npm не прошла DNS. Скилл PPTX не выдаётся за использование отсутствующего пакета. Визуальная проверка выполнена реальным инструментом view_image; дефекты таблицы/плотного текста в новомдеке исправлены и повторно отрендерены. Отдельные человеческие эксперты не привлекались: аудит проводился программными проверками и двумя явно обозначенными агентами.
