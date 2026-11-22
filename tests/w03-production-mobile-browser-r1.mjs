// Read-only Production verification: no credentials, provider calls, D1 writes, or deployment.
// Captures actual hydrated mobile UI with the published public API as the reference.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const origin='https://zgmini.kr',dir='artifacts/w03-production-mobile';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const summary={scope:'W03_PRODUCTION_MOBILE_READONLY',width:390,checkedAt:new Date().toISOString(),checks:[],status:'STARTED'};
let page;
try{
 page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const apiResponse=await page.request.get(origin+'/api/theme-fear-greed',{timeout:30000});
 assert.equal(apiResponse.status(),200,'Production API HTTP status');
 const feed=await apiResponse.json();
 assert.equal(feed.status,'READY','Production public paid feed status');
 assert.equal(feed.themes?.length,10,'existing public count');
 assert.ok(feed.themes.every(t=>t.history?.length===252&&t.history.at(-1)?.date===feed.observationDate&&t.score===t.history.at(-1)?.score),'public 10x252 and last scores');
 summary.observationDate=feed.observationDate;summary.publicCount=feed.themes.length;summary.checks.push('API_10X252');
 // No raw price/history stored in artifact. This is derived public display metadata only.
 const go=async path=>{
  await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>document.querySelectorAll('.zg-sfg-rank-row').length===10,{timeout:30000});
 };
 await go('/theme-fear-greed/');
 await page.waitForTimeout(1200);
 const detail=await page.evaluate(()=>{
  const labels=[...document.querySelectorAll('.zg-sfg-rank-row')].map(x=>({name:x.querySelector('.zg-sfg-rank-name')?.textContent?.trim(),score:x.querySelector('.zg-sfg-rank-score')?.textContent?.trim()}));
  const legends=[...document.querySelectorAll('.zg-sfg-legend button')].map(x=>({name:x.querySelector('.zg-sfg-legend-name')?.textContent?.trim(),score:x.querySelector('.zg-sfg-legend-score')?.textContent?.trim()}));
  const chart=document.querySelector('.zg-sfg-comparison-plot');
  return {header:document.querySelector('.zg-sfg-as-of')?.textContent?.trim(),labels,legends,
    chartSvgCount:chart?.querySelectorAll('svg').length??0,
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
    rowsOutside:[...document.querySelectorAll('.zg-sfg-rank-row')].filter(x=>x.getBoundingClientRect().right>innerWidth+1).length};
 });
 assert.ok(detail.header?.includes(feed.observationDate.replaceAll('-','.')),'header observation date');
 assert.ok(detail.header?.includes('공개 10개'),'header public count');
 assert.equal(detail.labels.length,10);assert.equal(detail.legends.length,10);
 for(const t of feed.themes){
  const rank=detail.labels.find(x=>x.name===t.theme);
  const legend=detail.legends.find(x=>x.name===t.theme);
  assert.ok(rank&&legend,'visible ranking and legend for '+t.id);
  assert.equal(Number(rank.score),Number(t.score.toFixed(1)),'ranking score '+t.id);
  assert.equal(Number(legend.score),Number(t.score.toFixed(1)),'legend score '+t.id);
 }
 assert.ok(detail.chartSvgCount>0,'comparison chart SVG rendered');
 assert.equal(detail.rowsOutside,0,'ranking row within viewport');
 assert.equal(detail.overflow,false,'no document horizontal overflow');
 assert.deepEqual(errors,[],'no client-side JS exception');
 summary.detail={header:detail.header,chartSvgCount:detail.chartSvgCount,overflow:detail.overflow,rowsOutside:detail.rowsOutside};
 summary.checks.push('DETAIL_10_SCORES','DETAIL_LEGEND','DETAIL_CHART','DETAIL_390_NO_OVERFLOW');
 await page.screenshot({path:dir+'/detail-390.png',fullPage:true});
 await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>document.body.textContent?.includes('테마별 공포·탐욕')&&document.body.textContent?.includes('사이버보안'),{timeout:30000});
 const home=await page.evaluate(()=>({text:document.body.textContent??'',overflow:document.documentElement.scrollWidth>innerWidth+1,buttons:[...document.querySelectorAll('button[title]')].filter(x=>x.title?.includes('관측')).map(x=>({title:x.title,label:x.getAttribute('aria-label')}))}));
 for(const t of feed.themes)assert.ok(home.text.includes(t.theme),'home visible '+t.id);
 assert.equal(home.overflow,false,'home no horizontal overflow');
 assert.deepEqual(errors,[],'no page JS exceptions');
 summary.home={overflow:home.overflow,themeTextCount:feed.themes.filter(t=>home.text.includes(t.theme)).length};
 summary.checks.push('HOME_10_NAMES','HOME_390_NO_OVERFLOW');
 await page.screenshot({path:dir+'/home-390.png',fullPage:true});
 summary.status='PASS';console.log('W03_PRODUCTION_MOBILE_PASS',JSON.stringify(summary));
}catch(e){
 summary.status='FAIL';summary.failure=String(e?.message??e).slice(0,700);
 if(page){summary.diagnostic=await page.evaluate(()=>({url:location.href,title:document.title,rankCount:document.querySelectorAll('.zg-sfg-rank-row').length,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth})).catch(()=>null);await page.screenshot({path:dir+'/first-failure-390.png',fullPage:true}).catch(()=>{});}
 console.error('W03_PRODUCTION_MOBILE_FIRST_FAIL',JSON.stringify(summary));
 process.exitCode=1;
}finally{writeFileSync(dir+'/result.json',JSON.stringify(summary,null,2)+'\n');await browser.close();}
