// One-shot real Production Chromium readback. GET + mouse/touch interactions only.
// No fixture, provider collection, DB/D1 write, deploy, or credential access.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const ROOT='https://zgmini.kr';
const DIR='artifacts/sector-inline-tooltip-production-readonly';
mkdirSync(DIR,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},
    locale:'ko-KR',timezoneId:'Asia/Seoul',isMobile:width===390,
    hasTouch:width===390,serviceWorkers:'block'});
  const page=await context.newPage();
  const exceptions=[];
  page.on('pageerror',error=>exceptions.push(error.message));
  try{
   const response=await page.goto(ROOT+'/',{waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(response?.status(),200,'real production home HTTP200');
   const publicResponse=await context.request.get(ROOT+'/api/sector-fear-greed',{timeout:30000});
   assert.equal(publicResponse.status(),200,'real published sector GET');
   const api=await publicResponse.json();
   assert.equal(api.status,'READY','published sector data must be READY');
   assert.equal(api.sectors?.length,11,'eleven actual published sector values');
   assert.equal(api.history?.length,252,'252 real stored history dates');
   const last=api.history.at(-1);
   assert.equal(api.observationDate,last?.date,'observed date matches last stored row');
   for(const sector of api.sectors){
    assert.equal(sector.score,last?.[sector.id],'published point parity '+sector.id);
   }
   // Real browser UI, no interception/mocked API or fixture.
   const intro=page.locator('#zg-about-intro-dialog');
   await page.waitForTimeout(1200);
   if(await intro.isVisible()){
    await intro.getByRole('button',{name:'닫기',exact:true}).click();
   }
   const strength=page.locator('#strength');
   await strength.scrollIntoViewIfNeeded({timeout:25000});
   const card=page.locator('section.zg-sector-chart.zg-sector-score-card').first();
   await card.waitFor({state:'visible',timeout:30000});
   const plot=card.locator('.zg-sector-chart-plot');
   await card.locator('.recharts-line-curve').first().waitFor({state:'visible',timeout:30000});
   await page.waitForTimeout(250);
   const plotBox=await plot.boundingBox();
   assert(plotBox&&plotBox.width>100&&Math.abs(plotBox.height-120)<1.5,
    'real chart plotting region mounted at stable 120px');
   const pointer={x:plotBox.x+plotBox.width*.55,y:plotBox.y+plotBox.height*.55};
   await page.mouse.move(pointer.x,pointer.y,{steps:4});
   await page.mouse.down();
   const held=card.locator('.zg-sector-readout .zg-sector-held-tooltip');
   await held.waitFor({state:'visible',timeout:8000});
   const layout=await card.evaluate(el=>{
    const rect=q=>el.querySelector(q)?.getBoundingClientRect();
    const c=el.getBoundingClientRect(),p=rect('.zg-sector-chart-plot'),
      l=rect('.zg-sector-chart-legend'),t=rect('.zg-sector-held-tooltip');
    return {cardHeight:c.height,cardBottom:c.bottom,plotBottom:p?.bottom,
      plotHeight:p?.height,legendBottom:l?.bottom,heldTop:t?.top,
      heldBottom:t?.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert(layout.heldTop>=layout.plotBottom-1,'real held tooltip below chart');
   assert(layout.heldTop>=layout.legendBottom-1,'real held tooltip below legend');
   assert(layout.cardBottom>=layout.heldBottom-1,'held tooltip fits inside card');
   assert(layout.cardHeight>232,'real card expands only with a tooltip');
   assert.equal(layout.overflow,false,'no horizontal overflow');
   await page.screenshot({path:DIR+'/held-'+width+'.png'});
   await page.mouse.up();
   await held.waitFor({state:'hidden',timeout:8000});
   await page.mouse.move(pointer.x+7,pointer.y,{steps:6});
   const hover=card.locator('.zg-sector-readout .recharts-tooltip-wrapper .zg-sector-tooltip');
   await hover.waitFor({state:'visible',timeout:8000});
   const hoverBox=await hover.boundingBox();
   const plotAfter=await plot.boundingBox();
   const legendAfter=await card.locator('.zg-sector-chart-legend').first().boundingBox();
   assert(hoverBox&&plotAfter&&legendAfter,'real hover tooltip layout exists');
   assert(hoverBox.y>=plotAfter.y+plotAfter.height-1,'hover below chart');
   assert(hoverBox.y>=legendAfter.y+legendAfter.height-1,'hover below legend');
   const hoverText=await hover.innerText();
   assert(/\d+\.\d/.test(hoverText),'hover shows actual dated score');
   await page.screenshot({path:DIR+'/hover-'+width+'.png'});
   assert.deepEqual(exceptions,[],'real production no page JS exceptions');
   const result={width,status:'PASS',observationDate:api.observationDate,
    publishedSectors:api.sectors.length,historyRows:api.history.length,
    liveData:true,heldUnderPlot:true,hoverUnderLegend:true,
    plotHeight:layout.plotHeight,noOverflow:true,
    input:'mouse hover and hold in actual '+width+'px viewport'};
   results.push(result);
   console.log('SECTOR_INLINE_TOOLTIP_PRODUCTION_PASS '+JSON.stringify(result));
  }finally{await context.close();}
 }
}finally{await browser.close();}
writeFileSync(DIR+'/result.json',JSON.stringify({
 scope:'READ_ONLY_ACTUAL_PRODUCTION_NOT_LOCAL_FIXTURE',
 checkedAt:new Date().toISOString(),results},null,2)+'\n');
assert.equal(results.length,2);
