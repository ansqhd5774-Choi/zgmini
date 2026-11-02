import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {planNewSymbolBackfill} from '../scripts/pc-writer/asset-r10-new-symbol-backfill-research.mjs';
import {stageR10NewSymbolBars} from '../scripts/pc-writer/asset-r10-new-symbol-collector-r1.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const sessions=[];
for(let day=new Date('2025-01-01T00:00:00Z');sessions.length<205;day.setUTCDate(day.getUTCDate()+1)){
 const date=day.toISOString().slice(0,10);
 if(isMarketSession(date))sessions.push(date);
}
const input={sessions,throughDate:sessions.at(-1),asOfDate:'2026-11-02',
 missingSymbols:['TWLO'],pitProof:{status:'PIT_TIME_EFFECTIVE_IDENTITIES_VERIFIED',
  isResearchOnly:true,eventDigest:'b'.repeat(64)},
 identities:[{ticker:'TWLO',validFrom:'2016-06-23',validTo:null,
  membershipEvidenceSha256:'c'.repeat(64),securityIdentitySha256:'d'.repeat(64),
  corporateActionPriceBasisReviewed:true,priceBasisEvidenceSha256:'e'.repeat(64)}],
 providerPolicy:{rightsStatus:'ALPACA_IEX_RESEARCH_RETRIEVAL_APPROVED',
  rightsEvidenceSha256:'a'.repeat(64),approvedRequestCap:2,approvedSymbolCap:2}};
const plan=planNewSymbolBackfill(input);
const authorization={researchCollectionApproved:true,approvedAuditDigest:plan.auditDigest,
 rightsEvidenceSha256:input.providerPolicy.rightsEvidenceSha256,maxRequests:2};
const credentials={id:'SECRET_ID_NEVER_LOG',secret:'SECRET_KEY_NEVER_LOG'};
const responseFor=(rows=sessions.slice(-200).map(t=>({t:t+'T14:30:00Z',c:100,v:10})),token=null)=>
 ({bars:{TWLO:rows},next_page_token:token});
const fakeFetch=(body=responseFor(),status=200)=>async(url)=>{
 assert.equal(url.origin,'https://data.alpaca.markets');
 assert.equal(url.searchParams.get('asof'),'-');
 assert.equal(url.searchParams.get('feed'),'iex');
 assert.equal(url.searchParams.get('adjustment'),'split');
 return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
};
const fixture=t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r10-collector-research-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 return base;
};
const invoke=(base,fetchImpl=fakeFetch(),overrides={})=>{
 const {authorization:requestedAuth,...rest}=overrides;
 return stageR10NewSymbolBars({plan,base,
  authorization:{...authorization,approvedBasePath:path.resolve(base),...requestedAuth},
  credentials,fetchImpl,wait:async()=>{},
  now:Date.parse('2026-11-02T05:00:00Z'),...rest});
};
const target=base=>path.join(base,'asset-r10-alpaca','research-asof-unmapped',plan.auditDigest);

test('requires explicit research capture approval before any provider call or write',async t=>{
 const base=fixture(t);let calls=0;
 const r=await invoke(base,async()=>{calls++;throw Error('NOT_EXPECTED');},
  {authorization:{...authorization,researchCollectionApproved:false}});
 assert.equal(r.status,'STOP_RESEARCH_AUTHORIZATION_MISSING');
 assert.equal(r.canPromote,false);assert.equal(calls,0);assert.equal(fs.existsSync(target(base)),false);
});

test('captures exact raw wire SHA and immutable source/rights manifest outside approved inputs',async t=>{
 const base=fixture(t),wire=JSON.stringify(responseFor());let calls=0;
 const r=await invoke(base,async(url,options)=>{
  calls++;assert.equal(url.searchParams.get('asof'),'-');
  assert.equal(options.headers['APCA-API-KEY-ID'],credentials.id);
  assert.equal(options.redirect,'error');
  return new Response(wire,{status:200});
 });
 assert.equal(r.status,'RESEARCH_CAPTURED_NOT_PROMOTABLE');
 assert.equal(calls,1);assert.equal(r.providerRequests,1);
 assert.equal(r.canPromote,false);assert.equal(r.productionEligible,false);
 assert.equal(r.d1Writes,0);assert.equal(r.pcApprovedInputWrites,0);
 const manifest=JSON.parse(fs.readFileSync(path.join(target(base),'manifest.json'),'utf8'));
 assert.equal(manifest.source,'ALPACA');assert.equal(manifest.asof,'-');
 assert.equal(manifest.sourceRightsEvidenceSha256,'a'.repeat(64));
 assert.equal(manifest.planSnapshot.auditDigest,plan.auditDigest);
 assert.equal(manifest.planSnapshot.expectedSessions.length,200);
 assert.equal(manifest.planSnapshotSha256,sha(JSON.stringify(manifest.planSnapshot)));
 assert.equal(Object.hasOwn(manifest.planSnapshot,'authorization'),false);
 assert.equal(Object.hasOwn(manifest.planSnapshot,'credentials'),false);
 assert.equal(manifest.files[0].sha256,sha(wire));
 const stored=fs.readFileSync(path.join(target(base),manifest.files[0].relativePath),'utf8');
 assert.equal(stored,wire);
 assert.equal(manifest.priceRows[0].count,200);
 assert.equal(fs.existsSync(path.join(base,'asset-r10-alpaca','incremental-checkpoint.json')),false);
 assert.equal(fs.existsSync(path.join(base,'local-asset-bubble-r10-release-payload.json')),false);
 assert.equal(JSON.stringify(manifest).includes(credentials.id),false);
 assert.equal(JSON.stringify(manifest).includes(credentials.secret),false);
});

test('identical plan cannot overwrite previous immutable staging or repeat provider requests',async t=>{
 const base=fixture(t);
 assert.equal((await invoke(base)).status,'RESEARCH_CAPTURED_NOT_PROMOTABLE');
 let calls=0;
 const r=await invoke(base,async()=>{calls++;throw Error('NOT_EXPECTED');});
 assert.equal(r.status,'STOP_RESEARCH_ALREADY_STAGED_REVIEW_REQUIRED');
 assert.equal(calls,0);
});

test('partial 200-session response never creates staging or approved rows',async t=>{
 const base=fixture(t);
 const r=await invoke(base,fakeFetch(responseFor(sessions.slice(-199).map(t=>({t:t+'T14:30:00Z',c:100,v:10})))));
 assert.equal(r.status,'PARTIAL_200_SESSION_PRICE_COVERAGE');
 assert.equal(r.canPromote,false);assert.equal(fs.existsSync(target(base)),false);
});

test('ambiguous relabeled ticker and duplicate historical rows fail closed',async t=>{
 const base=fixture(t);
 const wrong=await invoke(base,fakeFetch({bars:{SKYD:responseFor().bars.TWLO},next_page_token:null}));
 assert.equal(wrong.status,'STOP_UNVERIFIED_ALPACA_RESPONSE');
 const dup=[...responseFor().bars.TWLO,responseFor().bars.TWLO[0]];
 const repeated=await invoke(base,fakeFetch(responseFor(dup)));
 assert.equal(repeated.status,'STOP_ALPACA_BAR_OR_DUPLICATE_INVALID');
 assert.equal(fs.existsSync(target(base)),false);
});

test('forged endpoint or missing credentials cannot invoke HTTP',async t=>{
 const base=fixture(t);let calls=0;
 const fetchImpl=async()=>{calls++;throw Error('NOT_EXPECTED');};
 const forged={...plan,requests:[{...plan.requests[0],url:'https://example.org/steal'}]};
 assert.equal((await invoke(base,fetchImpl,{plan:forged})).status,'STOP_RESEARCH_PLAN_INVALID');
 assert.equal((await invoke(base,fetchImpl,{credentials:{id:'',secret:''}})).status,'STOP_LOCAL_CLIENT_UNAVAILABLE');
 assert.equal(calls,0);
});

test('research approval must pin exact PC data base path',async t=>{
 const base=fixture(t);let calls=0;
 const r=await invoke(base,async()=>{calls++;throw Error('NOT_EXPECTED');},
  {authorization:{approvedBasePath:path.join(base,'other-root')}});
 assert.equal(r.status,'STOP_RESEARCH_AUTHORIZATION_MISSING');
 assert.equal(calls,0);assert.equal(fs.existsSync(target(base)),false);
});

test('syntactically hashed but invalid security-effective window cannot fetch',async t=>{
 const base=fixture(t);let calls=0;
 const provenance={...plan.provenance,identities:[{
  ...plan.provenance.identities[0],validFrom:plan.expectedSessions.at(-100)}]};
 const fake={...plan,provenance};
 fake.auditDigest=sha(JSON.stringify({provenance,requests:fake.requests,window:fake.expectedSessions}));
 const auth={...authorization,approvedAuditDigest:fake.auditDigest};
 const r=await invoke(base,async()=>{calls++;throw Error('NOT_EXPECTED');},
  {plan:fake,authorization:auth});
 assert.equal(r.status,'STOP_RESEARCH_PLAN_SEMANTICS_INVALID');
 assert.equal(calls,0);
});

test('forged canonical dot-directory ticker cannot escape immutable research root',async t=>{
 const base=fixture(t);let calls=0;
 const ticker='..',provenance={...plan.provenance,
  identities:[{...plan.provenance.identities[0],ticker}]};
 const req=plan.requests[0],params={...req.params,symbols:ticker};
 const url=new URL(req.url);url.searchParams.set('symbols',ticker);
 const requests=[{...req,ticker,params,url:url.toString()}];
 const forged={...plan,requests,provenance};
 forged.auditDigest=sha(JSON.stringify({provenance,requests,window:plan.expectedSessions}));
 const r=await invoke(base,async()=>{calls++;throw Error('NOT_EXPECTED');},
  {plan:forged,authorization:{...authorization,approvedAuditDigest:forged.auditDigest}});
 assert.equal(r.status,'STOP_RESEARCH_PLAN_SEMANTICS_INVALID');
 assert.equal(calls,0);assert.equal(fs.existsSync(path.join(base,'asset-r10-alpaca')),false);
});

test('provider failures, malformed JSON, and budget exhaustion leave no staged evidence',async t=>{
 const base=fixture(t);
 assert.equal((await invoke(base,fakeFetch({},429))).status,'STOP_RESEARCH_PROVIDER_HTTP');
 assert.equal((await invoke(base,async()=>new Response('{broken',{status:200}))).status,'STOP_RESEARCH_PROVIDER_OR_JSON_ERROR');
 let count=0;
 const paged=async()=>{count++;return new Response(JSON.stringify(responseFor([],`next${count}`)),{status:200});};
 const budget=await invoke(base,paged);
 assert.equal(budget.status,'STOP_RESEARCH_PROVIDER_BUDGET');
 assert.equal(count,2);
 assert.equal(fs.existsSync(target(base)),false);
});

test('fetch failure counts attempted provider request without recording credentials',async t=>{
 const base=fixture(t);let calls=0;
 const r=await invoke(base,async()=>{calls++;throw Error('NETWORK_TIMED_OUT_WITH_SECRET_ID_NEVER_LOG');});
 assert.equal(r.status,'STOP_RESEARCH_PROVIDER_OR_JSON_ERROR');
 assert.equal(r.providerRequests,1);assert.equal(calls,1);
 assert.equal(JSON.stringify(r).includes(credentials.id),false);
 assert.equal(fs.existsSync(target(base)),false);
});
