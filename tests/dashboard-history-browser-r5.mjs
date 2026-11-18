import assert from 'node:assert/strict';
import {normalizeMarketTrendPointsR4} from '../lib/market-score/market-trend-normalize-r4.mjs';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';
import {appendPublishedDomainCurrent} from '../lib/market-score/published-domain-trend-r4.mjs';
import {miniTrendGeometry} from '../lib/market-score/mini-trend-geometry.mjs';
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

 // W06 #40 isolated LIVE domain parity; public GET + DOM read only.
 // This diagnostic PR must close without merge. 12 domains x 6 periods x
 // mobile/desktop compare using the *exact* approved pure display functions.
 const expectedIds=['inflation','employment','rates','credit','growth',
  'consumption','earnings','liquidity','fundFlows','breadth','dollarFx','commodities'];
 const ranges=[['1D',1],['1W',7],['1M',30],['3M',90],['6M',180],['1Y',365]];
 const validScore=s=>typeof s==='number'&&Number.isFinite(s)&&s>=0&&s<=100;
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',colorScheme:'light'});
  const live=await ctx.newPage();
  const errors=[],latestPublished=[];
  live.on('pageerror',err=>errors.push(err.message));
  live.on('response',response=>{
   const u=new URL(response.url());
   if(u.hostname==='zgmini.kr'&&u.pathname==='/api/market-score'
     &&response.status()===200)
    latestPublished.push(response.json().catch(()=>null));
  });
  try{
   const html=await live.goto('https://zgmini.kr/',{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(html?.status(),200,width+'px homepage HTTP');
   const intro=live.locator('#zg-about-intro-dialog');
   if(await intro.isVisible({timeout:2000}).catch(()=>false)){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:15000});
   }
   const cards=live.locator('.zg-r55-card-grid article');
   await cards.first().waitFor({state:'visible',timeout:30000});
   assert.equal(await cards.count(),12,width+'px domain count');
   // Use the snapshot actually received by this browser session. A separate
   // current GET is compared to prevent silent stale-cache masking.
   await live.waitForFunction(()=>[...document.querySelectorAll('.zg-r55-card-grid article')]
    .some(el=>el.getAttribute('data-status')==='ready'),null,{timeout:30000});
   const current=await live.request.get('https://zgmini.kr/api/market-score',{
    timeout:20000,headers:{accept:'application/json','cache-control':'no-cache'}
   });
   assert.equal(current.status(),200,'public market-score GET');
   const fresh=await current.json();
   const client=latestPublished.length?await latestPublished.at(-1):null;
   const market=client?.status==='SUCCESS'?client:fresh;
   assert.equal(market.status,'SUCCESS','client published market state');
   assert.ok(Array.isArray(market.domains)&&market.domains.length===12,
    'published 12 economic domain records');
   const seen=new Set(market.domains.map(d=>d.id));
   assert.deepEqual([...seen].sort(),[...expectedIds].sort(),
    'exact 12 public domain IDs, no deleted standalone breadth index');
   const renderExpected=expectedIds.map(id=>{
    const d=market.domains.find(x=>x.id===id);
    return {id,score:d.status==='READY'&&validScore(d.score)?d.score:null,
     publicStatus:d.status,observationDate:d.observationDate??null,
     trendCount:Array.isArray(d.trend)?d.trend.length:0,
     clientUpdatedAt:market.updatedAt};
   });
   try{
    await live.waitForFunction(expected=>{
     const cards=[...document.querySelectorAll('.zg-r55-card-grid article')];
     return cards.length===12&&cards.every((card,i)=>{
      const row=expected[i];
      const status=card.getAttribute('data-status');
      const meter=card.querySelector('[role="meter"]');
      const actual=meter?.getAttribute('aria-valuenow')??null;
      return status===String(row.publicStatus??'unavailable').toLowerCase()
       &&(row.score===null?actual===null:actual!==null&&Number(actual)===row.score);
     });
    },renderExpected,{timeout:30000});
   }catch(err){
    const actual=await cards.evaluateAll(rows=>rows.map((card,i)=>({
     i,status:card.getAttribute('data-status'),
     meter:card.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')??null
    })));
    console.log('W06_40_CARD_HYDRATION_MISMATCH',JSON.stringify({
     width,expected:renderExpected,actual,clientUpdatedAt:client?.updatedAt,
     directGetUpdatedAt:fresh.updatedAt
    }));
    throw err;
   }
   // If public snapshot advanced during hydration, compare to exactly the
   // client's response; do not flag the independent newer GET as UI corruption.
   const samePublishedVersion=fresh.updatedAt===market.updatedAt;
   const periods=live.getByRole('group',{name:'종합 시장 점수 추이 기간'});
   await periods.waitFor({state:'visible',timeout:15000});
   const domainResults=[];
   for(const [period,days] of ranges){
    const button=periods.getByRole('button',{name:period,exact:true});
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'),'true',period+' selected');
    // Domain points are already contained in the published market snapshot;
    // no 1D archive is required for the individual domain cards.
    const expected=expectedIds.map((id,i)=>{
     const domain=market.domains.find(d=>d.id===id);
     const score=renderExpected[i].score;
     const normalized=normalizeMarketTrendPointsR4(domain.trend,market.updatedAt);
     const daily=marketTrendWindowR1(normalized,days,{includeBoundaryCarry:false});
     const curr=score===null||!market.updatedAt?null:{label:market.updatedAt,value:score};
     const chart=appendPublishedDomainCurrent(daily,curr,days);
     const missingDates=id==='consumption'?(domain.trend??[])
      .filter(point=>point.value==null&&point.score==null)
      .map(point=>point.date??point.label??''):[];
     const geo=chart.length>0?miniTrendGeometry(chart,days,missingDates):null;
     return {id,days,score,rawTrend:domain.trend?.length??0,points:chart.length,
      lastAt:chart.at(-1)?.label??null,lastScore:chart.at(-1)?.value??null,
      path:geo?.path??null,hasDot:geo?.last!=null};
    });
    const actual=await cards.evaluateAll(rows=>rows.map(card=>{
     const svg=card.querySelector('.zg-r55-card-visual .zg-r55-mini-chart svg');
     const paths=svg?[...svg.querySelectorAll(':scope > path')]:[];
     const circle=svg?.querySelector('circle');
     return {path:paths.at(-1)?.getAttribute('d')??null,hasDot:!!circle,
      hasEmpty:!!card.querySelector('.zg-r55-card-spark-empty'),
      status:card.getAttribute('data-status')};
    }));
    const failures=[];
    for(let i=0;i<12;i++){
     const ex=expected[i],got=actual[i];
     if(ex.path===null){
      if(!got.hasEmpty)failures.push({id:ex.id,reason:'missing history should render empty',got});
     }else{
      if(got.path!==ex.path)failures.push({id:ex.id,reason:'SVG path differs from saved observation geometry',
       expectedPath:ex.path,actualPath:got.path,expectedLastAt:ex.lastAt,expectedLastScore:ex.lastScore});
      if(got.hasDot!==ex.hasDot)failures.push({id:ex.id,reason:'last observation dot missing or invented',got});
     }
     // A point on a period boundary is never invented by normalize+window.
     if(ex.path&&/NaN|Infinity/.test(ex.path))failures.push({id:ex.id,reason:'nonfinite svg'});
    }
    domainResults.push({period,
     exactGeometry:12-failures.length,
     withDisplayedLine:expected.filter(x=>typeof x.path==='string'&&x.path.includes('L')).length,
     singleOrEmpty:expected.filter(x=>x.points<2).length,
     lastSamples:expected.map(x=>({id:x.id,n:x.points,at:x.lastAt,score:x.lastScore})),
     issues:failures});
    // No hidden score reweighting or fake points in the comparison: the
    // published original score and exact per-domain geometry are authoritative.
    assert.deepEqual(failures,[],width+'px '+period+' public domain card parity');
   }
   const results={width,clientUpdatedAt:market.updatedAt,
    freshUpdatedAt:fresh.updatedAt,samePublishedVersion,
    domains:renderExpected,periods:domainResults,
    javaScriptErrors:errors};
   console.log('W06_40_LIVE_DOMAIN_PARITY',JSON.stringify(results));
   assert.deepEqual(errors,[],'Live domain JS errors');
   await live.screenshot({path:'artifacts/dashboard-history/live-domain-parity-'+width+'.png',
    fullPage:false,timeout:20000});
  }finally{await ctx.close();}
 }

}finally{await browser.close();}
