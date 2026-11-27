import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Actual public production, GET-only. No mocked data and no PC/Cloudflare writes.
const base='https://zgmini.kr';
const output='artifacts/w06-cnn-production-1d';
mkdirSync(output,{recursive:true});
const viewports=[{width:390,height:844},{width:1440,height:900}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];

async function inspect(viewport){
 const context=await browser.newContext({viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',
  serviceWorkers:'block',isMobile:viewport.width===390,hasTouch:viewport.width===390,
  reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[],requests=[];
 let navigationCount=0;
 page.on('pageerror',err=>errors.push(err.message));
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigationCount++;});
 page.on('response',response=>{
  const url=new URL(response.url());
  if(url.pathname==='/api/fear-greed'||url.pathname==='/api/fear-greed/observations'){
   requests.push({path:url.pathname,period:url.searchParams.get('period'),status:response.status(),
    at:Date.now()});
  }
 });
 try{
  const response=await page.goto(base+'/fear-greed/usa/',{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response?.status(),200,'production CNN page HTTP 200');
  const intro=page.locator('#zg-about-intro-dialog');
  await page.waitForTimeout(1200);
  if(await intro.isVisible()){
   await intro.getByRole('button',{name:'닫기',exact:true}).click();
   await intro.waitFor({state:'hidden',timeout:15000});
  }
  const controls=page.getByRole('group',{name:'CNN 지수 기간 선택'});
  const oneDay=controls.locator('button[data-period-short="1D"]');
  await oneDay.waitFor({state:'visible',timeout:35000});
  await controls.scrollIntoViewIfNeeded();
  await oneDay.click();
  await page.waitForFunction(()=>{
   const holder=document.querySelector('[data-cnn-intraday-mode="1"]');
   const curve=document.querySelector('.zg-fg-us .cnn-history-chart-hitbox path.recharts-area-curve');
   const d=curve?.getAttribute('d')??'';
   return Number(holder?.getAttribute('data-cnn-bucket-count'))>=2
    &&/^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&!/NaN|Infinity/.test(d);
  },null,{timeout:45000});
  assert.equal(await oneDay.getAttribute('aria-pressed'),'true');
  const actual=await page.evaluate(()=>{
   const holder=document.querySelector('[data-cnn-intraday-mode="1"]');
   const root=document.querySelector('.zg-fg-us .cnn-history-chart-hitbox');
   const path=root?.querySelector('path.recharts-area-curve');
   const circles=[...(root?.querySelectorAll('circle.recharts-reference-dot, .recharts-reference-dot circle')??[])];
   const dots=circles.filter(c=>{
    const style=getComputedStyle(c);
    return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'
      &&c.getAttribute('fill')!=='transparent'&&style.fill!=='rgba(0, 0, 0, 0)';
   });
   return {width:window.innerWidth,documentWidth:document.documentElement.scrollWidth,
    visibility:document.visibilityState,selected:holder?.getAttribute('data-cnn-intraday-mode'),
    bucketCount:Number(holder?.getAttribute('data-cnn-bucket-count')),
    pathD:path?.getAttribute('d')??'',visibleSourceDots:dots.length,
    ariaScore:document.querySelector('.usa-target-card .cnn-score-orb[role="group"]')?.getAttribute('aria-label')??null,
    archiveDelayed:document.body.textContent?.includes('이력 갱신 지연')??false};
  });
  assert.equal(actual.width,viewport.width,'exact responsive browser width');
  assert(actual.documentWidth<=actual.width+2,'no horizontal overflow');
  assert.equal(actual.visibility,'visible','visible page permits 60-second refresh');
  assert.equal(actual.selected,'1','real 1D mode');
  assert(actual.bucketCount>=2,'genuine observed buckets from production');
  assert.equal(actual.visibleSourceDots,0,'1D has no visible per-observation dot markers');
  assert.match(actual.ariaScore??'',/\d+(?:\.\d+)?점/,'rendered CNN score');
  const api=await context.request.get(base+'/api/fear-greed/observations?period=1D',
   {timeout:30000,headers:{'cache-control':'no-cache'}});
  assert.equal(api.status(),200);
  const body=await api.json();
  assert.equal(body.status,'READY');
  assert(Array.isArray(body.points)&&body.points.length>=2);
  assert(actual.bucketCount<=body.points.length+5,'rendered points must come from the public archive/current-source overlap');
  await page.screenshot({path:output+'/cnn-1d-'+viewport.width+'.png',fullPage:false});
  const initial1D=requests.filter(r=>r.path.endsWith('/observations')&&r.period==='1D').length;
  const initialCurrent=requests.filter(r=>r.path==='/api/fear-greed').length;
  const navBefore=navigationCount;
  // Time is real: no clock fast-forward, reload, synthetic observation or provider call.
  await page.waitForTimeout(70000);
  const subsequent1D=requests.filter(r=>r.path.endsWith('/observations')&&r.period==='1D').length;
  const subsequentCurrent=requests.filter(r=>r.path==='/api/fear-greed').length;
  assert.equal(navigationCount,navBefore,'no page reload occurred');
  assert(subsequent1D>initial1D,'1D archive re-fetched after 60 seconds without reload');
  assert(subsequentCurrent>initialCurrent,'CNN current score re-fetched after 60 seconds without reload');
  assert(requests.every(r=>r.status===200),'all observed public CNN GETs succeeded');
  assert.deepEqual(errors,[],'no browser page errors');
  const result={width:viewport.width,height:viewport.height,sourcePoints:body.points.length,
   bucketCount:actual.bucketCount,scoreLabel:actual.ariaScore,connectedLine:true,visibleDots:0,
   recordedBefore:{observations:initial1D,current:initialCurrent},
   recordedAfter:{observations:subsequent1D,current:subsequentCurrent},
   noReload:true,productionWrites:0};
  console.log('W06_CNN_REAL_PRODUCTION_1D '+JSON.stringify(result));
  return result;
 }catch(err){
  try{await page.screenshot({path:output+'/failed-'+viewport.width+'.png'});}catch{}
  console.error('W06_CNN_REAL_PRODUCTION_FAILED '+JSON.stringify({viewport,error:String(err),requests,errors}));
  throw err;
 }finally{await context.close();}
}
try{
 results.push(...await Promise.all(viewports.map(inspect)));
}finally{await browser.close();}
writeFileSync(output+'/results.json',JSON.stringify({observedAt:new Date().toISOString(),results},null,2)+'\n');
assert.equal(results.length,2);
console.log('W06_CNN_PRODUCTION_1D_VIEWPORTS_PASS');
