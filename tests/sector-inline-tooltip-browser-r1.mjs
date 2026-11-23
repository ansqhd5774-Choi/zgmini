// Isolated local Chromium: sector chart hover and held score readouts must never cover the plot.
// Uses published-shaped synthetic fixture ONLY, never a provider, DB, D1 or production write.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const BASE=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
const DIR='artifacts/sector-inline-tooltip';
mkdirSync(DIR,{recursive:true});
const sectors=['technology','financials','communication','discretionary','industrials','energy',
  'healthcare','staples','utilities','materials','realEstate'];
const history=Array.from({length:18},(_,i)=>({
  date:new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10),
  ...Object.fromEntries(sectors.map((id,k)=>[id,Math.min(99,Math.max(1,78-k*4+i*.11))]))
}));
const sectorFixture={status:'READY',phase:'CONFIRMED',
  confirmedObservationDate:history.at(-1).date,history};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:900},
      hasTouch:width===390,isMobile:width===390,serviceWorkers:'block'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e.message).slice(0,200)));
    try{
      await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
      await page.route('https://**',route=>route.abort());
      await page.route('**/api/**',route=>{
        const pathname=new URL(route.request().url()).pathname;
        const payload=pathname==='/api/sector-fear-greed'?sectorFixture:
          pathname==='/api/session'?{user:null}:
          pathname==='/api/favorites'?{favorites:[]}:
          pathname==='/api/market-data'?{status:'fallback',updatedAt:'',indicators:{},summary:[]}:
          {status:'UNAVAILABLE'};
        return route.fulfill({status:200,contentType:'application/json',
          body:JSON.stringify(payload)});
      });
      const response=await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
      assert.equal(response?.status(),200);
      const strength=page.locator('#strength');
      await strength.scrollIntoViewIfNeeded({timeout:15000});
      const card=page.locator('section.zg-sector-chart.zg-sector-score-card').first();
      await card.waitFor({state:'visible',timeout:20000});
      const plot=card.locator('.zg-sector-chart-plot');
      await card.locator('.recharts-line-curve').first().waitFor({state:'visible',timeout:20000});
      const baseBox=await card.boundingBox();
      const plotBox=await plot.boundingBox();
      assert.ok(baseBox&&plotBox&&plotBox.width>100,'chart plot must hydrate with stored-shaped fixture');
      const point={x:plotBox.x+plotBox.width*.55,y:plotBox.y+plotBox.height*.55};
      const legend=card.locator('.zg-sector-chart-legend').first();
      // Mouse pointer capture creates a reliable held indicator even at the mobile viewport.
      await page.mouse.move(point.x,point.y,{steps:4});
      await page.mouse.down();
      const held=card.locator('.zg-sector-readout .zg-sector-held-tooltip');
      await held.waitFor({state:'visible',timeout:6000});
      const metrics=await card.evaluate(el=>{
        const rect=selector=>el.querySelector(selector)?.getBoundingClientRect();
        const c=el.getBoundingClientRect(),plot=rect('.zg-sector-chart-plot'),
          legend=rect('.zg-sector-chart-legend'),tip=rect('.zg-sector-readout .zg-sector-held-tooltip');
        return {card:{top:c.top,bottom:c.bottom,height:c.height},
          plot:{top:plot.top,bottom:plot.bottom,height:plot.height},
          legend:{top:legend.top,bottom:legend.bottom},
          tip:{top:tip.top,bottom:tip.bottom,width:tip.width},
          overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      assert.ok(metrics.tip.top>=metrics.plot.bottom-1,'held readout must remain under plot');
      assert.ok(metrics.tip.top>=metrics.legend.bottom-1,'held readout must remain under legend');
      assert.ok(metrics.card.bottom>=metrics.tip.bottom-1,'readout must be inside card');
      assert.ok(metrics.card.height>baseBox.height+3,'card expands only for real readout');
      assert.equal(metrics.plot.height,120,'plot height must remain 120px');
      assert.equal(metrics.overflow,false,'no mobile/desktop horizontal overflow');
      assert.match(await held.innerText(),/정보기술|금융/);
      await page.screenshot({path:DIR+'/held-'+width+'.png'});
      await page.mouse.up();
      await held.waitFor({state:'hidden',timeout:6000});
      // Recharts hover Tooltip uses the SAME portal below the chart's legend.
      await page.mouse.move(point.x+7,point.y,{steps:6});
      const hover=card.locator('.zg-sector-readout .recharts-tooltip-wrapper .zg-sector-tooltip');
      await hover.waitFor({state:'visible',timeout:6000});
      const hoverPos=await hover.boundingBox();
      const plotPos=await plot.boundingBox();
      const legendPos=await legend.boundingBox();
      assert.ok(hoverPos&&plotPos&&legendPos);
      assert.ok(hoverPos.y>=plotPos.y+plotPos.height-1,'hover readout below plot');
      assert.ok(hoverPos.y>=legendPos.y+legendPos.height-1,'hover readout below legend');
      const finalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
      assert.equal(finalOverflow,false);
      await page.screenshot({path:DIR+'/hover-'+width+'.png'});
      assert.deepEqual(errors,[],'no JavaScript exceptions in local isolated fixture');
      const result={width,status:'PASS',sectorDataPoints:history.length,
        heldInsideCard:true,hoverBelowLegend:true,plotHeight:metrics.plot.height,
        noHorizontalOverflow:true};
      results.push(result);
      console.log('SECTOR_INLINE_TOOLTIP_BROWSER_PASS',JSON.stringify(result));
    }finally{await context.close();}
  }
}finally{await browser.close();}
writeFileSync(DIR+'/result.json',JSON.stringify({scope:'LOCAL_SYNTHETIC_FIXTURE_ONLY',
  checkedAt:new Date().toISOString(),results},null,2)+'\n');
assert.equal(results.length,2);
