/** Independent, evidence-bounded backtest of UNAPPROVED R4 score candidates.
 * Distinguishes a compatible band from proof of the exact numerical score.
 * Zero API calls; never imports current production state or publishes.
 */
import {calculateIranR4RealityShadow} from './reality-shadow-r4.mjs';
import {examineR4RealityAnchors} from './observed-anchors-r4.mjs';
export const R4_VALIDATION_VERSION='IRAN_R4_EPISODE_VALIDATION_SHADOW_V1';
const validMs=x=>Number.isSafeInteger(x)&&x>0;
function episodeValid(e){
 return e&&typeof e.id==='string'&&e.id.length>0&&validMs(e.asOf)
  &&Array.isArray(e.observations)&&e.input&&typeof e.input==='object';
}
export function evaluateR4Episodes(episodes){
 if(!Array.isArray(episodes)||episodes.length>200)throw Error('R4_EPISODES_INVALID');
 const rows=[];
 const ids=new Set();
 for(const episode of episodes){
  if(!episodeValid(episode)||ids.has(episode.id))throw Error('R4_EPISODE_INVALID_OR_DUPLICATE');
  ids.add(episode.id);
  const shadow=calculateIranR4RealityShadow(episode.input,episode.asOf);
  const independent=examineR4RealityAnchors(episode.observations,episode.asOf);
  const candidate=shadow.status==='SHADOW_READY'?shadow.score:null;
  const cap=independent.status==='CONSTRAINT_ONLY'?independent.maximumCompatibleScore:null;
  const consistency=candidate===null?'UNCOMPUTED':cap===null?'NO_INDEPENDENT_CONSTRAINT':
   candidate>cap?'CONTRADICTED_BY_OBSERVATION':'NOT_CONTRADICTED_UNCALIBRATED';
  rows.push({id:episode.id,asOf:episode.asOf,calculationStatus:shadow.status,
   candidateScore:candidate,independentUpperBound:cap,consistency,
   missing:shadow.status==='SHADOW_READY'?[]:shadow.missing??[],
   candidatePhase:shadow.status==='SHADOW_READY'?shadow.phase:null});
 }
 const groups=Object.fromEntries(['UNCOMPUTED','NO_INDEPENDENT_CONSTRAINT',
  'CONTRADICTED_BY_OBSERVATION','NOT_CONTRADICTED_UNCALIBRATED'].map(key=>[
   key,rows.filter(x=>x.consistency===key).length
  ]));
 const covered=rows.length-groups.UNCOMPUTED;
 return {version:R4_VALIDATION_VERSION,status:'UNAPPROVED_SHADOW_DIAGNOSTIC',
  total:rows.length,calculated:covered,independentlyBounded:groups.CONTRADICTED_BY_OBSERVATION+
    groups.NOT_CONTRADICTED_UNCALIBRATED,
  contradictions:groups.CONTRADICTED_BY_OBSERVATION,
  // Exact score error cannot be measured without an independently defined, audited reference score.
  exactScoreCalibration:'NOT_EVALUATED',productionReady:false,groups,episodes:rows};
}
