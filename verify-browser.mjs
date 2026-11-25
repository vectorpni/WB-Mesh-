import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire((process.env.MESH_PLAYWRIGHT_ROOT??'C:/Sites/MyWebsite')+'/package.json')('playwright');
const origin='http://127.0.0.1:4184';
const start=async()=>{
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4184'}});
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(x=>{throw Error('server exit '+x);})]);
 return child;
};
let server=await start(),browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext();
 const page=await context.newPage();page.setDefaultTimeout(5000);
 const errors=[], network=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!r.url().startsWith(origin+'/'))network.push(r.url());});
 const get=id=>page.locator('#'+id);
 const route=async expected=>assert.equal(await get('route').getAttribute('data-route'),expected);
 const click=id=>get(id).click();
 const preset=async key=>{await get('scenario').selectOption(key==='city'?'hub':'city');await get('scenario').selectOption(key);};
 const go=async n=>{for(let i=0;i<n;i++)await click('next');};
 await page.goto(origin);await route('mesh');
 for(const [batch,expected] of [['1','hub'],['4','hub'],['5','mesh'],['8','mesh'],['100','mesh']]){
   await get('batch').fill(batch);await click('reset');await route(expected);
 }
 for(const batch of ['0','-1','1.5','101','']){
   await get('batch').fill(batch);await click('reset');assert.equal(await get('error').isVisible(),true);
 }
 await preset('hub');await route('hub');
 await preset('city');
 await page.locator('details summary').first().click();
 await get('cancels').fill('50');await click('reset');await route('hub');
 await get('cancels').fill('0');await get('fallback').fill('1');await click('reset');await go(4);await click('fail');await route('blocked');
 await preset('city');await go(4);await click('cancel');assert.match(await get('stock').textContent(),/39,00/);
 await preset('city');await go(5);await click('damage');assert.equal(await get('next').isDisabled(),true);
 await preset('city');await context.setOffline(true);await go(7);
 await click('seller');assert.match(await get('finance').textContent(),/590/);
 await click('platform');assert.match(await get('finance').textContent(),/113/);
 await go(1);
 await context.setOffline(false);
 const exit=once(server,'exit');server.kill();await exit;server=await start();
 await page.reload();assert.equal(await get('next').isDisabled(),true);
 assert.match(await get('stock').textContent(),/213/);
 await page.evaluate(()=>localStorage.setItem('mesh-gate.order.v1','{"v":9}'));
 await page.reload();assert.equal(await get('error').isVisible(),true);await route('mesh');
 await preset('city');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'ultra-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:950});
 await page.screenshot({path:'ultra-desktop.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 console.log('PASS Edge: batch boundaries, invalid input, cancellation, damage, SLA fallback, 3 ledgers, offline, restart, corrupt storage, 390px. No page errors or external requests.');
}finally{await browser?.close();server.kill();}
