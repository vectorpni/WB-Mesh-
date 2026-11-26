from pathlib import Path
import json, math
from openpyxl import load_workbook
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[1]
model=json.loads((root/'deliverables/financial-model.json').read_text())
path=root/'deliverables/WB-Mesh-V8-Financial-Model.xlsx'
formulas=load_workbook(path,data_only=False);values=load_workbook(path,data_only=True)
errors=[f'{s.title}!{c.coordinate}: {c.value}' for s in values for row in s for c in row if c.data_type=='e']
checks={
 'classic':values['Себестоимость']['B9'].value==100,
 'mesh':values['Себестоимость']['C9'].value==92.96,
 'pvz':values['Четыре стороны']['C7'].value==6.5,
 'forecast_wape':math.isclose(values['Прогноз']['B9'].value,model['forecast']['seasonalNaive']['wape']),
 'npv':abs(values['Инвестиции']['B38'].value-model['investment']['npv']/100)<.02,
 'no_errors':not errors}
result={'checks':checks,'errors':errors,'formula_count':sum(c.data_type=='f' for s in formulas for row in s for c in row)}
(root/'evidence/workbook-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(result);assert all(checks.values())
out=root/'evidence/visual-review';out.mkdir(exist_ok=True)
for prefix in [f'{b}-{w}x{h}' for b in ['firefox','chromium','edge','chrome'] for w,h in [(1920,1080),(1536,864),(1366,768),(1280,720),(390,844)]]:
 files=sorted((root/'evidence/browser').glob(prefix+'-*.png'))
 if not files:continue
 thumbs=[]
 for p in files:
  img=Image.open(p).convert('RGB');img.thumbnail((420,1450))
  tile=Image.new('RGB',(440,1480),'#e8e0ef');tile.paste(img,((440-img.width)//2,30));ImageDraw.Draw(tile).text((8,8),p.stem,fill='black');thumbs.append(tile)
 sheet=Image.new('RGB',(440*len(thumbs),1480),'white')
 for i,t in enumerate(thumbs):sheet.paste(t,(440*i,0))
 sheet.save(out/(prefix+'.jpg'),quality=85)
