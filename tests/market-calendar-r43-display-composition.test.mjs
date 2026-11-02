import test from 'node:test';
import assert from 'node:assert/strict';
import {rankR43Issuers} from '../lib/market-calendar-r43-issuer-rank.mjs';
import {makeR43MarketImportanceDisplay} from '../lib/market-calendar-r43-display-overlay.mjs';
import {earningsDisplaySnapshot,earningsDisplayResponse} from '../lib/earnings-api-display.mjs';

const asOf=new Date().toISOString().slice(0,10), now=Date.now();
const dates=Array.from({length:14},(_,i)=>new Date(Date.parse(asOf+'T00:00:00Z')+i*86400000)
 .toISOString().slice(0,10));
const rank=rankR43Issuers(Array.from({length:2634},(_,i)=>({ticker:`T${i}`,
 eligible:true,tradeDate:asOf,price:10+i,volume:100+i,relativeVolume:1+i/10000,
 dividendYield:i%10,eps:i/10,dailyChangePct:i%5,epsGrowthPct:i%30})),{asOf});
const compact=makeR43MarketImportanceDisplay(rank,{now});
const top=compact.selected[0].tickers[0];
const event=ticker=>({ticker,company:ticker,date:asOf,marketSession:'after_market',
 priority:false,time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const projection={status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
 redistribution:false,publicationStatus:'HELD_UNCONFIRMED',coveredDays:dates,
 checkedAt:new Date(now).toISOString(),recordCount:2,priorityCount:0,
 events:[event(top),event('ARM')]};
const display=earningsDisplaySnapshot(projection);
const url=`https://zgmini.kr/api/earnings-calendar-display?start=${asOf}&end=${asOf}`;

test('verified R43 selection owns the primary ★★★ and preserves FHS grade separately',async()=>{
 const annual={status:'READY_R3_PROVISIONAL',version:'ZGMINI-FHS-R3',
  asOf,sourceStoredAt:now,recordCount:2,
  grades:{[top]:[1,31],ARM:[3,92]}};
 const response=earningsDisplayResponse(display,url,annual,compact);
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,new RegExp(`${top}\\)`));
 assert.match(html,/시장 중요도 별 3개/);
 assert.match(html,/시장 중요도 별 2개/);
 assert.match(html,/재무건전성 1등급/);
 assert.match(html,/재무건전성 3등급/);
 assert.equal((html.match(/aria-label="시장 중요도 별 3개"/g)??[]).length,1);
 assert.doesNotMatch(html,/class="mc-market-importance-r43/);
 assert.match(html,/ARM/);
});

test('without a verified R43 snapshot, old FHS grade and fallback rendering remain',async()=>{
 const base=await earningsDisplayResponse(display,url,null,null).text();
 assert.doesNotMatch(base,/시장 중요도 ★★★/);
 assert.match(base,/중요도 3/); // Existing R42 ARM fallback remains untouched.
 const invalid=await earningsDisplayResponse(display,url,null,{...compact,topCount:100}).text();
 assert.equal(invalid,base);
});

test('verified R43 selection fixes the three-star filter to selected issuers',async()=>{
 const annual={status:'READY_R3_PROVISIONAL',version:'ZGMINI-FHS-R3',
  asOf,sourceStoredAt:now,recordCount:2,grades:{[top]:[1,31],ARM:[3,92]}};
 const html=await earningsDisplayResponse(display,url+'&importance=3',annual,compact).text();
 assert.match(html,new RegExp(`${top}\\)`));
 assert.doesNotMatch(html,/ARM \(ARM\)/);
 assert.equal((html.match(/aria-label="시장 중요도 별 3개"/g)??[]).length,1);
});

test('2634 whole-universe input with 400 old FHS three-star grades exposes exactly 132 R43 three-star issuers',async()=>{
 const tickers=Array.from({length:2634},(_,i)=>`T${i}`);
 const full={...projection,recordCount:tickers.length,priorityCount:0,
  events:tickers.map(event)};
 const whole=earningsDisplaySnapshot(full);
 const grades=Object.fromEntries(tickers.map((ticker,i)=>[ticker,i<400?[3,90]:[2,70]]));
 const annual={status:'READY_R3_PROVISIONAL',version:'ZGMINI-FHS-R3',
  asOf,sourceStoredAt:now,recordCount:tickers.length,grades};
 const response=earningsDisplayResponse(whole,url,annual,compact);
 assert.equal(response.status,200);
 const html=await response.text();
 assert.equal((html.match(/aria-label="시장 중요도 별 3개"/g)??[]).length,132);
 assert.equal((html.match(/aria-label="시장 중요도 별 2개"/g)??[]).length,0);
 assert.equal((html.match(/aria-label="시장 중요도 별 1개"/g)??[]).length,2502);
 const filtered=earningsDisplayResponse(whole,url+'&importance=3',annual,compact);
 assert.equal(filtered.headers.get('x-display-count'),'132');
 assert.equal((await filtered.text()).match(/aria-label="시장 중요도 별 3개"/g)?.length,132);
});

