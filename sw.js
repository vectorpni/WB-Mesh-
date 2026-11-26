const CACHE='wb-mesh-v8-pages-1';
const FILES=["/", "/index.html", "/tariffs.yaml", "/src/core/app-state.js", "/src/core/cost-engine.js", "/src/core/demo-dataset.js", "/src/core/demo-engine.js", "/src/core/forecast-engine.js", "/src/core/inventory-engine.js", "/src/core/mcs-engine.js", "/src/core/operation-policy.js", "/src/core/order-operations.js", "/src/core/planning-engine.js", "/src/core/route-engine.js", "/src/core/state-validation.js", "/src/core/stock-audit.js", "/src/core/types.js", "/src/core/withdrawal-engine.js", "/src/ui/components.js", "/src/ui/design-system.css", "/src/ui/economics-view.js", "/src/ui/main.js", "/src/ui/network-view.js", "/src/ui/planning-view.js", "/src/ui/v8.css", "/src/ui/view-utils.js", "/src/ui/workspace-view.js", "/assets/benchmark-summary.json", "/assets/brand-mark.png", "/assets/favicon.svg", "/assets/mesh-presentation.png", "/assets/fonts/GolosText.ttf", "/assets/icons/favicon-16x16.png", "/assets/icons/favicon-32x32.png", "/assets/icons/favicon-96x96.png", "/assets/icons/favicon.ico"].map(path=>new URL(`.${path}`,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('wb-mesh-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
  return response;
 }).catch(()=>caches.match(event.request).then(response=>response||Promise.reject(new Error('Ресурс недоступен автономно')))));
});
