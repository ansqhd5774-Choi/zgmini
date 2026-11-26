// G16 score-only mini histories from actual local market score snapshots.
// This module does not read provider raw series, rescore old data, or claim PIT provenance.
import {GROWTH_R2_FEATURE_IDS} from '../../lib/market-score/growth-r2-contract.mjs';
import {verifiedEconomicGrowthScore} from '../../lib/economic-growth-stored-display-r4.mjs';
import {sameVerifiedLineage} from './market-snapshot-comparisons.mjs';

const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validStoredAt=value=>Number.isSafeInteger(value)&&value>=946684800000;
const scoreDay=value=>new Date(value).toISOString().slice(0,10);
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;

// Full 24/24, provider, released-as-of, W2 weighted score and methodology
// validation is shared with the already-approved G16 public display contract.
function validatedGrowth(domain,asOf){
 if(verifiedEconomicGrowthScore(domain,asOf)===null)return null;
 return new Map(domain.indicators.map(row=>[row.id,row.score]));
}

// Existing indicator.trend is the score-only public mini display contract.
// A saved evaluation date is not an observation month, source release date,
// or independently established as-of investable point-in-time record.
export function attachStoredGrowthFactorTrends(body,history=[]){
 if(body?.status!=='SUCCESS'||!validDate(body?.asOfDate)||
  !Array.isArray(body?.domains)||!Array.isArray(history))return body;
 const current=body.domains.find(domain=>domain?.id==='growth');
 const nowScores=validatedGrowth(current,body.asOfDate);
 if(!nowScores||GROWTH_R2_FEATURE_IDS.length!==24)return body;

 const cutoff=new Date(Date.parse(body.asOfDate+'T00:00:00Z')-366*86400000).toISOString().slice(0,10);
 const scored=new Map(GROWTH_R2_FEATURE_IDS.map(id=>[id,new Map()]));
 const conflicting=new Map(GROWTH_R2_FEATURE_IDS.map(id=>[id,new Set()]));
 for(const item of history){
  if(!validDate(item?.date)||item.date<cutoff||item.date>=body.asOfDate||
   item.body?.status!=='SUCCESS'||item.body.asOfDate!==item.date||
   !validStoredAt(item.storedAt)||scoreDay(item.storedAt)!==item.date)continue;
  const previous=item.body.domains?.find(domain=>domain?.id==='growth');
  if(!sameVerifiedLineage(current,previous))continue;
  const olderScores=validatedGrowth(previous,item.date);
  if(!olderScores)continue;
  for(const id of GROWTH_R2_FEATURE_IDS){
   const days=scored.get(id),bad=conflicting.get(id),value=olderScores.get(id);
   if(days.has(item.date)&&days.get(item.date)!==value){
    bad.add(item.date);
    days.delete(item.date);
   }else if(!bad.has(item.date))days.set(item.date,value);
  }
 }
 for(const row of current.indicators){
  if(Array.isArray(row.trend)&&row.trend.length)continue;
  const prior=[...scored.get(row.id)].sort(([a],[b])=>a.localeCompare(b))
   .map(([label,value])=>({label,value}));
  if(prior.length)row.trend=[...prior,{label:body.asOfDate,value:nowScores.get(row.id)}];
 }
 return body;
}
