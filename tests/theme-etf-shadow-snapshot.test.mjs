import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateR122ResearchEvidence,sha256} from '../lib/market-score/theme-etf-shadow-snapshot.mjs';
import {storeLocalSnapshot} from '../scripts/pc-writer/theme-etf-shadow-snapshot-local.mjs';
const PAIRS=[['로봇·자동화',['BOTZ','ROBO']],['클라우드·SaaS',['SKYY','CLOU']],['자율주행',['DRIV','BOTZ']],['바이오테크',['IBB','GNOM']],['원전·SMR',['NLR','URA']],['방산',['ITA','SHLD']],['핀테크',['FINX','ARKF']],['사이버보안',['CIBR','BUG']]];
function fixture(){
 const start=new Date('2025-10-16T00:00:00Z');
 const dates=Array.from({length:252},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});dates[251]='2026-10-16';
 const history=dates.map(date=>({date,score:40,axes:{trend:40,breadth:40,demand:40,relativeStrength:40,volatility:40}}));
 return {audit:'R122_EIGHT_THEME_252_SCORE_HISTORY_LOCAL_READONLY',mode:'RESEARCH_SHADOW_NOT_AUTHORIZED_FOR_PUBLICATION',asOf:'2026-10-16',
 checks:{eightThemes:8,historyPointsPerTheme:252,totalScorePoints:2016,referenceDaysPerTheme:756,allScoresMatchR120:true,allHistoryPointsRecalculated:true,allChronological:true,gameEsportsDeferred:true},
 input:{r9GroupCount:10,etfCount:17,r120SourceReportSha256:'95ead758999a7ace7da6003460735345663a35ba00bf896d2d07f9ade830d7bd'},
 contract:{formulaApproved:false,commercialPublicationRightsVerified:false,publicScores:0},safety:{providerCalls:0,networkCalls:0,dbWrites:0,publicWrites:0},
 blocked:[{theme:'게임·e스포츠',code:'R116_ZERO_TOTAL_ETF_TURNOVER_2024-10-03'}],
 results:PAIRS.map(([theme,etfs])=>({theme,etfs,asOf:'2026-10-16',referenceDays:756,historyCount:252,firstDate:'2025-10-16',lastDate:'2026-10-16',researchOnly:true,productionEligible:false,latestShadowScore:40,history252:structuredClone(history)}))};
}
function sandbox(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-snap-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const file=path.join(root,'R122.json');fs.writeFileSync(file,JSON.stringify(fixture()));return {root,file};}
test('validates eight chronological 252-point research series and never claims publication',()=>{const o=validateR122ResearchEvidence(fixture());assert.equal(o.observations,2016);assert.equal(o.results.length,8);assert.equal(o.publication.authorized,false);assert.equal(o.sourceStoredAt,null);});
test('source digest is preserved',()=>{const x=validateR122ResearchEvidence(fixture(),{sourceSha256:sha256('x')});assert.equal(x.sourceSha256,sha256('x'));});
test('rejects malformed axes',()=>{const f=fixture();f.results[2].history252[3].axes.trend=120;assert.throws(()=>validateR122ResearchEvidence(f),/AXIS_RANGE/);});
test('rejects false weighted sums',()=>{const f=fixture();f.results[2].history252[3].score=30;assert.throws(()=>validateR122ResearchEvidence(f),/WEIGHTED_SCORE/);});
test('rejects missing research points',()=>{const f=fixture();f.results[2].history252.pop();assert.throws(()=>validateR122ResearchEvidence(f),/HISTORY_LENGTH/);});
test('rejects mismatched dates among themes',()=>{const f=fixture();f.results[1].history252[250].date='2026-06-25';assert.throws(()=>validateR122ResearchEvidence(f),/CALENDAR_MISMATCH/);});
test('rejects wrong ETF pair',()=>{const f=fixture();f.results[1].etfs=['SKYY','SPY'];assert.throws(()=>validateR122ResearchEvidence(f),/PAIR_MISMATCH/);});
test('rejects publication approval drift',()=>{const f=fixture();f.contract.formulaApproved=true;assert.throws(()=>validateR122ResearchEvidence(f),/PUBLICATION_CONTRACT/);});
test('rejects changed R120 lineage',()=>{const f=fixture();f.input.r120SourceReportSha256='0'.repeat(64);assert.throws(()=>validateR122ResearchEvidence(f),/PROVENANCE/);});
test('rejects removal of game/e-sports hold',()=>{const f=fixture();f.blocked=[];assert.throws(()=>validateR122ResearchEvidence(f),/DEFERRED_EXACT/);});
test('dry-run neither creates directory nor writes file',t=>{const {root,file}=sandbox(t);const r=storeLocalSnapshot({root,inputPath:file});assert.equal(r.mode,'DRY_RUN');assert.equal(fs.existsSync(path.join(root,'theme-etf-shadow-research')),false);});
test('explicit local write verifies readback and repeats without writes',t=>{const {root,file}=sandbox(t);const first=storeLocalSnapshot({root,inputPath:file,write:true});assert.equal(first.status,'STORED_READBACK_VERIFIED');const dest=path.join(root,first.localRelativePath);const m=fs.statSync(dest).mtimeMs;const again=storeLocalSnapshot({root,inputPath:file,write:true});assert.equal(again.status,'ALREADY_VERIFIED_NO_WRITE');assert.equal(fs.statSync(dest).mtimeMs,m);});
test('rejects conflicting result for same asof rather than overwriting',t=>{const {root,file}=sandbox(t);storeLocalSnapshot({root,inputPath:file,write:true});const f=fixture();f.results[0].history252[0].score=41;f.results[0].history252[0].axes={trend:41,breadth:41,demand:41,relativeStrength:41,volatility:41};fs.writeFileSync(file,JSON.stringify(f));assert.throws(()=>storeLocalSnapshot({root,inputPath:file,write:true}),/CONFLICTING_SNAPSHOT_EXISTS/);});
test('refuses mutated existing output',t=>{const {root,file}=sandbox(t);const stored=storeLocalSnapshot({root,inputPath:file,write:true});fs.writeFileSync(path.join(root,stored.localRelativePath),'bad');assert.throws(()=>storeLocalSnapshot({root,inputPath:file,write:true}),/EXISTING_SNAPSHOT_CONTENT_CONFLICT/);});
test('rejects fake source attachment as directory',t=>{const {root}=sandbox(t);assert.throws(()=>storeLocalSnapshot({root,inputPath:root}),/SOURCE_MISSING_OR_TOO_LARGE/);});
