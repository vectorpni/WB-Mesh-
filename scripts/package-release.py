from pathlib import Path
import zipfile,json,hashlib,datetime,sys
root=Path(__file__).resolve().parents[1]
out=root/'deliverables/WB-Mesh-V8-Vector-PNI.zip'
excluded={'.git','node_modules','poppler','__pycache__','Checkpoint-1-Final','Checkpoint-1-WB-Mesh'}
files=[]
for p in root.rglob('*'):
 if not p.is_file():continue
 rel=p.relative_to(root)
 if any(x in excluded for x in rel.parts) or p.suffix in {'.zip','.log','.pyc'}:continue
 if len(rel.parts)==1 and p.suffix=='.png' and p.name.startswith('test-'):continue
 files.append(p)
manifest={'created':datetime.datetime.now().astimezone().isoformat(),'excluded':sorted(excluded),
 'note':'Legacy source files are preserved. Old binary ZIPs, Poppler runtime, node_modules and root legacy test PNGs are omitted; final screenshots and input source copies are included.',
 'files':[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files if p.name!='RELEASE-MANIFEST.json']}
mp=root/'RELEASE-MANIFEST.json';mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
if mp not in files:files.append(mp)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,p.relative_to(root).as_posix())
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 for r in manifest['files']:assert hashlib.sha256(z.read(r['path'])).hexdigest()==r['sha256']
 if '--extract-check' in sys.argv:
  target=Path(r'C:\Sites\WB-Mesh-release-check-20261126')
  target.mkdir(exist_ok=True)
  for name in z.namelist():
   dest=(target/name).resolve();assert target.resolve() in dest.parents,'Unsafe ZIP member'
  z.extractall(target)
print(json.dumps({'archive':str(out),'files':len(files),'bytes':out.stat().st_size,'crc':'pass','manifestHashes':'pass'},ensure_ascii=False))
