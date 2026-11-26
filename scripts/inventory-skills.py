from pathlib import Path
import hashlib,json,urllib.request
roots=[Path(r'C:\Users\Павел\.agents\skills'),Path(r'C:\Users\Павел\.codex\skills'),Path(r'C:\Users\Павел\.codex\plugins\cache'),Path(r'C:\Sites\RWB-Mesh\.agents')]
rows=[]
for root in roots:
 if root.exists():
  for p in root.rglob('SKILL.md'):
   rows.append({'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
Path('evidence/skills-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('Installed SKILL.md files:',len(rows))
checks=[('coreyhaines31/marketingskills','copywriting',Path(r'C:\Users\Павел\.agents\skills\copywriting\SKILL.md')),
 ('alonw0/web-asset-generator','web-asset-generator',Path(r'C:\Users\Павел\.agents\skills\web-asset-generator\SKILL.md')),
 ('wondelai/skills','jobs-to-be-done',Path(r'C:\Users\Павел\.agents\skills\jobs-to-be-done\SKILL.md')),
 ('Weizhena/Deep-Research-skills','research-deep',Path(r'C:\Users\Павел\.codex\skills\research-deep\SKILL.md'))]
results=[];out=Path('evidence/upstream-skills');out.mkdir(exist_ok=True)
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'WB-Mesh-source-audit'});return urllib.request.urlopen(req,timeout=20).read()
for repo,name,local in checks:
 result={'repository':repo,'local_path':str(local)}
 try:
  info=json.loads(fetch(f'https://api.github.com/repos/{repo}'));branch=info['default_branch']
  tree=json.loads(fetch(f'https://api.github.com/repos/{repo}/git/trees/{branch}?recursive=1'))
  matches=[i['path'] for i in tree['tree'] if i['path'].endswith(name+'/SKILL.md')]
  if not matches:raise ValueError('Target component not found in current tree')
  url=f'https://raw.githubusercontent.com/{repo}/{branch}/{matches[0]}'
  content=fetch(url);(out/(name+'.md')).write_bytes(content)
  result.update(url=url,upstream_sha256=hashlib.sha256(content).hexdigest(),local_sha256=hashlib.sha256(local.read_bytes()).hexdigest(),status='downloaded')
  result['byte_identical']=result['upstream_sha256']==result['local_sha256']
 except Exception as e:result.update(status='unverified',error=str(e))
 results.append(result);print(repo,result['status'],result.get('byte_identical',''))
Path('evidence/skill-repository-check.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
