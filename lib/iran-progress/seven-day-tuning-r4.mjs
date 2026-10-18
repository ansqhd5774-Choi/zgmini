/** Seven-day research-only tuning. No changes to approved production equations. */
import {IRAN_R4_WEIGHTS} from './reality-shadow-r4.mjs';

export const R4_TRIAL_TUNING_VERSION='R4_SHADOW_TUNING_V1';
export const R4_TRIAL_DEFAULT=Object.freeze({
 weights:Object.freeze({...IRAN_R4_WEIGHTS}),
 sensitivity:1,
});
const KEYS=Object.freeze(['D','C','M','H','N']);
const round=n=>Number(n.toFixed(2));
const clamp=n=>Math.max(0,Math.min(1,n));
export function validateR4TrialTuning(config){
 if(!config||typeof config!=='object'||Array.isArray(config)
  ||Object.keys(config).sort().join(',')!=='sensitivity,weights'
  ||!config.weights||typeof config.weights!=='object'
  ||Object.keys(config.weights).sort().join(',')!==[...KEYS].sort().join(','))
  throw Error('R4_TUNING_CONTRACT_INVALID');
 const values=KEYS.map(k=>config.weights[k]);
 if(values.some(w=>typeof w!=='number'||!Number.isFinite(w)||w<0||w>1)
  ||Math.abs(values.reduce((a,b)=>a+b,0)-1)>1e-9)
  throw Error('R4_TUNING_WEIGHTS_INVALID');
 if(typeof config.sensitivity!=='number'||!Number.isFinite(config.sensitivity)
  ||config.sensitivity<0.5||config.sensitivity>2)
  throw Error('R4_TUNING_SENSITIVITY_INVALID');
 return {weights:Object.fromEntries(KEYS.map(k=>[k,config.weights[k]])),sensitivity:config.sensitivity};
}
export function tuneR4ShadowCandidate(shadow,config=R4_TRIAL_DEFAULT){
 const validated=validateR4TrialTuning(config);
 if(shadow?.status!=='SHADOW_READY')return {status:'SHADOW_PENDING',score:null,
  reason:'R4_VERIFIED_SCORE_INPUT_MISSING',productionReady:false};
 const band=shadow.allowedRange;
 if(!band||!Number.isFinite(band.min)||!Number.isFinite(band.max)
  ||band.min<0||band.max>100||band.min>band.max
  ||!shadow.domains||KEYS.some(k=>!Number.isFinite(shadow.domains[k])||shadow.domains[k]<0||shadow.domains[k]>100))
  throw Error('R4_TUNING_SCORE_INPUT_INVALID');
 const weighted=KEYS.reduce((sum,k)=>sum+validated.weights[k]*shadow.domains[k],0)/100;
 const scaled=clamp(.5+validated.sensitivity*(weighted-.5));
 const score=shadow.phase==='ENDED'?100:round(band.min+(band.max-band.min)*scaled);
 return {status:'SHADOW_TUNING_CANDIDATE',score,baselineScore:shadow.score,
  weighted:round(weighted*100),sensitivity:validated.sensitivity,weights:validated.weights,
  phase:shadow.phase,allowedRange:{...band},productionReady:false,
  calibrated:false,method:R4_TRIAL_TUNING_VERSION};
}
export function compareR4TrialCandidates(shadows,configs){
 if(!Array.isArray(shadows)||shadows.length>7||!Array.isArray(configs)||configs.length>12)
  throw Error('R4_TRIAL_COMPARISON_LIMIT');
 const entries=configs.map(c=>({name:c?.name,config:validateR4TrialTuning(c?.config)}));
 if(new Set(entries.map(x=>x.name)).size!==entries.length||
  entries.some(x=>typeof x.name!=='string'||!/^[a-z0-9_-]{1,36}$/i.test(x.name)))
  throw Error('R4_TRIAL_COMPARISON_IDS_INVALID');
 return entries.map(x=>({name:x.name,weights:x.config.weights,sensitivity:x.config.sensitivity,
  observations:shadows.map(s=>{
   const r=tuneR4ShadowCandidate(s,x.config);
   return {status:r.status,score:r.score,phase:r.phase??null,allowedRange:r.allowedRange??null};
  }),note:'CANDIDATE COMPARISON ONLY - NOT AN EMPIRICALLY VALIDATED MODEL'}));
}
