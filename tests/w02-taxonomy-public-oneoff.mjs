import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const dir='artifacts/w02-taxonomy-live';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},locale:'ko-KR'});
const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,150)));
const result={status:'PENDING',apiStatus:null,apiKind:null,sectorCount:0,industryCount:0,
 pageStatus:null,hasNineColumn:false,earningsRows:0,earningsBadges:0,sectorBadges:0,
 industryBadges:0,mobileFilterPresent:false,errors:[]};
try{
 const api=await page.request.get('https://zgmini.kr/api/earnings-calendar-taxonomy',{timeout:60000});
 result.apiStatus=api.status();
 let data=null;try{data=await api.json()}catch{}
 result.apiKind=data?.status??null;
 result.sectorCount=Object.keys(data?.sectors??{}).length;
 result.industryCount=Object.values(data?.sectors??{}).reduce((a,b)=>a+(Array.isArray(b)?b.length:0),0);
 if(!api.ok()||result.apiKind!=='READY_TAXONOMY_OPTIONS'||result.sectorCount<1)
  throw Error('TAXONOMY_API_NOT_PUBLISHED:'+result.apiStatus+':'+result.apiKind);
 const doc=await page.goto('https://zgmini.kr/market-calendar/',{waitUntil:'domcontentloaded',timeout:60000});
 result.pageStatus=doc?.status()??null;
 assert.equal(result.pageStatus,200);
 await page.waitForSelector('.mc-panel.mc-nine-column',{timeout:45000});
 result.hasNineColumn=true;
 const header=await page.locator('.mc-head').innerText();
 assert.match(header,/섹터/);assert.match(header,/산업/);
 assert.doesNotMatch(header,/예상/);
 const sector=page.getByRole('combobox',{name:'섹터',exact:true});
 const industry=page.getByRole('combobox',{name:'세부 산업',exact:true});
 assert.equal(await sector.isVisible(),true);
 result.earningsRows=await page.locator('.mc-vendor-row').count();
 result.earningsBadges=await page.locator('.mc-kind-earnings').count();
 result.sectorBadges=await page.locator('.mc-vendor-row .mc-sector').count();
 result.industryBadges=await page.locator('.mc-vendor-row .mc-industry').count();
 assert.ok(result.earningsRows>0,'NO_PUBLIC_EARNINGS_IN_VISIBLE_RANGE');
 assert.equal(result.sectorBadges,result.earningsRows);
 assert.equal(result.industryBadges,result.earningsRows);
 assert.equal(result.errors.length,0);
 await page.screenshot({path:dir+'/desktop-1440.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 const toggle=page.getByRole('button',{name:'일정 필터 펼치기'});
 result.mobileFilterPresent=await toggle.isVisible();
 assert.equal(result.mobileFilterPresent,true);
 await toggle.click();
 assert.equal(await sector.isVisible(),true);
 await page.screenshot({path:dir+'/mobile-390.png',fullPage:true});
 assert.deepEqual(errors,[]);
 result.status='PASS_LIVE_NINE_COLUMN_TAXONOMY';
}catch(error){
 result.status='FAIL_LIVE_TAXONOMY_VERIFICATION';
 result.error=String(error?.message??error).slice(0,320);
 try{await page.screenshot({path:dir+'/failure.png',fullPage:true})}catch{}
 throw error;
}finally{
 result.errors=errors;
 writeFileSync(dir+'/result.json',JSON.stringify(result,null,2)+'\n');
 console.log('ZGMINI_W02_TAXONOMY_PUBLIC '+JSON.stringify(result));
 await browser.close();
}
