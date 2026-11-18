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
      {observedAt:'2026-10-22T12:00:00Z',score:46},
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
  // Reconstructed daily history is dashed; actual calculation-time samples
  // form a separate solid line. Never bridge these different provenances.
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
   if(label==='1W'){
    // 10/22 and 10/24 are saved calculations; reconstructed daily 10/23
    // is between them. Both provenance lines must remain connected within
    // their own source, never joined into a single provenance-changing line.
    const curves=await page.locator(chartSelector+' path.recharts-area-curve').evaluateAll(paths=>
     paths.map(path=>({d:path.getAttribute('d')??'',dash:path.getAttribute('stroke-dasharray')})));
    assert.equal(curves.length,2,width+'px reconstructed and calculated series are separate');
    assert.ok(curves.some(p=>p.dash)&&curves.some(p=>!p.dash),width+'px dashed and solid series');
    for(const curve of curves){
     assert.ok(/^M/.test(curve.d)&&/[CLQ]/.test(curve.d.slice(1))
      &&(curve.d.match(/M/g)??[]).length===1,
      width+'px 1W provenance line is a single connected SVG subpath');
    }
    const domainLines=await page.locator('.zg-r55-card-grid article .zg-r55-mini-chart svg > path').evaluateAll(paths=>
     paths.map(path=>path.getAttribute('d')??''));
    assert.equal(domainLines.length,12,width+'px 12 domain observation paths');
    assert.ok(domainLines.every(d=>/^M/.test(d)&&/L/.test(d)),
     width+'px 12 domains connect their real 1W observations');
   }
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
  // The 1D archive contains two actual observations plus the changed current
  // publication: their stroke must contain a real segment, not just dots.
  // No reconstructed daily points are available in the 1D series.
  const oneDayObservedLine=await page.locator(chartSelector+' path.recharts-area-curve').evaluateAll(paths=>paths.some(path=>{
   const d=path.getAttribute('d')??'';
   const stroke=path.getAttribute('stroke')??getComputedStyle(path).stroke;
   return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&!/NaN|Infinity/.test(d)
    &&stroke!=='none'&&stroke!=='transparent'&&stroke!==''; 
  }));
  assert.equal(oneDayObservedLine,true,width+'px 1D actual calculated observations connect as a line');
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

 // W06 #75 ONE-OFF, PUBLIC READ-ONLY live production verification.
 // No user credentials, D1 credentials, POST, deployment, persistent CI gate,
 // fabricated observations or source/model edits. Never merge this probe.
 for(const width of [390,1440]){
  const liveContext=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',colorScheme:'light'});
  const live=await liveContext.newPage();
  const errors=[];
  const requests=[];
  live.on('pageerror',error=>errors.push(String(error.message).slice(0,240)));
  live.on('response',response=>{
   const url=new URL(response.url());
   if(url.hostname==='zgmini.kr'&&
     ['/api/market-score','/api/market-score/observations'].includes(url.pathname))
    requests.push({path:url.pathname,period:url.searchParams.get('period'),http:response.status()});
  });
  const origin='https://zgmini.kr';
  try{
   const html=await live.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(html?.status(),200,'Live homepage HTTP 200 at '+width+'px');
   const dialog=live.locator('#zg-about-intro-dialog');
   if(await dialog.isVisible({timeout:2500}).catch(()=>false)){
    await dialog.getByRole('button',{name:'닫기',exact:true}).click();
    await dialog.waitFor({state:'hidden',timeout:15000});
   }
   const cards=live.locator('.zg-r55-card-grid article');
   await cards.first().waitFor({state:'visible',timeout:35000});
   assert.equal(await cards.count(),12,'Live 12 domains at '+width+'px');
   const periods=live.getByRole('group',{name:'종합 시장 점수 추이 기간'});
   await periods.waitFor({state:'visible',timeout:25000});
   const summary=live.locator('.zg-r55-summary-top[role="img"]');
   await summary.waitFor({state:'visible',timeout:25000});
   const curRes=await live.request.get(origin+'/api/market-score',
    {timeout:18000,headers:{accept:'application/json','cache-control':'no-cache'}});
   assert.equal(curRes.status(),200,'Live current GET HTTP 200');
   const market=await curRes.json();
   assert.equal(market.status,'SUCCESS','Live market current published status');
   assert.equal(market.overall?.status,'READY','Live current overall READY');
   assert.ok(typeof market.overall?.score==='number'&&Number.isFinite(market.overall.score),
    'Live current score finite');
   assert.equal(market.domains?.length,12,'Live API has twelve domains');
   const expectedDisplay=Math.max(0,Math.min(100,50+(market.overall.score-50)*3.5)).toFixed(1);
   await live.waitForFunction(()=>{
    const s=document.querySelector('.zg-r55-summary-top[role="img"]')?.getAttribute('aria-label')??'';
    return /종합 시장 점수 [0-9]+[.][0-9]점$/.test(s);
   },null,{timeout:25000});
   const summaryLabel=await summary.getAttribute('aria-label');
   const archives=[];
   for(const period of ['1D','1W','1M','3M','6M','1Y']){
    const res=await live.request.get(origin+'/api/market-score/observations?period='+period,
     {timeout:18000,headers:{accept:'application/json','cache-control':'no-cache'}});
    assert.equal(res.status(),200,'Live '+period+' archive HTTP 200');
    const body=await res.json();
    assert.equal(body.period,period,'Live '+period+' response label');
    assert.ok(['READY','PENDING'].includes(body.status),'Live '+period+' published state');
    assert.equal(body.timeMeaning,'PC_CALCULATED_AT','Live '+period+' observed time source');
    assert.equal(res.headers()['x-data-source'],'STORED','Live '+period+' stored-only GET');
    const points=Array.isArray(body.points)?body.points:[];
    assert.ok(points.every(p=>
     typeof p?.score==='number'&&Number.isFinite(p.score)
      &&p.score>=0&&p.score<=100
      &&typeof p?.observedAt==='string'&&Number.isFinite(Date.parse(p.observedAt))
    ),'Live '+period+' only finite observed score and dates');
    for(let i=1;i<points.length;i++)
     assert.ok(points[i-1].observedAt<points[i].observedAt,
      'Live '+period+' strictly increasing actual calculation timestamps');
    const button=periods.getByRole('button',{name:period,exact:true});
    // An aria-pressed update precedes React's async observed-archive fetch.
    // Wait for the *UI's own* archive response before measuring the SVG.
    await Promise.all([
     live.waitForResponse(response=>{
      const url=new URL(response.url());
      return url.hostname==='zgmini.kr'&&url.pathname==='/api/market-score/observations'
       &&url.searchParams.get('period')===period&&response.status()===200;
     },{timeout:22000}),
     button.click(),
    ]);
    assert.equal(await button.getAttribute('aria-pressed'),'true',
     'Live '+width+'px '+period+' period selected');
    // Two or more real calculation-time observations require a connected
    // SOLID calculation series, not only the dashed daily reconstruction.
    // A single observed point has no valid connecting segment.
    if(points.length>=2){
     await live.waitForFunction(()=>{
      const root=document.querySelector('.zg-r55-summary-chart');
      return [...(root?.querySelectorAll('path.recharts-area-curve')??[])].some(p=>{
       const d=p.getAttribute('d')??'';
       const dash=p.getAttribute('stroke-dasharray')??'';
       const stroke=p.getAttribute('stroke')??getComputedStyle(p).stroke;
       return dash===''&&/^M/.test(d)&&/[CLQ]/.test(d.slice(1))
        &&stroke!=='none'&&stroke!=='transparent'&&!/NaN|Infinity/.test(d);
      });
     },null,{timeout:20000});
    }
    const curves=await live.locator('.zg-r55-summary-chart path.recharts-area-curve')
     .evaluateAll(paths=>paths.map(p=>({
      d:p.getAttribute('d')??'',dash:p.getAttribute('stroke-dasharray')??'',
      stroke:p.getAttribute('stroke')??''
     })));
    const lines=curves.filter(c=>/^M/.test(c.d)&&/[CLQ]/.test(c.d.slice(1))
     &&c.stroke!=='none'&&!/NaN|Infinity/.test(c.d));
    const domains=await live.locator('.zg-r55-card-grid article .zg-r55-mini-chart svg > path')
     .evaluateAll(paths=>paths.map(p=>p.getAttribute('d')??''));
    archives.push({period,state:body.status,points:points.length,
     lastAt:points.at(-1)?.observedAt??null,
     lastRawScore:points.at(-1)?.score??null,
     compositeConnectedLines:lines.length,
     reconstructionAndCalculationStyles:curves.map(c=>c.dash?'dashed':'solid'),
     domainConnectedLines:domains.filter(d=>/^M/.test(d)&&/L/.test(d)).length});
   }
   const overflow=await live.evaluate(()=>{
    const w=document.documentElement.clientWidth;
    return {width:w,scrollWidth:document.documentElement.scrollWidth,
     tooWide:document.documentElement.scrollWidth>w+1};
   });
   assert.equal(overflow.tooWide,false,'Live '+width+'px document does not overflow');
   assert.equal(await cards.count(),12,'Live domain count remains 12 after six periods');
   assert.deepEqual(errors,[],'Live '+width+'px no JS page errors');
   await live.screenshot({path:'artifacts/dashboard-history/live-prod-w06-75-'+width+'.png',
    fullPage:false,timeout:20000});
   const report={width,htmlStatus:html?.status(),current:{
    sourceVersion:market.modelVersion??null,
    updatedAt:market.updatedAt??null,
    rawScore:market.overall.score,
    expectedDisplay,actualAria:summaryLabel,displayMatches:summaryLabel==='종합 시장 점수 '+expectedDisplay+'점'
   },archives,overflow,jsErrors:errors,requestCount:requests.length};
   console.log('W06_75_LIVE_CHART_PUBLIC',JSON.stringify(report));
   assert.ok(report.current.displayMatches,'Live card score equals approved UI conversion on '+width+'px');
  }finally{
   await liveContext.close();
  }
 }

}finally{await browser.close();}
