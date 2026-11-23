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

   // Only public GETs: validate the Production informational rows without altering D1.
   const earningsPage=await context.newPage();
   const earningsReadback=[];
   try{
    const documentResponse=await earningsPage.goto(base+'/earnings-recession/',{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(documentResponse?.status(),200,'Production earnings page HTTP 200');
    const infoStatus=earningsPage.locator('.earnings-r2-cost-status');
    await infoStatus.waitFor({state:'visible',timeout:35000});
    const reasons={
     STORED_PROJECTION_PENDING:'게시 대기',
     PROJECTION_READ_UNAVAILABLE:'조회 불가',
     STORED_PROJECTION_INVALID:'자료 오류',
     SOURCE_RETRIEVAL_EXPIRED:'자료 갱신 지연',
     OBSERVATION_EXPIRED:'자료 갱신 지연',
     FUTURE_SOURCE_OR_PERIOD:'자료 시각 오류'
    };
    for(const item of [
     {label:'BEA 단위이익',path:'/api/earnings-recession-bea-unit-profit',field:'indicator',period:'observationPeriodEnd'},
     {label:'Census QFR',path:'/api/earnings-recession-census-qfr-margin',field:'rows',period:'observationPeriod'}
    ]){
     const response=await context.request.get(base+item.path,{timeout:30000,headers:{'cache-control':'no-cache'}});
     const httpStatus=response.status(),payload=await response.json();
     const reason=typeof payload?.reason==='string'?payload.reason:null;
     assert([200,503].includes(httpStatus),item.label+' unexpected Production HTTP '+httpStatus);
     await earningsPage.waitForFunction(label=>{
      const text=document.querySelector('.earnings-r2-cost-status')?.textContent??'';
      return text.includes(label+' ')&&!text.includes(label+' 연결 확인 중');
     },item.label,{timeout:35000});
     const shown=await infoStatus.innerText();
     if(httpStatus===503){
      const expected=reasons[reason]??'자료 조회 실패';
      assert(shown.includes(item.label+' '+expected),item.label+' Production 503 reason mismatch: '+reason+' / '+shown);
     }else{
      const row=item.field==='indicator'?payload?.indicator:payload?.rows?.[0];
      if(payload?.status==='READY'&&row&&Number.isFinite(row.value)){
       const formatted=item.field==='indicator'?'
  }finally{await context.close();}
 }
}finally{await browser.close();}
writeFileSync('artifacts/w06-production-readonly/results.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
assert.equal(results.length,12,'six periods across two production viewports');
console.log('W06_PRODUCTION_READONLY_CHECK_FINISHED '+JSON.stringify(results));
+row.value.toFixed(3):row.value.toFixed(2)+'%';
       assert(shown.includes(item.label+' 연결 완료'),item.label+' published READY is not connected: '+shown);
       const pageText=await earningsPage.locator('body').innerText();
       assert(pageText.includes(formatted),item.label+' published value/unit missing: '+formatted);
       assert(pageText.includes(String(row[item.period])),item.label+' observation period missing');
      }
     }
     earningsReadback.push({viewport:viewport.width,key:item.label,httpStatus,reason,uiStatus:shown,
      observationPeriod:httpStatus===200?(item.field==='indicator'?payload?.indicator?.observationPeriodEnd:payload?.rows?.[0]?.observationPeriod)??null:null});
    }
    await earningsPage.screenshot({path:'artifacts/w06-production-readonly/earnings-'+viewport.width+'.png',fullPage:false});
    console.log('W06_EARNINGS_PRODUCTION_READBACK '+JSON.stringify(earningsReadback));
   }finally{await earningsPage.close();}
   assert.deepEqual(errors,[],'no page errors at '+viewport.width);
  }finally{await context.close();}
 }
}finally{await browser.close();}
writeFileSync('artifacts/w06-production-readonly/results.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
assert.equal(results.length,12,'six periods across two production viewports');
console.log('W06_PRODUCTION_READONLY_CHECK_FINISHED '+JSON.stringify(results));
