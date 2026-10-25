import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
mkdirSync('artifacts/about-intro-bootstrap',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/hydrat|didn.t match/i.test(m.text()))errors.push(m.text());});
  // Model React stopping an early discrete event at the hydration boundary.
  // Window capture must already have processed the close before this happens.
  await page.addInitScript(()=>document.addEventListener('click',event=>{
   if(event.target.closest?.('#zg-about-intro-dialog [data-intro-dismiss]'))event.stopPropagation();
  },true));
  let release;let delivered=0;
  const hold=new Promise(resolve=>{release=resolve;});
  await page.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==new URL(base).origin)return route.abort();
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'UNAVAILABLE',user:null})});
   if(request.resourceType()==='script'){await hold;delivered++;}
   return route.continue();
  });
  // Use the global popup on the standalone guide so unrelated deferred chat
  // DOM initialization cannot contaminate this deliberately delayed hydration.
  await page.goto(`${base}/usage/`,{waitUntil:'commit'});
  await page.waitForFunction(()=>document.getElementById('zg-about-intro-dialog')?.open===true);
  assert.equal(delivered,0,'Introduction opens before external React/application modules arrive');
  const popup=page.locator('#zg-about-intro-dialog');
  const geometry=await popup.evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,overflow:r.left<0||r.right>innerWidth+1};});
  assert.ok(geometry.width>0);assert.equal(geometry.overflow,false);
  // Playwright's default caret hiding writes an empty style attribute to
  // inputs, which would itself cause a mismatch in this unhydrated document.
  const inputStyle=await popup.locator('input').getAttribute('style');
  await page.screenshot({path:`artifacts/about-intro-bootstrap/before-hydration-${width}.png`,caret:'initial'});
  assert.equal(await popup.locator('input').getAttribute('style'),inputStyle,'Evidence capture must not mutate unhydrated markup');
  await popup.getByRole('checkbox',{name:'7일 동안 보지 않기'}).check();
  await popup.getByRole('button',{name:'닫기',exact:true}).click();
  assert.equal(await popup.evaluate(el=>el.open),false);
  const preference=await page.evaluate(()=>({session:sessionStorage.getItem('zgmini-about-intro-dismissed-r1'),until:Number(localStorage.getItem('zgmini-about-intro-hidden-until-r1'))}));
  assert.equal(preference.session,'1');assert.ok(preference.until>Date.now()+6*86400000);
  release();await page.waitForLoadState('networkidle');
  assert.equal(await popup.evaluate(el=>el.open),false,'Hydration must not reopen a dismissed introduction');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await popup.evaluate(el=>el.open),false,'Reload respects the same session');
  await page.evaluate(()=>sessionStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await popup.evaluate(el=>el.open),false,'Week preference survives a new session');
  await page.evaluate(()=>localStorage.setItem('zgmini-about-intro-hidden-until-r1',String(Date.now()-1000)));
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await popup.evaluate(el=>el.open),true,'Expired preference shows the introduction');
  await page.keyboard.press('Escape');await popup.waitFor({state:'hidden'});
  await page.evaluate(()=>{sessionStorage.clear();localStorage.clear();});
  await page.goto(`${base}/about/`,{waitUntil:'networkidle'});
  assert.equal(await popup.evaluate(el=>el.open),false,'Full introduction page is excluded');
  assert.deepEqual(errors,[]);
  console.log(`PASS introduction before hydration and existing controls ${width}px`);
  await context.close();
 }
}finally{await browser.close();}
