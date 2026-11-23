import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// W06 production read-only acceptance. Uses only stored public GETs and UI clicks.
const base='https://zgmini.kr';
const viewports=[{width:390,height:844},{width:1440,height:900}];
const periods=['1D','1W','1M','3M','6M','1Y'];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
mkdirSync('artifacts/w06-production-readonly',{recursive:true});
try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,locale:'ko-KR',timezoneId:'Asia/Seoul',serviceWorkers:'block',hasTouch:viewport.width===390,isMobile:viewport.width===390});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   const response=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(response?.status(),200,'production homepage HTTP 200');
   // Dismiss the site's real introductory dialog via its normal UI control.
   // Without this, the dialog correctly intercepts chart clicks on fresh sessions.
   const intro=page.locator('#zg-about-intro-dialog');
   await page.waitForTimeout(1200);
   if(await intro.isVisible())await intro.getByRole('button',{name:'닫기',exact:true}).click();
   const controls=page.locator('.zg-r55-period');
   await controls.getByRole('button',{name:'1D',exact:true}).waitFor({timeout:35000});
   const api=await context.request.get(base+'/api/market-score/observations?period=1D',{timeout:30000});
   assert.equal(api.status(),200,'1D stored observation API HTTP 200');
   const body=await api.json();
   assert.equal(body.period,'1D');
   assert.equal(body.status,'READY');
   assert(Array.isArray(body.points),'published points must be array');
   for(const period of periods){
    await controls.getByRole('button',{name:period,exact:true}).click();
    await assert.doesNotReject(()=>controls.getByRole('button',{name:period,exact:true}).waitFor({state:'visible',timeout:10000}));
    const selected=controls.getByRole('button',{name:period,exact:true});
    await page.waitForFunction(label=>Array.from(document.querySelectorAll('.zg-r55-period button')).some(b=>b.textContent?.trim()===label&&b.getAttribute('aria-pressed')==='true'),period,{timeout:10000});
    await page.waitForTimeout(1800);
    const chart=page.locator('.zg-r55-summary-chart');
    const svg=chart.locator('svg.recharts-surface');
    const empty=chart.getByText('추이 데이터 준비 중');
    if(period==='1D'&&body.points.length===1){
     await page.getByText('실제 관측점 1개',{exact:false}).waitFor({timeout:20000});
     assert.equal(await empty.count(),0,'one actual point must not be hidden as empty');
     assert((await svg.count())>0,'single point actual SVG must mount');
     const marker=chart.locator('.recharts-reference-dot circle');
     assert((await marker.count())>0,'single point reference dot must render');
     const current=body.points[0];
     const displayed=Math.max(0,Math.min(100,50+(current.score-50)*3.5)).toFixed(1);
     const statusText=await chart.locator('[role=status]').innerText();
     assert(statusText.includes(displayed+'점'),'display sensitivity matches published raw point');
     const kst=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(current.observedAt));
     assert(statusText.includes(kst),'actual KST calculated time is shown');
     // Recharts tooltip is driven by chart mouse movement, not the ReferenceDot alone.
     const bounds=await marker.first().boundingBox();
     assert(bounds,'rendered marker has real page coordinates');
     await page.mouse.move(bounds.x+bounds.width/2-12,bounds.y+bounds.height/2);
     await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2,{steps:4});
     await page.waitForTimeout(450);
     const tip=page.locator('.zg-r55-summary-chart .recharts-tooltip-wrapper');
     assert((await tip.count())>0,'tooltip exists');
     const tooltipText=await tip.innerText();
     const tipVisibility=await tip.evaluate(el=>getComputedStyle(el).visibility);
     console.log('W06_SINGLE_TOOLTIP '+JSON.stringify({width:viewport.width,displayed,tooltipText,tipVisibility,markerBounds:bounds}));
     await page.screenshot({path:'artifacts/w06-production-readonly/point-'+viewport.width+'.png',fullPage:false});
     // A 390px viewport is not proof of a hover-capable input device. Record
     // the observed mobile tooltip state without claiming it passed.
     // Require actual hover tooltip content at the desktop 1440px viewport.
     if(viewport.width===1440)assert(tipVisibility==='visible'&&tooltipText.includes(displayed),'desktop hover shows true score');
     else console.log('W06_MOBILE_HOVER_NOT_CONFIRMED '+JSON.stringify({tipVisibility,tooltipText}));
    }
    // W06: verify a genuine multipoint stored curve with the latest actual point.
    // An SVG with two axis labels is not by itself proof of tooltip behavior.
    if(period==='1D'&&body.points.length>=2){
     assert.equal(await empty.count(),0,'two stored observations must not display empty');
     assert((await svg.count())>0,'multipoint actual SVG must mount');
     const latest=body.points.at(-1);
     const displayed=Math.max(0,Math.min(100,50+(latest.score-50)*3.5)).toFixed(1);
     const kst=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(latest.observedAt));
     const latestDot=chart.locator('.recharts-reference-dot circle').first();
     await latestDot.waitFor({state:'visible',timeout:15000});
     await latestDot.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest'}));
     await page.waitForTimeout(200);
     const bounds=await latestDot.boundingBox();
     assert(bounds&&bounds.width>0&&bounds.height>0,'latest marker has real visible bounds');
     const center={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
     const topHit=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);return {tag:el?.tagName??null,cls:el?.getAttribute('class')??null,aria:el?.getAttribute('aria-label')??null};},center);
     console.log('W06_MULTIPOINT_TARGET_HIT '+JSON.stringify({width:viewport.width,center,topHit}));
     const tip=viewport.width===390?chart.locator('[data-testid="w06-touch-tooltip"]'):chart.locator('.recharts-tooltip-wrapper');
     if(viewport.width===390){
      // An actual emulated touch must be used; mouse hover on 390px is not evidence.
      await page.touchscreen.tap(center.x,center.y);
     }else{
      await page.mouse.move(center.x-12,center.y);
      await page.mouse.move(center.x,center.y,{steps:4});
     }
     await page.waitForTimeout(500);
     const tipExists=(await tip.count())>0;
     const tipText=tipExists?await tip.innerText():'';
     const tipVisibility=tipExists?await tip.evaluate(el=>getComputedStyle(el).visibility):'missing';
     const evidence={width:viewport.width,points:body.points.length,lastAt:latest.observedAt,displayed,kst,tipVisibility,tipText,center};
     console.log('W06_MULTIPOINT_INTERACTION '+JSON.stringify(evidence));
     await page.screenshot({path:'artifacts/w06-production-readonly/multipoint-'+viewport.width+'.png',fullPage:false});
     const deployedTouchCapability=(await chart.locator('[data-w06-touch-tooltip-ready="true"]').count())>0;
     // Main already contains the approved touch implementation. A Production
     // run without the marker must now fail, not silently skip verification.
     if(viewport.width===390){
      assert(deployedTouchCapability,'merged W06 touch UI must be present in Production assets');
      const sideVeil=page.locator('button.zg-risk-side-veil[aria-label="열린 패널 닫기"]');
      assert(!(await sideVeil.isVisible()),'latest chart-point touch must not open market chat overlay');
     }
     assert(tipExists&&tipVisibility==='visible'&&tipText.includes(displayed)&&tipText.includes(kst),
       'actual '+(viewport.width===390?'mobile touch':'desktop hover')+' latest 1D point tooltip matches public data');
    }
    assert.equal(await selected.getAttribute('aria-pressed'),'true',period+' selected');
    const dimension=await page.evaluate(()=>({innerWidth:window.innerWidth,documentWidth:document.documentElement.scrollWidth}));
    assert.equal(dimension.innerWidth,viewport.width,'real tested viewport width');
    assert(dimension.documentWidth<=dimension.innerWidth+2,period+' no document horizontal overflow');
    results.push({viewport:viewport.width,period,svgCount:await svg.count(),emptyCount:await empty.count(),points1D:body.points.length,documentWidth:dimension.documentWidth});
   }
   await controls.getByRole('button',{name:'1D',exact:true}).click();
   await page.waitForTimeout(1100);
   await page.screenshot({path:'artifacts/w06-production-readonly/home-'+viewport.width+'-1D.png',fullPage:false});

   // Read-only W06 information-row acceptance against actual Production responses.
   const earnings=await context.newPage();
   try{
    const doc=await earnings.goto(base+'/earnings-recession/',{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(doc?.status(),200,'earnings production document');
    // Reuse the homepage's real first-visit dialog dismissal before testing an interactive help button.
    const earningsIntro=earnings.locator('#zg-about-intro-dialog');
    await earnings.waitForTimeout(1200);
    if(await earningsIntro.isVisible()){
     await earningsIntro.getByRole('button',{name:'닫기',exact:true}).click();
     await earningsIntro.waitFor({state:'hidden',timeout:10000});
    }
    const status=earnings.locator('.earnings-r2-cost-status');
    await status.waitFor({state:'visible',timeout:35000});
    const reasons={STORED_PROJECTION_PENDING:'게시 대기',PROJECTION_READ_UNAVAILABLE:'조회 불가',
     STORED_PROJECTION_INVALID:'자료 오류',SOURCE_RETRIEVAL_EXPIRED:'자료 갱신 지연',
     OBSERVATION_EXPIRED:'자료 갱신 지연',FUTURE_SOURCE_OR_PERIOD:'자료 시각 오류'};
    for(const item of [
     {name:'BEA 단위이익',path:'/api/earnings-recession-bea-unit-profit',kind:'unit'},
     {name:'Census QFR',path:'/api/earnings-recession-census-qfr-margin',kind:'qfr'}
    ]){
     const response=await context.request.get(base+item.path,{timeout:30000,headers:{'cache-control':'no-cache'}});
     const http=response.status();
     assert([200,503].includes(http),item.name+' HTTP '+http);
     const payload=await response.json();
     await earnings.waitForFunction(name=>{
      const s=document.querySelector('.earnings-r2-cost-status')?.textContent??'';
      return s.includes(name+' ')&&!s.includes(name+' 연결 확인 중');
     },item.name,{timeout:35000});
     const label=await status.innerText(),reason=typeof payload?.reason==='string'?payload.reason:null;
     if(http===503){
      const expected=reasons[reason]??'자료 조회 실패';
      assert(label.includes(item.name+' '+expected),item.name+' API/UI state mismatch: '+reason+' / '+label);
     }else{
      const row=item.kind==='unit'?payload?.indicator:payload?.rows?.[0];
      if(payload?.status==='READY'&&row&&Number.isFinite(row.value)){
       assert(label.includes(item.name+' 연결 완료'),item.name+' READY API/UI mismatch');
       const value=item.kind==='unit'?String.fromCharCode(36)+row.value.toFixed(3):row.value.toFixed(2)+'%';
       const period=item.kind==='unit'?row.observationPeriodEnd:row.observationPeriod;
       const text=await earnings.locator('body').innerText();
       assert(text.includes(value),item.name+' published value/unit absent: '+value);
       assert(text.includes(String(period)),item.name+' published period absent');
       if(item.kind==='unit'&&row.transport==='BEA_API_JSON'){
        assert.equal(row.seriesId,'A463RD','native BEA series identity');
        assert.equal(row.sourceURL,'https://apps.bea.gov/api/data','native BEA URL');
        assert.match(payload.sourceVersion,/^[a-f0-9]{64}$/,'public source version');
        const indicator=earnings.locator(viewport.width===390
         ?'article.earnings-r2-mobile-card[data-source="bea-unit-profit"]'
         :'tr.earnings-r2-cost-row[data-source="bea-unit-profit"]');
        const infoButton=indicator.getByRole('button',{name:'비금융기업 단위이익 도움말'});
        if(viewport.width===390)await infoButton.tap();
        else await infoButton.click();
        const sourceLink=earnings.getByRole('tooltip')
         .getByRole('link',{name:'BEA 공식 API 원자료'});
        await sourceLink.waitFor({state:'visible',timeout:12000});
        assert.equal(await sourceLink.getAttribute('href'),row.sourceURL,
         'deployed PC/mobile source link must match actual native BEA payload');
        console.log('W05_BEA_NATIVE_PRODUCTION_SOURCE '+JSON.stringify({
         width:viewport.width,sourceVersion:payload.sourceVersion,
         sourceURL:row.sourceURL,sourceLabel:await sourceLink.innerText(),
         observedPeriod:period,value:row.value}));
        await earnings.keyboard.press('Escape');
       }
      }
     }
     console.log('W06_EARNINGS_PRODUCTION_READBACK '+JSON.stringify({width:viewport.width,name:item.name,http,reason,uiStatus:label}));
    }
    await earnings.screenshot({path:'artifacts/w06-production-readonly/earnings-'+viewport.width+'.png',fullPage:false});
    // Verify the already merged BEA API attribution on the actual public page.
    const sources=await context.newPage();
    try{
     const sourcePage=await sources.goto(base+'/data-sources/',{
      waitUntil:'domcontentloaded',timeout:60000});
     assert.equal(sourcePage?.status(),200,'production data sources page');
     const notice=sources.getByText('This product uses the Bureau of Economic Analysis (BEA) Data API but is not endorsed or certified by BEA.',{exact:false});
     await notice.waitFor({state:'visible',timeout:15000});
     assert.equal(await sources.getByRole('link',{name:'BEA Data API Terms of Use'}).getAttribute('href'),
      'https://apps.bea.gov/api/_pdf/bea_api_tos.pdf');
     console.log('W05_BEA_NATIVE_NOTICE_PRODUCTION '+JSON.stringify({
      width:viewport.width,noticePresent:true,termsURL:'https://apps.bea.gov/api/_pdf/bea_api_tos.pdf'}));
    }finally{await sources.close();}
   }finally{await earnings.close();}
   assert.deepEqual(errors,[],'no page errors at '+viewport.width);
  }finally{await context.close();}
 }
}finally{await browser.close();}
writeFileSync('artifacts/w06-production-readonly/results.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
assert.equal(results.length,12,'six periods across two production viewports');
console.log('W06_PRODUCTION_READONLY_CHECK_FINISHED '+JSON.stringify(results));
