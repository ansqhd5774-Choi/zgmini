import {DIAGNOSTIC_FRED_SERIES} from '../../lib/diagnostic-layer/input-registry.mjs';
import {DOMAIN_WEIGHTS} from '../../lib/market-score/composite-model-r1.mjs';
export const fullMacro=(date='2026-09-29',value=0)=>({series:Object.fromEntries(Object.keys(DIAGNOSTIC_FRED_SERIES).map(id=>[id,[{observationDate:date,value}]]))});
export const fullMarket=(value=0,date='2026-09-30')=>({status:'SUCCESS',asOfDate:date,overall:{status:'READY',score:value,trend:[{label:date,value}]},domains:DOMAIN_WEIGHTS.map(d=>({id:d.id,status:'READY',score:value}))});
