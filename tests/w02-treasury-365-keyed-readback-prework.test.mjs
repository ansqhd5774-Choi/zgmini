import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compareTreasury365KeyedEvidence,buildTreasury365PrivateReceipt,
 compareTreasury365ReceiptToPublic,W02_TREASURY_365_AUDIT_SCHEMA,
 W02_TREASURY_365_PRIVATE_RECEIPT_SCHEMA}
 from '../scripts/market-calendar/treasury-365-keyed-readback-prework.mjs';
import {parseTreasuryDirectAuctionRows}
 from '../lib/treasury-auction-history-taws.mjs';
import {parseTreasuryAuctionHistoryRows}
 from '../lib/treasury-auction-history.mjs';

const fromDate='2025-11-10',toDate='2026-11-09';
const storedAt=Date.parse('2026-11-15T03:45:06.198Z');
const stamp=new Date(storedAt+1000).toISOString();
const apiStamp=new Date(storedAt+2500).toISOString();
const sha=value=>createHash('sha256').update(value,'utf8').digest('hex');
const cusip=i=>'9'+i.toString(36).toUpperCase().padStart(8,'0');
const awarded=i=>({
 cusip:cusip(i),competitiveAuctionCloseDate:'2026-11-05T00:00:00',
 announcementDate:'2026-11-03T00:00:00',issueDate:'2026-11-10T00:00:00',
 type:'Bill',securityTerm:'4-Week',originalSecurityTerm:'17-Week',
 reopening:'No',inflationProtected:'No',floatingRate:'No',
 bidToCoverRatio:'2.46',
});
const pending=i=>({...awarded(i),bidToCoverRatio:''});
const rows=[...Array.from({length:436},(_,i)=>awarded(i)),
 ...Array.from({length:11},(_,i)=>pending(i+436))];
const expected=parseTreasuryAuctionHistoryRows(
 parseTreasuryDirectAuctionRows(rows,{fromDate,toDate}),{fromDate,toDate});
assert.equal(expected.length,872);
const rawText=JSON.stringify(rows);
const snapshot={status:'READY',updatedAt:new Date(storedAt).toISOString(),
 sources:{treasury:{status:'READY'},fed_fomc:{status:'SOURCE_FAILED'}},
 events:[...expected,{id:'bls-cpi',date:'2026-11-10',source:'bls'}]};
const make=(body=snapshot)=>({
 privateText:rawText,fromDate,toDate,
 pcTextSha256:sha(rawText),pcRawRowCount:447,pcAwardedRowCount:436,
 d1BodyText:JSON.stringify(body),d1StoredAt:storedAt,d1ReadAt:stamp,
 apiBody:structuredClone(body),apiObservedAt:apiStamp,
 now:storedAt+10000,
});
const check=(overrides={})=>compareTreasury365KeyedEvidence({...make(),...overrides});

test('W02 447 stored official rows -> 436 awarded -> 436 auction + 436 announcement are matched by exact key',()=>{
 const verdict=check();
 assert.equal(verdict.schema,W02_TREASURY_365_AUDIT_SCHEMA);
 assert.equal(verdict.status,'KEYED_CONTENT_MATCH_LINEAGE_NOT_VERIFIED');
 assert.equal(verdict.privateRawRowCount,447);
 assert.equal(verdict.privateAwardedRowCount,436);
 assert.equal(verdict.expectedEventCount,872);
 assert.equal(verdict.publicEventCount,872);
 // A hash-only receipt cannot reveal individual missing/extra keys.
 assert.equal(Object.hasOwn(verdict,'missingEventCount'),false);
 assert.equal(Object.hasOwn(verdict,'extraEventCount'),false);
 assert.equal(verdict.expectedKeySetSha256,verdict.publicKeySetSha256);
 for(const field of ['runtimeVerified','sourceLineageVerified',
  'deploymentIdentityVerified','ownerAuthorizationVerified'])
  assert.equal(verdict[field],false);
 assert.doesNotMatch(JSON.stringify(verdict),/treasury-auction-9|PRIVATE_SOURCE|bidToCoverRatio|cusip/);
});

test('W02 equal counts with a different Treasury event date can NEVER certify 365d identity',()=>{
 const wrong=structuredClone(snapshot);
 wrong.events[0]={...wrong.events[0],date:'2026-11-04'};
 const verdict=check({d1BodyText:JSON.stringify(wrong),apiBody:wrong});
 assert.equal(verdict.status,'TREASURY_PUBLIC_KEY_MISMATCH');
 assert.equal(verdict.publicEventCount,872);
 // The key-set SHA proves mismatch without exposing individual CUSIPs.
 assert.equal(verdict.expectedEventCount,872);
 assert.notEqual(verdict.publicKeySetSha256,check().publicKeySetSha256);
});
test('W02 unchanged public count does not hide replaced auction CUSIP',()=>{
 const wrong=structuredClone(snapshot);
 const pos=wrong.events.findIndex(x=>x.id.startsWith('treasury-auction'));
 wrong.events[pos]={...wrong.events[pos],id:'treasury-auction-9zzzzzzzz'};
 const verdict=check({d1BodyText:JSON.stringify(wrong),apiBody:wrong});
 assert.equal(verdict.status,'TREASURY_PUBLIC_KEY_MISMATCH');
 // The key-set SHA proves mismatch without exposing individual CUSIPs.
 assert.equal(verdict.expectedEventCount,872);
 assert.notEqual(verdict.publicKeySetSha256,check().publicKeySetSha256);
 assert.doesNotMatch(JSON.stringify(verdict),/9zzzzzzzz/);
});
test('W02 duplicate public 365d Treasury events fail without silently deduplicating',()=>{
 const wrong=structuredClone(snapshot);
 wrong.events.push(structuredClone(wrong.events[0]));
 assert.equal(check({d1BodyText:JSON.stringify(wrong),apiBody:wrong}).status,
  'PUBLIC_TREASURY_DUPLICATE');
});
test('W02 independent approved PC text hash and awarded/raw counts are required',()=>{
 assert.equal(check({pcTextSha256:sha('different')}).status,'PC_RAW_SHA_MISMATCH');
 assert.equal(check({pcRawRowCount:446}).status,'PC_RAW_ROW_COUNT_MISMATCH');
 assert.equal(check({pcAwardedRowCount:437}).status,'PC_AWARDED_ROW_COUNT_MISMATCH');
});
test('W02 stored D1 JSON vs public API differences fail before key check',()=>{
 const wrong=structuredClone(snapshot);
 wrong.events[0].date='2026-11-04';
 assert.equal(check({apiBody:wrong}).status,'D1_API_BODY_MISMATCH');
 assert.equal(check({d1StoredAt:storedAt+1}).status,'INVALID_PUBLIC_SNAPSHOT');
});
test('W02 valid Treasury READY survives other supplier PARTIAL, but Treasury SOURCE_FAILED is not ready',()=>{
 const partial=structuredClone(snapshot);partial.status='PARTIAL';
 assert.equal(check({d1BodyText:JSON.stringify(partial),apiBody:partial}).status,
  'KEYED_CONTENT_MATCH_LINEAGE_NOT_VERIFIED');
 partial.sources.treasury.status='SOURCE_FAILED';
 assert.equal(check({d1BodyText:JSON.stringify(partial),apiBody:partial}).status,
  'TREASURY_SOURCE_NOT_READY');
});
test('W02 exactly 365 inclusive days and same-window observation are mandatory',()=>{
 assert.equal(check({fromDate:'2025-11-11'}).status,'UNVERIFIED_365_DAY_WINDOW');
 assert.equal(check({toDate:'2026-11-10'}).status,'UNVERIFIED_365_DAY_WINDOW');
 assert.equal(check({apiObservedAt:new Date(storedAt+180000).toISOString(),
  now:storedAt+200000}).status,'UNVERIFIED_CAPTURE_WINDOW');
 assert.equal(check({d1ReadAt:apiStamp,apiObservedAt:stamp}).status,
  'UNVERIFIED_CAPTURE_WINDOW');
});
test('W02 malformed/unlicensed raw does not leak private source or produce a false match',()=>{
 const modified=structuredClone(rows);
 modified[0].bidToCoverRatio='SECRET_INVALID_SOURCE';
 const text=JSON.stringify(modified);
 const verdict=check({privateText:text,pcTextSha256:sha(text)});
 assert.equal(verdict.status,'PRIVATE_RAW_VALIDATION_FAILED');
 assert.doesNotMatch(JSON.stringify(verdict),/SECRET_INVALID_SOURCE/);
 assert.equal(check({unknownAction:'DELETE'}).status,'UNVERIFIED_INPUT_CONTRACT');
});
test('W02 valid extra future weekly event outside 365d does not falsify historical identity',()=>{
 const mixed=structuredClone(snapshot);
 mixed.events.push({source:'treasury',id:'treasury-auction-9ffffffff',
  date:'2026-11-10'});
 const verdict=check({d1BodyText:JSON.stringify(mixed),apiBody:mixed});
 assert.equal(verdict.status,'KEYED_CONTENT_MATCH_LINEAGE_NOT_VERIFIED');
 assert.equal(verdict.publicEventCount,872);
});

test('W02 inside-PC receipt contains only SHA/counts and never private raw or CUSIP',()=>{
 const receipt=buildTreasury365PrivateReceipt({privateText:rawText,fromDate,toDate});
 assert.equal(receipt.schema,W02_TREASURY_365_PRIVATE_RECEIPT_SCHEMA);
 assert.equal(receipt.privateRawRowCount,447);
 assert.equal(receipt.privateAwardedRowCount,436);
 assert.equal(receipt.expectedEventCount,872);
 assert.equal(receipt.privateRawTextSha256,sha(rawText));
 const serialized=JSON.stringify(receipt);
 assert.equal(serialized.includes(cusip(0)),false);
 assert.doesNotMatch(serialized,/bidToCoverRatio|competitiveAuctionCloseDate|4-Week/);
 const publicVerdict=compareTreasury365ReceiptToPublic({
  privateReceipt:receipt,d1BodyText:JSON.stringify(snapshot),
  d1StoredAt:storedAt,d1ReadAt:stamp,apiBody:structuredClone(snapshot),
  apiObservedAt:apiStamp,now:storedAt+10000
 });
 assert.equal(publicVerdict.status,'KEYED_CONTENT_MATCH_LINEAGE_NOT_VERIFIED');
 assert.equal(publicVerdict.sourceLineageVerified,false);
 assert.equal(publicVerdict.ownerAuthorizationVerified,false);
 assert.doesNotMatch(JSON.stringify(publicVerdict),/bidToCoverRatio|competitiveAuctionCloseDate/);
});
test('W02 identical event keys but corrupted Treasury title or URL fail on metadata digest',()=>{
 for(const patch of [
  {title:'잘못된 입찰 종류'}, {sourceUrl:'https://wrong.example/auctions/'}
 ]){
  const changed=structuredClone(snapshot);
  changed.events[0]={...changed.events[0],...patch};
  assert.equal(check({d1BodyText:JSON.stringify(changed),apiBody:changed}).status,
   'TREASURY_PUBLIC_EVENT_METADATA_MISMATCH');
 }
});
test('W02 only exact bounded private receipt schema can be used without raw transfer',()=>{
 const receipt=buildTreasury365PrivateReceipt({privateText:rawText,fromDate,toDate});
 const base={privateReceipt:receipt,d1BodyText:JSON.stringify(snapshot),
  d1StoredAt:storedAt,d1ReadAt:stamp,apiBody:snapshot,
  apiObservedAt:apiStamp,now:storedAt+10000};
 for(const patch of [
  {schema:'UNAUTHORIZED'}, {expectedKeySetSha256:'not-a-hash'},
  {privateAwardedRowCount:999}, {raw:'PRIVATE_JSON'},
  {expectedEventCount:10000}
 ]){
  const result=compareTreasury365ReceiptToPublic({
   ...base,privateReceipt:{...receipt,...patch}
  });
  assert.equal(result.status,'UNVERIFIED_INPUT_CONTRACT');
 }
 assert.throws(()=>buildTreasury365PrivateReceipt({
  privateText:'NOT_JSON',fromDate,toDate
 }),/W02_TREASURY_PRIVATE_VALIDATION_FAILED/);
 assert.throws(()=>buildTreasury365PrivateReceipt({
  privateText:rawText,fromDate:'2025-11-11',toDate
 }),/W02_TREASURY_365_DAY_WINDOW_INVALID/);
});
