import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "WB Mesh Economics"

# Styles
header_font = Font(bold=True, size=11)
header_fill = PatternFill(start_color="4B0082", end_color="4B0082", fill_type="solid")
header_font_white = Font(bold=True, size=11, color="FFFFFF")
input_fill = PatternFill(start_color="D6E4F0", end_color="D6E4F0", fill_type="solid")
formula_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
result_fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)
center_align = Alignment(horizontal='center', wrap_text=True)
left_align = Alignment(horizontal='left', wrap_text=True)

# Column widths
col_widths = {1: 48, 2: 16, 3: 16, 4: 16, 5: 16, 6: 16, 7: 16, 8: 16, 9: 16, 10: 16, 11: 16, 12: 16, 13: 16, 14: 16, 15: 16, 16: 16}
for col, width in col_widths.items():
    ws.column_dimensions[get_column_letter(col)].width = width

# Title
ws.merge_cells('A1:P1')
ws['A1'] = "WB Mesh | Чекпоинт 1 — Экономическая модель"
ws['A1'].font = Font(bold=True, size=14, color="4B0082")
ws['A1'].alignment = Alignment(horizontal='center')

ws.merge_cells('A2:P2')
ws['A2'] = "Деньги в копейках. Голубой — ввод, зелёный — формула, жёлтый — результат. Базовый сценарий: город, 8 заказов."
ws['A2'].font = Font(italic=True, size=10, color="666666")
ws['A2'].alignment = Alignment(horizontal='center', wrap_text=True)

# Headers row 3
headers = [
    "Параметр или результат",
    "Город, 8", "Город, 4", "Граница, 5",
    "Остановка", "Две остановки", "Ожидание 2 ч", "2 стопа + 2 ч",
    "Авто на 6", "SLA нарушен", "Нет партии",
    "Москва → Владивосток", "Ожидание, ничья",
    "Нет места/слота", "Хранение 12 дней", "Возвраты 60%"
]

for col_idx, header in enumerate(headers, 1):
    cell = ws.cell(row=3, column=col_idx, value=header)
    cell.font = header_font_white
    cell.fill = header_fill
    cell.alignment = center_align
    cell.border = thin_border

# Data rows
data_rows = [
    ("Подтверждено заказов", 4, [8,4,5,8,8,8,8,8,8,8,0,1,5,8,8,8], 'input'),
    ("Вместимость авто, заказов", 5, [12,12,12,12,12,12,12,12,6,12,12,12,12,12,12,12], 'input'),
    ("Хранение, дней", 6, [3,3,3,3,3,3,3,3,3,3,3,3,3,3,12,3], 'input'),
    ("Вероятность возврата, %", 7, [10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,60], 'input'),
    ("Возврат через хаб, коп./случай", 8, [5000]*16, 'input'),
    ("Возврат через Mesh, коп./случай", 9, [10000]*16, 'input'),
    ("Хаб без ожидаемого возврата, коп.", 10, [14000]*16, 'input'),
    ("Локальные расходы без рейса и выплат, коп.", 11, [4400]*16, 'input'),
    ("Базовый рейс, коп.", 12, [24000]*16, 'input'),
    ("Дополнительных остановок", 13, [0,0,0,1,2,0,2,2,0,0,0,0,0,0,0,0], 'input'),
    ("Расход на остановку, коп.", 14, [6000]*16, 'input'),
    ("Дополнительное ожидание, ч", 15, [0,0,0,0,0,2,2,2,17,0,0,2,0,0,0,0], 'input'),
    ("Стоимость ожидания, коп./ч", 16, [1000]*16, 'input'),
    ("Технический минимум партии", 17, [2]*16, 'input'),
    ("Базовое время Mesh, ч", 18, [8]*16, 'input'),
    ("Обещание покупателю, ч", 19, [24]*16, 'input'),
    ("Время готовности через хаб, ч", 20, [24]*16, 'input'),
    ("Доступен локальный коридор, 1/0", 21, [1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1], 'input'),
    ("Склад, место, слот и тот же ПВЗ, 1/0", 22, [1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1], 'input'),
    ("Начисление за приёмку, коп.", 23, [600]*16, 'input'),
    ("Начисление за хранение, коп./день", 24, [500]*16, 'input'),
    ("Начисление за сборку, коп.", 25, [1200]*16, 'input'),
    ("Начисление за передачу, коп.", 26, [600]*16, 'input'),
    ("Полная ставка сотрудника, коп./ч", 27, [36000]*16, 'input'),
    ("Приёмка, секунд", 28, [30]*16, 'input'),
    ("Сборка, секунд", 29, [80]*16, 'input'),
    ("Передача, секунд", 30, [60]*16, 'input'),
    ("Площадь, м²", 31, [0.04]*16, 'input'),
    ("Альтернативная цена площади, коп./м²/день", 32, [2500]*16, 'input'),
    ("Расходники хранения, коп./день", 33, [100]*16, 'input'),
    ("Цена товара, коп.", 34, [100000]*16, 'input'),
    ("Себестоимость товара, коп.", 35, [30000]*16, 'input'),
    ("Комиссия, коп.", 36, [10000]*16, 'input'),
    ("Общий тариф продавца, коп.", 37, [2000]*16, 'input'),
    ("Доставка покупателя, коп.", 38, [100]*16, 'input'),
    ("Доп. резерв ущерба сверх возвратов, коп.", 39, [0]*16, 'input'),
]

for label, row_num, values, fill_type in data_rows:
    ws.cell(row=row_num, column=1, value=label).font = Font(size=10)
    ws.cell(row=row_num, column=1).alignment = left_align
    ws.cell(row=row_num, column=1).border = thin_border
    for col_idx, val in enumerate(values, 2):
        cell = ws.cell(row=row_num, column=col_idx, value=val)
        cell.alignment = center_align
        cell.border = thin_border
        cell.number_format = '#,##0'
        if fill_type == 'input':
            cell.fill = input_fill
        elif fill_type == 'formula':
            cell.fill = formula_fill
        elif fill_type == 'result':
            cell.fill = result_fill

# Formula rows
formula_rows = [
    (40, "Проверяемая партия рейса, шт.", '=MIN({col}4,{col}5)', 'formula'),
    (41, "Рейс с остановками и ожиданием, коп.", '=ROUND({col}12+{col}13*{col}14+{col}15*{col}16,0)', 'formula'),
    (42, "Выплаты ПВЗ, коп.", '={col}23+{col}24*{col}6+{col}25+{col}26', 'formula'),
    (43, "Оплата труда за приёмку, коп.", '=ROUND({col}27*{col}28/3600,0)', 'formula'),
    (44, "Оплата труда за сборку, коп.", '=ROUND({col}27*{col}29/3600,0)', 'formula'),
    (45, "Оплата труда за передачу, коп.", '=ROUND({col}27*{col}30/3600,0)', 'formula'),
    (46, "Стоимость площади, коп.", '=ROUND({col}31*{col}32*{col}6,0)', 'formula'),
    (47, "Расходники хранения, коп.", '={col}33*{col}6', 'formula'),
    (48, "Итого затраты ПВЗ, коп.", '={col}43+{col}44+{col}45+{col}46+{col}47', 'formula'),
    (49, "Прибыль ПВЗ до налогов, коп.", '={col}42-{col}48', 'formula'),
    (50, "Ожидаемая стоимость возврата хаб, коп.", '=ROUND({col}7*{col}8/100,0)', 'formula'),
    (51, "Ожидаемая стоимость возврата Mesh, коп.", '=ROUND({col}7*{col}9/100,0)', 'formula'),
    (52, "WB через хаб, коп.", '=IF({col}21=1,{col}10+{col}50,0)', 'formula'),
    (53, "WB Mesh без рейса, коп.", '={col}11+{col}42+{col}51+{col}39', 'formula'),
    (54, "WB Mesh с рейсом, коп.", '=IF(OR({col}21=0,{col}40=0),0,{col}53+ROUNDUP({col}41/{col}40,0))', 'formula'),
    (55, "Модельная разница WB, коп.", '=IF({col}54=0,0,{col}52-{col}54)', 'formula'),
    (56, "Экономический порог, заказов", '=IF(OR({col}21=0,{col}52<={col}53,AND({col}52-{col}53=1,{col}41>0)),0,MAX({col}17,ROUNDUP({col}41/MAX(1,{col}52-{col}53-1),0)))', 'formula'),
    (57, "Прибыль продавца в Mesh, коп.", '={col}34-{col}35-{col}36-{col}37', 'formula'),
    (58, "Прибыль продавца через хаб, коп.", '={col}34-{col}35-{col}36-{col}37', 'formula'),
    (59, "Оплата покупателя в обеих схемах, коп.", '={col}34+{col}38', 'formula'),
    (60, "Время Mesh с ожиданием и остановками, ч", '={col}18+{col}15+{col}13/2', 'formula'),
    (61, "1 Mesh · 2 хаб · 3 магистраль · 0 нет решения",
     '=IF({col}4=0,0,IF({col}21=0,3,IF(AND({col}22=1,{col}40>={col}56,{col}56>0,{col}60<={col}19,{col}60<={col}20,{col}49>=0,{col}57>={col}58),1,IF({col}20<={col}19,2,0))))', 'formula'),
    (62, "Маршрут", '=IF({col}61=1,"Mesh",IF({col}61=2,"Хаб",IF({col}61=3,"Магистраль","Нет назначения")))', 'formula'),
    (63, "Экономия выбранного рейса, коп.", '=IF({col}61=1,{col}55*{col}40,0)', 'formula'),
]

for row_num, label, formula_template, fill_type in formula_rows:
    ws.cell(row=row_num, column=1, value=label).font = Font(size=10)
    ws.cell(row=row_num, column=1).alignment = left_align
    ws.cell(row=row_num, column=1).border = thin_border
    for col_idx in range(2, 18):
        col_letter = get_column_letter(col_idx)
        formula = formula_template.replace('{col}', col_letter)
        cell = ws.cell(row=row_num, column=col_idx, value=formula)
        cell.alignment = center_align
        cell.border = thin_border
        cell.number_format = '#,##0'
        if fill_type == 'formula':
            cell.fill = formula_fill
        elif fill_type == 'result':
            cell.fill = result_fill

# Footer notes
footer_rows = [
    (65, "0 для цены локальной схемы означает, что сравнение неприменимо. Для межгорода ставки и ETA из городской модели не используются."),
    (66, "При вместимости меньше спроса сравнивается одна фактически загружаемая партия. Остальные заказы требуют отдельного назначения."),
    (67, "Ставка труда включает затраты работодателя. Прибыль ПВЗ операционная, до налога и CAPEX. Продавец — завершённая покупка."),
]
for row_num, text in footer_rows:
    ws.merge_cells(f'A{row_num}:P{row_num}')
    cell = ws.cell(row=row_num, column=1, value=text)
    cell.font = Font(italic=True, size=9, color="666666")
    cell.alignment = Alignment(wrap_text=True)

ws.freeze_panes = 'B4'

wb.save(r'C:\Sites\RWB-Mesh\Checkpoint-1-Final\WB-Mesh-Financial-Model.xlsx')
print("Saved successfully")