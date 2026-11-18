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

 // W06 #41 one-shot live read-only Inflation R2 score/axes/12-month-line probe.
 // No permanent external CI gate, no provider calls and no D1 writes.
 const riskFeatureIds=['CORE_PCE','CORE_CPI','CORE_CPI_3M','MEDIAN_CPI','TRIM16_CPI',
  'HEADLINE_PCE','INF_EXPECT','PPI_FINAL','PPI_CORE_FD','IMPORT_EX_FUEL',
  'WTI','GASOLINE','WAGE_YOY','ECI_COST','UNIT_LABOR_COST','INDPRO'];
 const axisIds=['TARGET_STABILITY','UNDERLYING_MOMENTUM','HEADLINE_PRESSURE',
  'EXPECTATIONS','SUPPLY_PIPELINE','LABOR_COST_PERSISTENCE','DEMAND_CONTEXT'];
 const validRiskScore=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
 const validDay=value=>typeof value==='string'
  &&/^\d{4}-\d{2}-\d{2}$/.test(value)
  &&Number.isFinite(Date.parse(value+'T00:00:00.000Z'))
  &&new Date(Date.parse(value+'T00:00:00.000Z')).toISOString().slice(0,10)===value;
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',colorScheme:'light'});
  const live=await context.newPage();
  const accepted=[],errorMessages=[];
  live.on('pageerror',err=>errorMessages.push(err.message));
  live.on('response',response=>{
   const u=new URL(response.url());
   if(u.hostname==='zgmini.kr'&&u.pathname==='/api/inflation-detail')
    accepted.push({status:response.status(),url:response.url(),
      promise:response.json().catch(()=>null)});
  });
  try{
   const pageResp=await live.goto('https://zgmini.kr/inflation/',
    {waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(pageResp?.status(),200,'W06 #41 actual Inflation page HTML');
   const intro=live.locator('#zg-about-intro-dialog');
   if(await intro.isVisible({timeout:1200}).catch(()=>false)){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:14000});
   }
   const hero=live.locator('[data-testid="inflation-detail-hero"]');
   await hero.waitFor({state:'visible',timeout:15000});
   await live.waitForFunction(()=>document.querySelector('[data-testid="inflation-detail-hero"]')
    ?.getAttribute('aria-busy')==='false',null,{timeout:35000});
   const direct=await live.request.get('https://zgmini.kr/api/inflation-detail',{
    timeout:25000,headers:{accept:'application/json','cache-control':'no-cache'}
   });
   const status=direct.status();
   const directBody=await direct.json();
   const observedClient=accepted.length?await accepted.at(-1).promise:null;
   const usedBody=observedClient&&accepted.at(-1).status===200
    ?observedClient:directBody;
   const apiMeta={width,http:status,clientHttp:accepted.at(-1)?.status??null,
    projectedAt:direct.headers()['x-public-projection-at']??null,
    projectionType:direct.headers()['x-public-projection']??null,
    reason:status!==200?directBody?.reason??null:null};
   let rows=[],trend=[],latest=null,axes=[],features=[];
   if(status===200){
    assert.equal(direct.headers()['x-public-projection'],'STORED','only approved published R2 GET');
    assert.equal(usedBody?.status,directBody?.status,'same projection state');
    const p=usedBody;
    assert.ok(['READY','PARTIAL','STALE','UNAVAILABLE'].includes(p?.status),
     'known Inflation R2 stored projection status');
    const isReady=p.status==='READY'&&validRiskScore(p.score);
    assert.equal(await hero.getAttribute('data-market-state'),validRiskScore(p.score)?'ready':'unavailable');
    const visible=await hero.locator('.cnn-score-orb[role="group"]').getAttribute('aria-label');
    if(isReady){
     assert.ok(visible?.includes(p.score.toFixed(1)+'점'),
      width+'px rendered Inflation detail score matches stored current R2');
     assert.ok(validDay(p.asOfDate),'stored R2 asOfDate strict Gregorian');
     const label=new Intl.DateTimeFormat('ko-KR',{
      dateStyle:'medium',timeZone:'Asia/Seoul'
     }).format(new Date(Date.parse(p.asOfDate+'T00:00:00Z')));
     assert.equal(await hero.locator('.cnn-source strong').textContent(),label,
      'source asOf day equals displayed header, not retrievedAt or publication at');
    }else assert.ok(visible?.includes('—점'),
     'missing/partial/stale R2 score cannot appear as fabricated zero');
    axes=axisIds.map(id=>{
     const value=p.axes?.[id];
     return {id,score:validRiskScore(value)?value:null};
    });
    const cards=live.locator('.inflation-r2-axis-grid .inflation-r2-axis-item');
    assert.equal(await cards.count(),7,'7 real Inflation R2 axes');
    for(let i=0;i<7;i++){
     const a=axes[i];
     const el=cards.nth(i).locator('.inflation-r2-axis-top strong');
     const text=(await el.textContent())?.trim()??'';
     const expected=isReady&&a.score!==null?a.score.toFixed(1):'—';
     assert.equal(text,expected,width+'px '+a.id+' real-axis displayed score');
    }
    const vals=axes.map(v=>v.score);
    if(isReady&&vals.every(v=>v!==null)){
     const average=vals.reduce((sum,v)=>sum+v,0)/7;
     assert.ok(Math.abs(average-p.score)<0.000001,
      'stored published score equals exact 7 approved equally weighted axes');
    }
    const featureRows=live.locator('.inflation-indicator-table-r2 tbody tr:not([data-development])');
    const mobileRows=live.locator('.inflation-r2-mobile-card:not(.is-development)');
    assert.equal(await featureRows.count(),16,'16 actual inflation R2 input rows');
    assert.equal(await mobileRows.count(),16,'16 mobile feature rows (same published input)');
    features=riskFeatureIds.map(id=>{
     const row=p.features?.[id];
     const rawChart=Array.isArray(row?.trend)?row.trend:[];
     return {id,hasFeature:row!==null&&row!==undefined,rawValue:row?.value??null,
      availableAt:row?.availableAt??null,
      score:validRiskScore(row?.score)?row.score:null,
      trendPoints:rawChart.filter(v=>typeof v?.date==='string'&&Number.isFinite(v?.value)).length};
    });
    for(let i=0;i<features.length;i++){
     const item=features[i];
     // Feature sparklines are strictly based on saved, finite raw values;
     // do not require a line when 0/1 available points.
     const svg=featureRows.nth(i).locator('svg.inflation-mini-chart');
     const drawn=await svg.count()>0;
     if(item.trendPoints<2)assert.equal(drawn,false,item.id+' no invented 1Y mini line');
     else {
      assert.equal(drawn,true,item.id+' real 1Y mini line');
      const d=await svg.locator('path.inflation-mini-chart-line').getAttribute('d');
      assert.ok(d&&/^M/.test(d)&&/L/.test(d)&&!/NaN|Infinity/.test(d),
       item.id+' connected real raw feature time series');
     }
    }
    rows=Array.isArray(p.trend)?p.trend:[];
    trend=rows.filter(point=>typeof point?.label==='string'
      &&typeof point?.value==='number'&&Number.isFinite(point.value)).slice(-12);
    latest=trend.at(-1)??null;
    const future=trend.filter(point=>validDay(point.label)&&validDay(p.asOfDate)
      &&point.label>p.asOfDate);
    const chart=hero.locator('.fg-chart-slot');
    if(trend.length>=2){
     await live.waitForFunction(()=>{
      const root=document.querySelector('[data-testid="inflation-detail-hero"]');
      return [...(root?.querySelectorAll('.fg-chart-slot path.recharts-area-curve')??[])]
       .some(path=>{const d=path.getAttribute('d')??'';
        const stroke=path.getAttribute('stroke')??getComputedStyle(path).stroke;
        return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&!/NaN|Infinity/.test(d)
          &&stroke!=='none'&&stroke!=='transparent';});
     },null,{timeout:25000});
    }else await live.waitForFunction(()=>{
     const root=document.querySelector('[data-testid="inflation-detail-hero"]');
     return !!root?.querySelector('.fg-chart-slot .cnn-chart-empty');
    },null,{timeout:18000});
    const curves=await chart.locator('path.recharts-area-curve').evaluateAll(paths=>
     paths.map(e=>({path:e.getAttribute('d'),stroke:e.getAttribute('stroke')})));
    const dots=await chart.locator('.cnn-latest-point').count();
    const futureNewest=latest&&validDay(p.asOfDate)&&latest.label>p.asOfDate;
    console.log('W06_41_ACTUAL_RISK_CHART',JSON.stringify({
     width,publishedScore:p.score,asOfDate:p.asOfDate,
     latestPublishedTrend:latest,
     futurePublishedTrendPoints:future,historyRawCount:rows.length,historyValidCount:trend.length,
     currentEqualsLast:latest?.value===p.score,
     currentAsOfEqualsLast:latest?.label===p.asOfDate,
     futureNewest,curves,dots,
    }));
    // Report a leaked future-dated line as a distinct UI issue. The *last*
    // observed score MUST NOT have a future date.
    if(futureNewest){
     const futureIsVisible=curves.some(x=>x.path&&x.stroke!=='none');
     console.log('W06_41_FUTURE_DATE_VISIBILITY',JSON.stringify({width,
      publishedAsOf:p.asOfDate,futureLabel:latest.label,
      sourceStatus:p.status,futureIsVisible,requiresW06UiGuard:futureIsVisible}));
    }
    if(trend.length>=2)assert.ok(curves.some(x=>x.path&&x.stroke!=='none'),
     width+'px stored valid 12-month history must render connected curve');
    if(trend.length<2)assert.equal(dots,0,
     width+'px no fake endpoint from insufficient inflation trend');
   }else{
    assert.equal(status,503,'R2 only 200 or correctly unavailable 503');
    assert.ok(['STORED_PROJECTION_STALE','STORED_PROJECTION_PENDING'].includes(directBody?.reason),
     'stored R2 cache unavailable must be explicit');
    assert.equal(await hero.getAttribute('data-market-state'),'unavailable',
     width+'px 503 stored R2 is not displayed as valid score');
    assert.ok((await hero.locator('.cnn-score-orb[role="group"]').getAttribute('aria-label'))?.includes('—점'),
     width+'px 503 stored R2 score absent, never zero');
   }
   const overflow=await live.evaluate(()=>({
    client:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
   }));
   assert.ok(overflow.scroll<=overflow.client+1,
    width+'px detail page no horizontal overflow');
   assert.deepEqual(errorMessages,[],width+'px no page JS errors');
   await live.screenshot({path:'artifacts/dashboard-history/inflation-r2-live-41-'+width+'.png',
    fullPage:false,timeout:20000});
   console.log('W06_41_LIVE_INFLATION_R2',JSON.stringify({
    ...apiMeta,status:usedBody?.status??null,score:usedBody?.score??null,
    methodologyVersion:usedBody?.methodologyVersion??null,
    asOfDate:usedBody?.asOfDate??null,updatedAt:usedBody?.updatedAt??null,
    clientAndDirectScoreAgree:usedBody?.score===directBody?.score,
    axes,featureSummary:features,
    visibleTrend:trend,
    rawTrendCount:rows.length,
    renderedMarketState:await hero.getAttribute('data-market-state'),
    overflow,errors:errorMessages
   }));
  }finally{await context.close();}
 }

}finally{await browser.close();}
