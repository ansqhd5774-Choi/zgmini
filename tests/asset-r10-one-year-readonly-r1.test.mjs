import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildAssetR10OneYearReadOnly}
 from '../lib/diagnostic-layer/asset-bubble-r10-1y-history-readonly-r1.mjs';
import {evaluateAssetBubbleR10Candidate}
 from '../lib/diagnostic-layer/asset-bubble-r10-evaluation.mjs';
import {scoreAssetBubbleR10Candidate,ASSET_BUBBLE_R10_WEIGHTS}
 from '../lib/diagnostic-layer/asset-bubble-r10-candidate.mjs';

function fixture(){
 const quarters=[],m2=[],price=[];
 for(let year=2015;year<=2026;year++)for(let month=1;month<=12;month++){
  if(year===2026&&month>10)break;
  const mm=String(month).padStart(2,'0');
  price.push({observationDate:`${year}-${mm}-28`,
   value:100+(year-2015)*19+month*1.4+((year-2015)*12+month)**2/280});
  if(year===2026&&month>9)continue;
  m2.push({observationDate:`${year}-${mm}-01`,
   value:10000+(year-2015)*280+month*7});
  if(month%3===1)quarters.push({observationDate:`${year}-${mm}-01`,
   value:4000+(year-2015)*180+month*12});
 }
 const macroSeries={
  GDP:quarters.map((row,i)=>({...row,value:18000+i*95})),
  BOGZ1LM793164115Q:quarters.map((row,i)=>({...row,value:13000000+i*80000})),
  BOGZ1LM103164115Q:quarters.map((row,i)=>({...row,value:18000000+i*90000})),
  BOGZ1FL153064486Q:quarters.map((row,i)=>({...row,value:28+i*0.15})),
  BOGZ1FA153064475Q:quarters.map((row,i)=>({...row,value:10000+i*250})),
  BOGZ1FL153064475Q:quarters.map((row,i)=>({...row,value:5500000+i*24000})),
  M2SL:m2,
 };
 const breadthRows=[];
 for(let year=2025;year<=2026;year++)for(let month=1;month<=12;month++){
  if(year===2025&&month<4||year===2026&&month>6)continue;
  breadthRows.push({observationDate:`${year}-${String(month).padStart(2,'0')}-28`,
   researchSafetyScore:75,breadthGap:25});
 }
 const breadth={formulaApproved:true,rows:breadthRows};
 const quality={rows:breadthRows.map(row=>({observationDate:row.observationDate,
  coverage:1,participation:0.6}))};
 const audit={invalid:0,conflicts:0};
 const evaluation=evaluateAssetBubbleR10Candidate({macroSeries,
  sp500ShadowRows:price,asOfDate:'2026-10-09'});
 const target=evaluation.rows.find(row=>row.quarter==='2026-Q2');
 const scored=scoreAssetBubbleR10Candidate({...target,breadthDivergence:75});
 const ids=Object.keys(ASSET_BUBBLE_R10_WEIGHTS);
 const release={methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',status:'READY',
  historyMode:'CURRENT_VINTAGE_ONLY',
  publicationPolicy:'USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES',
  rightsStatus:'USER_ACCEPTED_UNVERIFIED',lookAheadSafe:false,productionEligible:true,
  scoreObservationQuarter:'2026-Q2',diagnosticQuarter:'2026-Q4',
  asOfDate:'2026-10-09',sourceStoredAt:Date.parse('2026-10-08'),
  sourceVersion:'test-storage-snapshot',score:scored.score,
  indicators:ids.map(id=>({id,status:'READY',
   score:target[id]??(id==='breadthDivergence'?75:null)}))};
 return {macroSeries,sp500Rows:price,breadth,quality,audit,release};
}

test('only five genuine observations per factor qualify as full one year',()=>{
 const out=buildAssetR10OneYearReadOnly(fixture());
 assert.equal(out.status,'READY_1Y_READONLY');
 assert.equal(out.firstQuarter,'2025-Q2');
 assert.equal(out.lastQuarter,'2026-Q2');
 assert.equal(out.approvedRawParity,'PASS');
 assert.equal(out.historicalMode,'CURRENT_VINTAGE_NOT_PIT');
 assert.equal(out.rightsStatus,'USER_ACCEPTED_UNVERIFIED');
 assert.equal(out.factors.length,6);
 for(const factor of out.factors){
  assert.equal(factor.status,'READY_1Y');
  assert.equal(factor.points.length,5);
  assert.equal(factor.missingQuarters.length,0);
  assert(factor.points.every(point=>Number.isFinite(point.value)));
 }
 assert.equal(out.d1Writes,0);
 assert.equal(out.scoreWrites,0);
 assert.equal(out.pcSqliteWrites,0);
});

test('a missing audited monthly breadth row remains a missing quarter',()=>{
 const input=fixture();
 input.breadth.rows=input.breadth.rows.filter(row=>row.observationDate!=='2025-07-28');
 const out=buildAssetR10OneYearReadOnly(input);
 assert.equal(out.status,'PARTIAL_1Y_READONLY');
 const breadth=out.factors.find(factor=>factor.id==='breadthDivergence');
 assert.deepEqual(breadth.missingQuarters,['2025-Q3']);
 assert.deepEqual(breadth.points[1],{quarter:'2025-Q3',observationDate:null,value:null});
 assert(out.factors.filter(f=>f.id!=='breadthDivergence')
  .every(f=>f.status==='READY_1Y'));
});

test('approved score drift is rejected and future points never enter the period',()=>{
 const input=fixture();
 input.release.score+=0.5;
 assert.throws(()=>buildAssetR10OneYearReadOnly(input),/SCORE_PARITY_FAILED/);
 input.release.score-=0.5;
 input.macroSeries.GDP.push({observationDate:'2027-01-01',value:200000});
 const out=buildAssetR10OneYearReadOnly(input);
 assert.equal(out.status,'READY_1Y_READONLY');
 assert(out.factors.every(f=>f.points.every(point=>point.observationDate<='2026-10-09')));
});

test('PC runner enforces --dry-run and read-only SQLite source',()=>{
 const runner=fs.readFileSync(new URL('../scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.mjs',import.meta.url),'utf8');
 const storage=fs.readFileSync(new URL('../scripts/pc-writer/asset-r10-storage.mjs',import.meta.url),'utf8');
 const cmd=fs.readFileSync(new URL('../scripts/pc-writer/ASSET_R10_1Y_HISTORY_READONLY_R1.cmd',import.meta.url),'utf8');
 assert.match(runner,/--dry-run/);
 assert.doesNotMatch(runner,/writeFileSync|--apply|database\.prepare\([^)]*INSERT/i);
 assert.match(storage,/readOnly:true/);
 assert.match(storage,/PRAGMA query_only=ON/);
 assert.match(cmd,/codex\/api-site-integration-r1-20261026/);
 assert.doesNotMatch(cmd,/wrangler|git push|--apply/i);
});
