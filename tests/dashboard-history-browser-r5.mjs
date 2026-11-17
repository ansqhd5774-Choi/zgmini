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
  const curve=page.locator('.zg-r55-summary-chart path.recharts-area-curve');
  await curve.waitFor({state:'visible'});
  await page.locator('.usa-target-card path.recharts-area-curve').waitFor({state:'visible'});
  await page.reload({waitUntil:'networkidle'});
  await intro.waitFor({state:'hidden'});
  await curve.waitFor({state:'visible'});
  const year=await curve.getAttribute('d');
  const periods=page.getByRole('group',{name:'종합 시장 점수 추이 기간'});
  await periods.getByRole('button',{name:'1M',exact:true}).click();
  await page.waitForFunction(old=>document.querySelector('.zg-r55-summary-chart path.recharts-area-curve')?.getAttribute('d')!==old,year);
  const month=await curve.getAttribute('d');
  revision=2;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByRole('img',{name:'종합 시장 점수 60.5점',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(old=>document.querySelector('.zg-r55-summary-chart path.recharts-area-curve')?.getAttribute('d')!==old,month);
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
   await curve.waitFor({state:'visible',timeout:15000});
   const path=await curve.getAttribute('d');
   assert.ok(path?.startsWith('M')&&!/NaN|Infinity/.test(path),
    width+'px '+label+' chart has finite geometry');
   assert.equal(await page.locator('.zg-r55-card-grid article').count(),12);
  }
  // A real zero score remains visible, not a null/missing placeholder, on
  // each responsive viewport and the 1D calc archive.
  await periods.getByRole('button',{name:'1D',exact:true}).click();
  revision=3;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByRole('img',{name:'종합 시장 점수 0.0점',exact:true})
   .waitFor({state:'visible',timeout:15000});
  await curve.waitFor({state:'visible',timeout:15000});
  assert.equal(await periods.getByRole('button',{name:'1D',exact:true}).getAttribute('aria-pressed'),'true');
  await page.screenshot({path:`artifacts/dashboard-history/history-${width}.png`});
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: 6 chart periods, newer snapshot and true zero in mocked Chromium`);
  await page.close();
 }
  // W06 #75 isolated PRODUCTION smoke: public webpage only (zero app/API writes).
  // This one-off draft will not be merged into the permanent mocked CI suite.
  // The active Cloudflare deployment SHA and private D1 body/stored_at are
  // intentionally outside this browser's verification scope.
  for(const width of [390,1440]){
   const liveContext=await browser.newContext({
    viewport:{width,height:900},locale:'ko-KR',colorScheme:'light',
   });
   const live=await liveContext.newPage();
   const errors=[],requests=[];
   live.on('pageerror',error=>errors.push(error.message.slice(0,250)));
   live.on('response',response=>{
    const u=new URL(response.url());
    if(u.hostname==='zgmini.kr'&&['/api/market-score','/api/market-score/observations'].includes(u.pathname)){
     requests.push({path:u.pathname,status:response.status()});
    }
   });
   try{
    const result=await live.goto('https://zgmini.kr/',{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(result?.status(),200,'Production homepage must return HTML 200');
    const dialog=live.locator('#zg-about-intro-dialog');
    if(await dialog.isVisible({timeout:2000}).catch(()=>false)){
     await dialog.getByRole('button',{name:'닫기',exact:true}).click();
     await dialog.waitFor({state:'hidden',timeout:12000});
    }
    const cards=live.locator('.zg-r55-card-grid article');
    await cards.first().waitFor({state:'visible',timeout:40000});
    assert.equal(await cards.count(),12,'Live production must show twelve domain cards');
    const periods=live.getByRole('group',{name:'종합 시장 점수 추이 기간'});
    await periods.waitFor({state:'visible',timeout:25000});
    // Target the *actual* composite score card; another earlier summary
    // image has an unrelated accessible name while its chart is empty.
    const scorePanel=live.locator('.zg-r55-summary-top[role="img"]');
    await scorePanel.waitFor({state:'visible',timeout:25000});
    const currentResponse=await live.request.get('https://zgmini.kr/api/market-score',{
     timeout:15000,headers:{accept:'application/json','cache-control':'no-cache'},
    });
    const currentBody=await currentResponse.json();
    const currentReady=currentResponse.status()===200&&currentBody?.status==='SUCCESS'
     &&currentBody?.overall?.status==='READY'
     &&typeof currentBody?.overall?.score==='number'&&Number.isFinite(currentBody.overall.score);
    if(currentReady){
     await live.waitForFunction(()=>{
      const label=document.querySelector('.zg-r55-summary-top[role="img"]')
       ?.getAttribute('aria-label')??'';
      return /종합 시장 점수 [0-9]+\\.[0-9]점$/.test(label);
     },null,{timeout:25000});
    }
    const summary=await scorePanel.getAttribute('aria-label');
    assert.match(summary??'',/종합 시장 점수/);
    if(currentReady)assert.match(summary??'',/종합 시장 점수 [0-9]+\\.[0-9]점$/,
     'Public READY score must render as a number in the exact main card');
    for(const period of ['1D','1W','1M','3M','6M','1Y']){
     const button=periods.getByRole('button',{name:period,exact:true});
     await button.click();
     assert.equal(await button.getAttribute('aria-pressed'),'true',
      width+'px live '+period+' must be selected');
     assert.equal(await cards.count(),12);
    }
    await live.screenshot({path:`artifacts/dashboard-history/live-production-${width}.png`,fullPage:false,timeout:20000});
    console.log('W06_75_LIVE_PRODUCTION',JSON.stringify({
     viewport:width,htmlStatus:result?.status(),domainCards:await cards.count(),
     summaryAria:summary?.slice(0,140),periodsTested:6,
     publicScoreResponse:{httpStatus:currentResponse.status(),
      status:currentBody?.status??null,overallStatus:currentBody?.overall?.status??null,
      score:typeof currentBody?.overall?.score==='number'?currentBody.overall.score:null},
     apiRequests:requests.slice(0,22),pageErrors:errors
    }));
    assert.deepEqual(errors,[],'Live production browser must not have JS page errors');
   }finally{await liveContext.close();}
  }
}finally{await browser.close();}
