import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Read-only public production check, run once on an isolated GitHub runner.
// Do not access private data, credentials, raw vendor payloads or PC services.
const site='https://zgmini.kr';
const artifactDir='artifacts/market-calendar-production';
mkdirSync(artifactDir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},locale:'ko-KR'});
const errors=[];
page.on('pageerror',e=>errors.push(e.message.slice(0,180)));
try{
 const response=await page.goto(site+'/market-calendar/',{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(response?.status(),200,'Production market-calendar page must return 200');
 await page.waitForFunction(()=>{
  const header=document.querySelector('.mc-period');
  return header?.textContent?.includes('11월');
 },null,{timeout:45000});
 const close=page.getByRole('button',{name:'닫기',exact:true}).first();
 if(await close.isVisible().catch(()=>false))await close.click({timeout:5000});
 await page.getByRole('button',{name:'월간',exact:true}).click();
 await page.getByRole('button',{name:'기업 실적',exact:true}).click();
 const apiPromise=page.waitForResponse(r=>r.url().includes('/api/earnings-calendar-display')&&
  new URL(r.url()).searchParams.get('importance')==='3',{timeout:45000});
 await page.locator('button[aria-label^="별등급 3개"]').click();
 const api=await apiPromise;
 assert.equal(api.status(),200,'R44 public grade-filtered API must return 200');
 assert.equal(api.headers()['x-zgmini-earnings-grade-reader'],'ZGMINI-R44-USD-CAP',
  'Public API must read R44 published importance output');
 await page.waitForFunction(()=>{
  const root=document.querySelector('.mc-earnings-display');
  return root&&!root.textContent?.includes('기업 실적 저장본을 불러오는 중입니다.')&&
    !root.textContent?.includes('기업 실적 화면 표시본을 불러오지 못했습니다.');
 },null,{timeout:45000});
 const tooltip=await page.locator('.mc-filter-label[title]').first().getAttribute('title');
 assert.match(tooltip??'',/시총 중요도 또는 실적 점수/,
  'Global filter label must be accurate for R44 and legacy ER1 rows');
 const headerTooltip=await page.locator('.mc-importance-heading').getAttribute('title');
 assert.match(headerTooltip??'',/시총 중요도 또는 실적 점수/,
  'Importance column header must explain mixed methods');
 const month=await page.locator('.mc-period').innerText();
 assert.match(month,/2026년|11월/);
 const aria=await page.locator('button[aria-label^="별등급 3개"]').getAttribute('aria-pressed');
 assert.equal(aria,'true','Three-star filter must be active');
 const rows=page.locator('.mc-earnings-display .mc-vendor-row');
 const count=await rows.count();
 const countHeader=Number(api.headers()['x-display-count']);
 assert.equal(count,countHeader,'Hydrated row count must match public filtered API count');
 const stars=page.locator('.mc-earnings-display .mc-importance[aria-label="시총 기준 중요도 별 3개"]');
 const starCount=await stars.count();
 assert.equal(starCount,count,'Every matching result must have R44 three-star importance');
 const titles=await stars.evaluateAll(els=>els.map(el=>el.getAttribute('title')));
 for(const title of titles)assert.match(title??'',/★★★ 50B USD 이상 · ★★ 20B USD 이상/,
  'Current R44 row must show USD 50B/20B breakpoints');
 if(starCount>0)await stars.first().hover();
 await page.screenshot({path:artifactDir+'/r44-three-star-public-1440.png',fullPage:true});
 const verdict={status:starCount>0?'PASS_HYDRATED_R44_THREE_STAR':'INDETERMINATE_NO_THREE_STAR_ROWS',
  publicPageStatus:response?.status(),apiStatus:api.status(),
  gradeReader:api.headers()['x-zgmini-earnings-grade-reader'],apiCount:countHeader,
  hydratedRows:count,threeStarRows:starCount,method:'USD_50B_20B',
  globalLabelsCorrect:true,month,jsErrors:errors.length};
 writeFileSync(artifactDir+'/result.json',JSON.stringify(verdict,null,2)+'\n');
 console.log('ZGMINI_R44_PUBLIC_BROWSER_RESULT '+JSON.stringify(verdict));
 assert.ok(starCount>0,'No 3-star rows in published November 2026 cohort; UI is read-only verified, but threshold display cannot be established');
}finally{await browser.close();}
