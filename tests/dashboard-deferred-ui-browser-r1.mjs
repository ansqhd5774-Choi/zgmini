import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Isolated local browser fixtures. No real account, data write, or analytics.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
mkdirSync('artifacts/dashboard-deferred-ui',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const sampleHistory=Array.from({length:90},(_,i)=>({date:new Date(Date.UTC(2026,7,1)+i*86400000).toISOString().slice(0,10),score:45+Math.sin(i/8)*12}));
const breadthR2Points=[
 {date:'2026-11-24',risingPct:40,unchangedPct:5,fallingPct:55},
 {date:'2026-11-25',risingPct:38,unchangedPct:5,fallingPct:57},
 {date:'2026-11-26',risingPct:35,unchangedPct:5,fallingPct:60},
];
const breadthR2Current={
 status:'READY',market:'usa',phase:'CONFIRMED',
 source:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY',
 observationDate:'2026-11-26',current:breadthR2Points.at(-1),
};
const breadthR2History={...breadthR2Current,points:breadthR2Points,
 firstDate:'2026-11-24',lastDate:'2026-11-26',historyComplete:false};
// Restored display-only breadth slots must not call retired suppliers or old history APIs.
try{
 for(const width of [390,1440])for(const signedIn of [false,true]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});
  const modules=[],errors=[];
  let retiredBreadthRequests=0;
  const breadthR2Requests=[];
  page.on('request',request=>modules.push(new URL(request.url()).pathname));
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.route('https://**',route=>route.abort());
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url());
   const path=url.pathname;
   const isPaidCurrent=path==='/api/market-breadth'&&url.searchParams.get('phase')==='confirmed-r2';
   const isPaidHistory=path==='/api/market-breadth-r2-history'&&url.searchParams.get('market')==='usa';
   if(isPaidCurrent||isPaidHistory)breadthR2Requests.push(path);
   const payload=path==='/api/session'?{user:signedIn?{displayName:'UI fixture',email:'fixture@example.invalid'}:null}
    :path==='/api/favorites'?{favorites:[]}
    :path==='/api/market-data'?{status:'fallback',updatedAt:'',indicators:{},summary:[]}
    :path==='/api/fear-greed'?{status:'verified',score:34.5,rating:'공포',observedAt:'2026-10-30T12:00:00Z',history:sampleHistory}
    :path==='/api/fear-greed/observations'?{
      status:'READY',period:url.searchParams.get('period'),
      points:[
       {observedAt:'2026-10-29T12:00:00Z',score:33.1},
       {observedAt:'2026-10-30T12:00:00Z',score:34.5},
      ],checkedPoints:[],
    }
    :isPaidCurrent?breadthR2Current
    :isPaidHistory?breadthR2History
    :path.startsWith('/api/market-breadth')?(retiredBreadthRequests++,{status:'UNAVAILABLE'})
    :{status:'UNAVAILABLE'};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(base,{waitUntil:'networkidle',timeout:45000});
  await page.locator('.zg-dashboard[data-view="dashboard"]').waitFor({state:'visible'});
  const header=await page.locator('.zg-country-section .zg-section-heading').evaluate(el=>{
   const title=el.querySelector('h1').getBoundingClientRect(),guide=el.querySelector('a').getBoundingClientRect();
   return {overlap:title.left<guide.right&&title.right>guide.left&&title.top<guide.bottom&&title.bottom>guide.top,
    overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(header.overlap,false,'Market title and guide remain separate');
  assert.equal(header.overflow,false,'Dashboard has no horizontal overflow');

  // Regression: the October breadth inline grid override must not override
  // the previously approved mobile dashboard row height (112px).
  const marketLayout=await page.evaluate(()=>['usa','korea'].map(market=>{
   const card=document.querySelector('.'+market+'-target-card.fg-shared-shell');
   if(!card)return {market,missing:true};
   const score=card.querySelector('.fg-score-slot')?.getBoundingClientRect();
   const chart=card.querySelector('.fg-chart-slot')?.getBoundingClientRect();
   const breadth=card.querySelector('.fg-breadth-slot');
   const breadthBox=breadth?.getBoundingClientRect();
   const footer=card.querySelector('.fg-footer-slot')?.getBoundingClientRect();
   const rows=getComputedStyle(card).gridTemplateRows.trim().split(/\s+/).map(Number.parseFloat);
   return {market,missing:false,inlineGridRows:card.style.gridTemplateRows,
    rows,scoreHeight:score?.height??0,chartHeight:chart?.height??0,
    breadthPresent:Boolean(breadth),breadthHeight:breadthBox?.height??0,
    breadthBottom:breadthBox?.bottom??0,footerTop:footer?.top??0,footerHeight:footer?.height??0};
  }));
  for(const m of marketLayout){
   assert.equal(m.missing,false,m.market+' market card exists');
   assert.equal(m.inlineGridRows,'',m.market+' no obsolete breadth inline row override');
   assert.equal(m.breadthPresent,true,m.market+' verified-data breadth display shell restored');
   assert.ok(m.breadthHeight>=35,m.market+' restored summary height');
   assert.ok(m.breadthBottom<=m.footerTop+1,m.market+' breadth and footer do not overlap');
   assert.ok(m.footerHeight>0,m.market+' existing footer remains visible');
   if(width===390){
    assert.ok(Math.abs(m.rows[1]-112)<1,m.market+' mobile grid preserves pre-breadth 112px row');
    assert.ok(Math.abs(m.scoreHeight-112)<1,m.market+' mobile score remains 112px');
    assert.ok(Math.abs(m.chartHeight-112)<1,m.market+' mobile chart remains 112px');
   }else{
    assert.ok(Math.abs(m.rows[1]-142)<1,m.market+' desktop content row remains 142px');
   }
  }
  console.log('PASS rollback original rows '+width+'px signedIn='+signedIn+': '+JSON.stringify(marketLayout));
  if(width===390&&!signedIn){
   await page.locator('.usa-target-card path.recharts-area-curve').waitFor({state:'visible',timeout:15000});
   const chart=page.locator('.usa-target-card .recharts-surface').first();
   await chart.waitFor({state:'visible',timeout:15000});
   const box=await chart.boundingBox();
   assert.ok(box&&box.width>100,'USA mobile chart is rendered');
   const x=box.x+box.width*0.5,y=box.y+box.height*0.5;
   const cdp=await page.context().newCDPSession(page);
   const tip=page.locator('.usa-target-card .cnn-history-tooltip');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
   await page.waitForTimeout(120);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+12,y,id:1}]});
   await page.waitForTimeout(120);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+24,y,id:1}]});
   await page.waitForTimeout(120);
   await tip.waitFor({state:'visible',timeout:5000});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await tip.waitFor({state:'hidden',timeout:3000});
   console.log('PASS mobile chart tooltip disappears on touch release');

   assert.equal(await page.locator('.usa-target-card .fg-breadth-slot, .korea-target-card .fg-breadth-slot').count(),2,
    'US paid R2 and Korean display-only breadth slots remain mounted');
   const us=page.locator('.usa-target-card .fg-breadth-slot');
   const kr=page.locator('.korea-target-card .fg-breadth-slot');
   await us.locator('[aria-label="상승: 35.0%"]').waitFor({state:'visible'});
   for(const [label,value] of [['상승','35.0%'],['보합','5.0%'],['하락','60.0%']]){
    assert.equal(await us.locator(`[aria-label="${label}: ${value}"]`).count(),1,
      'Verified paid R2 '+label+' percentage must render without count fabrication');
   }
   await kr.getByText('연결 예정',{exact:true}).waitFor({state:'visible'});
   assert.equal(await kr.locator('[aria-label$=": 미제공"]').count(),3,
    'Korea without verified counts must remain missing, not zero');
   const paidPanel=page.getByRole('region',{name:'미국 전체 주식 등락 지수'});
   const historyToggle=paidPanel.locator('button').first();
   assert.equal(await historyToggle.getAttribute('aria-expanded'),'false');
   await historyToggle.click();
   assert.equal(await historyToggle.getAttribute('aria-expanded'),'true');
   const paidHistory=page.getByRole('region',{name:'미국 전체 시장 확정 등락 비율 이력'});
   await paidHistory.locator('svg[aria-label^="실제 저장된 3거래일"]').waitFor({state:'visible'});
   assert.equal(await paidHistory.locator('svg path').count(),3,
    'R2 confirmed history must draw three real lines without fabricated dates');
   await historyToggle.click();
   assert.equal(await historyToggle.getAttribute('aria-expanded'),'false');
   assert.equal(retiredBreadthRequests,0,'Retired breadth endpoints must not be requested');
   assert.equal(breadthR2Requests.filter(path=>path==='/api/market-breadth').length,1,
    'US paid R2 confirmed current feed must be requested once');
   assert.equal(breadthR2Requests.filter(path=>path==='/api/market-breadth-r2-history').length,1,
    'US paid R2 verified history feed must be requested once');
   console.log('PASS paid R2 breadth and Korea missing-data UI without retired API requests');
  }

  if(signedIn){
   const trigger=page.getByRole('button',{name:'사용자 설정',exact:true});
   await trigger.waitFor({state:'visible',timeout:15000});
   await trigger.click();
   const dialog=page.getByRole('dialog');
   await dialog.getByRole('heading',{name:'사용자 설정',exact:true}).waitFor({state:'visible'});
   await page.waitForFunction(()=>{
    const box=document.querySelector('[role="dialog"]')?.getBoundingClientRect();
    return box&&box.width>0&&box.left>=-0.5&&box.right<=innerWidth+0.5;
   },null,{timeout:5000});
   assert.equal(await dialog.getByText('내 즐겨찾기 0개',{exact:true}).count(),1);
   await page.screenshot({path:`artifacts/dashboard-deferred-ui/settings-${width}.png`});
   await page.keyboard.press('Escape');
   await dialog.waitFor({state:'hidden'});
  }else{
   assert.equal(await page.getByRole('button',{name:'사용자 설정',exact:true}).count(),0);
   assert.deepEqual(modules.filter(path=>/\/components\/ui\/(tabs|select|accordion|sheet)\.tsx$/.test(path)||path.endsWith('/app/core-pce-row.tsx')),[],
    'Anonymous dashboard must not request secondary UI modules');
   await page.screenshot({path:`artifacts/dashboard-deferred-ui/dashboard-${width}.png`});
  }
  assert.deepEqual(errors,[],`No client errors at ${width}px, signedIn=${signedIn}`);
  console.log(`PASS dashboard deferred UI ${width}px signedIn=${signedIn}`);
  await page.close();
 }
}finally{await browser.close();}
