import {marketOperationalStore} from './candidate-market-operational-store.mjs';
import {calculateConsumptionR5,CONSUMPTION_R5} from '../lib/market-score/consumption-r5.mjs';
export async function loadStoredConsumptionR5(db,{asOf}={}){
 const unavailable=reason=>({status:'PARTIAL',score:null,trend:[],indicators:[],updatedAt:null,methodologyVersion:CONSUMPTION_R5,missingFactors:[reason]});
 if(!db)return unavailable('R5_STORAGE_MISSING');
 try{
  const input=await marketOperationalStore(db).readInput('consumption-r5');
  if(!input)return unavailable('R5_INPUT_PENDING');
  const now=Date.parse(asOf+'T23:59:59Z');
  if(!Number.isFinite(now)||input.storedAt>now||now-input.storedAt>7*86400000)return unavailable('R5_COLLECTION_STALE');
  const result=calculateConsumptionR5(input.body,{asOfDate:asOf});
  if(result.updatedAt&&now-Date.parse(result.updatedAt)>120*86400000)return unavailable('R5_OBSERVATION_STALE');
  const {rows,...domain}=result;
  return {...domain,freshness:'STORED_MONTHLY_R5',sourceStoredAt:input.storedAt,sourceVersion:input.body.sourceVersion};
 }catch{return unavailable('R5_STORAGE_INVALID');}
}
