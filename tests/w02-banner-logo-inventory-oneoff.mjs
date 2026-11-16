import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const dir='artifacts/w02-banner-logos-live';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1200,height:800},locale:'ko-KR'});
const errors=[];
page.on('pageerror',e=>errors.push(e.message.slice(0,120)));
try{
 const resp=await page.goto('https://zgmini.kr/market-calendar/',{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(resp?.status(),200,'Published calendar must be served');
 const close=page.getByRole('button',{name:'닫기',exact:true}).first();
 if(await close.isVisible().catch(()=>false))await close.click({timeout:5000});
 await page.locator('.zg-fomc-bar').click();
 await page.waitForFunction(()=>document.querySelectorAll('.zg-schedule-kind.is-earnings').length>=12,null,{timeout:45000});
 const rows=page.locator('.zg-schedule-item').filter({has:page.locator('.zg-schedule-kind.is-earnings')});
 const rowCount=await rows.count();
 assert.ok(rowCount>=12&&rowCount<=20,'Expected public earnings cohort (max 20 total banner items)');
 // Trigger lazy-loaded images across the scrollable schedule list.
 for(let i=0;i<rowCount;i++){
  await rows.nth(i).scrollIntoViewIfNeeded();
 }
 await page.waitForFunction(()=>{
  const rows=[...document.querySelectorAll('.zg-schedule-item')].filter(el=>el.querySelector('.zg-schedule-kind.is-earnings'));
  return rows.length>=12 && rows.every(el=>{
   const image=el.querySelector('img.zg-schedule-company-logo');
   return !!image&&image.complete;
  });
 },null,{timeout:30000}).catch(()=>{});
 const details=await rows.evaluateAll(els=>els.map(el=>{
  const img=el.querySelector('img.zg-schedule-company-logo');
  const fallback=el.querySelector('.zg-schedule-ticker-fallback');
  const domain=img?.getAttribute('src')?.match(/[?&]domain=([^&]+)/)?.[1]??null;
  return {ticker:img?.getAttribute('alt')?.split(' ')[0]??fallback?.getAttribute('aria-label')?.split(' ')[0]??null,
   image:!!img,loaded:!!img&&img.complete&&img.naturalWidth>0,
   domain:domain?decodeURIComponent(domain):null,
   fallback:!!fallback};
 }));
 const missing=details.filter(row=>!row.loaded);
 const uniques=[...new Set(details.map(row=>row.ticker))];
 const report={status:missing.length===0&&errors.length===0?'PASS_ALL_LIVE_COMPANY_LOGOS':'FAIL_COMPANY_LOGO_COVERAGE',
  publicPageStatus:resp?.status(),earningsRows:rowCount,distinctIssuers:uniques.length,
  mappedImages:details.filter(row=>row.image).length,
  loadedImages:details.filter(row=>row.loaded).length,tickerFallbacks:details.filter(row=>row.fallback).length,
  missing,jsErrors:errors.length,domains:details.map(({ticker,domain})=>[ticker,domain])};
 const list=page.locator('.zg-schedule-list');
 await list.evaluate(el=>{el.scrollTop=0});
 await page.screenshot({path:dir+'/live-logos-1200.png',fullPage:true});
 writeFileSync(dir+'/result.json',JSON.stringify(report,null,2)+'\n');
 console.log('ZGMINI_W02_LIVE_LOGO_VERIFY '+JSON.stringify(report));
 assert.equal(missing.length,0,'Every displayed current earnings issuer must have a loaded official-site favicon');
 assert.equal(errors.length,0,'Public page must not raise JS errors');
}finally{await browser.close();}
