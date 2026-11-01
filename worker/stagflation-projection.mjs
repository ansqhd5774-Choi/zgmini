import {calculateStagflationS21} from '../lib/diagnostic-layer/stagflation-s21.mjs';
import {STAGFLATION_PUBLIC_KEY} from './stagflation-public.mjs';
/** Pure draft builder: caller supplies the stored macro batch. Never publishes. */
export function buildStagflationDraft({series,sourceHash,sourceStoredAt,observationMonth}={}){
 const result=calculateStagflationS21({series,sourceHash,observationMonth});
 return {key:STAGFLATION_PUBLIC_KEY,body:{...result,sourceStoredAt,publicationAuthorized:false}};
}
