from pathlib import Path
p=Path('src/core/mcs-engine.js');s=p.read_text(encoding='utf-8')
for cls,nextcls,module in [('RouteOptimizer','InventoryManager','route-engine'),('InventoryManager','DemandForecast','inventory-engine')]:
    a=s.index('export class '+cls); b=s.index('export class '+nextcls,a)
    s=s[:a]+f"export {{ {cls} }} from './{module}.js';\nimport {{ {cls} }} from './{module}.js';\n\n"+s[b:]
p.write_text(s,encoding='utf-8')
