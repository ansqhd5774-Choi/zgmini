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

 // W06 #37 one-off read-only LIVE Korea Rev7 card/period provenance check.
 // This external-site code is not a permanent CI gate; close Draft unmerged.
 const {koreaRev7DisplayDayMs,koreaRev7VisibleHistoryDays}=
  await import('../lib/korea-rev7-display-day-r4.mjs');
 const periodsKorea=[['1W',7],['1M',31],['3M',93],['6M',186],['1Y',366]];
 const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
 const day=v=>Number.isFinite(koreaRev7DisplayDayMs(v));
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',colorScheme:'light'});
  const live=await ctx.newPage(),responses=[],errors=[];
  live.on('pageerror',err=>errors.push(err.message));
  live.on('response',response=>{
   const url=new URL(response.url());
   if(url.hostname==='zgmini.kr'&&url.pathname==='/api/indicators/korea-funds'
      &&response.status()===200)responses.push(response.json().catch(()=>null));
  });
  try{
   const result=await live.goto('https://zgmini.kr/fear-greed/korea/',
    {waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(result?.status(),200,width+'px Korea detail HTTP200');
   const intro=live.locator('#zg-about-intro-dialog');
   if(await intro.isVisible({timeout:1500}).catch(()=>false)){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:15000});
   }
   const card=live.locator('[data-testid="kr-composite"]');
   await card.waitFor({state:'visible',timeout:18000});
   await live.waitForFunction(()=>{
    const el=document.querySelector('[data-testid="kr-composite"]');
    return el&&el.getAttribute('aria-busy')==='false';
   },null,{timeout:30000});
   const direct=await live.request.get('https://zgmini.kr/api/indicators/korea-funds',{
    timeout:20000,headers:{accept:'application/json','cache-control':'no-cache'}
   });
   assert.equal(direct.status(),200,'public Korea Rev7 GET HTTP200');
   const fresh=await direct.json();
   assert.ok(responses.length>0,'browser hydrated from real public Korea API');
   const published=await responses.at(-1);
   assert.ok(published,'browser payload parsed');
   assert.equal(published.methodologyVersion,'kr-fg-cnn-r7-1.0.0');
   assert.equal(published.composite?.methodologyVersion,'kr-fg-cnn-r7-1.0.0');
   assert.equal(published.composite?.historyMode,'RECONSTRUCTED_CURRENT_VINTAGE');
   assert.equal(published.composite?.pointInTimeVerified,false);
   assert.equal(published.researchOnly,true);
   assert.equal(published.productionEligible,false);
   assert.equal(published.composite?.sourcePublishedAt,null);
   const c=published.composite;
   const isValid=valid(c?.displayScore)&&day(c?.observationDate);
   if(isValid){
    assert.ok(valid(c.score),'actual raw composite valid');
    assert.equal(c.displayScore,Math.round((c.score+Number.EPSILON)*10)/10,
     'visible score equals approved raw-to-one-decimal, not hidden recomputation');
    assert.ok(day(c.observationDate),'strict KRX YYYYMMDD Gregorian observed date');
    assert.ok(koreaRev7DisplayDayMs(c.observationDate)<=Date.now(),'not future observation date');
    const expectedDate=new Intl.DateTimeFormat('ko-KR',{
     dateStyle:'medium',timeZone:'Asia/Seoul'
    }).format(new Date(koreaRev7DisplayDayMs(c.observationDate)));
    await live.waitForFunction(expected=>{
     const root=document.querySelector('[data-testid="kr-composite"]');
     const orb=root?.querySelector('.cnn-score-orb[role="group"]');
     const date=root?.querySelector('.cnn-score-observed-date');
     return orb?.getAttribute('aria-label')?.includes(expected.score)
       &&date?.textContent?.trim()===expected.date;
    },{score:c.displayScore.toFixed(1)+'점',date:expectedDate},{timeout:20000});
    assert.equal(await card.getAttribute('data-market-state'),c.status.toLowerCase());
    const indicatorIds=Array.isArray(published.indicators)?published.indicators.map(i=>i.id):[];
    assert.deepEqual([...indicatorIds].sort(),['momentum','strength','breadth','putCall',
     'volatility','safeHaven','junkBond'].sort(),'exact seven Rev7 factors');
    assert.equal(c.components?.length,7,'7 stored Rev7 components');
   }else{
    assert.ok(['WARMUP','UNAVAILABLE','STALE'].includes(c?.status),
     'no fabricated available score for incomplete Rev7');
    await live.waitForFunction(()=>{
     const root=document.querySelector('[data-testid="kr-composite"]');
     return root?.querySelector('.cnn-score-orb[role="group"]')
      ?.getAttribute('aria-label')?.includes('—');
    },null,{timeout:12000});
   }
   const actualStatus=await card.getAttribute('data-market-state');
   const bar=live.getByRole('group',{name:'한국 공포탐욕 차트 기간'});
   await bar.waitFor({state:'visible',timeout:15000});
   const history=Array.isArray(c?.history)?c.history:[];
   const sampled=[],invalidDates=history.filter(p=>!day(p.date)).length;
   const newer=history.filter(p=>day(p.date)&&day(c.observationDate)
    &&koreaRev7DisplayDayMs(p.date)>koreaRev7DisplayDayMs(c.observationDate));
   // Extra stored dates may be present but must never be shown beyond
   // the approved completed observation day.
   for(const [period,days] of periodsKorea){
    const btn=bar.locator('button[data-period-short="'+period+'"]');
    await btn.click();
    assert.equal(await btn.getAttribute('aria-pressed'),'true',width+'px '+period+' selected');
    const visible=koreaRev7VisibleHistoryDays(history,c?.observationDate,days);
    const normalized=visible.map(p=>{
     const raw=valid(p.displayScore)?p.displayScore:p.score;
     return {date:p.date,score:valid(raw)?raw:null};
    });
    const contiguousSegments=normalized.slice(1).filter((p,i)=>
     p.score!==null&&normalized[i].score!==null).length;
    const lastValid=normalized.filter(p=>p.score!==null).at(-1)??null;
    if(contiguousSegments>=1){
     await live.waitForFunction(expected=>{
      const root=document.querySelector('[data-testid="kr-composite"]');
      const period=root?.querySelector('button[data-period-short="'+expected.period+'"]');
      if(period?.getAttribute('aria-pressed')!=='true')return false;
      return [...(root?.querySelectorAll('path.recharts-area-curve')??[])].some(p=>{
       const d=p.getAttribute('d')??'';
       const stroke=p.getAttribute('stroke')??getComputedStyle(p).stroke;
       return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))
        &&stroke!=='none'&&stroke!=='transparent'&&!/NaN|Infinity/.test(d);
      });
     },{period},{timeout:18000});
    }else if(visible.length<=1){
     await live.waitForFunction(()=>{
      const root=document.querySelector('[data-testid="kr-composite"]');
      return root?.querySelector('.cnn-chart-empty')!==null;
     },null,{timeout:18000});
    }
    const shape=await card.evaluate(root=>({
     paths:[...root.querySelectorAll('path.recharts-area-curve')].map(p=>({
      d:p.getAttribute('d')??'',stroke:p.getAttribute('stroke')??''})),
     empty:!!root.querySelector('.cnn-chart-empty'),
     lastDotCount:root.querySelectorAll('.cnn-latest-point').length
    }));
    const goodPaths=shape.paths.filter(p=>/^M/.test(p.d)
     &&/[CLQ]/.test(p.d.slice(1))&&p.stroke!=='none'
     &&!/NaN|Infinity/.test(p.d));
    if(contiguousSegments>=1)assert.ok(goodPaths.length>0,
     width+'px '+period+' real stored points must connect as a line');
    if(visible.length<=1)assert.ok(shape.empty,
     width+'px '+period+' cannot invent line without two observed rows');
    if(visible.length>=2&&lastValid)assert.ok(shape.lastDotCount>=1,
     width+'px '+period+' real last stored point dot');
    assert.ok(visible.every(p=>day(p.date)&&
     koreaRev7DisplayDayMs(p.date)<=koreaRev7DisplayDayMs(c.observationDate)),
      width+'px '+period+' no future or normalized impossible dates');
    sampled.push({period,storedRows:visible.length,nonNull:normalized.filter(p=>p.score!==null).length,
     contiguousSegments,lastActual:lastValid,empty:shape.empty,
     connectedCurves:goodPaths.length,lastDot:shape.lastDotCount});
   }
   const overflow=await live.evaluate(()=>({
    width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   assert.ok(overflow.scroll<=overflow.width+1,width+'px no Korea horizontal overflow');
   assert.deepEqual(errors,[],width+'px no Korea page JS error');
   console.log('W06_37_LIVE_KOREA_REV7',JSON.stringify({
    width,bodySnapshot:published.snapshotGeneratedAt,
    directSnapshot:fresh.snapshotGeneratedAt,
    samePublishedObservation:fresh.composite?.observationDate===c.observationDate
      &&fresh.composite?.score===c.score,
    composite:{status:c.status,rawScore:c.score,displayScore:c.displayScore,
     observationDate:c.observationDate,previousObservationDate:c.previousObservationDate,
     stageCode:c.stageCode,stageLabel:c.stageLabel,methodologyVersion:c.methodologyVersion,
     historyMode:c.historyMode,pointInTimeVerified:c.pointInTimeVerified,
     researchOnly:c.researchOnly,productionEligible:c.productionEligible},
    allStoredRows:history.length,invalidDates,newerStoredThanObservation:newer.length,
    firstStoredDay:history[0]?.date??null,lastStoredDay:history.at(-1)?.date??null,
    renderedStatus:actualStatus,periods:sampled,overflow,errors,
   }));
  }finally{await ctx.close();}
 }

}finally{await browser.close();}
