/**
 * Independent W02 official Fed HTML one-pass proof for the reconciled 2027
 * source+calendar-client candidate. Never a PC/Collector/DB/Writer operation.
 * Exactly one bounded official GET on this named PR branch in GitHub CI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const BRANCH='support/w02-2027-fomc-owner-onepass-20261115';
const ENABLED=process.env.CI==='true'&&
 process.env.GITHUB_EVENT_NAME==='pull_request'&&
 process.env.GITHUB_HEAD_REF===BRANCH;
const MEETINGS=['2027-01-27','2027-03-17','2027-04-28','2027-06-09',
 '2027-07-28','2027-09-15','2027-10-27','2027-11-17'];
const MAX_BYTES=5_000_000;

test('W02 one-shot live official Fed 2027 parser and strategy-only label integration',
 {skip:!ENABLED&&'Live official GET only on the isolated W02 integration PR head',timeout:100_000},
 async t=>{
  const {parseFomcAnnualCalendar,RELEASE_SOURCES}=
   await import('../lib/release-calendar.mjs');
  const url=RELEASE_SOURCES.fed_fomc.url;
  assert.equal(url,'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm');
  const res=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(55_000),
   headers:{accept:'text/html','user-agent':'ZGMINI-W02-SourceOnly/1.0'}});
  assert.equal(res.status,200,'FOMC_OFFICIAL_HTTP_'+res.status);
  assert.equal(res.redirected,false,'FOMC_OFFICIAL_REDIRECT_UNAUTHORIZED');
  assert.equal(res.url,url,'FOMC_UNEXPECTED_ENDPOINT');
  assert.ok(res.body?.getReader,'FOMC_OFFICIAL_BODY_UNAVAILABLE');
  const declared=Number(res.headers.get('content-length'));
  assert.ok(!Number.isFinite(declared)||declared<=MAX_BYTES,'FOMC_DECLARED_TOO_LARGE');
  let n=0;const bytes=[];const reader=res.body.getReader();
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   n+=value.byteLength;
   if(n>MAX_BYTES){
    await reader.cancel();
    throw Error('FOMC_HTML_BYTES_CAP_EXCEEDED');
   }
   bytes.push(Buffer.from(value));
  }
  assert.ok(n>1000,'FOMC_HTML_EMPTY');
  const content=Buffer.concat(bytes);
  const sha=createHash('sha256').update(content).digest('hex');
  const html=new TextDecoder('utf-8',{fatal:true}).decode(content);
  // Invoke the actual, combined PC source parser: no test fixture/shim.
  const meetings=parseFomcAnnualCalendar(html,2027);
  assert.deepEqual(meetings.map(m=>m.date),MEETINGS);
  assert.equal(meetings.length,8);
  assert.equal(meetings.some(m=>m.date==='2027-12-08'),false);
  assert.ok(meetings.every(m=>m.id==='fomc'&&m.source==='fed_fomc'));
  const client=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
  assert.ok(client.includes("item.source==='fed_fomc'&&item.id==='fomc'&&item.date==='2027-10-27'"),
   'FOMC_OCT_2027_STRATEGY_ONLY_UI_GUARD_ABSENT');
  assert.ok(client.includes('미국 FOMC 통화정책 전략 회의 · 금리 결정 없음'),
   'FOMC_OCT_2027_MISLABELED_DECISION');
  t.diagnostic('W02_OFFICIAL_FOMC_2027_INTEGRATED_REAL_HTML bytes='+n+
   ' sha256='+sha+' count='+meetings.length+
   ' first='+meetings[0].date+' strategyOnly=2027-10-27'+
   ' final='+meetings.at(-1).date+' removedOldFinal=2027-12-08');
});
