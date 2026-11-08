import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isER1MonthlyFeedKey,er1MonthlyD1Readback,attemptOutput}
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

test('existing independent output failure behavior is not changed',async()=>{
 const report={};const first=await attemptOutput(report,'feed:test',async()=>{throw Error('D1_FAIL')});
 const second=await attemptOutput(report,'feed:other',async()=>true);
 assert.equal(first,false);assert.equal(second,true);
 assert.deepEqual(report.failures,[{id:'feed:test',reason:'D1_FAIL'}]);
});
