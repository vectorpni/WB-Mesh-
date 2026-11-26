const {chromium,firefox,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sizes=[[1920,1080],[1536,864],[1366,768],[1280,720],[390,844]];
const tabs=['dashboard','pvz','seller','mcs','economics','demo','settings'];
const scenarios={city_order:'M2',intercity_order:'C2',return_flow:'M1',route_failure:'blocked',long_storage:'C1'};
fs.mkdirSync('evidence/browser',{recursive:true});
const results=[];
async function navigate(page,tab){
 if(page.viewportSize().width<1100)await page.locator('#sidebarToggle').click();
 await page.locator(`.sidebar-link[data-tab="${tab}"]`).click();
 await page.locator(`#panel-${tab}.active`).waitFor();
 await page.waitForTimeout(80);
}
(async()=>{
 for(const [name,engine]of Object.entries({firefox,chromium,webkit})){
  let browser;
  try{browser=await engine.launch({headless:true});}catch(e){results.push({browser:name,status:'unavailable',reason:e.message.split('\n')[0]});continue;}
  const row={browser:name,status:'pass',errors:[],layouts:[],scenarios:[],externalRequests:[]};
  try{
   const context=await browser.newContext({viewport:{width:1536,height:864}}),p=await context.newPage();
   p.on('pageerror',e=>row.errors.push(e.message));
   p.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});
   p.on('request',r=>{if(!r.url().startsWith('http://localhost:3000')&&!r.url().startsWith('data:'))row.externalRequests.push(r.url());});
   await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
   for(const [width,height]of (name==='firefox'?sizes:[[1536,864]])){
    await p.setViewportSize({width,height});
    for(const tab of tabs){
     await navigate(p,tab);
     const panel=p.locator(`#panel-${tab}`),text=await panel.innerText();
     assert.equal(await p.locator('.tab-panel:visible').count(),1,'Only one section visible');
     assert.ok(!/\b(?:NaN|undefined|null)\b/.test(text),`${name}/${tab}: invalid value`);
     const layout=await p.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));
     assert.ok(layout.document<=layout.width+2,`${name}/${width}/${tab} page overflow ${layout.document}`);
     const screenshot=`evidence/browser/${name}-${width}x${height}-${tab}.png`;
     await p.screenshot({path:screenshot,fullPage:true});row.layouts.push({width,height,tab,screenshot,status:'pass'});
    }
   }
   await p.setViewportSize({width:1536,height:864});await navigate(p,'economics');
   assert.ok((await p.locator('#simulationResults').innerText()).includes('92,96'));
   await p.locator('#simBatch').fill('10');await p.locator('#simBatch').dispatchEvent('input');assert.ok((await p.locator('#simDecision').innerText()).includes('C1'));
   await p.locator('#simBatch').fill('40');await p.locator('#simBatch').dispatchEvent('input');assert.ok((await p.locator('#simDecision').innerText()).includes('M2'));
   await navigate(p,'demo');
   for(const [scenario,route]of Object.entries(scenarios)){
    await p.locator(`#panel-demo [data-scenario="${scenario}"]`).click();
    await p.waitForTimeout(100);
    const demo=await p.evaluate(()=>window.appState.getState().lastDemo);
    assert.equal(demo.route,route);assert.ok(demo.passed);row.scenarios.push({scenario,route,status:'pass'});
   }
   const orderCount=await p.evaluate(()=>window.appState.state.orders.size);await p.reload({waitUntil:'networkidle'});
   assert.equal(await p.evaluate(()=>window.appState.state.orders.size),orderCount,'Reload preserves orders');
   await context.setOffline(true);await navigate(p,'pvz');await navigate(p,'seller');await navigate(p,'economics');
   assert.ok((await p.locator('#simulationResults').innerText()).includes('92,96'),'Offline calculations work');
   await context.setOffline(false);
   assert.equal(row.errors.length,0,'Browser errors');assert.equal(row.externalRequests.length,0,'External dependency');
   row.persistence='pass';row.offline='pass';
  }catch(e){row.status='fail';row.failure=e.stack;}finally{await browser.close();}
  results.push(row);console.log(name,row.status,row.layouts.length,'layouts',row.scenarios.length,'scenarios',row.failure||'');
 }
 fs.writeFileSync('evidence/browser/results.json',JSON.stringify({time:new Date().toISOString(),results},null,2));
 const passed=results.filter(r=>r.status==='pass').map(r=>r.browser);
 assert.ok(passed.includes('firefox'),'Firefox acceptance');assert.ok(passed.includes('chromium'),'Chromium acceptance');
 assert.ok(!results.some(r=>r.status==='fail'),'Available browser failed');
 console.log('Acceptance PASS:',passed.join(', '));
})().catch(e=>{console.error(e);process.exit(1);});
