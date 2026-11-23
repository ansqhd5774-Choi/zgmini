import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Isolated UI fixture only. No source collection, D1, PC state or Production writes.
const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
const input=[
 {observedAt:'2026-11-23T00:00:55.676Z',score:45.137344974152676,asOfDate:'2026-11-23'},
 {observedAt:'2026-11-23T00:37:20.887Z',score:45.137344974152676,asOfDate:'2026-11-23'},
];
const modules=['inflation','employment','rates','credit','growth','consumption','earnings','liquidity','fundFlows','breadth','dollarFx','commodities'];
const display=(50+(input.at(-1).score-50)*3.5).toFixed(1);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/w06-touch-local',{recursive:true});
const results=[];
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'ko-KR',timezoneId:'Asia/Seoul',hasTouch:width===390,isMobile:width===390,serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.route('https://**',route=>route.abort());
   await page.route('**/api/**',route=>{
    const url=new URL(route.request().url());
    const body=url.pathname==='/api/market-score'?{
     status:'SUCCESS',updatedAt:'2026-11-23T00:37:20.887Z',
     overall:{status:'READY',score:input.at(-1).score,trend:[{label:'2026-11-22',value:45.137344974152676},{label:'2026-11-23',value:45.137344974152676}]},
     domains:modules.map(id=>({id,status:'READY',score:50,trend:[]})),
     dataQuality:{readyDomains:12,totalDomains:12,coverageWeight:1}
    }:url.pathname==='/api/market-score/observations'?{
     status:'READY',version:'COMPOSITE_CALCULATED_SCORES_R1',period:url.searchParams.get('period'),
     availableDays:1,totalObservedPoints:2,sampled:false,timeMeaning:'PC_CALCULATED_AT',points:input
    }:url.pathname==='/api/session'?{user:null}:
     url.pathname==='/api/market-data'?{status:'fallback',indicators:{},summary:[]}:
     {status:'UNAVAILABLE'};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   });
   const res=await page.goto(base,{waitUntil:'networkidle',timeout:45000});
   assert.equal(res?.status(),200);
   const intro=page.locator('#zg-about-intro-dialog');
   if(await intro.isVisible())await intro.getByRole('button',{name:'닫기',exact:true}).click();
   const periods=page.getByRole('group',{name:'종합 시장 점수 추이 기간'});
   const dayButton=periods.getByRole('button',{name:'1D',exact:true});
   await page.waitForFunction(()=>{const b=document.querySelector('.zg-r55-period button');return !!b&&!b.hasAttribute('disabled');},null,{timeout:20000});
   await dayButton.click();
   const chart=page.locator('.zg-r55-summary-chart');
   await chart.locator('svg.recharts-surface').waitFor({state:'visible',timeout:20000});
   const dot=chart.locator('.recharts-reference-dot circle').first();
   await dot.waitFor({state:'visible',timeout:15000});
   const bounds=await dot.boundingBox();
   assert(bounds,'latest actual chart point geometry');
   const center={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
   if(width===390)await page.touchscreen.tap(center.x,center.y);
   else{
    await page.mouse.move(center.x-12,center.y);
    await page.mouse.move(center.x,center.y,{steps:4});
   }
   await page.waitForTimeout(500);
   const tip=width===390?chart.locator('[data-testid="w06-touch-tooltip"]'):chart.locator('.recharts-tooltip-wrapper');
   const visible=(await tip.count())>0&&await tip.isVisible();
   const tipText=(await tip.count())>0?await tip.innerText():'';
   const dimensions=await page.evaluate(()=>({innerWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth}));
   const result={width,visible,tipText,center,dimensions};
   results.push(result);
   console.log('W06_LOCAL_TOUCH_OR_HOVER '+JSON.stringify(result));
   await page.screenshot({path:'artifacts/w06-touch-local/'+width+'.png',fullPage:false});
   assert(visible,'a real '+(width===390?'touch':'hover')+' on latest dot must show tooltip');
   assert(tipText.includes(display),'tooltip must show source-scaled 33.0');
   assert(tipText.includes('09:37'),'tooltip must show exact calculated minute in KST');
   assert(dimensions.scrollWidth<=width+2,'no horizontal document overflow');
   assert.deepEqual(errors,[],'no browser exceptions');
  }finally{await context.close();}
 }
}finally{await browser.close();}
writeFileSync('artifacts/w06-touch-local/results.json',JSON.stringify({type:'ISOLATED_UI_FIXTURE_NOT_PRODUCTION',results},null,2)+'\n');
assert.equal(results.length,2);
console.log('W06_LOCAL_TOUCH_FIXTURE_PASS');
