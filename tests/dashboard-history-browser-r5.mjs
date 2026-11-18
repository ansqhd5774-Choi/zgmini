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

 // W06 #43 one-off LIVE S21 confirmed vs R21 provisional stored-only
 // provenance, month/date and real line fidelity. Do not merge this into
 // recurring external-network CI or invoke any supplier/PC/DB write.
 const validMonth=s=>typeof s==='string'
  &&/^\d{4}-(0[1-9]|1[0-2])-01$/.test(s)
  &&Number.isFinite(Date.parse(s+'T00:00:00.000Z'))
  &&new Date(Date.parse(s+'T00:00:00.000Z')).toISOString().slice(0,10)===s;
 const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
 const validTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
 const inputIds=['PCEPI','PCEPILFE','INDPRO','DPCERA3M086SBEA',
  'DSPIC96','PAYEMS','EXPINF5YR','MCOILWTICO'];
 const fourAxis=['inflation','realEconomy','labor','expectationsEnergy'];
 for(const width of [390,1440]){
  const context=await browser.newContext({
   viewport:{width,height:900},locale:'ko-KR',colorScheme:'light'});
  const live=await context.newPage(),errors=[],hydrated={confirmed:[],provisional:[]};
  live.on('pageerror',error=>errors.push(error.message));
  live.on('response',response=>{
   const path=new URL(response.url()).pathname;
   if(new URL(response.url()).hostname!=='zgmini.kr')return;
   if(path==='/api/stagflation-risk-detail')
    hydrated.confirmed.push({status:response.status(),
     body:response.json().catch(()=>null)});
   if(path==='/api/stagflation-risk-provisional')
    hydrated.provisional.push({status:response.status(),
     body:response.json().catch(()=>null)});
  });
  try{
   const page=await live.goto('https://zgmini.kr/stagflation-risk/',{
    waitUntil:'domcontentloaded',timeout:50000});
   assert.equal(page?.status(),200,width+'px actual Stagflation page HTTP200');
   const intro=live.locator('#zg-about-intro-dialog');
   if(await intro.isVisible({timeout:1000}).catch(()=>false)){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:12000});
   }
   const hero=live.locator('[data-testid="stagflation-detail-hero"]');
   await hero.waitFor({state:'visible',timeout:18000});
   await live.waitForFunction(()=>document.querySelector('[data-testid="stagflation-detail-hero"]')
    ?.getAttribute('aria-busy')==='false',null,{timeout:30000});
   await live.waitForFunction(()=>performance.getEntriesByType('resource')
    .some(e=>e.name.includes('/api/stagflation-risk-provisional')),
    null,{timeout:20000});
   const directConfirmed=await live.request.get('https://zgmini.kr/api/stagflation-risk-detail',
    {timeout:20000,headers:{accept:'application/json','cache-control':'no-cache'}});
   const directProvisional=await live.request.get('https://zgmini.kr/api/stagflation-risk-provisional',
    {timeout:20000,headers:{accept:'application/json','cache-control':'no-cache'}});
   const confApi=await directConfirmed.json(),provApi=await directProvisional.json();
   const confClient=hydrated.confirmed.length?await hydrated.confirmed.at(-1).body:null;
   const provClient=hydrated.provisional.length?await hydrated.provisional.at(-1).body:null;
   const statusC=directConfirmed.status(),statusP=directProvisional.status();
   const state={width,
    confirmedHttp:statusC,confirmedStatus:confApi.status,
    confirmedReason:confApi.reason??null,
    confirmedSnapshotAt:directConfirmed.headers()['x-data-snapshot-at']??null,
    confirmedClientStatus:hydrated.confirmed.at(-1)?.status??null,
    provisionalHttp:statusP,provisionalStatus:provApi.status,
    provisionalReason:provApi.reason??null,
    provisionalSnapshotAt:directProvisional.headers()['x-data-snapshot-at']??null,
    provisionalClientStatus:hydrated.provisional.at(-1)?.status??null
   };
   const scoreAria=await hero.locator('.cnn-score-orb[role="group"]').getAttribute('aria-label');
   const headerDate=await hero.locator('.cnn-source strong').textContent();
   const axes=hero.locator('.inflation-r2-axis-grid .inflation-r2-axis-item');
   assert.equal(await axes.count(),0,'S21 risk axes are separate from hero, not within hero');
   const riskAxes=live.locator('.stagflation-axes .inflation-r2-axis-grid .inflation-r2-axis-item');
   assert.equal(await riskAxes.count(),4,'confirmed four displayed risk axes');
   const inputTable=live.locator('.stagflation-inputs .inflation-indicator-table-r2 tbody tr');
   const mobileInputs=live.locator('.stagflation-inputs .inflation-r2-mobile-card');
   assert.equal(await inputTable.count(),10,'ten confirmed S21 derived input signals');
   assert.equal(await mobileInputs.count(),10,'mobile matches desktop S21 signals');
   const fixed={http:statusC,score:confApi?.score??null,
    observationMonth:confApi?.observationMonth??null,
    methodologyVersion:confApi?.methodologyVersion??null,
    historyPolicy:confApi?.historyPolicy??null,
    trendLength:Array.isArray(confApi?.trend)?confApi.trend.length:0,
    last:confApi?.trend?.at(-1)??null,first:confApi?.trend?.[0]??null,
    scoreAria,headerDate,axes:[]};
   if(statusC===200){
    assert.equal(confApi.status,'READY');
    assert.equal(confApi.methodologyVersion,'STAGFLATION_S2.1_SHADOW');
    assert.equal(confApi.historyPolicy,'CURRENT_VINTAGE_RECONSTRUCTION_NOT_PIT');
    assert.equal(confClient?.status,confApi.status,'confirmed hydration status equals direct');
    assert.equal(confClient?.score,confApi.score,'confirmed hydration score equals direct');
    assert.equal(confClient?.observationMonth,confApi.observationMonth,'confirmed month equals direct');
    assert.ok(validScore(confApi.score)&&validMonth(confApi.observationMonth));
    assert.ok(scoreAria?.includes(confApi.score.toFixed(1)+'점'),
     width+'px confirmed score renders from stored public S21');
    assert.ok(headerDate?.includes(confApi.observationMonth.slice(0,7)),
     'confirmed page header matches common observation month');
    const history=confApi.trend??[];
    assert.equal(history.length,13,'confirmed exactly 13 actual monthly reconstructed points');
    for(let i=0;i<history.length;i++){
     const x=history[i];assert.ok(validMonth(x.label)&&validScore(x.value),
      'confirmed monthly points valid, no missing imputation');
     if(i>0){
      const y=history[i-1].label;
      const next=new Date(Date.UTC(Number(y.slice(0,4)),Number(y.slice(5,7)),1)).toISOString().slice(0,10);
      assert.equal(x.label,next,'confirmed actual 13 consecutive months');
     }
    }
    assert.equal(history.at(-1).label,confApi.observationMonth,
     'confirmed source latest month correctly keyed');
    assert.ok(Math.abs(history.at(-1).value-confApi.score)<1e-8,
     'confirmed last observed score equals current card');
    const chart=hero.locator('.fg-chart-slot');
    await live.waitForFunction(()=>{
     const hero=document.querySelector('[data-testid="stagflation-detail-hero"]');
     return [...(hero?.querySelectorAll('.fg-chart-slot path.recharts-area-curve')??[])]
      .some(x=>{
       const d=x.getAttribute('d')??'',stroke=x.getAttribute('stroke')??getComputedStyle(x).stroke;
       return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&stroke!=='none'&&!/NaN|Infinity/.test(d);
      });
    },null,{timeout:22000});
    const paths=await chart.locator('path.recharts-area-curve').evaluateAll(all=>all.map(p=>({
     d:p.getAttribute('d')??'',stroke:p.getAttribute('stroke')??''})));
    const dot=chart.locator('.cnn-latest-point').first();
    assert.equal(await dot.count(),1,'confirmed 13 monthly values have one last real dot');
    let tooltip=null;try{
     await dot.hover({force:true,timeout:12000});
     await live.waitForTimeout(250);
     const label=hero.locator('.cnn-history-tooltip span').first();
     if(await label.isVisible())tooltip=(await label.textContent())?.trim()??null;
    }catch{}
    if(tooltip)assert.equal(tooltip,confApi.observationMonth.slice(0,7),
     'confirmed hover source month, never publication timestamp');
    fixed.chart={connected:paths.some(p=>/^M/.test(p.d)&&/[CLQ]/.test(p.d.slice(1))
     &&p.stroke!=='none'&&!/NaN|Infinity/.test(p.d)),
     latestDot:await dot.count(),tooltip,rawRows:history.length,
     latest:history.at(-1)};
    for(let i=0;i<fourAxis.length;i++){
     const val=confApi.axes?.[fourAxis[i]];
     assert.ok(validScore(val),'approved S21 risk axis valid');
     const actual=await riskAxes.nth(i).locator('.inflation-r2-axis-top strong').textContent();
     assert.equal(actual?.trim(),val.toFixed(1),'risk axis independently displayed');
     fixed.axes.push({id:fourAxis[i],value:val,display:actual?.trim()});
    }
    assert.equal(confApi.scoreComparisons?.week??null,null,
     'do not create weekly score from a monthly reconstructed history');
    const sourceInputs=Array.isArray(confApi.inputs)?confApi.inputs:[];
    assert.equal(sourceInputs.length,10,'ten published S21 signals');
    const inputStates=[];
    for(const [i,row] of sourceInputs.entries()){
     const el=inputTable.nth(i);
     const real=Array.isArray(row.trend)?row.trend:[];
     const chart=el.locator('svg.inflation-mini-chart');
     const connected=await chart.count()===1;
     if(real.length>=2){
      assert.ok(connected,width+'px '+row.id+' 2+ stored points connect');
      const d=await chart.locator('path.inflation-mini-chart-line').getAttribute('d');
      assert.ok(d&&/^M/.test(d)&&/L/.test(d)&&!/NaN|Infinity/.test(d),
       row.id+' real monthly raw line');
     }else assert.equal(connected,false,row.id+' no fabricated raw mini line');
     inputStates.push({id:row.id,status:row.status,
      observationMonth:row.observationMonth,
      previousObservationMonth:row.previousObservationMonth,
      latest:real.at(-1)??null,rawPoints:real.length,connected});
    }
    fixed.inputStates=inputStates;
    fixed.comparisons=confApi.scoreComparisons;
   }else{
    assert.equal(statusC,503,'confirmed incomplete must be explicit 503');
    assert.ok(['STORED_DATA_PENDING','STORED_DATA_STALE',
     'STORED_DATA_NOT_APPROVED','STORED_READ_UNAVAILABLE'].includes(confApi.reason),
     'correct confirmed unavailable reason');
    assert.ok(scoreAria?.includes('—점'),'confirmed 503 cannot display fake score');
    assert.equal((await hero.locator('.cnn-latest-point').count()),0,
     'no confirmed publication means no real chart last-dot');
   }
   const provisional=live.locator('[data-testid="stagflation-latest-provisional"]');
   const provisionalVisible=await provisional.isVisible().catch(()=>false);
   const dynamic={http:statusP,status:provApi?.status??null,reason:provApi?.reason??null,
    visible:provisionalVisible,
    score:provApi?.score??null,
    confirmedObservationMonth:provApi?.confirmedObservationMonth??null,
    oldestInputMonth:provApi?.oldestInputMonth??null,
    newestInputMonth:provApi?.newestInputMonth??null,
    inputMonths:provApi?.inputMonths??null,
    observedAt:provApi?.observedAt??null,calculatedAt:provApi?.calculatedAt??null,
    sourceStoredAt:provApi?.sourceStoredAt??null,
    historyLength:provApi?.history?.length??0,
    latest:provApi?.history?.at(-1)??null,chart:null};
   if(statusP===200){
    assert.equal(provApi.status,'READY');
    assert.equal(provClient?.status,provApi.status,'provisional hydration status');
    assert.equal(provClient?.score,provApi.score,'provisional direct score consistent');
    assert.ok(provisionalVisible,'published latest provisional has a separate card');
    assert.equal(provApi.methodologyVersion,'STAGFLATION_LATEST_PUBLISHED_R1');
    assert.equal(provApi.evaluationMode,'LATEST_PUBLISHED_INPUTS_NOT_COMMON_MONTH_OR_FORECAST');
    assert.equal(provApi.historyPolicy,'ACTUAL_CALCULATION_OBSERVATIONS_ONLY');
    assert.equal(provApi.phase,'PROVISIONAL');
    assert.ok(validScore(provApi.score),'valid provisional 0-100');
    assert.ok(validMonth(provApi.confirmedObservationMonth)&&validMonth(provApi.oldestInputMonth)
      &&validMonth(provApi.newestInputMonth),'provisional input months well-formed');
    assert.ok(provApi.oldestInputMonth<=provApi.newestInputMonth);
    assert.ok(provApi.confirmedObservationMonth<provApi.newestInputMonth,
     'provisional new released input beyond common month');
    assert.equal(provApi.inputCount,8);
    assert.deepEqual(Object.keys(provApi.inputMonths).sort(),[...inputIds].sort(),
     'all eight real source input months');
    assert.ok(validTime(provApi.observedAt)&&validTime(provApi.calculatedAt)
     &&validTime(provApi.sourceStoredAt),'three independent dates valid');
    assert.equal(provApi.history.at(-1).observedAt,provApi.observedAt,
     'latest point actual calc observation, not a month label');
    assert.equal(provApi.history.at(-1).score,provApi.score);
    for(let i=0;i<provApi.history.length;i++){
     const p=provApi.history[i];
     assert.ok(validScore(p.score)&&validTime(p.observedAt));
     if(i>0)assert.ok(Date.parse(p.observedAt)>Date.parse(provApi.history[i-1].observedAt),
      'real calc-observation timestamps strictly increasing');
    }
    assert.ok((await provisional.locator('.stagflation-latest-heading strong').textContent())
      ?.includes(provApi.score.toFixed(1)),
      'separate provisional score is published source, not confirmed data');
    const c=provisional.locator('.stagflation-latest-chart');
    const paths=await c.locator('path.recharts-area-curve').evaluateAll(all=>
     all.map(p=>({d:p.getAttribute('d')??'',stroke:p.getAttribute('stroke')??'',
      dash:p.getAttribute('stroke-dasharray')??''})));
    const connected=paths.some(p=>/^M/.test(p.d)&&/[CLQ]/.test(p.d.slice(1))
      &&p.stroke!=='none'&&!/NaN|Infinity/.test(p.d));
    if(provApi.history.length>=2){
     await live.waitForFunction(()=>{
      const el=document.querySelector('[data-testid="stagflation-latest-provisional"]');
      return [...(el?.querySelectorAll('path.recharts-area-curve')??[])]
       .some(p=>/^M/.test(p.getAttribute('d')??'')
        &&/[CLQ]/.test((p.getAttribute('d')??'').slice(1)));
     },null,{timeout:18000});
     assert.ok(connected,'provisional actual 2+ stored calculations connect');
    }else assert.ok(!connected,'no invented line with only one actual provisional calculation');
    dynamic.chart={connected,dashed:paths.some(p=>Boolean(p.dash)),
     dots:await c.locator('.cnn-latest-point').count()};
   }else{
    assert.equal(statusP,503,'unavailable provisional explicit 503');
    assert.ok(['LATEST_PUBLISHED_INPUTS_PENDING','LATEST_PUBLISHED_INPUTS_STALE',
     'STORED_READ_UNAVAILABLE','STORED_DATA_NOT_APPROVED',
     'PROVISIONAL_SUPERSEDED'].includes(provApi.reason),
     'expected provisional publication boundary code');
    assert.equal(provisionalVisible,false,'unapproved stale or superseded provisional must be hidden');
   }
   assert.deepEqual(errors,[],'no actual Production page JS errors');
   const overflow=await live.evaluate(()=>({
    client:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
   }));
   assert.ok(overflow.scroll<=overflow.client+1,
    width+'px real page must not overflow');
   await live.screenshot({path:'artifacts/dashboard-history/stagflation-43-'+width+'.png',
    fullPage:false,timeout:20000});
   console.log('W06_43_LIVE_STAGFLATION',JSON.stringify({state,fixed,dynamic,
    scoresMixed:statusC===200&&statusP===200?
     Math.abs(confApi.score-provApi.score)<1e-9:null,
    mobileWidth:width,overflow,errors}));
  }finally{await context.close();}
 }

}finally{await browser.close();}
