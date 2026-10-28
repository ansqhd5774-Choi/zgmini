import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildAssetR10RawReadOnlyEvidence}
 from '../lib/diagnostic-layer/asset-bubble-r10-raw-evidence-r1.mjs';
import {evaluateAssetBubbleR10Candidate}
 from '../lib/diagnostic-layer/asset-bubble-r10-evaluation.mjs';
import {scoreAssetBubbleR10Candidate,ASSET_BUBBLE_R10_WEIGHTS}
 from '../lib/diagnostic-layer/asset-bubble-r10-candidate.mjs';

function fixture(){
 const quarters=[],m2=[],price=[];
 for(let y=2015;y<=2026;y++)for(let m=1;m<=12;m++){
  if(y===2026&&m>10)break;
  const mm=String(m).padStart(2,'0');
  price.push({observationDate:`${y}-${mm}-28`,value:100+(y-2015)*19+m*1.4+((y-2015)*12+m)**2/280});
  if(y===2026&&m>9)continue;
  m2.push({observationDate:`${y}-${mm}-01`,value:10000+(y-2015)*280+m*7});
  if(m%3===1)quarters.push({observationDate:`${y}-${mm}-01`,value:4000+(y-2015)*180+m*12});
 }
 const macroSeries={
  GDP:quarters.map((r,i)=>({...r,value:18000+i*95})),
  BOGZ1LM793164115Q:quarters.map((r,i)=>({...r,value:13000000+i*80000})),
  BOGZ1LM103164115Q:quarters.map((r,i)=>({...r,value:18000000+i*90000})),
  BOGZ1FL153064486Q:quarters.map((r,i)=>({...r,value:28+i*0.15})),
  BOGZ1FA153064475Q:quarters.map((r,i)=>({...r,value:10000+i*250})),
  BOGZ1FL153064475Q:quarters.map((r,i)=>({...r,value:5500000+i*24000})),
  M2SL:m2,
 };
 const breadthRows=[];
 for(const [m,score] of [[1,75],[2,70],[3,65],[4,80],[5,75],[6,70]])
  breadthRows.push({observationDate:`2026-${String(m).padStart(2,'0')}-28`,
   researchSafetyScore:score,breadthGap:100-score});
 const breadth={formulaApproved:true,rows:breadthRows};
 const quality={rows:breadthRows.map(r=>({observationDate:r.observationDate,coverage:1,participation:0.6}))};
 const audit={invalid:0,conflicts:0};
 const evaluation=evaluateAssetBubbleR10Candidate({macroSeries,sp500ShadowRows:price,asOfDate:'2026-10-09'});
 const target=evaluation.rows.find(row=>row.quarter==='2026-Q2');
 const scored=scoreAssetBubbleR10Candidate({...target,breadthDivergence:75});
 const ids=Object.keys(ASSET_BUBBLE_R10_WEIGHTS);
 const release={methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',status:'READY',
  historyMode:'CURRENT_VINTAGE_ONLY',publicationPolicy:'USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES',
  rightsStatus:'USER_ACCEPTED_UNVERIFIED',lookAheadSafe:false,productionEligible:true,
  scoreObservationQuarter:'2026-Q2',diagnosticQuarter:'2026-Q4',asOfDate:'2026-10-09',
  sourceStoredAt:Date.parse('2026-10-08'),sourceVersion:'stored-fixture-version',
  score:scored.score,indicators:ids.map(id=>({id,status:'READY',score:target[id]??(id==='breadthDivergence'?75:null)}))};
 return {macroSeries,sp500Rows:price,breadth,quality,audit,release};
}

test('reconstructs six raw R10 observations without changing approved score',()=>{
 const input=fixture();
 const out=buildAssetR10RawReadOnlyEvidence(input);
 assert.equal(out.status,'PASS_READONLY_ASSET_R10_RAW_PREFLIGHT');
 assert.equal(out.scoreObservationQuarter,'2026-Q2');
 assert.equal(out.diagnosticQuarter,'2026-Q4');
 assert.equal(out.diagnosticScore,input.release.score);
 assert.equal(out.factors.length,6);
 assert.deepEqual(out.factors.map(f=>f.id),Object.keys(ASSET_BUBBLE_R10_WEIGHTS));
 assert.deepEqual(out.factors.map(f=>f.unit),[
  'TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
  'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS']);
 assert.equal(out.factors[4].value,25);
 assert.equal(out.factors[4].previousValue,30);
 assert.equal(out.pcSqliteWrites,0);
 assert.equal(out.d1Writes,0);
 assert.equal(out.scoreWrites,0);
});

test('rejects score mismatch, unapproved breadth or incomplete score quarter',()=>{
 const input=fixture();
 input.release.score+=1;
 assert.throws(()=>buildAssetR10RawReadOnlyEvidence(input),/SCORE_PARITY_FAILED/);
 input.release.score-=1;
 input.audit.invalid=1;
 assert.throws(()=>buildAssetR10RawReadOnlyEvidence(input),/BREADTH_SOURCE_NOT_APPROVED/);
 input.audit.invalid=0;
 input.release.scoreObservationQuarter='2026-Q4';
 assert.throws(()=>buildAssetR10RawReadOnlyEvidence(input),/RELEASE_CONTRACT_INVALID/);
});

test('PC runner only accepts dry-run and obtains SQLite in read-only mode',()=>{
 const runner=fs.readFileSync(new URL('../scripts/pc-writer/ASSET_R10_RAW_PREFLIGHT_R1.mjs',import.meta.url),'utf8');
 const source=fs.readFileSync(new URL('../scripts/pc-writer/asset-r10-storage.mjs',import.meta.url),'utf8');
 assert.match(runner,/--dry-run/);
 assert.doesNotMatch(runner,/--apply|allowWrites:true|writeFileSync/);
 assert.match(source,/readOnly:true/);
 assert.match(source,/PRAGMA query_only=ON/);
});
