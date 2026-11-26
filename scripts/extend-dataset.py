from pathlib import Path
p=Path('src/core/app-state.js');s=p.read_text(encoding='utf-8');s="import {extendDemoDataset} from './demo-dataset.js';\n"+s
s=s.replace("    for (const p of pvzs.values()) { p.status", "    extendDemoDataset(cities,pvzs,products,sellers);\n\n    for (const p of pvzs.values()) { p.status",1)
s=s.replace('const productArray = Array.from(products.values());','const productArray = Array.from(products.values()).slice(0,4);',1)
s=s.replace("        const batchId = `batch-${product.id}-${generateId().slice(-6)}`;", "        if(quantity<=0)continue;\n        const batchId = `batch-${product.id}-${generateId().slice(-6)}`;")
p.write_text(s,encoding='utf-8')
p=Path('src/ui/network-view.js');s=p.read_text(encoding='utf-8');s=s.replace("const cities=[...state.cities.values()],positions=new Map();", "const cities=[...state.cities.values()],positions=new Map();\n const height=230+Math.ceil(Math.max(...cities.map(c=>[...state.pvzs.values()].filter(p=>p.cityId===c.id&&p.type!=='hub').length))/2)*97;")
s=s.replace('return `<svg class="v-network" viewBox="0 0 1030 400"','return `<div class="v-network-wrap"><svg class="v-network" viewBox="0 0 1030 ${height}"').replace('width="1030" height="400"','width="1030" height="${height}"').replace('${edges}${highlight}${nodes}</svg>`','${edges}${highlight}${nodes}</svg></div>`')
p.write_text(s,encoding='utf-8')
p=Path('src/core/planning-engine.js');s=p.read_text(encoding='utf-8').replace("const profiles={", "const profiles={")
# Extra categories have neutral profiles; base four retain the source's regional differences.
p.write_text(s,encoding='utf-8')
