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

 // W06 #42: one-shot actual public R13 readback / score + 7-factor and
 // revision-vintage monthly/quarterly chart. This external-network test
 // must be closed unmerged, not introduced as an ongoing CI prerequisite.
 const {recessionVerifiedDisplayScore,recessionVerifiedDisplayTrend}=
  await import('../lib/recession-stored-display-r4.mjs');
 const coreIds=['nfp','realGdp','industrialProduction','realPce','sahmGap','retailSales','disposableIncome'];
 const coreWeights=[0.25,0.15,0.15,0.15,0.10,0.10,0.10];
 const validRecessionDate=value=>typeof value==='string'
  &&/^\d{4}-\d{2}-\d{2}$/.test(value)
  &&Number.isFinite(Date.parse(value+'T00:00:00Z'))
  &&new Date(Date.parse(value+'T00:00:00Z')).toISOString().slice(0,10)===value;
 const finiteScore=value=>typeof value==='number'&&Number.isFinite(value)
  &&value>=0&&value<=100;
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',colorScheme:'light'});
  const live=await ctx.newPage(),errors=[],responses=[];
  live.on('pageerror',err=>errors.push(err.message));
  live.on('response',response=>{
   const u=new URL(response.url());
   if(u.hostname==='zgmini.kr'&&u.pathname==='/api/recession-detail'){
    responses.push({status:response.status(),json:response.json().catch(()=>null)});
   }
  });
  try{
   const page=await live.goto('https://zgmini.kr/recession/',{
    waitUntil:'domcontentloaded',timeout:50000});
   assert.equal(page?.status(),200,width+'px R13 public page returns HTML 200');
   const intro=live.locator('#zg-about-intro-dialog');
   if(await intro.isVisible({timeout:1500}).catch(()=>false)){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:15000});
   }
   const hero=live.locator('[data-testid="recession-detail-hero"]');
   await hero.waitFor({state:'visible',timeout:17000});
   await live.waitForFunction(()=>document.querySelector('[data-testid="recession-detail-hero"]')
    ?.getAttribute('aria-busy')==='false',null,{timeout:35000});
   const direct=await live.request.get('https://zgmini.kr/api/recession-detail',
    {timeout:25000,headers:{accept:'application/json','cache-control':'no-cache'}});
   const directBody=await direct.json();
   const requestMeta={http:direct.status(),status:directBody?.status??null,
    reason:directBody?.reason??null,projection:direct.headers()['x-public-projection']??null,
    projectionAt:direct.headers()['x-public-projection-at']??null,
    hydrationHttp:responses.at(-1)?.status??null};
   const client=responses.at(-1)?.status===200?await responses.at(-1).json:null;
   const payload=client??directBody;
   const score=recessionVerifiedDisplayScore(payload);
   const trend=recessionVerifiedDisplayTrend(payload,score).slice(-13);
   const status=await hero.getAttribute('data-market-state');
   const orb=await hero.locator('.cnn-score-orb[role="group"]').getAttribute('aria-label');
   const headerDate=(await hero.locator('.cnn-source strong').textContent())?.trim()??null;
   const scoreText=typeof score==='number'?score.toFixed(1)+'점':null;
   if(direct.status()===200){
    assert.equal(requestMeta.projection,'STORED','R13 read-only D1 projection GET');
    assert.equal(client?.status,directBody?.status,'R13 UI and direct GET same status');
    const known=['READY','PARTIAL','STALE','UNAVAILABLE'];
    assert.ok(known.includes(payload?.status),'known R13 projection status');
    if(score!==null){
     assert.equal(status,'ready','verified current-vintage score is ready');
     assert.ok(orb?.includes(scoreText),width+'px R13 score card equals stored score');
     assert.ok(validRecessionDate(payload.asOfDate),'R13 asOfDate strict Gregorian');
     const expectedDate=new Intl.DateTimeFormat('ko-KR',{
      dateStyle:'medium',timeZone:'Asia/Seoul'
     }).format(new Date(payload.asOfDate+'T00:00:00Z'));
     assert.equal(headerDate,expectedDate,width+'px R13 header shows real stored asOfDate');
    }else{
     assert.equal(status,'unavailable','no fake score on invalid R13 status/vintage');
     assert.ok(orb?.includes('—점'),'R13 unavailable is not a fabricated zero');
    }
   }else{
    assert.equal(direct.status(),503,'only approved stale/pending 503, not fake score');
    assert.ok(['STORED_PROJECTION_STALE','STORED_PROJECTION_PENDING']
     .includes(directBody?.reason),'explicit publication stale/pending status');
    assert.equal(status,'unavailable');
    assert.ok(orb?.includes('—점'));
   }
   const components=Array.isArray(payload?.components)?payload.components:[];
   const rows=live.locator('.recession-indicator-table-r2 tbody tr:not([data-development])');
   const mobileRows=live.locator('.recession-r2-mobile-card:not(.is-development)');
   const summaries=[],supplements=[],futureCore=[];
   if(direct.status()===200&&score!==null){
    assert.deepEqual(components.map(c=>c.id),coreIds,'R13 exact seven core factors');
    assert.equal(await rows.count(),7+(Array.isArray(payload?.supplementals)?payload.supplementals.length:0),
     'table shows real 7 core and only approved supplemental observations');
    assert.equal(await mobileRows.count(),await rows.count(),'mobile and table factor parity');
    for(let i=0;i<7;i++){
     const c=components[i],w=coreWeights[i],cells=rows.nth(i);
     assert.ok(Math.abs(c.weight-w)<1e-12,'approved immutable R13 factor weight');
     assert.ok(c.score===null||finiteScore(c.score),'core score 0-100/null');
     assert.ok(c.value===null||(typeof c.value==='number'&&Number.isFinite(c.value)),
      'stored core source value finite or explicit missing');
     assert.ok(c.observationDate===null||validRecessionDate(c.observationDate),
      'core actual observation Gregorian');
     if(c.observationDate&&c.observationDate>payload.asOfDate)
      futureCore.push({id:c.id,date:c.observationDate});
     const source=Array.isArray(c.trend)?c.trend:[];
     const realTrend=source.filter(point=>validRecessionDate(point?.date)
       &&typeof point.value==='number'&&Number.isFinite(point.value));
     const mini=cells.locator('svg.inflation-mini-chart'),count=await mini.count();
     if(source.length>=2){
      assert.equal(count,1,width+'px real '+c.id+' stored raw trend connected');
      const d=await mini.locator('path.inflation-mini-chart-line').getAttribute('d');
      assert.ok(d&&/^M/.test(d)&&/L/.test(d)&&!/NaN|Infinity/.test(d),
       c.id+' real history SVG path has connecting line');
     }else{
      assert.equal(count,0,c.id+' 0/1 raw observations cannot create a line');
     }
     const currentShown=await cells.locator('td.recession-r2-value').nth(1).textContent();
     summaries.push({id:c.id,weight:c.weight,score:c.score,
      value:c.value,observationDate:c.observationDate,
      previousObservationDate:c.previousObservationDate??null,
      rawPoints:source.length,validPoints:realTrend.length,
      rawLast:source.at(-1)??null,miniConnected:count===1,
      renderedCurrent:currentShown?.trim().slice(0,140)??null});
    }
    const expectedSupp=Array.isArray(payload.supplementals)?payload.supplementals:[];
    for(const c of expectedSupp){
     assert.ok(c.observationDate==null||validRecessionDate(c.observationDate),
      c.id+' supplemental original observation date strict');
     const tr=Array.isArray(c.trend)?c.trend:[];
     supplements.push({id:c.id,status:c.status,score:c.score,
      observationDate:c.observationDate,historyStatus:c.historyStatus??null,
      points:tr.length,latest:tr.at(-1)??null});
    }
    const comparisons=payload.scoreComparisons??{};
    for(const key of ['week','month','threeMonth','sixMonth','year'])
     assert.ok(comparisons[key]==null||(typeof comparisons[key]==='number'
      &&Number.isFinite(comparisons[key])),key+' comparison is saved or null');
    // Monthly/quarterly R13 display does not invent 1W calculation samples.
    assert.equal(comparisons.week??null,null,'weekly comparison intentionally absent');
    const chart=hero.locator('.fg-chart-slot');
    if(trend.length>=2){
     await live.waitForFunction(()=>{
      const root=document.querySelector('[data-testid="recession-detail-hero"]');
      return [...(root?.querySelectorAll('.fg-chart-slot path.recharts-area-curve')??[])]
       .some(p=>{const d=p.getAttribute('d')??'';
        const stroke=p.getAttribute('stroke')??getComputedStyle(p).stroke;
        return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))
         &&stroke!=='none'&&!/NaN|Infinity/.test(d);
       });
     },null,{timeout:20000});
    }else await chart.locator('.cnn-chart-empty').waitFor({state:'visible',timeout:20000});
    const curves=await chart.locator('path.recharts-area-curve').evaluateAll(paths=>
     paths.map(p=>({d:p.getAttribute('d')??'',stroke:p.getAttribute('stroke')??''})));
    const latestDot=chart.locator('.cnn-latest-point').first();
    let hoverDate=null;
    if(trend.length>=2&&await latestDot.count()>0){
     await latestDot.hover({force:true,timeout:15000});
     await live.waitForTimeout(280);
     const label=hero.locator('.cnn-history-tooltip span').first();
     if(await label.count()>0&&await label.isVisible())
      hoverDate=(await label.textContent())?.trim()??null;
    }
    const last=trend.at(-1)??null;
    const expected=last?new Intl.DateTimeFormat('ko-KR',{
     dateStyle:'medium',timeZone:'Asia/Seoul'
    }).format(new Date(last.label+'T00:00:00Z')):null;
    if(hoverDate&&expected)assert.equal(hoverDate,expected,
      width+'px hover shows verified latest stored R13 source date');
    assert.ok(trend.every(p=>p.label<=payload.asOfDate),
     'no future-dated R13 curve after display source gate');
    if(last&&last.label===payload.asOfDate)
     assert.equal(last.value,score,'current snapshot and last same-day real point identical');
    console.log('W06_42_LIVE_R13_CHART',JSON.stringify({width,sourceScore:score,
     asOfDate:payload.asOfDate,storedHistoryCount:payload.trend?.length??0,
     visibleHistoryCount:trend.length,first:trend[0]??null,last,
     lastEqualsCurrent:last?.value===score,lastDateEqualsAsOf:last?.label===payload.asOfDate,
     curves:curves.map(c=>({stroke:c.stroke,connected:/^M/.test(c.d)&&/[CLQ]/.test(c.d.slice(1)),
      invalid:/NaN|Infinity/.test(c.d)})),
     hoverDate,expected,comparisons,coreFactors:summaries,
     supplementalFactors:supplements,futureCore}));
   }
   const overflow=await live.evaluate(()=>({
    width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   assert.ok(overflow.scroll<=overflow.width+1,width+'px R13 horizontal overflow absent');
   assert.deepEqual(errors,[],width+'px R13 JavaScript errors absent');
   await live.screenshot({path:'artifacts/dashboard-history/recession-live-42-'+width+'.png',
    fullPage:false,timeout:20000});
   console.log('W06_42_LIVE_RECESSION_R13',JSON.stringify({
    width,...requestMeta,methodology:payload?.methodologyVersion??null,
    historyMode:payload?.historyMode??null,lookAheadSafe:payload?.lookAheadSafe??null,
    asOfDate:payload?.asOfDate??null,score:payload?.score??null,
    displayScore:score,displayState:status,scoreAria:orb,
    headerDate,visibleTrendPoints:trend.length,
    components:components.length,supplementals:supplements.length,
    noHistoryOrUnknown:trend.length<2,overflow,errors
   }));
  }finally{await ctx.close();}
 }

}finally{await browser.close();}
