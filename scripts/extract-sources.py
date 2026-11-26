"""Read-only OOXML source extraction; originals are never modified."""
from pathlib import Path
import zipfile, xml.etree.ElementTree as ET, re, json

root = Path(r'C:\Users\Павел\Downloads\Telegram Desktop')
out = Path('evidence/sources')
out.mkdir(parents=True, exist_ok=True)
names = ['ТЗ_сайт_MVP_WB_Mesh_хакатон,_ТОП_ИИ_Старт_дополненное.docx',
         'Описание_кейса_Mesh_доставка_RWB_ПГТУ.docx',
         'WB_Mesh_otchet_исправленный.docx', 'План выступления (2).docx',
         'WB Mesh - редактируемая (2).pptx']
for name in names:
    path = root / name
    with zipfile.ZipFile(path) as z:
        if path.suffix == '.docx':
            xml = ET.fromstring(z.read('word/document.xml'))
            lines = [''.join(p.itertext()) for p in []]
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            lines = [''.join(p.itertext()) for p in []]
            lines = [''.join(t.text or '' for t in p.findall('.//w:t', ns)) for p in xml.findall('.//w:p', ns)]
        else:
            slides = sorted((n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)), key=lambda s: int(re.search(r'slide(\d+)', s)[1]))
            lines=[]
            for s in slides:
                lines.append('\n## ' + s)
                xml = ET.fromstring(z.read(s))
                lines += [t.text or '' for t in xml.iter() if t.tag.endswith('}t')]
            theme = ET.fromstring(z.read('ppt/theme/theme1.xml'))
            lines.append('\n## Theme')
            lines.append(ET.tostring(theme, encoding='unicode'))
        (out / (path.stem + '.txt')).write_text('\n'.join(lines), encoding='utf-8')
    print(name, '->', len(lines), 'paragraphs/runs')
