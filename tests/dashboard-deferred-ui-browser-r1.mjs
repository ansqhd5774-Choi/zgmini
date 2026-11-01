import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Isolated local browser fixtures. No real account, data write, or analytics.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
mkdirSync('artifacts/dashboard-deferred-ui',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,1440])for(const signedIn of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const modules=[],errors=[];
  page.on('request',request=>modules.push(new URL(request.url()).pathname));
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const payload=path==='/api/session'?{user:signedIn?{displayName:'UI fixture',email:'fixture@example.invalid'}:null}
    :path==='/api/favorites'?{favorites:[]}
    :path==='/api/market-data'?{status:'fallback',updatedAt:'',indicators:{},summary:[]}
    :{status:'UNAVAILABLE'};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  await page.locator('.zg-dashboard[data-view="dashboard"]').waitFor({state:'visible'});
  const header=await page.locator('.zg-country-section .zg-section-heading').evaluate(el=>{
   const title=el.querySelector('h1').getBoundingClientRect(),guide=el.querySelector('a').getBoundingClientRect();
   return {overlap:title.left<guide.right&&title.right>guide.left&&title.top<guide.bottom&&title.bottom>guide.top,
    overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(header.overlap,false,'Market title and guide remain separate');
  assert.equal(header.overflow,false,'Dashboard has no horizontal overflow');
  if(signedIn){
   const trigger=page.getByRole('button',{name:'사용자 설정',exact:true});
   await trigger.waitFor({state:'visible',timeout:15000});
   await trigger.click();
   const dialog=page.getByRole('dialog');
   await dialog.getByRole('heading',{name:'사용자 설정',exact:true}).waitFor({state:'visible'});
   await page.waitForFunction(()=>{
    const box=document.querySelector('[role="dialog"]')?.getBoundingClientRect();
    return box&&box.width>0&&box.left>=-0.5&&box.right<=innerWidth+0.5;
   },null,{timeout:5000});
   assert.equal(await dialog.getByText('내 즐겨찾기 0개',{exact:true}).count(),1);
   await page.screenshot({path:`artifacts/dashboard-deferred-ui/settings-${width}.png`});
   await page.keyboard.press('Escape');
   await dialog.waitFor({state:'hidden'});
  }else{
   assert.equal(await page.getByRole('button',{name:'사용자 설정',exact:true}).count(),0);
   assert.deepEqual(modules.filter(path=>/\/components\/ui\/(tabs|select|accordion|sheet)\.tsx$/.test(path)||path.endsWith('/app/core-pce-row.tsx')),[],
    'Anonymous dashboard must not request secondary UI modules');
   await page.screenshot({path:`artifacts/dashboard-deferred-ui/dashboard-${width}.png`});
  }
  assert.deepEqual(errors,[],`No client errors at ${width}px, signedIn=${signedIn}`);
  console.log(`PASS dashboard deferred UI ${width}px signedIn=${signedIn}`);
  await page.close();
 }

 // Read-only live production visual check after the mobile tooltip layer fix.
 // No mocks, API writes, login, data collection, or change to the public site.
 const live=await browser.newPage({
  viewport:{width:390,height:844},
  deviceScaleFactor:2,
  isMobile:true,
  hasTouch:true,
 });
 await live.addInitScript(()=>{
  try{sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1');}catch{}
 });
 try{
  await live.goto('https://zgmini.kr/',{waitUntil:'domcontentloaded',timeout:60000});
  await live.locator('.zg-dashboard[data-view="dashboard"]').waitFor({state:'visible',timeout:30000});
  for(const market of ['usa','korea']){
   const card=live.locator(market==='usa'?'.usa-target-card':'.korea-target-card');
   const svg=card.locator('svg.recharts-surface').first();
   await svg.waitFor({state:'visible',timeout:30000});
   await card.locator('.recharts-area-curve').first().waitFor({state:'attached',timeout:20000});
   const rect=await svg.boundingBox();
   assert.ok(rect&&rect.width>80&&rect.height>40,market+' chart visible');
   const tooltip=card.locator('.recharts-tooltip-wrapper .cnn-history-tooltip');
   for(const xFraction of [.4,.6,.3]){
    await live.mouse.move(rect.x+rect.width*xFraction,rect.y+rect.height*.5);
    if(await tooltip.isVisible())break;
   }
   await tooltip.waitFor({state:'visible',timeout:10000});
   const surface=await tooltip.evaluate(el=>{
    const wrapper=el.closest('.recharts-tooltip-wrapper');
    const tip=getComputedStyle(el),layer=wrapper?getComputedStyle(wrapper):null;
    const box=el.getBoundingClientRect(), chart=el.closest('.fg-card')?.getBoundingClientRect();
    return {background:tip.backgroundColor,opacity:tip.opacity,layer:layer?.zIndex,
      width:box.width,height:box.height,cardWidth:chart?.width??0};
   });
   assert.equal(surface.background,'rgb(7, 26, 41)',market+' desktop-matched opaque tooltip');
   assert.equal(surface.opacity,'1',market+' tooltip opacity');
   assert.equal(surface.layer,'5',market+' mobile tooltip sits above translated SVG');
   assert.ok(surface.width>40&&surface.height>25,market+' tooltip is readable');
   await live.screenshot({path:`artifacts/dashboard-deferred-ui/production-mobile-fg-${market}-390.png`,animations:'disabled'});
   console.log('PASS production mobile sentiment tooltip '+market+' '+JSON.stringify(surface));
  }
 }finally{await live.close();}
}finally{await browser.close();}
