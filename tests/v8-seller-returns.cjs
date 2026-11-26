const {firefox}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await firefox.launch();try{
 const p=await b.newPage({viewport:{width:1536,height:864}});
 await p.goto('http://localhost:3000',{waitUntil:'networkidle'});
 await p.locator('.sidebar-link[data-tab="demo"]').click();
 await p.locator('#panel-demo [data-scenario="city_order"]').click();
 await p.locator('#toastContainer .toast-close').evaluateAll(es=>es.forEach(e=>e.click()));
 await p.screenshot({path:'deliverables/mvp-screen.png'});
 await p.locator('.sidebar-link[data-tab="seller"]').click();
 const result=await p.evaluate(()=>{
  const m=window.appState,prod=m.state.products.get('prod-1');
  m.state.salesHistory.set(prod.id,Array(60).fill(100));
  m.mcs.inventoryManager.processReturn('pvz-perm-plus','qa-disposition',2,'customer',prod.id);
  const r=m.resolveReturn('return-qa-disposition','resell',{fit:true});
  return {success:r.success,cost:m.state.ledger.find(l=>l.id==='return-qa-disposition:disposition')?.sellerAmount};
 });
 assert.ok(result.success);assert.equal(result.cost,-1000);
 await p.waitForTimeout(100);
 assert.ok((await p.locator('#panel-seller').innerText()).includes('возвратных операций'));
 console.log('Seller return disposition and UI PASS:',JSON.stringify(result));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
