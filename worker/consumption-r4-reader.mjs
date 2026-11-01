import {marketOperationalStore} from './candidate-market-operational-store.mjs';
import {calculateConsumptionR4,CONSUMPTION_R4} from '../lib/market-score/consumption-r4.mjs';

export async function loadStoredConsumptionR4(db,{asOf}={}) {
  const unavailable = reason => ({status:'PARTIAL',score:null,trend:[],indicators:[],updatedAt:null,methodologyVersion:CONSUMPTION_R4,missingFactors:[reason]});
  if(!db)return unavailable('CONSUMPTION_R4_STORAGE_MISSING');
  try {
    const input=await marketOperationalStore(db).readInput('consumption-r4');
    if(!input)return unavailable('CONSUMPTION_R4_INPUT_PENDING');
    const now=Date.parse(asOf+'T23:59:59Z');
    if(input.storedAt>now||now-input.storedAt>7*86400000)return unavailable('CONSUMPTION_R4_COLLECTION_STALE');
    const result=calculateConsumptionR4(input.body.series.PCEC96,{asOfDate:asOf});
    if(result.updatedAt&&now-Date.parse(result.updatedAt)>120*86400000)return unavailable('CONSUMPTION_R4_OBSERVATION_STALE');
    const {rows,...domain}=result;
    return {...domain,sourceStoredAt:input.storedAt,sourceVersion:input.body.sourceVersion};
  } catch {return unavailable('CONSUMPTION_R4_STORAGE_INVALID');}
}
