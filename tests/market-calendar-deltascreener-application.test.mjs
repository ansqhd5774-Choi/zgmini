import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseDeltaScreenerCsv,gradeCalendarTickersFromDelta} from '../lib/market-calendar-deltascreener-snapshot.mjs';
import {makeDeltaR44Public,validateDeltaR44Public,
 DELTA_R44_METHOD,DELTA_R44_LEGACY_METHOD} from '../lib/market-calendar-deltascreener-public.mjs';
import {earningsDisplaySnapshot,earningsDisplayHtml} from '../lib/earnings-api-display.mjs';
import {collectPinnedDeltaOnce} from '../scripts/pc-writer/market-calendar-deltascreener-input.mjs';

const source='ticker,name,exchange,sector,industry,country,price,mktCap\n'+
 'DAC,Danaos Corporation,NYSE,Industrials,Marine Shipping,,153.96,2802626256\n'+
 'NVDA,Nvidia,NASDAQ,Technology,Semiconductors,US,202.06,4869646000000\n';
const r44=()=>{
 const parsed=parseDeltaScreenerCsv(source);
 return makeDeltaR44Public(gradeCalendarTickersFromDelta(parsed,['DAC','NVDA']));
};
const days=Array.from({length:14},(_,i)=>
 '2026-11-'+String(i+10).padStart(2,'0'));
const projection=(when)=>({
 status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
 publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-11-15T10:00:00.000Z',
 coveredDays:days,recordCount:1,priorityCount:0,events:[{
  id:'earnings-vendor-dac-'+when,date:when,ticker:'DAC',company:'Danaos Corporation',
  marketSession:'after_market',time:null,verification:'VENDOR_UNVERIFIED',
  kind:'earnings',country:'US',source:'earnings-api'}]
});
test('market-cap D1 contract contains derived tiers, attribution and no raw USD values',()=>{
 const s=r44(),ok=validateDeltaR44Public(s);
 assert.ok(ok);assert.equal(ok.grades.DAC,1);assert.equal(ok.grades.NVDA,3);
 assert.equal(JSON.stringify(s).includes('2802626256'),false);
 assert.equal(JSON.stringify(s).includes('4869646000000'),false);
 assert.equal(s.sourceAsOf,'2026-11-03');
});
test('R44 overrides EPS stars only after source as-of; a dated credit link is visible',()=>{
 const display=earningsDisplaySnapshot(projection('2026-11-16'));
 const html=earningsDisplayHtml(display,{start:'2026-11-16',end:'2026-11-16'},
  null,null,null,{},r44()).html;
 assert.match(html,/시총 기준 중요도 별 1개/);
 assert.match(html,/DeltaScreener<\/a> \(2026-11-03\)/);
 assert.match(html,/deltascreener\.com\/data/);
});
test('new R44 50B method carries exact threshold into display without hiding legacy 200B rows',()=>{
 const current=r44();
 assert.equal(current.method,DELTA_R44_METHOD);
 assert.match(current.method,/50B_20B/);
 const display=earningsDisplaySnapshot(projection('2026-11-16'));
 const params={start:'2026-11-16',end:'2026-11-16'};
 const shown=earningsDisplayHtml(display,params,null,null,null,{},current).html;
 assert.match(shown,/★★★ 50B USD 이상 · ★★ 20B USD 이상/);
 const previous={...current,method:DELTA_R44_LEGACY_METHOD};
 assert.ok(validateDeltaR44Public(previous));
 const legacy=earningsDisplayHtml(display,params,null,null,null,{},previous).html;
 assert.match(legacy,/★★★ 200B USD 이상 · ★★ 20B USD 이상/);
 assert.doesNotMatch(legacy,/★★★ 50B USD 이상/);
});
test('missing public R44 data does not invent star or attribution',()=>{
 const display=earningsDisplaySnapshot(projection('2026-11-16'));
 const html=earningsDisplayHtml(display,{start:'2026-11-16',end:'2026-11-16'},
  null,null,null,{},null).html;
 assert.match(html,/기업 실적 점수 없음/);
 assert.doesNotMatch(html,/시총 기준 중요도 별 1개/);
 assert.doesNotMatch(html,/deltascreener\.com/);
});
test('private CSV acquisition does not refetch cached data and rejects unsigned response',async()=>{
 let calls=0,stored=null;
 const store={readInput:async()=>stored,writeInput:async()=>{throw Error('MUST_NOT_WRITE')}};
 const r=await collectPinnedDeltaOnce({store,now:1794700000000,fetchImpl:async()=>{
  calls++;return new Response(source,{status:200,headers:{'content-type':'text/csv'},
   });}});
 assert.equal(r.status,'FAILED_PREVIOUS_INPUT_PRESERVED');assert.equal(r.code,'DELTA_UPLOAD_SIZE_INVALID');
 assert.equal(calls,1);
 stored={body:{text:source,sha256:createHash('sha256').update(source).digest('hex')}};
 const again=await collectPinnedDeltaOnce({store,now:1794700000000,fetchImpl:async()=>{calls++;throw Error('NO')}});
 assert.equal(again.status,'EXISTING_INPUT_INVALID_PRESERVED');
 assert.equal(calls,1);
});

test('mixed-vintage market calendar filter labels do not misstate ER1 97 as universal',()=>{
 const client=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(client,/기업 실적: 게시된 시총 중요도 또는 실적 점수/);
 assert.match(client,/기업 실적: 시총 중요도 또는 실적 점수\(행별 적용 기준\)/);
 assert.match(client,/기업 실적 게시 등급/);
 assert.doesNotMatch(client,/기업 실적[^\n]*97점 이상/);
});
