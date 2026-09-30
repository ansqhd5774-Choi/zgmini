import {
  EMPLOYMENT_R6_FEATURES,
} from "./employment-r6-formula.mjs";
import {
  EMPLOYMENT_R6_PROJECTION_DEFINITIONS,
} from "./employment-r6-projection-engine.mjs";

const featureById = new Map(EMPLOYMENT_R6_FEATURES.map(x=>[x.id,x]));
const featureIds = Object.freeze(EMPLOYMENT_R6_FEATURES.map(x=>x.id));
const familyNames = Object.freeze([...new Set(EMPLOYMENT_R6_FEATURES.map(x=>x.family))]);

const seriesToFeatures = new Map();
for (const feature of EMPLOYMENT_R6_FEATURES) {
  for (const seriesId of feature.logical ?? []) {
    if (!seriesToFeatures.has(seriesId)) seriesToFeatures.set(seriesId,new Set());
    seriesToFeatures.get(seriesId).add(feature.id);
  }
}

const projectionSeries = Object.freeze({
  UNEMPLOYMENT:Object.freeze(["U3_UNEMPLOYMENT_RATE"]),
  PAYROLL:Object.freeze(["PAYEMS_LEVEL"]),
  CLAIMS:Object.freeze(["INITIAL_CLAIMS"]),
  JOB_OPENINGS:Object.freeze(["JOLTS_JOB_OPENINGS_LEVEL"]),
});
const projectionScoreFeatures = Object.freeze({
  UNEMPLOYMENT:"U3_UNEMPLOYMENT",
  PAYROLL:"PAYEMS_3M_AVG",
  CLAIMS:"INITIAL_CLAIMS_4W",
  JOB_OPENINGS:"JOLTS_OPENINGS_RATE",
});

export function getEmploymentR6DependencyMap() {
  return {
    seriesToFeatures:Object.fromEntries([...seriesToFeatures].map(([k,v])=>[k,[...v].sort()])),
    featureToFamily:Object.fromEntries(EMPLOYMENT_R6_FEATURES.map(x=>[x.id,x.family])),
    familyToScore:Object.fromEntries(familyNames.map(x=>[x,"EMPLOYMENT_R6"])),
    seriesToProjections:Object.fromEntries(Object.entries(projectionSeries).flatMap(([projection,series])=>series.map(s=>[s,[projection]]))),
    projectionScoreFeatures:{...projectionScoreFeatures},
  };
}

export function resolveEmploymentR6Impact(changedSeriesIds) {
  const unknown = changedSeriesIds == null;
  const changed = unknown ? [] : [...new Set(changedSeriesIds.map(String))].sort();
  if (unknown) {
    return {
      mode:"FULL",
      changedSeriesIds:[],
      featureIds:[...featureIds],
      families:[...familyNames],
      projections:EMPLOYMENT_R6_PROJECTION_DEFINITIONS.map(x=>x.id),
      score:true,
    };
  }
  const features=new Set(),families=new Set(),projections=new Set();
  for(const seriesId of changed){
    for(const featureId of seriesToFeatures.get(seriesId) ?? []){
      features.add(featureId);
      const def=featureById.get(featureId);
      if(def)families.add(def.family);
    }
    for(const [projection,series] of Object.entries(projectionSeries)){
      if(series.includes(seriesId))projections.add(projection);
    }
  }
  for(const [projection,scoreFeatureId] of Object.entries(projectionScoreFeatures)){
    if(features.has(scoreFeatureId))projections.add(projection);
  }
  return {
    mode:changed.length===0 ? "NO_CHANGE" : "CHANGED",
    changedSeriesIds:changed,
    featureIds:[...features].sort(),
    families:[...families].sort(),
    projections:[...projections].sort(),
    score:features.size>0,
  };
}

export const EMPLOYMENT_R6_DEPENDENCY_CONTRACT=Object.freeze({
  seriesToFeature:true,
  featureToFamily:true,
  familyToScore:true,
  changedOnlyRecompute:true,
  projectionDependencies:true,
  providerCalls:0,
});
