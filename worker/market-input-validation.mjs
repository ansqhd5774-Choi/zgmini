import {macroCollectionReadiness} from './macro-result-contract-r61.mjs';
import {validCreditInput} from './credit-input-policy.mjs';
import {bisInputField,validBisInput} from './bis-input-policy.mjs';
import {groupedInputValid,hasObservations} from './collection-input-safety.mjs';
import {RATE_R2_PROVIDER_CONTRACT} from '../lib/market-score/rate-r2-provider.mjs';
export const VALIDATED_INPUT_KEYS=Object.freeze(['macro','credit','supply','fundFlows','bisDsr','bisTc','rates']);
export function validMarketInput(key,body){
 if(key==='macro')return macroCollectionReadiness(body).complete;
 if(key==='credit')return validCreditInput(body);
 if(bisInputField(key))return validBisInput(key,body);
 if(key==='rates')return body?.rateR2?.status==='READY'&&RATE_R2_PROVIDER_CONTRACT.requiredSeries.every(id=>hasObservations(body.rateR2.series?.[id]));
 if(key==='supply'||key==='fundFlows')return groupedInputValid(key,body);
 return false;
}
export function assertMarketInput(key,body){
 if(VALIDATED_INPUT_KEYS.includes(key)&&!validMarketInput(key,body))throw Error('INPUT_NOT_VALID');
}
// Existing daily history only; recovery retains the original acquisition clock.
export async function readValidatedInput(db,key,decode){
 const rows=await db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 10').bind(key+':%').all();
 for(const row of rows.results??[]){try{const body=decode(row.body);if(validMarketInput(key,body))return {body,storedAt:row.stored_at};}catch{}}
 return null;
}
