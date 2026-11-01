import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {toggleStarImportance} from '../lib/market-calendar-importance-toggle.mjs';
import {earningsDisplayHtml,earningsDisplayResponse,earningsDisplaySnapshot} from '../lib/earnings-api-display.mjs';

const client=fs.readFileSync(fileURLToPath(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url)),'utf8');
const vendor=fs.readFileSync(fileURLToPath(new URL('../app/market-calendar/earnings-display-client.tsx',import.meta.url)),'utf8');

test('R36 defaults to all calendar events and all importance levels',()=>{
 assert.match(client,/useState<FilterKind>\('all'\)/);
 assert.match(client,/useState<FilterImportance>\(null\)/);
 assert.match(client,/\[\['all','전체'\],\['economic','경제지표'\],\['earnings','기업 실적'\]\]/);
});

test('R36 multi-select independently toggles 3, 2, 1 and restores all when empty',()=>{
 let selected=null;
 selected=toggleStarImportance(selected,3);assert.deepEqual(selected,[3]);
 selected=toggleStarImportance(selected,2);assert.deepEqual(selected,[3,2]);
 selected=toggleStarImportance(selected,1);assert.deepEqual(selected,[3,2,1]);
 selected=toggleStarImportance(selected,2);assert.deepEqual(selected,[3,1]);
 selected=toggleStarImportance(selected,3);assert.deepEqual(selected,[1]);
 selected=toggleStarImportance(selected,1);assert.equal(selected,null);
 assert.match(client,/toggleStarImportance\(current,key\)/);
 assert.match(client,/importance\.includes\(row\.importance\)/);
 assert.match(vendor,/importance\.join\(','\)/);
});

const date='2026-10-29';
const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(`${date}T00:00:00Z`)+i*86400000).toISOString().slice(0,10));
const raw=ticker=>({ticker,date,company:ticker,marketSession:'after_market',kind:'earnings',country:'US',
 priority:ticker!=='ZM',verification:'VENDOR_UNVERIFIED',time:null,source:'earnings-api'});
const snapshot=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
 redistribution:false,publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-10-29T09:00:00Z',
 coveredDays,recordCount:3,priorityCount:2,events:[raw('GOOG'),raw('AMD'),raw('ZM')]});

test('R36 earnings HTML accepts simultaneous 3+2, 3+2+1 and all with no extra vendor request',async()=>{
 const html=importance=>earningsDisplayHtml(snapshot,{start:date,end:date,importance});
 assert.equal(html([3,2]).count,2);
 assert.equal(html([3,2,1]).count,3);
 assert.equal(html(null).count,3);
 assert.equal(html([3]).count,1);
 const url=`https://zgmini.kr/api/earnings-calendar-display?start=${date}&end=${date}&importance=3,2`;
 const response=earningsDisplayResponse(snapshot,url);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-display-count'),'2');
 assert.equal(response.headers.get('x-display-day-counts'),`${date}:2`);
 const body=await response.text();
 assert.match(body,/GOOG/);assert.match(body,/AMD/);assert.doesNotMatch(body,/ZM/);
 for(const impact of ['','4','3,4','3,3','3,,2','3,2,1,2']){
  assert.equal(earningsDisplayResponse(snapshot,url.replace('importance=3,2',`importance=${impact}`)).status,400,impact);
 }
 assert.throws(()=>html([]),/R31_HTML_REQUEST_INVALID/);
});
