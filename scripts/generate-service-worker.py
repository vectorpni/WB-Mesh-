from pathlib import Path
import json
files=['/','/index.html','/tariffs.yaml']
files+=['/'+p.as_posix() for p in Path('src').rglob('*') if p.is_file() and p.suffix in ['.js','.css']]
files+=['/'+p.as_posix() for p in Path('assets').rglob('*') if p.is_file() and p.suffix in ['.svg','.png','.ico','.ttf','.json']]
code='''const CACHE='wb-mesh-v8-final-1';
const FILES=__FILES__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
  return response;
 }).catch(()=>caches.match(event.request).then(response=>response||Promise.reject(new Error('Ресурс недоступен автономно')))));
});
'''.replace('__FILES__',json.dumps(files))
Path('sw.js').write_text(code,encoding='utf-8')
print('Offline manifest:',len(files),'local files')
