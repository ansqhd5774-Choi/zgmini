import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planNewSymbolBackfill,inspectBackfillPages} from '../scripts/pc-writer/asset-r10-new-symbol-backfill-research.mjs';

const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sessions=[];
for(let day=new Date('2025-01-01T00:00:00Z');sessions.length<205;day.setUTCDate(day.getUTCDate()+1)){
 if(day.getUTCDay()>0&&day.getUTCDay()<6)sessions.push(day.toISOString().slice(0,10));
}
const throughDate=sessions.at(-1),asOfDate='2026-11-02';
const proof={status:'PIT_TIME_EFFECTIVE_IDENTITIES_VERIFIED',isResearchOnly:true,eventDigest:'b'.repeat(64)};
const identity={ticker:'TWLO',validFrom:'2016-06-23',validTo:null,membershipEvidenceSha256:'c'.repeat(64),
 securityIdentitySha256:'d'.repeat(64),corporateActionPriceBasisReviewed:true,priceBasisEvidenceSha256:'e'.repeat(64)};
const providerPolicy={rightsStatus:'ALPACA_IEX_RESEARCH_RETRIEVAL_APPROVED',
 rightsEvidenceSha256:'a'.repeat(64),approvedRequestCap:2,approvedSymbolCap:2};
const input={sessions,throughDate,asOfDate,missingSymbols:['TWLO'],pitProof:proof,identities:[identity],providerPolicy};
const plan=planNewSymbolBackfill(input);
const responseFor=rows=>({bars:{TWLO:rows},next_page_token:null});
const bars=sessions.slice(-200).map(t=>({t:t+'T14:30:00Z',c:100,v:10}));
function pages(response=responseFor(bars),params=plan.requests[0].params){
 return {TWLO:[{requestedPageToken:null,httpStatus:200,requestParams:params,response,responseSha256:hash(response)}]};
}

test('plans one bounded IEX split request with unmapped asof but makes no API call',()=>{
 assert.equal(plan.status,'RESEARCH_REQUESTS_PREPARED_NO_PROVIDER_CALLS');
 assert.equal(plan.canPromote,false);assert.equal(plan.providerRequests,0);
 assert.equal(plan.requestCount,1);assert.equal(plan.expectedSessions.length,200);
 assert.equal(plan.requests[0].params.asof,'-');
 assert.equal(plan.requests[0].params.feed,'iex');
 assert.equal(plan.requests[0].params.adjustment,'split');
});

test('refuses requests with no time-effective PIT or security evidence',()=>{
 assert.equal(planNewSymbolBackfill({...input,pitProof:{...proof,isResearchOnly:false}}).status,'STOP_TIME_EFFECTIVE_PIT_PROOF_MISSING');
 assert.equal(planNewSymbolBackfill({...input,identities:[]}).status,'STOP_SYMBOL_IDENTITY_EVIDENCE_MISSING');
 assert.equal(planNewSymbolBackfill({...input,identities:[{...identity,corporateActionPriceBasisReviewed:false}]}).status,'STOP_SYMBOL_IDENTITY_EVIDENCE_INVALID');
});

test('requires explicit source rights and bounded provider request budget',()=>{
 assert.equal(planNewSymbolBackfill({...input,providerPolicy:{...providerPolicy,rightsEvidenceSha256:null}}).status,'STOP_PROVIDER_RIGHTS_OR_BUDGET_NOT_APPROVED');
 assert.equal(planNewSymbolBackfill({...input,providerPolicy:{...providerPolicy,approvedRequestCap:0}}).status,'STOP_PROVIDER_RIGHTS_OR_BUDGET_NOT_APPROVED');
 assert.equal(planNewSymbolBackfill({...input,missingSymbols:['TWLO','SKYD','PSKY']}).status,'STOP_PROVIDER_REQUEST_BUDGET_EXCEEDED');
 const first={...pages().TWLO[0],response:{bars:{TWLO:[]},next_page_token:'page2'}};
 first.responseSha256=hash(first.response);
 const second={...pages().TWLO[0],requestedPageToken:'page2'};
 const singlePageBudgetPlan=planNewSymbolBackfill({...input,providerPolicy:{...providerPolicy,approvedRequestCap:1}});
 assert.equal(inspectBackfillPages({plan:singlePageBudgetPlan,pagesByTicker:{TWLO:[first,second]}}).status,
  'STOP_PROVIDER_REQUEST_BUDGET_EXCEEDED');
});

test('invalid calendar dates are rejected without silent UTC normalization',()=>{
 assert.equal(planNewSymbolBackfill({...input,throughDate:'2026-02-30'}).status,'STOP_DATE_SCOPE_INVALID');
 assert.equal(planNewSymbolBackfill({...input,sessions:sessions.map(d=>d==='2025-03-03'?'2025-02-30':d)}).status,
  'STOP_VERIFIED_SESSION_WINDOW_MISSING');
});

test('200-session historical identity cannot cross a rename or issuer validity boundary',()=>{
 assert.equal(planNewSymbolBackfill({...input,identities:[{...identity,validFrom:sessions.at(-100)}]}).status,'STOP_SYMBOL_IDENTITY_EVIDENCE_INVALID');
 assert.equal(planNewSymbolBackfill({...input,identities:[{...identity,validTo:sessions.at(-2)}]}).status,'STOP_SYMBOL_IDENTITY_EVIDENCE_INVALID');
});

test('audit digest binds PIT, membership, identity and split-price evidence',()=>{
 for(const variant of [
  {provenance:{...plan.provenance,eventDigest:'f'.repeat(64)}},
  {provenance:{...plan.provenance,identities:[{...plan.provenance.identities[0],membershipEvidenceSha256:'f'.repeat(64)}]}},
  {provenance:{...plan.provenance,identities:[{...plan.provenance.identities[0],securityIdentitySha256:'f'.repeat(64)}]}},
  {provenance:{...plan.provenance,identities:[{...plan.provenance.identities[0],priceBasisEvidenceSha256:'f'.repeat(64)}]}},
  {provenance:{...plan.provenance,providerPolicy:{...plan.provenance.providerPolicy,rightsEvidenceSha256:'f'.repeat(64)}}},
  {requests:[{...plan.requests[0],params:{...plan.requests[0].params,asof:'2026-11-02'}}]},
  {expectedSessions:[...plan.expectedSessions.slice(0,-1),'2026-10-31']}
 ])assert.equal(inspectBackfillPages({plan:{...plan,...variant},pagesByTicker:pages()}).status,'STOP_BACKFILL_PLAN_INVALID');
});

test('rejects unsafe request scope and unverified session window',()=>{
 assert.equal(planNewSymbolBackfill({...input,missingSymbols:Array.from({length:11},(_,i)=>'X'+i)}).status,'STOP_NEW_SYMBOL_SCOPE_INVALID');
 assert.equal(planNewSymbolBackfill({...input,sessions:[...sessions.slice(0,-1),sessions.at(-2)]}).status,'STOP_VERIFIED_SESSION_WINDOW_MISSING');
});

test('rejects traversal-style ticker directory components and accepts real class tickers',()=>{
 for(const candidate of ['.','..','-','../TWLO','TWLO/..']){
  const request=planNewSymbolBackfill({...input,missingSymbols:[candidate],
    identities:[{...identity,ticker:candidate}]});
  assert.equal(request.status,'STOP_NEW_SYMBOL_SCOPE_INVALID',candidate);
 }
 for(const candidate of ['BRK.B','BF.B','BRK-B']){
  const request=planNewSymbolBackfill({...input,missingSymbols:[candidate],
    identities:[{...identity,ticker:candidate}]});
  assert.equal(request.status,'RESEARCH_REQUESTS_PREPARED_NO_PROVIDER_CALLS',candidate);
 }
});

test('accepts 200 distinct verified responses for research only',()=>{
 const r=inspectBackfillPages({plan,pagesByTicker:pages()});
 assert.equal(r.status,'RESEARCH_PRICES_200_SESSIONS_VALIDATED_AUDIT_PENDING');
 assert.equal(r.canPromote,false);assert.equal(r.productionEligible,false);
 assert.equal(r.results[0].rows.length,200);
 assert.equal(r.results[0].rows[0].asof,'-');
});

test('one missing IEX day cannot be silently filled',()=>{
 const r=inspectBackfillPages({plan,pagesByTicker:pages(responseFor(bars.slice(1)))});
 assert.equal(r.status,'PARTIAL_200_SESSION_PRICE_COVERAGE');
 assert.equal(r.missingCount,1);assert.equal(r.canPromote,false);
});

test('default asof, forged digest, or duplicate same-price bar blocks evidence',()=>{
 const mapped=pages(responseFor(bars),{...plan.requests[0].params,asof:'2026-11-02'});
 assert.equal(inspectBackfillPages({plan,pagesByTicker:mapped}).status,'STOP_UNVERIFIED_ALPACA_RESPONSE');
 const forged=pages();forged.TWLO[0].responseSha256='f'.repeat(64);
 assert.equal(inspectBackfillPages({plan,pagesByTicker:forged}).status,'STOP_ALPACA_RESPONSE_HASH_MISMATCH');
 const duplicated=pages(responseFor([...bars,bars[0]]));
 assert.equal(inspectBackfillPages({plan,pagesByTicker:duplicated}).status,'STOP_ALPACA_BAR_OR_DUPLICATE_INVALID');
});

test('incomplete pagination and unexpected ticker both block',()=>{
 const pending=pages({...responseFor(bars),next_page_token:'more'});
 assert.equal(inspectBackfillPages({plan,pagesByTicker:pending}).status,'STOP_ALPACA_PAGINATION_INCOMPLETE');
 const wrong=pages({bars:{SKYD:bars},next_page_token:null});
 assert.equal(inspectBackfillPages({plan,pagesByTicker:wrong}).status,'STOP_UNVERIFIED_ALPACA_RESPONSE');
 assert.equal(inspectBackfillPages({plan,pagesByTicker:{...pages(),SKYD:[]}}).status,
  'STOP_UNEXPECTED_ALPACA_TICKER_EVIDENCE');
 const extraPage=pages();extraPage.TWLO.push({...extraPage.TWLO[0]});
 assert.equal(inspectBackfillPages({plan,pagesByTicker:extraPage}).status,'STOP_ALPACA_PAGINATION_INVALID');
});
