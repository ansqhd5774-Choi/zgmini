/**
 * Fail-closed R4 shadow prepublication cross-check.
 * This tool never publishes. A score may be ready under synthetic domain inputs
 * yet contradict independent, recent observed combat. Never silently overwrite.
 */
import {calculateIranR4RealityShadow} from './reality-shadow-r4.mjs';
import {auditR4ScoreAgainstAnchors,examineR4RealityAnchors} from './observed-anchors-r4.mjs';

export function crosscheckIranR4ShadowAgainstReports(input,observations,asOf){
 const raw=calculateIranR4RealityShadow(input,asOf);
 const reality=examineR4RealityAnchors(observations,asOf);
 if(raw.status!=='SHADOW_READY')return {status:'SHADOW_PENDING',score:null,
  reason:'INPUT_VERIFICATION_INCOMPLETE',shadow:raw,reality,productionReady:false};
 if(reality.status!=='CONSTRAINT_ONLY')return {status:'SHADOW_UNCALIBRATED',score:null,
  reason:'INDEPENDENT_REALITY_CHECK_UNAVAILABLE',candidateScore:raw.score,shadow:raw,reality,productionReady:false};
 const assessment=auditR4ScoreAgainstAnchors(raw.score,observations,asOf);
 if(assessment.status==='CONTRADICTED_BY_CURRENT_COMBAT')return {status:'SHADOW_CONTRADICTED',score:null,
  reason:'SCORE_INCOMPATIBLE_WITH_OBSERVED_COMBAT',candidateScore:raw.score,
  maximumCompatibleScore:reality.maximumCompatibleScore,shadow:raw,reality,productionReady:false};
 return {status:'SHADOW_UNCALIBRATED',score:null,candidateScore:raw.score,
  reason:'EXACT_SCORE_NOT_CALIBRATED_BY_REPORTS',shadow:raw,reality,productionReady:false};
}
