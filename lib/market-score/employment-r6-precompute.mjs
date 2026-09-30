import {
  EMPLOYMENT_R6_FEATURES,
  EMPLOYMENT_R6_FORMULA_HASH,
  sha256HexSync,
} from "./employment-r6-formula.mjs";
import {
  computeAllFeaturePoints,
  computeEmploymentScore,
  computeFamilyScores,
  computeFeaturePoint,
} from "./employment-r6-feature-engine.mjs";
import {
  createEmploymentR6ObservationReader,
} from "./employment-r6-observation-reader.mjs";
import {
  computeEmploymentR6Projections,
} from "./employment-r6-projection-engine.mjs";
import {
  resolveEmploymentR6Impact,
} from "./employment-r6-dependency-map.mjs";
import {
  createEmploymentR6ReadModelStore,
} from "./employment-r6-read-model-store.mjs";

const finite=v=>Number.isFinite(Number(v));
const featureDef=new Map(EMPLOYMENT_R6_FEATURES.map(x=>[x.id,x]));
const families=[...new Set(EMPLOYMENT_R6_FEATURES.map(x=>x.family))];

function iso(v){
  const t=Date.parse(String(v??""));
  if(!Number.isFinite(t))throw new TypeError("SCORE_AS_OF_INVALID");
  return new Date(t).toISOString();
}
function previousModelOf(ready){
  return ready?.model && ready.formulaHash===EMPLOYMENT_R6_FORMULA_HASH ? ready.model : null;
}
function mergeChangedFeatures(previousFeatures,recomputed,impactedIds){
  const changed=new Map(recomputed.map(x=>[x.featureId,x]));
  return EMPLOYMENT_R6_FEATURES.map(def=>{
    if(impactedIds.has(def.id))return changed.get(def.id)??{featureId:def.id,status:"PARTIAL_MISSING",score:null,rawValue:null};
    return (previousFeatures??[]).find(x=>x.featureId===def.id)
      ?? {featureId:def.id,status:"PARTIAL_MISSING",score:null,rawValue:null};
  });
}
function computeChangedFamilyScores(featurePoints,previousFamilies,impactedFamilies){
  const all=computeFamilyScores(featurePoints);
  const out={};
  for(const family of families){
    if(impactedFamilies.has(family)||!previousFamilies?.[family])out[family]=all[family];
    else out[family]=previousFamilies[family];
  }
  return out;
}
function readyGate({features,families,employmentScore,projections,formulaHash,dataHash}){
  const issues=[];
  if(formulaHash!==EMPLOYMENT_R6_FORMULA_HASH)issues.push("FORMULA_HASH");
  if(!Array.isArray(features)||features.length!==29)issues.push("FEATURE_COUNT");
  else if(features.some(x=>x.status!=="READY"||!finite(x.score)||x.score<0||x.score>100))issues.push("FEATURE_READY");
  if(!families||Object.keys(families).length!==7)issues.push("FAMILY_COUNT");
  else if(Object.values(families).some(x=>x.status!=="READY"||!finite(x.score)))issues.push("FAMILY_READY");
  if(!finite(employmentScore)||employmentScore<0||employmentScore>100)issues.push("EMPLOYMENT_SCORE");
  if(!Array.isArray(projections)||projections.length!==4||projections.some(x=>x.status!=="READY"||!finite(x.score)))issues.push("PROJECTION_READY");
  if(!String(dataHash??""))issues.push("DATA_HASH");
  return {pass:issues.length===0,issues};
}

export async function precomputeEmploymentR6ReadModel({
  db,
  scoreAsOf=new Date().toISOString(),
  changedSeriesIds,
  readerFactory=createEmploymentR6ObservationReader,
  readModelStoreFactory=createEmploymentR6ReadModelStore,
  allFeatureFn=computeAllFeaturePoints,
  oneFeatureFn=computeFeaturePoint,
  projectionFn=computeEmploymentR6Projections,
}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const asOf=iso(scoreAsOf),store=readModelStoreFactory(db),previous=await store.getCurrentReady();
  const previousModel=previousModelOf(previous),impact=resolveEmploymentR6Impact(changedSeriesIds);

  if(impact.mode==="NO_CHANGE"&&previousModel){
    return {
      status:"NOOP",
      versionId:previous.versionId,
      servingVersionId:previous.versionId,
      readPointerUpdated:false,
      recomputedFeatureIds:[],
      reusedFeatureCount:29,
      providerRequests:0,
      publicOutput:false,
    };
  }
  if(impact.mode==="CHANGED"&&!impact.featureIds.length&&!impact.projections.length&&previousModel){
    return {
      status:"NOOP_IRRELEVANT_CHANGE",
      versionId:previous.versionId,
      servingVersionId:previous.versionId,
      readPointerUpdated:false,
      recomputedFeatureIds:[],
      reusedFeatureCount:29,
      providerRequests:0,
      publicOutput:false,
    };
  }

  const observations=await readerFactory(db).loadAsOf(asOf);
  const canIncrement=Boolean(previousModel && impact.mode==="CHANGED");
  let features,recomputedFeatureIds=[];
  if(canIncrement){
    const impacted=new Set(impact.featureIds);
    const recomputed=impact.featureIds.map(id=>oneFeatureFn(featureDef.get(id),observations));
    features=mergeChangedFeatures(previousModel.features,recomputed,impacted);
    recomputedFeatureIds=[...impact.featureIds];
  }else{
    features=allFeatureFn(observations);
    recomputedFeatureIds=EMPLOYMENT_R6_FEATURES.map(x=>x.id);
  }

  const impactedFamilies=new Set(canIncrement?impact.families:families);
  const familyScores=canIncrement
    ? computeChangedFamilyScores(features,previousModel.families,impactedFamilies)
    : computeFamilyScores(features);
  const employment=computeEmploymentScore(features,familyScores);
  const projections=projectionFn({observations,featurePoints:features});
  const dataHash=sha256HexSync(observations.map(x=>[
    x.logicalSeriesId,x.geographyCode,x.observationDate,x.value,x.sourceHash
  ]));
  const gate=readyGate({
    features,families:familyScores,employmentScore:employment.score,
    projections,formulaHash:EMPLOYMENT_R6_FORMULA_HASH,dataHash,
  });
  const model={
    methodologyVersion:"EMP-R6",
    formulaHash:EMPLOYMENT_R6_FORMULA_HASH,
    scoreAsOf:asOf,
    status:gate.pass?"READY_CANDIDATE":"PARTIAL",
    dataHash,
    features,
    families:familyScores,
    employmentScore:employment.score,
    projections,
    dependencyExecution:{
      mode:impact.mode,
      changedSeriesIds:impact.changedSeriesIds,
      recomputedFeatureIds,
      reusedFeatureCount:29-recomputedFeatureIds.length,
      recomputedFamilies:[...impactedFamilies],
      impactedProjections:impact.projections,
    },
    readyGate:gate,
  };
  const staged=await store.stageVersion({
    scoreAsOf:asOf,formulaHash:EMPLOYMENT_R6_FORMULA_HASH,dataHash,
    status:gate.pass?"READY_CANDIDATE":"PARTIAL",
    employmentScore:employment.score,model,
  });

  if(!gate.pass){
    return {
      status:"PARTIAL",
      versionId:staged.versionId,
      servingVersionId:previous?.versionId??null,
      fallbackUsed:Boolean(previous),
      readPointerUpdated:false,
      readyGate:gate,
      recomputedFeatureIds,
      reusedFeatureCount:29-recomputedFeatureIds.length,
      providerRequests:0,
      publicOutput:false,
    };
  }

  const promoted=await store.promoteReady(staged.versionId);
  return {
    status:"READY",
    versionId:staged.versionId,
    servingVersionId:staged.versionId,
    previousReadyVersionId:previous?.versionId??null,
    readPointerUpdated:promoted.pointerUpdated===true,
    readyGate:gate,
    recomputedFeatureIds,
    reusedFeatureCount:29-recomputedFeatureIds.length,
    providerRequests:0,
    publicOutput:false,
  };
}

export const EMPLOYMENT_R6_PRECOMPUTE_CONTRACT=Object.freeze({
  dependencyAware:true,
  changedOnlyRecompute:true,
  versionedReadModel:true,
  readyGate:true,
  atomicCurrentPointer:true,
  previousReadyFallback:true,
  providerCalls:0,
  publicIntermediateExposure:false,
});
