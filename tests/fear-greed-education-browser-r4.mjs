import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
mkdirSync('artifacts/fear-greed-education',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[],educationRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('/styles/fear-greed-education-r1.css'))educationRequests.push(request.url());});
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'UNAVAILABLE',user:null})}));
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  assert.equal(educationRequests.length,0,'Dashboard must not request detail education CSS');
  await page.locator('[data-testid="investor-search-dashboard"]').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Investor market guide has no horizontal overflow');
  await page.screenshot({path:`artifacts/fear-greed-education/investor-dashboard-${width}.png`});
  await page.goto(base+'/fear-greed/usa/',{waitUntil:'networkidle',timeout:45000});
  assert.equal(educationRequests.length,1,'Detail requests its education CSS');
  const disclosure=page.locator('details.fg-r2-extended');
  await disclosure.locator('summary').click();
  const education=page.locator('.cnn-education-panel');
  await education.waitFor({state:'visible'});
  assert.equal(await education.locator('.cnn-education-card').count(),7);
  assert.equal(await education.locator('.cnn-component-overview-row').count(),7);
  const layout=await education.evaluate(el=>{
   const cards=[...el.querySelectorAll('.cnn-education-card')];
   const first=cards[0].getBoundingClientRect(),last=cards.at(-1).getBoundingClientRect();
   return {display:getComputedStyle(el.querySelector('.cnn-education-header')).display,
    border:getComputedStyle(el).borderTopWidth,first:first.width,last:last.width,
    overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(layout.display,'grid');
  assert.equal(layout.border,'1px');
  assert.equal(layout.overflow,false,'Detail must not overflow viewport');
  if(width>=768)assert.ok(layout.last>layout.first*1.8,'Last card spans desktop row');
  else assert.ok(Math.abs(layout.last-layout.first)<1,'Mobile cards share one column');
  await education.scrollIntoViewIfNeeded();
  await page.screenshot({path:`artifacts/fear-greed-education/education-${width}.png`});
  await disclosure.locator('summary').click();
  await education.waitFor({state:'hidden'});
  await page.goto(base+'/fear-greed/korea/',{waitUntil:'networkidle',timeout:45000});
  await page.locator('.zg-fg-korea .zg-fg-intro').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Korea introduction has no horizontal overflow');
  await page.screenshot({path:`artifacts/fear-greed-education/korea-intro-${width}.png`});
  for(const route of ['/economic-indicators/employment/','/theme-fear-greed/','/sector-fear-greed/','/guides/fomc/','/inflation/','/risk-indicators/','/economic-indicators/','/about/']){
   await page.goto(base+route,{waitUntil:'networkidle',timeout:45000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' has no horizontal overflow');
   assert.equal(await page.locator('h1').count(),1,route+' has one visible heading');
   assert.ok((await page.locator('h1').innerText()).trim(),route+' nonempty heading');
   const searchGuide=page.locator('[data-testid^="investor-search-"]');
   if(await searchGuide.count()){
    await searchGuide.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' investor guide has no overflow');
    await page.screenshot({path:`artifacts/fear-greed-education/investor-${route.split('/').filter(Boolean).join('-')}-${width}.png`});
    await page.locator('h1').scrollIntoViewIfNeeded();
   }
   if(route==='/theme-fear-greed/'){
    const overlap=await page.evaluate(()=>{
     const intro=document.querySelector('.zg-sector-detail-hero p')?.getBoundingClientRect();
     const count=document.querySelector('.zg-tfg-content .zg-sfg-as-of')?.getBoundingClientRect();
     return !!intro&&!!count&&intro.left<count.right&&intro.right>count.left&&intro.top<count.bottom&&intro.bottom>count.top;
    });
    assert.equal(overlap,false,'Theme description does not overlap the theme count');
   }
   await page.screenshot({path:`artifacts/fear-greed-education/search-${route.split('/').filter(Boolean).join('-')}-${width}.png`});
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS education open/close, responsive cards and no overflow at ${width}px`);
  await page.close();
 }
}finally{await browser.close();}
