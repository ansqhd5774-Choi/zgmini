import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const dir='artifacts/w02-banner-label-live';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1200,height:720},locale:'ko-KR'});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message.slice(0,120)));
try{
 const apiPromise=page.waitForResponse(r=>r.url().includes('/api/earnings-calendar-display?')&&new URL(r.url()).searchParams.get('importance')==='3',{timeout:60000});
 const doc=await page.goto('https://zgmini.kr/market-calendar/',{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(doc?.status(),200);
 const api=await apiPromise;assert.equal(api.status(),200);
 assert.equal(api.headers()['x-zgmini-earnings-grade-reader'],'ZGMINI-R44-USD-CAP');
 const close=page.getByRole('button',{name:'닫기',exact:true}).first();
 if(await close.isVisible().catch(()=>false))await close.click({timeout:5000});
 await page.locator('.zg-fomc-bar').click();
 await page.waitForFunction(()=>document.querySelectorAll('.zg-schedule-kind.is-earnings').length>0,null,{timeout:45000});
 const rows=page.locator('.zg-schedule-list .zg-schedule-item');
 const count=await rows.count();
 assert.ok(count>1&&count<=20,'Existing banner item limit must remain');
 const names=await rows.evaluateAll(els=>els.filter(el=>el.querySelector('.zg-schedule-kind.is-earnings')).map(el=>el.querySelector('.zg-schedule-name-text')?.textContent?.trim()??''));
 const cases=['월트 디즈니','홈디포','TJX 컴퍼니스'];
 const covered=cases.filter(wanted=>names.some(name=>name.startsWith(wanted)));
 assert.ok(covered.length>=2,'At least two reported nested-parentheses companies must be visible in public window');
 for(const wanted of covered)assert.ok(names.filter(name=>name.startsWith(wanted)).every(name=>name===wanted),
  'Nested English legal suffix leaked into '+wanted);
 assert.equal(pageErrors.length,0);
 await page.screenshot({path:dir+'/banner-labels-1200.png',fullPage:true});
 const verdict={status:'PASS_LIVE_BANNER_NAME_NORMALIZED',visibleTargetNames:covered,checkedNames:covered.length,
  bannerTotal:count,earningsShown:names.length,apiGrade:'R44_50B',pageStatus:doc?.status(),apiStatus:api.status(),pageErrors:pageErrors.length};
 writeFileSync(dir+'/result.json',JSON.stringify(verdict,null,2)+'\n');
 console.log('ZGMINI_W02_BANNER_LABELS '+JSON.stringify(verdict));
}finally{await browser.close();}
