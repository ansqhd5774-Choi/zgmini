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

 // W06 #36 one-off PUBLIC/READ-ONLY actual CNN/PC archive and 1D..1Y UI probe.
 // Must not be merged as an external-network CI test.
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',colorScheme:'light'});
  const live=await ctx.newPage();
  const apiCalls=[],errors=[];
  live.on('pageerror',err=>errors.push(err.message));
  live.on('response',response=>{
   const url=new URL(response.url());
   if(url.hostname==='zgmini.kr'&&(url.pathname==='/api/fear-greed'||url.pathname==='/api/fear-greed/observations'))
    apiCalls.push({path:url.pathname,period:url.searchParams.get('period'),status:response.status()});
  });
  const root='https://zgmini.kr';
  try{
   const homepage=await live.goto(root+'/fear-greed/usa/',{waitUntil:'domcontentloaded',timeout:50000});
   assert.equal(homepage?.status(),200,'USA CNN page '+width+'px HTTP200');
   const intro=live.locator('#zg-about-intro-dialog');
   if(await intro.isVisible({timeout:1500}).catch(()=>false)){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
    await intro.waitFor({state:'hidden',timeout:15000});
   }
   const feedResponse=await live.request.get(root+'/api/fear-greed',{
    timeout:20000,headers:{accept:'application/json','cache-control':'no-cache'}
   });
   const feedStatus=feedResponse.status();
   if(feedStatus!==200){
    console.log('W06_36_LIVE_PUBLIC_FEED_BLOCKED',JSON.stringify({width,http:feedStatus,
     reason:(await feedResponse.text()).slice(0,450)}));
   }
   assert.equal(feedStatus,200,'actual stored CNN feed HTTP200');
   assert.equal(feedResponse.headers()['x-data-source'],'STORED','stored-only CNN GET');
   const feed=await feedResponse.json();
   assert.equal(feed.status,'verified','current CNN source verified');
   assert.ok(typeof feed.score==='number'&&Number.isFinite(feed.score)&&feed.score>=0&&feed.score<=100,
    'CNN current 0..100 finite');
   assert.ok(typeof feed.observedAt==='string'&&Number.isFinite(Date.parse(feed.observedAt)),
    'CNN source observedAt valid');
   assert.ok(Date.parse(feed.observedAt)<=Date.now()+300000,'CNN observation not in future');
   const rawHistory=Array.isArray(feed.history)?feed.history:[];
   const validHistory=rawHistory.filter(p=>{
    const at=p?.date??p?.timestamp,score=typeof p?.score==='number'?p.score:p?.value;
    return typeof at==='string'&&Number.isFinite(Date.parse(at))
     &&typeof score==='number'&&Number.isFinite(score)&&score>=0&&score<=100;
   });
   const markerScore=feed.score.toFixed(1)+'점';
   const panel=live.locator('[data-testid="cnn-reference-panel"]');
   await panel.waitFor({state:'visible',timeout:20000});
   // Real panel must show the exact published CNN original score, never a
   // recalculated score, publication time or fabricated missing value.
   await live.waitForFunction(score=>{
    const panel=document.querySelector('[data-testid="cnn-reference-panel"]');
    const label=panel?.querySelector('.cnn-score-orb[role="group"]')?.getAttribute('aria-label')??'';
    return label.includes(score)&&panel?.getAttribute('data-market-state')!=='loading';
   },markerScore,{timeout:20000});
   const state=await panel.getAttribute('data-market-state');
   const periodGroup=live.getByRole('group',{name:'CNN 지수 기간 선택'});
   await periodGroup.waitFor({state:'visible',timeout:15000});
   const periods=[];
   const dateValid=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
   const scoreValid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
   for(const period of ['1D','1W','1M','3M','6M','1Y']){
    const res=await live.request.get(root+'/api/fear-greed/observations?period='+period,
     {timeout:20000,headers:{accept:'application/json','cache-control':'no-cache'}});
    assert.equal(res.status(),200,'CNN archive '+period+' HTTP200');
    assert.equal(res.headers()['x-data-source'],'STORED','CNN archive '+period+' stored GET');
    const archive=await res.json();
    assert.equal(archive.period,period,'CNN archive period');
    assert.ok(['READY','PENDING'].includes(archive.status),period+' archive state');
    assert.equal(archive.checkTimeMeaning,'PC_VERIFIED_STORED_AT',period+' PC verified timestamps named');
    const points=Array.isArray(archive.points)?archive.points:[];
    const checks=Array.isArray(archive.checkedPoints)?archive.checkedPoints:[];
    for(const p of points)assert.ok(dateValid(p.observedAt)&&scoreValid(p.score),
      period+' source observation finite');
    for(const p of checks)assert.ok(dateValid(p.checkedAt)&&dateValid(p.sourceObservedAt)
      &&scoreValid(p.score)&&Date.parse(p.sourceObservedAt)<=Date.parse(p.checkedAt)+300000,
      period+' PC check contains separate sourceObservedAt');
    for(let i=1;i<points.length;i++)assert.ok(points[i-1].observedAt<points[i].observedAt,
      period+' source observations increasing');
    for(let i=1;i<checks.length;i++)assert.ok(checks[i-1].checkedAt<checks[i].checkedAt,
      period+' checked points increasing');
    assert.ok(archive.totalObservedPoints>=points.length,period+' source count contains sampled');
    assert.ok(archive.verifiedCheckCount>=checks.length,period+' verified checks count contains sampled');
    const button=periodGroup.locator('button[data-period-short="'+period+'"]');
    await Promise.all([
     live.waitForResponse(response=>{
      const u=new URL(response.url());
      return u.hostname==='zgmini.kr'&&u.pathname==='/api/fear-greed/observations'
       &&u.searchParams.get('period')===period;
     },{timeout:22000}),
     button.click(),
    ]);
    assert.equal(await button.getAttribute('aria-pressed'),'true',
     width+'px '+period+' selected');
    const chart=panel.locator('.cnn-history-chart-hitbox');
    const shape=await chart.locator('path.recharts-area-curve').evaluateAll(paths=>
     paths.map(p=>({d:p.getAttribute('d')??'',stroke:p.getAttribute('stroke')??'',
      dash:p.getAttribute('stroke-dasharray')??''})));
    const segments=shape.filter(p=>/^M/.test(p.d)&&/[CLQ]/.test(p.d.slice(1))
     &&p.stroke!=='none'&&!/NaN|Infinity/.test(p.d));
    periods.push({period,state:archive.status,sourceTotal:archive.totalObservedPoints,
     sourceReturned:points.length,checksTotal:archive.verifiedCheckCount,
     checksReturned:checks.length,
     sourceLast:points.at(-1)??null,
     pcCheckLast:checks.at(-1)??null,
     rawConnectedCurves:segments.length,
     curveCount:shape.length,
     chartEmpty:await panel.locator('.cnn-chart-empty').isVisible().catch(()=>false),
    });
    if(period==='1D'){
     const {currentCnnSessionHistory}=await import('../lib/cnn-current-session-history-r4.mjs');
     const {CNN_OBSERVED_HISTORY_VERSION}=await import('../lib/cnn-observed-history-r1.mjs');
     const old=feed.observedHistoryVersion===CNN_OBSERVED_HISTORY_VERSION?
       (Array.isArray(feed.intradayObservations)?feed.intradayObservations:[]):[];
     const displayed=archive.status==='READY'
      ?currentCnnSessionHistory(feed.observedAt,
       {checkedPoints:checks,observedPoints:points,intradayObservations:old})
      :currentCnnSessionHistory(feed.observedAt,{intradayObservations:old});
     const count=displayed.length;
     periods.at(-1).eligibleNewYorkSession=count;
     periods.at(-1).eligibleSessionLast=displayed.at(-1)??null;
     // Do not require a line if 0/1 genuine US-session observations exist.
     if(count>=2){
      await live.waitForFunction(()=>{
       const root=document.querySelector('[data-testid="cnn-reference-panel"]');
       return [...(root?.querySelectorAll('path.recharts-area-curve')??[])].some(p=>{
        const d=p.getAttribute('d')??'';
        const stroke=p.getAttribute('stroke')??getComputedStyle(p).stroke;
        return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&!/NaN|Infinity/.test(d)
         &&stroke!=='none'&&stroke!=='transparent';
       });
      },null,{timeout:20000});
      periods.at(-1).connectedAfterHydration=true;
     }else{
      periods.at(-1).singleOrEmptyWithoutFabricatedLine=true;
      // One observed point is not enough to create the 1D score trend.
      assert.equal(await panel.locator('path.recharts-area-curve').count(),0,
       width+'px 1D does not create fictitious connecting stroke');
     }
    }else if(['6M','1Y'].includes(period)&&validHistory.length>=2){
     // 6M/1Y use actual CNN daily closes; not PC check-time curves.
     await live.waitForFunction(()=>{
      const root=document.querySelector('[data-testid="cnn-reference-panel"]');
      return [...(root?.querySelectorAll('path.recharts-area-curve')??[])].some(p=>{
       const d=p.getAttribute('d')??'',stroke=p.getAttribute('stroke')??getComputedStyle(p).stroke;
       return /^M/.test(d)&&/[CLQ]/.test(d.slice(1))&&stroke!=='none'&&!/NaN|Infinity/.test(d);
      });
     },null,{timeout:20000});
     periods.at(-1).connectedDailyAfterHydration=true;
    }
   }
   const overflow=await live.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth
   }));
   assert.ok(overflow.scrollWidth<=overflow.width+1,'CNN '+width+'px no horizontal overflow');
   assert.deepEqual(errors,[],'CNN '+width+'px no JavaScript page errors');
   await live.screenshot({path:'artifacts/dashboard-history/cnn-live-w06-36-'+width+'.png',
    fullPage:false,timeout:20000});
   console.log('W06_36_LIVE_CNN_PUBLIC',JSON.stringify({
    width,source:'STORED',current:{status:feed.status,score:feed.score,
     observedAt:feed.observedAt,previousClose:feed.previous?.close??null,
     observedHistoryVersion:feed.observedHistoryVersion??null,
     sidecarPoints:feed.intradayObservations?.length??0,
     dailyRangeCount:feed.dailyObservedRanges?.length??0,
     dailyHistory:validHistory.length,
     lastDaily:validHistory.at(-1)??null,
     display:state,aria:await panel.locator('.cnn-score-orb[role="group"]').getAttribute('aria-label')},
    periods,overflow,errors,requests:apiCalls.length
   }));
  }finally{await ctx.close();}
 }

}finally{await browser.close();}
