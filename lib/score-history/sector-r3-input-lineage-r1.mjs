import {createHash} from 'node:crypto';
import {scoreInputLineage} from './input-lineage-r1.mjs';

// Shadow-only signature of the ALREADY CALCULATED R3 rolling source supplied
// to buildSectorFearGreedR3Public(). Never load local files or write a feed.
// This is effective scoring-input evidence, not provider-raw revision proof.
const METHOD='SECTOR-FEAR-GREED-R3-FIVE-AXIS-COMPLETE';
const REFERENCE=756;
const HISTORY=252;
const SECTORS=Object.freeze([
 'technology','communication','discretionary','industrials','financials',
 'utilities','healthcare','materials','energy','staples','realEstate',
]);
const ALLOWED=new Set([
 'SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE',
 'SECTOR_FEAR_GREED_R3_ROLLING_252_READY',
]);
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validRow=row=>typeof row?.date==='string'&&DATE.test(row.date)
 &&typeof row?.score==='number'&&Number.isFinite(row.score)
 &&row.score>=0&&row.score<=85+Number.EPSILON*85;

function normalizedRows(rows){
 if(!Array.isArray(rows)||rows.length!==HISTORY)return null;
 const normalized=rows.map(row=>({date:row?.date,score:row?.score}));
 if(!normalized.every(validRow))return null;
 normalized.sort((a,b)=>a.date.localeCompare(b.date));
 if(normalized.some((row,i)=>i>0&&normalized[i-1].date===row.date))return null;
 return normalized;
}

/**
 * One logical S01-S11 signature, anchored to the last valid trade date.
 * Shared-feed publication readiness still depends on all eleven sectors.
 * Does not change the existing SAME_DATE_SCORE_DRIFT protection or permit a
 * revised score on an already published confirmed trade date.
 */
export function sectorR3InputLineage({source,sectorId='technology'}={}){
 if(!SECTORS.includes(sectorId))throw Error('SECTOR_R3_UNSUPPORTED_ID');
 const rows=Object.fromEntries(SECTORS.map(id=>[id,normalizedRows(source?.sectors?.[id]?.fiveRaw)]));
 const selected=rows[sectorId];
 const master=rows.technology?.map(row=>row.date)??null;
 const aligned=Boolean(master)&&SECTORS.every(id=>rows[id]
  &&rows[id].every((row,i)=>row.date===master[i]));
 const gate=ALLOWED.has(source?.status)
  &&source?.approvedR1ReferenceRequirement===REFERENCE
  &&source?.summary?.allReady252===true&&aligned;
 const dates=SECTORS.map(id=>[id,rows[id]?.map(row=>row.date)??null]);
 const gateEvidence={
  status:source?.status??null,
  referenceRequirement:source?.approvedR1ReferenceRequirement??null,
  allReady252:source?.summary?.allReady252===true,
  aligned,dates,
 };
 const lastDate=selected?.at(-1)?.date??null;
 return scoreInputLineage({
  scoreId:`sectorR3:${sectorId}`,
  methodologyVersion:METHOD,
  eligibilityState:gate?'READY':'PARTIAL',
  evaluationKey:lastDate,
  sources:[
   {key:'sharedFeedEligibility',state:gate?'READY':'PARTIAL',
    observationId:lastDate,bodySha256:digest(gateEvidence)},
   {key:'sectorFiveRaw252',state:selected?'READY':'MISSING',
    observationId:lastDate,bodySha256:selected?digest(selected):null},
  ],
 });
}
