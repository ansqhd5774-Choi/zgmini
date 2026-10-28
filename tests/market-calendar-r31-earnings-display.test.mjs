import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsDisplaySnapshot,earningsDisplayHtml,earningsDisplayResponse,
 EARNINGS_API_DISPLAY_KEY} from '../lib/earnings-api-display.mjs';
import {collectEarningsApiLocal} from '../scripts/pc-writer/earnings-api-local.mjs';

const dates=Array.from({length:14},(_,i)=>new Date(Date.UTC(2026,9,29+i)).toISOString().slice(0,10));
const item=(ticker,company,date,marketSession='unknown',priority=false)=>({
 date,ticker,company,marketSession,kind:'earnings',source:'earnings-api',
 verification:'VENDOR_UNVERIFIED',priority,time:null,
});
const projection=events=>({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
 redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
 checkedAt:'2026-10-29T10:00:00.000Z',coveredDays:dates,
 recordCount:events.length,priorityCount:events.filter(e=>e.priority).length,events});

test('R31 stores display-only HTML, not a public vendor JSON row feed',()=>{
 const display=earningsDisplaySnapshot(projection([
  item('NVDA','NVIDIA <Inc>',dates[0],'after_market',true),
  item('MSFT','Microsoft & Co',dates[1],'before_market',true),
 ]));
 assert.equal(display.status,'READY_DISPLAY');
 assert.equal(display.mode,'OWN_SITE_HTML_ONLY');
 assert.equal(display.rawVendorJsonExposed,false);
 assert.equal(display.publicJsonFeed,false);
 assert.equal(display.byDay[dates[0]].length,1);
 assert.match(display.byDay[dates[0]][0],/NVIDIA &lt;Inc&gt;/);
 assert.doesNotMatch(display.byDay[dates[0]][0],/<Inc>/);
 assert.equal(Object.keys(display).includes('events'),false);
 assert.equal(EARNINGS_API_DISPLAY_KEY,'market-calendar:earnings-display-html');
});

test('R31 displays 2,609 rows across the 14-day window without API calls',()=>{
 const events=Array.from({length:2609},(_,i)=>item(`A${i}`,`Firm ${i}`,dates[i%14]));
 // Real ticker parser limits to 12 characters; these simulated IDs stay short.
 const display=earningsDisplaySnapshot(projection(events));
 assert.ok(new TextEncoder().encode(JSON.stringify(display)).length<1800000);
 const page=earningsDisplayHtml(display,{start:dates[0],end:dates[13]});
 assert.equal(page.count,2609);
 assert.equal((page.html.match(/mc-vendor-row/g)??[]).length,2609);
 assert.equal(Object.values(page.counts).reduce((a,b)=>a+b,0),2609);
});

test('R31 filters visible dates and search while retaining unknown times',()=>{
 const display=earningsDisplaySnapshot(projection([
  item('AAPL','Apple Inc',dates[0],'unknown',true),
  item('MSFT','Microsoft',dates[0],'before_market',true),
  item('NVDA','NVIDIA',dates[1],'after_market',true),
 ]));
 const page=earningsDisplayHtml(display,{start:dates[0],end:dates[0],query:'apple'});
 assert.equal(page.count,1);
 assert.match(page.html,/시각 미정/);
 assert.doesNotMatch(page.html,/Microsoft/);
 assert.doesNotMatch(page.html,/NVIDIA/);
});

test('R31 rejects malformed dates, source states and public-feed promotion',()=>{
 assert.throws(()=>earningsDisplaySnapshot({...projection([]),publicDisplay:true}),/R31_DISPLAY_SOURCE_INVALID/);
 const display=earningsDisplaySnapshot(projection([]));
 assert.throws(()=>earningsDisplayHtml(display,{start:'2026-10-34',end:dates[3]}));
 assert.throws(()=>earningsDisplayHtml(display,{start:dates[3],end:dates[0]}));
});

test('R31 HTTP presentation returns HTML, not a proprietary JSON endpoint',async()=>{
 const display=earningsDisplaySnapshot(projection([item('AAPL','Apple',dates[0])]));
 const response=earningsDisplayResponse(display,`https://zgmini.kr/api/earnings-calendar-display?start=${dates[0]}&end=${dates[1]}`);
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type'),/^text\/html/);
 assert.equal(response.headers.get('x-display-count'),'1');
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 const body=await response.text();
 assert.match(body,/Apple/);
 assert.doesNotMatch(body,/"events":/);
 const selected=earningsDisplayResponse(display,`https://zgmini.kr/api/earnings-calendar-display?start=${dates[0]}&end=${dates[1]}&day=${dates[1]}`);
 assert.equal(selected.status,200);
 assert.equal(selected.headers.get('x-display-count'),'0');
 assert.equal(selected.headers.get('x-display-day-counts'),`${dates[0]}:1,${dates[1]}:0`);
 assert.equal(await selected.text(),'');
 const pending=earningsDisplayResponse(null,`https://zgmini.kr/api/earnings-calendar-display?start=${dates[0]}&end=${dates[0]}`);
 assert.equal(pending.status,204);
});

test('R31 PC cycle writes a display-only output, keeps raw inputs private and does not add provider calls',async()=>{
 const data=new Map(),publicData=new Map();let requests=0;
 const store={
  readInput:async key=>data.get(key)??null,writeInput:async(key,body)=>{data.set(key,{body});},
  readOutput:async key=>publicData.get(key)??null,
  writeOutput:async(key,body)=>{publicData.set(key,{body});},
 };
 const now=Date.parse('2026-10-29T12:00:00Z');
 const result=await collectEarningsApiLocal({store,now,apiKey:'private-local-token',
  fetchImpl:async url=>{
   requests++;
   const date=new URL(url).searchParams.get('date');
   return {ok:true,url,headers:{get:()=>'application/json'},text:async()=>JSON.stringify({
    date,pre:[{symbol:'AAPL',name:'Apple'}],after:[],notSupplied:[]}),
   };
  }});
 assert.equal(requests,14);
 assert.equal(result.providerRequests,14);
 assert.equal(result.projectionStatus,'READY_PRIVATE');
 assert.equal(result.displayStatus,'READY_DISPLAY');
 assert.deepEqual([...publicData.keys()],[EARNINGS_API_DISPLAY_KEY]);
 assert.equal(publicData.get(EARNINGS_API_DISPLAY_KEY).body.publicJsonFeed,false);
 assert.equal(publicData.get(EARNINGS_API_DISPLAY_KEY).body.byDay[Object.keys(publicData.get(EARNINGS_API_DISPLAY_KEY).body.byDay)[0]].length,1);
 assert.ok(!JSON.stringify([...data.values(),...publicData.values()]).includes('private-local-token'));
});
