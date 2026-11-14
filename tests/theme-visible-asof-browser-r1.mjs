// Isolated browser proof of W06 header provenance. All API responses are
// local fixtures: no D1, provider credentials, production calls, or writes.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.CHAT_PREVIEW_URL??'http://127.0.0.1:5173';
mkdirSync('artifacts/theme-visible-asof',{recursive:true});
const historicalLegacy={status:'UNAVAILABLE',observationDate:'2026-10-28',phase:'CONFIRMED',themes:[]};

function configured(mode){
 const old={
  id:'independent-older-high',theme:'독립검증 고득점',etfs:['BOTZ'],score:91,
  observationDate:'2026-11-12',history:[{date:'2026-11-12',score:91}],
  provisionalStatus:'PENDING',
 };
 const newItem={
  id:'independent-newer-low',theme:'독립검증 최신관측',etfs:['ROBO'],score:31,
  observationDate:'2026-11-14',history:[{date:'2026-11-14',score:31}],
  provisionalStatus:'READY',
  provisional:mode==='valid'?{date:'2026-11-15',score:35}:{date:'2026-11-31',score:99},
 };
 return {status:'READY',themes:[old,newItem]};
}

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('zgmini-about-intro-dismissed-r1','1'));
  await page.route('https://**',route=>route.abort());
  let mode='valid';
  await page.route('**/api/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const body=path==='/api/theme-fear-greed'?historicalLegacy:
    path==='/api/theme-configured'?configured(mode):
    {status:'UNAVAILABLE',user:null};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body),
    headers:{'cache-control':'no-store'}});
  });
  try{
   for(const scenario of [
    {mode:'valid',expected:'최신 관측일 2026.11.15 · 공개 2개'},
    {mode:'invalid',expected:'최신 관측일 2026.11.14 · 공개 2개'},
   ]){
    mode=scenario.mode;
    // Vite + polling stored readers may keep requests active after the page is
    // fully visible. Assert the real hydrated header, not network quiescence.
    await page.goto(base+'/theme-fear-greed/',{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(expected=>{
     const element=document.querySelector('.zg-tfg-content .zg-sfg-as-of');
     return element?.textContent?.trim()===expected;
    },scenario.expected,{timeout:20000});
    const actual=(await page.locator('.zg-tfg-content .zg-sfg-as-of').innerText()).trim();
    assert.equal(actual,scenario.expected);
    assert.equal(await page.locator('.zg-sfg-rank-row').count(),2);
    const titles=await page.locator('.zg-sfg-rank-name').allInnerTexts();
    assert.ok(titles[0].includes('독립검증 고득점'),
     'Highest score must rank first even though its observation is older');
    assert.ok(titles[1].includes('독립검증 최신관측'),
     'Latest observation should stay visible independent of rank');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),
     false,'No theme viewport horizontal overflow at '+width+'px');
    assert.deepEqual(errors,[],'No browser-side JavaScript exceptions');
    await page.screenshot({path:'artifacts/theme-visible-asof/theme-asof-'+width+'-'+mode+'.png',fullPage:true});
    console.log('PASS W06_THEME_VISIBLE_ASOF width='+width+' scenario='+mode+' observedHeader='+actual);
   }
  }catch(error){
   const diagnosis=await page.evaluate(()=>({
    title:document.title,
    header:document.querySelector('.zg-tfg-content .zg-sfg-as-of')?.textContent?.trim()??null,
    rankCount:document.querySelectorAll('.zg-sfg-rank-row').length,
    pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
   })).catch(()=>null);
   console.error('W06_THEME_VISIBLE_ASOF_FIRST_FAIL',JSON.stringify({width,mode,diagnosis,pageErrors:errors}));
   await page.screenshot({path:'artifacts/theme-visible-asof/theme-asof-firstfail-'+width+'-'+mode+'.png',fullPage:true}).catch(()=>{});
   throw error;
  }finally{
   await page.close();
  }
 }
}finally{
 await browser.close();
}
