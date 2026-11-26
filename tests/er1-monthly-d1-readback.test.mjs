import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isER1MonthlyFeedKey,er1MonthlyD1Readback,retainRecentER1Readback,
 assertER1ReadbackConsistent,canReuseER1VintageEvidence,attemptOutput}
 from '../scripts/pc-writer/independent-publication.mjs';

const sha=value=>createHash('sha256').update(value,'utf8').digest('hex');
const row=(body='{"score":97}',stored_at=1800000000000,month='2027-03')=>({
 feed_key:`market-calendar:earnings-er1-score-${month}-public`,body,stored_at});

test('monthly key accepts future months but not unrelated feeds or malformed periods',()=>{
 assert.equal(isER1MonthlyFeedKey(row().feed_key),true);
 assert.equal(isER1MonthlyFeedKey(row('{}',1,'2027-13').feed_key),false);
 assert.equal(isER1MonthlyFeedKey('market-calendar:earnings-er1-score-2027-03-public:secret'),false);
 assert.equal(isER1MonthlyFeedKey('employment-r6:2027-03'),false);
});

test('equal stored_at with the identical D1 body is matched, without returning raw bodies',()=>{
 const local=row();const evidence=er1MonthlyD1Readback(local,{body:local.body,stored_at:local.stored_at},{now:()=>1800000001111});
 assert.equal(evidence.status,'MATCHED');
 assert.equal(evidence.localBodySha256,sha(local.body));
 assert.equal(evidence.d1BodySha256,sha(local.body));
 assert.equal(evidence.d1StoredAt,local.stored_at);
 assert.equal(JSON.stringify(evidence).includes('"score"'),false);
});

test('same timestamp but different D1 body never matches',()=>{
 const evidence=er1MonthlyD1Readback(row(),{body:'{"score":85}',stored_at:1800000000000});
 assert.equal(evidence.status,'BODY_MISMATCH');
 assert.notEqual(evidence.localBodySha256,evidence.d1BodySha256);
});

test('remote newer remains preserved and is never considered a match',()=>{
 const evidence=er1MonthlyD1Readback(row(),{body:'{"score":97}',stored_at:1800000000001});
 assert.equal(evidence.status,'REMOTE_NEWER_PRESERVED');
});

test('missing, older and invalid readbacks have distinct statuses',()=>{
 assert.equal(er1MonthlyD1Readback(row(),undefined).status,'NOT_FOUND');
 assert.equal(er1MonthlyD1Readback(row(),{body:'{}',stored_at:1799999999999}).status,'REMOTE_OLDER');
 assert.equal(er1MonthlyD1Readback(row(),{body:undefined,stored_at:1800000000000}).status,'INVALID_REMOTE_OUTPUT');
 assert.equal(er1MonthlyD1Readback({...row(),body:null},undefined).status,'INVALID_LOCAL_OUTPUT');
});

test('bounded monthly D1 evidence always retains newest 24 despite unordered rows',()=>{
 const rows=Array.from({length:30},(_,index)=>row('{}',1800000000000,
  new Date(Date.UTC(2026,index,1)).toISOString().slice(0,7)));
 const order=rows.map((_,index)=>index).sort((left,right)=>
  (left*13%31)-(right*13%31));
 const evidence=[];
 for(const index of order){
  const local=rows[index];
  retainRecentER1Readback(evidence,er1MonthlyD1Readback(local,local));
  assert.ok(evidence.length<=24);
 }
 const expected=rows.slice(-24).map(item=>item.feed_key).reverse();
 assert.deepEqual(evidence.map(item=>item.key),expected);
 // A repeated monthly output replaces its own evidence without increasing size.
 retainRecentER1Readback(evidence,er1MonthlyD1Readback(rows.at(-1),{
  body:'{"score":85}',stored_at:rows.at(-1).stored_at}));
 assert.equal(evidence.length,24);
 assert.equal(evidence[0].status,'BODY_MISMATCH');
});

test('same-timestamp ER1 body mismatch fails only that feed without overwriting D1',async()=>{
 const local=row();const originalRemote={body:'{"score":85}',stored_at:local.stored_at};
 const evidence=er1MonthlyD1Readback(local,originalRemote);
 const report={};
 const ok=await attemptOutput(report,'feed:'+local.feed_key,async()=>{
  assertER1ReadbackConsistent(evidence);
 });
 assert.equal(ok,false);
 assert.deepEqual(report.failures,[{id:`feed:${local.feed_key}`,
  reason:'LOCAL_FEED_PUBLICATION_MISMATCH'}]);
 assert.equal(originalRemote.body,'{"score":85}');
 assert.doesNotThrow(()=>assertER1ReadbackConsistent(
  er1MonthlyD1Readback(local,{body:'{}',stored_at:local.stored_at+1})));
 assert.doesNotThrow(()=>assertER1ReadbackConsistent(null));
});

test('existing independent output failure behavior is not changed',async()=>{
 const report={};const first=await attemptOutput(report,'feed:test',async()=>{throw Error('D1_FAIL')});
 const second=await attemptOutput(report,'feed:other',async()=>true);
 assert.equal(first,false);assert.equal(second,true);
 assert.deepEqual(report.failures,[{id:'feed:test',reason:'D1_FAIL'}]);
});

test('verified old monthly archive evidence is reused only for the exact D1-matched source',()=>{
 const local=row();
 const current=er1MonthlyD1Readback(local,local);
 const previous={key:current.key,status:'VERIFIED',
  localStoredAt:current.localStoredAt,localBodySha256:current.localBodySha256};
 assert.equal(canReuseER1VintageEvidence(current,previous),true);
 assert.equal(canReuseER1VintageEvidence({...current,status:'BODY_MISMATCH'},previous),false);
 assert.equal(canReuseER1VintageEvidence(current,{...previous,localStoredAt:1}),false);
 assert.equal(canReuseER1VintageEvidence(current,{...previous,localBodySha256:'different'}),false);
 assert.equal(canReuseER1VintageEvidence(current,{...previous,key:'other'}),false);
});
