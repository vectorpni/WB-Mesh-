"""Create a separate editable V8 draft; never edit the supplied presentation."""
from pathlib import Path
import json
from pptx import Presentation
from pptx.util import Inches,Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE,XL_LEGEND_POSITION

model=json.loads(Path('deliverables/financial-model.json').read_text(encoding='utf-8'))
prs=Presentation();prs.slide_width=Inches(13.333);prs.slide_height=Inches(7.5)
C={'ink':'201A29','muted':'7D7088','purple':'5421A8','pink':'CB11AB','bg':'F6F4F9','line':'E9E0EF','white':'FFFFFF'}
FONT='Golos Text'
def text(slide,value,x,y,w,h,size=18,color='ink',bold=False):
 box=slide.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h));tf=box.text_frame;tf.word_wrap=True
 tf.margin_left=tf.margin_right=0;tf.margin_top=tf.margin_bottom=0
 for i,line in enumerate(str(value).split('\n')):
  p=tf.paragraphs[0] if i==0 else tf.add_paragraph();p.text=line;p.font.name=FONT;p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=RGBColor.from_string(C.get(color,color));p.space_after=Pt(8)
 return box
def rect(slide,x,y,w,h,color='white'):
 shape=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,Inches(x),Inches(y),Inches(w),Inches(h));shape.fill.solid();shape.fill.fore_color.rgb=RGBColor.from_string(C.get(color,color));shape.line.fill.background();return shape
def slide(title,sub,notes):
 s=prs.slides.add_slide(prs.slide_layouts[6]);s.background.fill.solid();s.background.fill.fore_color.rgb=RGBColor.from_string(C['bg'])
 text(s,title,.65,.48,12,1,30,bold=True);text(s,sub,.67,1.4,12,.65,14,'muted')
 text(s,'Vector PNI · WB Mesh V8 · исследовательский MVP',.67,7.1,10,.25,10,'muted');text(s,str(len(prs.slides))+' / 8',12.1,7.1,.6,.25,10,'muted')
 s.notes_slide.notes_text_frame.text=notes;return s
def metric(s,label,value,desc,x,y,w=2.85):
 rect(s,x,y,w,1.5);text(s,label,x+.2,y+.17,w-.4,.4,13,'muted');text(s,value,x+.2,y+.55,w-.4,.6,30,'purple',True);text(s,desc,x+.2,y+1.13,w-.4,.3,10,'muted')

s=slide('WB Mesh','Модель распределённой логистики','0:00–0:20. Мы используем существующие ПВЗ и транспорт. Mesh дополняет хабы и включается только при выгоде и соблюдении условий четырёх участников. Все числа далее — модельные допущения, не финансовые данные Wildberries.')
s.shapes.add_picture('assets/mesh-presentation.png',0,0,width=prs.slide_width,height=prs.slide_height)
text(s,'Vector PNI  /  RWB × ПГТУ',.8,.55,8,.5,17,'pink',True);text(s,'WB MESH',.8,2,7,1.1,61,'ink',True)
text(s,'Ближе товар.\nСильнее сеть.',.85,3.35,6,1.45,34,'purple',True)
text(s,'Не строим новую сеть.\nРаскрываем потенциал существующей.',.85,5.15,6.2,1.1,20,'muted')
text(s,'Локальный MVP · номинация «ТОП ИИ СТАРТ»',.85,6.8,8,.3,12,'muted')

s=slide('Хаб остаётся основой. Mesh сокращает локальный путь','Четыре маршрута сравниваются по наличию товара, стоимости, сроку и ограничениям.','0:20–0:40. M1 — товар уже в ПВЗ покупателя. M2 — подтверждённый товар в другом ПВЗ города. C1 — город через хаб. C2 — межгород. Без локального товара MCS не превращает магистраль в городской маршрут.')
cards=[('M1','Товар в ПВЗ покупателя','Локальный остаток → выдача','~1 ч'),('M2','ПВЗ → ПВЗ города','Остаток → партия → рейс','~6 ч'),('C1','Через городской хаб','Хаб остаётся резервом','~40 ч'),('C2','Через магистраль','Хаб → хаб → ПВЗ','~60 ч')]
for i,(code,title,desc,eta)in enumerate(cards):
 x=.7+i*3.15;rect(s,x,2.45,2.95,3.4);text(s,code,x+.25,2.7,2.5,.7,37,'pink' if i<2 else 'purple',True);text(s,title,x+.25,3.6,2.45,1.0,20,bold=True);text(s,desc,x+.25,4.75,2.4,.55,13,'muted');text(s,eta,x+.25,5.3,2.4,.4,19,'purple',True)
text(s,'ПВЗ покупателя и цена доставки сохраняются. Недоступность всех вариантов — честный отказ, а не фиктивный успех.',.8,6.2,11.8,.6,17,'muted')

s=slide('MCS связывает спрос, товар и экономику','Решение вычисляется программно и остаётся в объяснимом журнале.','0:40–1:00. Прогноз на синтетической истории сравнивает пять статистических методов без утечки будущего. Остатки, резервы и карантин учитываются отдельно. План перемещений резервирует товар и будущую вместимость реального модельного рейса. Существующий рейс не считается бесплатным.')
modules=[('Network Graph','Узлы, города, связи и сбои'),('Demand Forecast','60 дней; 7 проверочных дней; WAPE / MAE / bias'),('Inventory Manager','P = A + R + Q + D; отдельно товары в пути'),('Consolidation & Route Optimizer','Кандидаты, партия, остановки, простой'),('Capacity Manager','Место в ПВЗ и вместимость транспорта'),('Cost Engine','Единый tariffs.yaml; деньги в копейках'),('Operations & Audit','События, FIFO, идемпотентность, сверка')]
for i,(name,desc)in enumerate(modules):
 row=i//2;col=i%2;x=.7+col*6.35;y=2.25+row*1.05;rect(s,x,y,6.1,.88);text(s,name,x+.2,y+.12,5.7,.3,17,'purple',True);text(s,desc,x+.2,y+.5,5.7,.25,12,'muted')

s=slide('100 ₽ → 92,96 ₽ на контрольном заказе','40 отправлений, 10 суток хранения, 1 остановка, без простоя, 12% возвратов.','1:00–1:25. Контроль ТЗ пересчитывается из семи статей. Рейс стоит 480 + 8×40 = 800 рублей, то есть 20 рублей на отправление. Возвраты и потери Mesh — 5,96. Экономия 7,04, в слайдах исходной концепции округлена до 7. Реальные бонусы и параметры SKU в рабочем сценарии показываются отдельно.')
metric(s,'Классика','100 ₽','Полная цепочка',.7,2.25,3.85);metric(s,'Mesh','92,96 ₽','Полная цепочка',4.75,2.25,3.85);metric(s,'Экономия','7,04 ₽','7,04% в контрольном сценарии',8.8,2.25,3.85)
table=s.shapes.add_table(8,4,Inches(.9),Inches(4.05),Inches(11.6),Inches(2.65)).table
labels=['Перевозка','Хранение','Сортировка','Локальная доставка','ПВЗ','Возвраты и потери','IT']
classic=[24,12,14,24,13,7,6];mesh=[22,13,10,20,14,5.96,8]
for i,row in enumerate([['Статья','Классика, ₽','Mesh, ₽','Изменение, ₽']]+[[labels[j],str(classic[j]),str(mesh[j]),f'{classic[j]-mesh[j]:.2f}']for j in range(7)]):
 for j,v in enumerate(row):
  cell=table.cell(i,j);cell.text=v.replace('.',',');cell.fill.solid();cell.fill.fore_color.rgb=RGBColor.from_string(C['purple']if i==0 else C['white'])
  for p in cell.text_frame.paragraphs:p.font.name=FONT;p.font.size=Pt(13);p.font.color.rgb=RGBColor.from_string(C['white']if i==0 else C['ink'])
table.columns[0].width=Inches(4.1)
for j in range(1,4):table.columns[j].width=Inches(2.5)

s=slide('Выгода проходит четыре проверки','Себестоимость, выручка, маржа и операционный результат имеют разные значения.','1:25–1:45. WB получает маржу логистики 16,04 вместо 12 рублей при тарифах 109 и 112. Дополнительный базовый результат ПВЗ 14 минус 7,50 = 6,50. Продавец экономит 3 рубля, покупатель сохраняет цену и выбранный ПВЗ. Это модельный пример, не чистая бухгалтерская прибыль.')
items=[('Wildberries','+4,04 ₽','Изменение маржи логистики:\n109 − 92,96 против 112 − 100'),('ПВЗ','6,50 ₽','Дополнительный результат:\n14 ₽ дохода − 7,50 ₽ расходов'),('Продавец','+3 ₽','Прибыль до/после:\nцена − закупка − комиссия − логистика'),('Покупатель','0 ₽','Доставка без Mesh-наценки;\nсрок не хуже обещанного')]
for i,(title,value,desc)in enumerate(items):
 x=.7+(i%2)*6.35;y=2.25+(i//2)*2.1;rect(s,x,y,6.1,1.85);text(s,title,x+.25,y+.18,2.9,.4,18,'purple',True);text(s,value,x+3.6,y+.15,2.2,.6,30,'pink',True);text(s,desc,x+.25,y+.82,5.55,.8,16,'muted')

s=slide('Границы выгоды видны на числах','Mesh не применяется ко всем заказам. Малый рейс, длительное хранение и задержки меняют решение.','1:45–2:05. Транспортное равенство — 30 отправлений, положительная экономия с 31. Порог полной цепочки отдельно — 26 в базовом расчёте, но допуск также проверяет ПВЗ, продавца и маржу WB. В симуляторе изменение параметра меняет экономику, маршрут и схему. IT уже внутри себестоимости: повторное вычитание недопустимо.')
chart_data=CategoryChartData();chart_data.categories=['10','20','30','40','60'];chart_data.add_series('Классика',[100]*5);chart_data.add_series('Mesh',[128.96,104.96,96.96,92.96,88.96])
chart=s.shapes.add_chart(XL_CHART_TYPE.LINE_MARKERS,Inches(.75),Inches(2.3),Inches(8),Inches(4.15),chart_data).chart
chart.has_legend=True;chart.legend.position=XL_LEGEND_POSITION.BOTTOM;chart.legend.include_in_layout=False
chart.value_axis.minimum_scale=80;chart.value_axis.maximum_scale=140;chart.value_axis.has_title=True;chart.value_axis.axis_title.text_frame.text='₽ / отправление';chart.category_axis.has_title=True;chart.category_axis.axis_title.text_frame.text='Отправлений в рейсе'
for series,color in zip(chart.series,['84738F','CB11AB']):series.format.line.color.rgb=RGBColor.from_string(color);series.format.line.width=Pt(2.5)
text(s,'30 / 31',9.2,2.6,3.3,.7,36,'purple',True);text(s,'равенство / плюс\nпо транспортному плечу',9.2,3.35,3.25,.9,18,'muted')
text(s,'26',9.2,4.6,3.3,.7,36,'pink',True);text(s,'порог полной цепочки\nпри базовых допущениях',9.2,5.35,3.25,.9,18,'muted')

s=slide('Пять сценариев — один работающий продукт','Остатки, маршрут, начисления и журнал меняются одной системой.','2:05–2:25. Дальше двухминутный живой показ: город, межгород, возврат, сбой, хранение. 53 результата тестов ядра и реальные браузерные проверки подтверждают определённые сценарии, а не промышленную готовность. Сканер, платежи и серверная синхронизация не подключены.')
if Path('deliverables/mvp-screen.png').exists():s.shapes.add_picture('deliverables/mvp-screen.png',Inches(.75),Inches(2.25),width=Inches(8.35))
for i,(title,desc)in enumerate([('Город','M2 и полная стоимость'),('Межгород','C2 без локального стока'),('Возврат','Карантин, проверка, сторно'),('Сбой','Нет фиктивной доставки'),('Хранение','Прогрессивный тариф')]):
 text(s,title,9.4,2.2+i*.83,3.1,.35,18,'purple',True);text(s,desc,9.4,2.58+i*.83,3.1,.35,13,'muted')

s=slide('Следующий шаг — измеримый пилот','Масштабировать после подтверждения экономического эффекта и качества операций.','2:25–3:00. Предлагаем пилот 10 ПВЗ, один хаб, 500–1000 SKU, 30 дней и контрольную группу. Цели: не менее 5% снижения затрат, не хуже SLA, 99,5% точности и 98% успешных перемещений. Это цели, не результаты. Промышленный этап: API, БД, роли, очередь, синхронизация и наблюдаемость. Ни одна цифра масштаба не выдаётся за прогноз Wildberries.')
for i,(label,value,desc)in enumerate([('Контур','10 ПВЗ','1 хаб · 500–1000 SKU'),('Длительность','30 дней','Контрольная группа'),('Цель затрат','≥5%','На сопоставимых заказах'),('Точность','99,5%','Целевой показатель')]):metric(s,label,value,desc,.7+i*3.15,2.3,2.95)
rect(s,.7,4.15,11.95,1.7);text(s,'Что уже проверено',1,4.4,5.5,.4,20,'purple',True);text(s,'Расчётное ядро, пять сценариев, повторные операции,\nбраузеры, локальные ресурсы и сохранение состояния.',1,4.95,10.9,.75,17,'muted')
text(s,'Граница MVP: синтетические данные и локальное выполнение.\nПромышленная синхронизация, многопользовательские транзакции и аппаратные интеграции — следующий этап.',.85,6,11.7,.7,15,'muted')
out=Path('deliverables/WB-Mesh-V8-final-draft.pptx');prs.save(out)
print('Created',out,'slides:',len(prs.slides))
