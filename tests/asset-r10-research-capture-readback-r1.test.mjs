import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planNewSymbolBackfill} from '../scripts/pc-writer/asset-r10-new-symbol-backfill-research.mjs';
import {stageR10NewSymbolBars} from '../scripts/pc-writer/asset-r10-new-symbol-collector-r1.mjs';
import {verifyR10ResearchCapture} from '../scripts/pc-writer/asset-r10-research-capture-readback-r1.mjs';

const sessions=[];
for(let day=new Date('2025-01-01T00:00:00Z');sessions.length<205;day.setUTCDate(day.getUTCDate()+1)){
 if(day.getUTCDay()>0&&day.getUTCDay()<6)sessions.push(day.toISOString().slice(0,10));
}
const plan=planNewSymbolBackfill({sessions,throughDate:sessions.at(-1),asOfDate:'2026-11-02',
 missingSymbols:['TWLO'],pitProof:{status:'PIT_TIME_EFFECTIVE_IDENTITIES_VERIFIED',
  isResearchOnly:true,eventDigest:'b'.repeat(64)},
 identities:[{ticker:'TWLO',validFrom:'2016-06-23',validTo:null,
  membershipEvidenceSha256:'c'.repeat(64),securityIdentitySha256:'d'.repeat(64),
  corporateActionPriceBasisReviewed:true,priceBasisEvidenceSha256:'e'.repeat(64)}],
 providerPolicy:{rightsStatus:'ALPACA_IEX_RESEARCH_RETRIEVAL_APPROVED',
  rightsEvidenceSha256:'a'.repeat(64),approvedRequestCap:2,approvedSymbolCap:2}});
const response=()=>({bars:{TWLO:sessions.slice(-200).map(t=>({t:t+'T14:30:00Z',c:100,v:10}))},next_page_token:null});
function fixture(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r10-research-readback-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 return base;
}
const stage=async base=>stageR10NewSymbolBars({plan,base,
 authorization:{researchCollectionApproved:true,approvedAuditDigest:plan.auditDigest,
  approvedBasePath:path.resolve(base),rightsEvidenceSha256:'a'.repeat(64),maxRequests:2},
 credentials:{id:'SECRET_KEY_ID',secret:'SECRET_KEY_VALUE'},
 fetchImpl:async()=>new Response(JSON.stringify(response()),{status:200}),
 wait:async()=>{},now:Date.parse('2026-11-02T05:00:00Z')});
const research=base=>path.join(base,'asset-r10-alpaca','research-asof-unmapped',plan.auditDigest);

test('before capture or untrusted root, readback stops with zero mutations',t=>{
 const base=fixture(t);
 const before=verifyR10ResearchCapture({base,plan});
 assert.equal(before.status,'STOP_RESEARCH_READBACK_MISSING_OR_INVALID');
 assert.equal(before.canPromote,false);assert.equal(before.d1Writes,0);
 assert.equal(fs.existsSync(path.join(base,'asset-r10-alpaca')),false);
 assert.equal(verifyR10ResearchCapture({base:'relative',plan}).status,'STOP_RESEARCH_READBACK_SCOPE_INVALID');
});

test('200-day asof-unmapped raw pages pass readback but never promotion',async t=>{
 const base=fixture(t),r=await stage(base);
 assert.equal(r.status,'RESEARCH_CAPTURED_NOT_PROMOTABLE');
 const result=verifyR10ResearchCapture({base,plan});
 assert.equal(result.status,'STAGED_RESEARCH_READBACK_VERIFIED_NOT_PROMOTABLE');
 assert.equal(result.manifestSha256,r.manifestSha256);
 assert.deepEqual(result.capturedSymbols,['TWLO']);
 assert.equal(result.capturedSessionsPerSymbol,200);
 assert.equal(result.verifiedSourcePages,1);
 assert.equal(result.canPromote,false);assert.equal(result.productionEligible,false);
 assert.equal(result.approvedInputWrites,0);assert.equal(result.d1Writes,0);
 assert.equal(fs.existsSync(path.join(base,'local-asset-bubble-r10-release-payload.json')),false);
});

test('tampering wire bytes without updating manifest fails exact hash',async t=>{
 const base=fixture(t);await stage(base);
 const f=path.join(research(base),'TWLO','page-001.json');
 fs.appendFileSync(f,' ');
 assert.equal(verifyR10ResearchCapture({base,plan}).status,'STOP_RESEARCH_WIRE_SHA_MISMATCH');
});

test('manifest ticker path traversal and source lineage are rejected',async t=>{
 const base=fixture(t);await stage(base);
 const f=path.join(research(base),'manifest.json');
 const manifest=JSON.parse(fs.readFileSync(f,'utf8'));
 manifest.files[0].relativePath='../approved-price.json';
 fs.writeFileSync(f,JSON.stringify(manifest));
 assert.equal(verifyR10ResearchCapture({base,plan}).status,'STOP_RESEARCH_FILE_LINEAGE_INVALID');
 manifest.files[0].relativePath='TWLO/page-001.json';
 manifest.sourceRightsEvidenceSha256='f'.repeat(64);
 fs.writeFileSync(f,JSON.stringify(manifest));
 assert.equal(verifyR10ResearchCapture({base,plan}).status,'STOP_RESEARCH_MANIFEST_INVALID');
});

test('silently modified financial values cannot pass even with rehashed page',async t=>{
 const base=fixture(t);await stage(base);
 const f=path.join(research(base),'manifest.json');
 const manifest=JSON.parse(fs.readFileSync(f,'utf8'));
 const price=path.join(research(base),'TWLO','page-001.json');
 const data=JSON.parse(fs.readFileSync(price,'utf8'));
 data.bars.TWLO[0].c=999;
 fs.writeFileSync(price,JSON.stringify(data));
 const {createHash}=await import('node:crypto');
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 manifest.files[0].sha256=sha(fs.readFileSync(price));
 manifest.files[0].canonicalSha256=sha(JSON.stringify(data));
 fs.writeFileSync(f,JSON.stringify(manifest));
 assert.equal(verifyR10ResearchCapture({base,plan}).status,'STOP_RESEARCH_PRICE_ROW_DIGEST_MISMATCH');
});

test('proof plan substitution cannot read a different captured identity',async t=>{
 const base=fixture(t);await stage(base);
 const forged={...plan,provenance:{...plan.provenance,
  providerPolicy:{...plan.provenance.providerPolicy,rightsEvidenceSha256:'f'.repeat(64)}}};
 assert.equal(verifyR10ResearchCapture({base,plan:forged}).status,'STOP_RESEARCH_MANIFEST_INVALID');
});

test('forged dot-path ticker is rejected before any file read',t=>{
 const base=fixture(t);
 for(const ticker of ['.','..','../TWLO']){
  const forged={...plan,requests:[{...plan.requests[0],ticker}]};
  assert.equal(verifyR10ResearchCapture({base,plan:forged}).status,
   'STOP_RESEARCH_READBACK_SCOPE_INVALID');
 }
 assert.equal(fs.existsSync(path.join(base,'asset-r10-alpaca')),false);
});
