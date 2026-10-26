import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditApprovedRoster} from
 '../scripts/pc-writer/theme-space-satellite-r26-roster-audit.mjs';

const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),
 '../scripts/pc-writer');
const evidence=JSON.parse(fs.readFileSync(path.join(dir,
 'theme-space-satellite-r23-dated-aum-evidence.json'),'utf8'));
const policy=JSON.parse(fs.readFileSync(path.join(dir,
 'theme-space-satellite-r26-approved-roster.json'),'utf8'));

test('R26 approves all four current real ETFs with ROKT mixed disclosure',()=>{
 const r=auditApprovedRoster(evidence,policy);
 assert.deepEqual(r.approvedCurrentSymbols,['UFO','NASA','WARP','ROKT']);
 assert.deepEqual(r.eligibleCurrentSymbols,['UFO','NASA','WARP','ROKT']);
 assert.equal(r.privateScore,44.65075);
 assert.equal(r.weightsPercent.NASA,59.3);
 assert.equal(r.finalBasketSelected,true);
 assert.equal(r.rightsVerified,false);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.aumEvidenceMixedDates,true);
 assert.equal(r.providerCalls,0);
 assert.equal(r.collectionRetries,0);
});

test('R26 rejects a fixed ETF cap, absent evidence and hidden ROKT mixture',()=>{
 assert.throws(()=>auditApprovedRoster(evidence,{...policy,maximumEtfCount:4}),
  /R26_POLICY_INVALID_OR_CAPPED/);
 assert.throws(()=>auditApprovedRoster(evidence,{...policy,
  approvedCurrentSymbols:[...policy.approvedCurrentSymbols,'NEW']}),
  /R26_NO_REAL_EVIDENCE_FOR_SELECTED/);
 assert.throws(()=>auditApprovedRoster(evidence,{...policy,mixedThemeDisclosures:{}}),
  /R26_ROKT_MIXED_THEME_DISCLOSURE_REQUIRED/);
});

test('R26 can scale to 10 verified ETFs with no count hardcoding',()=>{
 const symbols=Array.from({length:10},(_,i)=>`ETF${i}`);
 const rows=symbols.map((symbol,i)=>({symbol,score:30+i,
  aumUsd:1000000*(i+1),aumAsOf:'2026-10-22',
  issuerUrl:'https://issuer.example/fund'}));
 const mock={...evidence,rows};
 const futurePolicy={...policy,approvedCurrentSymbols:symbols,
  mixedThemeDisclosures:{},excludedFromCurrentSelectionNoRetry:[]};
 const r=auditApprovedRoster(mock,futurePolicy);
 assert.equal(r.eligibleCurrentSymbols.length,10);
 assert.equal(Object.keys(r.weightsPercent).length,10);
 assert.equal(r.maxEtfCount,null);
 assert.equal(r.publicationAuthorized,false);
});
