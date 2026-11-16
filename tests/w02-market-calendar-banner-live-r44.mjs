import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const root='https://zgmini.kr';
const output='artifacts/w02-banner-live';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1200,height:720},locale:'ko-KR'});
const pageErrors=[];
page.on('pageerror',err=>pageErrors.push(err.message.slice(0,160)));
try{
 const req=page.waitForResponse(r=>r.url().includes('/api/earnings-calendar-display?')&&new URL(r.url()).searchParams.get('importance')==='3',{timeout:60000});
 const pageResponse=await page.goto(root+'/market-calendar/',{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(pageResponse?.status(),200);
 const api=await req;
 assert.equal(api.status(),200,'Production banner earnings HTML API should be ready');
 assert.equal(api.headers()['x-zgmini-earnings-grade-reader'],'ZGMINI-R44-USD-CAP');
 const sourceCount=Number(api.headers()['x-display-count']);
 assert.ok(Number.isSafeInteger(sourceCount)&&sourceCount>0,'Published 14-day window must include R44 three-star companies');
 await page.waitForSelector('.zg-fomc-bar',{timeout:45000});
 const close=page.getByRole('button',{name:'닫기',exact:true}).first();
 if(await close.isVisible().catch(()=>false))await close.click({timeout:5000});
 await page.locator('.zg-fomc-bar').click();
 await page.waitForFunction(()=>document.querySelectorAll('.zg-schedule-kind.is-earnings').length>0,null,{timeout:45000});
 assert.equal(await page.locator('.zg-fomc-bar').getAttribute('aria-expanded'),'true');
 const total=await page.locator('.zg-schedule-list .zg-schedule-item').count();
 const earnings=await page.locator('.zg-schedule-kind.is-earnings').count();
 const economic=await page.locator('.zg-schedule-kind:not(.is-earnings)').count();
 const caption=await page.locator('.zg-schedule-heading span').innerText();
 assert.ok(earnings>0,'R44 three-star companies must appear in banner');
 assert.ok(total>=earnings&&total<=20,'Existing top banner 20-entry bounded view must be preserved');
 assert.match(caption,new RegExp('\\b'+total+'건'));
 await page.screenshot({path:output+'/live-1200.png',fullPage:true});
 const summary={status:'PASS_LIVE_R44_BANNER_EARNINGS',sourceGrade:'R44_50B_USD',
  pageStatus:pageResponse?.status(),apiStatus:api.status(),apiWindowThreeStarCount:sourceCount,
  renderedTopBannerItems:total,renderedEarningsItems:earnings,renderedOtherItems:economic,
  bannerExpanded:true,pageErrors:pageErrors.length};
 writeFileSync(output+'/result.json',JSON.stringify(summary,null,2)+'\n');
 console.log('ZGMINI_W02_BANNER_PRODUCTION '+JSON.stringify(summary));
}finally{await browser.close();}
