import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {comparePurityAlternatives} from
 '../scripts/pc-writer/theme-space-satellite-r25-purity-alternatives.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,
 'scripts/pc-writer/theme-space-satellite-r23-dated-aum-evidence.json'),'utf8'));

test('R25 four-versus-three AUM sensitivity preserves real PC provenance',()=>{
 const r=comparePurityAlternatives(evidence,{excludeSymbols:['ROKT']});
 assert.equal(r.fullBasket.score,44.65075);
 assert.equal(r.narrowerBasket.score,44.70775);
 assert.equal(r.difference,0.057);
 assert.deepEqual(r.fullBasket.symbols,['UFO','NASA','WARP','ROKT']);
 assert.deepEqual(r.narrowerBasket.symbols,['UFO','NASA','WARP']);
 assert.deepEqual(r.narrowerBasket.aumWeightsPercent,
  {UFO:32.0783,NASA:65.3505,WARP:2.5713});
 assert.equal(r.issuerAumEvidenceMixedDates,true);
 assert.equal(r.purityExclusionApproved,false);
 assert.equal(r.finalBasketSelected,false);
 assert.equal(r.rightsVerified,false);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.collectionRetries,0);
 assert.equal(r.providerCalls,0);
 assert.equal(r.publicWrites,0);
 assert.equal(r.d1Writes,0);
 assert.equal(r.schedulerWrites,0);
});

test('R25 cannot invent an arbitrary exclusion or waive the three-plus rule',()=>{
 assert.throws(()=>comparePurityAlternatives(evidence,
  {excludeSymbols:['MISSING']}),/R25_EXCLUSION_NOT_IN_EVIDENCE/);
 assert.throws(()=>comparePurityAlternatives(evidence,
  {excludeSymbols:['ROKT','ROKT']}),/R25_DUPLICATE_EXCLUSION/);
 assert.throws(()=>comparePurityAlternatives(evidence,
  {excludeSymbols:['ROKT','WARP']}),
  /R25_THREE_PLUS_APPROVAL_REQUIRES_THREE_CANDIDATES/);
});

test('R25 blocks changed R21 provenance rather than re-fetching prices',()=>{
 assert.throws(()=>comparePurityAlternatives({...evidence,
  sourceManifestSha256:'0'.repeat(64)},
  {excludeSymbols:['ROKT']}),/R23_R21_PC_PROVENANCE_CHANGED/);
});
