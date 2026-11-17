import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
const ids=['inflation','employment','rates','credit','growth','consumption','earnings','liquidity','fundFlows','breadth','dollarFx','commodities'];
function snapshot(revision){
 const score=revision===1?50:revision===3?0:53;
 const trend=Array.from({length:400},(_,i)=>({label:new Date(Date.UTC(2025,8,20)+i*86400000).toISOString().slice(0,10),value:i===399?score:50+Math.sin(i/13)*10}));
 return {status:'SUCCESS',updatedAt:`2026-10-24T12:0${revision}:00Z`,overall:{status:'READY',score,trend},domains:ids.map(id=>({id,status:'READY',score,trend})),dataQuality:{readyDomains:12,totalDomains:12,coverageWeight:1}};
}
mkdirSync('artifacts/dashboard-history',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,768,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900}});
  let revision=1;
  const modules=[];
  page.on('request',request=>modules.push(new URL(request.url()).pathname));
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const body=path==='/api/market-score'?snapshot(revision)
    :path==='/api/market-score/observations'?{
     status:'READY',period:new URL(route.request().url()).searchParams.get('period'),
     points:[
      {observedAt:'2026-10-24T11:50:00Z',score:48},
      {observedAt:'2026-10-24T12:00:00Z',score:50},
     ],
    }:path==='/api/fear-greed'?{
    status:'verified',score:21,rating:'공포',observedAt:'2026-10-24T12:00:00Z',
    history:snapshot(1).overall.trend.map(p=>({date:p.label,score:p.value})),
   }:path==='/api/session'?{user:null}:path==='/api/market-data'?{status:'fallback',indicators:{},summary:[]}:{status:'UNAVAILABLE'};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  const intro=page.locator('#zg-about-intro-dialog');
  await intro.waitFor({state:'visible'});
  assert.equal(await page.locator('.zg-r55-summary-mini-chart .recharts-responsive-container').count(),0,'Covered summary does not initialize Recharts');
  assert.equal(await page.locator('.cnn-history-chart-hitbox .recharts-responsive-container').count(),0,'Covered market charts do not initialize Recharts');
  assert.equal(await page.locator('#strength .recharts-wrapper').count(),0,'Covered secondary charts do not mount');
  assert.deepEqual(modules.filter(p=>/dashboard-summary-chart|market-fear-greed-chart-renderer|dashboard-secondary-plots|korea-composite-plot/.test(p)),[],'Covered chart renderer modules are not requested');
  await page.screenshot({path:`artifacts/dashboard-history/introduction-${width}.png`,caret:'initial'});
  await intro.getByRole('button',{name:'닫기',exact:true}).click();
  await intro.waitFor({state:'hidden'});
  // Reconstructed history has a dashed line. Unversioned calculation-time
  // observations are disconnected dots; both are real visible geometry.
  const chartSelector='.zg-r55-summary-chart';
  const chartSignature=()=>page.locator(chartSelector).evaluate(root=>[
   ...[...root.querySelectorAll('path.recharts-area-curve')].map(p=>p.getAttribute('d')??''),
   ...[...root.querySelectorAll('circle.recharts-area-dot')].map(p=>(p.getAttribute('cx')??'')+':'+(p.getAttribute('cy')??'')),
  ].join('|'));
  const waitForGeometry=()=>page.waitForFunction(selector=>{
   const root=document.querySelector(selector);
   if(!root)return false;
   return [...root.querySelectorAll('path.recharts-area-curve')].some(p=>/^M/.test(p.getAttribute('d')??''))
    ||[...root.querySelectorAll('circle.recharts-area-dot')].some(p=>Number.isFinite(Number(p.getAttribute('cx')))&&Number.isFinite(Number(p.getAttribute('cy'))));
  },chartSelector);
  await waitForGeometry();
  await page.locator('.usa-target-card path.recharts-area-curve').waitFor({state:'visible'});
  await page.reload({waitUntil:'networkidle'});
  await intro.waitFor({state:'hidden'});
  await waitForGeometry();
  const year=await chartSignature();
  const periods=page.getByRole('group',{name:'종합 시장 점수 추이 기간'});
  await periods.getByRole('button',{name:'1M',exact:true}).click();
  await page.waitForFunction(({selector,old})=>{
   const root=document.querySelector(selector);
   return root&&[
    ...[...root.querySelectorAll('path.recharts-area-curve')].map(p=>p.getAttribute('d')??''),
    ...[...root.querySelectorAll('circle.recharts-area-dot')].map(p=>(p.getAttribute('cx')??'')+':'+(p.getAttribute('cy')??'')),
   ].join('|')!==old;
  },{selector:chartSelector,old:year});
  const month=await chartSignature();
  revision=2;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByRole('img',{name:'종합 시장 점수 60.5점',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(({selector,old})=>{
   const root=document.querySelector(selector);
   return root&&[
    ...[...root.querySelectorAll('path.recharts-area-curve')].map(p=>p.getAttribute('d')??''),
    ...[...root.querySelectorAll('circle.recharts-area-dot')].map(p=>(p.getAttribute('cx')??'')+':'+(p.getAttribute('cy')??'')),
   ].join('|')!==old;
  },{selector:chartSelector,old:month});
  assert.equal(await periods.getByRole('button',{name:'1M',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.zg-r55-card-grid article').count(),12);
  // W06 #69: exercise every selectable period with real Recharts in mocked
  // Chromium on mobile/tablet/desktop widths. This remains an isolated UI
  // fixture, NOT proof of production data publishing or device hardware.
  const selection=['1D','1W','1M','3M','6M','1Y'];
  for(const label of selection){
   const button=periods.getByRole('button',{name:label,exact:true});
   await Promise.all([
    page.waitForResponse(response=>{
     const url=new URL(response.url());
     return url.pathname==='/api/market-score/observations'
      &&url.searchParams.get('period')===label;
    },{timeout:15000}),
    button.click(),
   ]);
   assert.equal(await button.getAttribute('aria-pressed'),'true',
    width+'px '+label+' selected period');
   await waitForGeometry();
   const geometry=await page.locator(chartSelector).evaluate(root=>({
    paths:[...root.querySelectorAll('path.recharts-area-curve')].map(p=>p.getAttribute('d')??'').filter(Boolean),
    dots:[...root.querySelectorAll('circle.recharts-area-dot')].map(p=>[p.getAttribute('cx'),p.getAttribute('cy')]),
   }));
   assert.ok(geometry.paths.length+geometry.dots.length>=1
    &&geometry.paths.every(path=>path.startsWith('M')&&!/NaN|Infinity/.test(path))
    &&geometry.dots.every(([x,y])=>Number.isFinite(Number(x))&&Number.isFinite(Number(y))),
    width+'px '+label+' provenance curves and discrete calculations have finite geometry');
   assert.equal(await page.locator('.zg-r55-card-grid article').count(),12);
  }
  // A real zero score remains visible, not a null/missing placeholder, on
  // each responsive viewport and the 1D calc archive.
  await periods.getByRole('button',{name:'1D',exact:true}).click();
  revision=3;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByRole('img',{name:'종합 시장 점수 0.0점',exact:true})
   .waitFor({state:'visible',timeout:15000});
  await waitForGeometry();
  assert.equal(await periods.getByRole('button',{name:'1D',exact:true}).getAttribute('aria-pressed'),'true');
  // W06 R4 #69: verify actual viewport overflow after all six period changes.
  const overflow=await page.evaluate(()=>{
   const viewport=document.documentElement.clientWidth;
   const violations=[];
   if(document.documentElement.scrollWidth>viewport+1)
    violations.push('document scrollWidth='+document.documentElement.scrollWidth);
   for(const selector of ['.zg-r55-summary-chart','.zg-r55-card-grid article']){
    for(const element of document.querySelectorAll(selector)){
     const rect=element.getBoundingClientRect();
     if(rect.width>0&&(rect.left< -1||rect.right>viewport+1))
      violations.push(selector+' left='+rect.left+' right='+rect.right);
    }
   }
   return violations;
  });
  assert.deepEqual(overflow,[],width+'px horizontal overflow');
  await page.screenshot({path:`artifacts/dashboard-history/history-${width}.png`});
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: 6 chart periods, newer snapshot and true zero in mocked Chromium`);
  await page.close();
 }
}finally{await browser.close();}
