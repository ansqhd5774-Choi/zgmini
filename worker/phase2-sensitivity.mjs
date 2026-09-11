// Pure, bounded research. Callers supply existing internal observations; no I/O.
export const SENSITIVITY_VERSION = 'phase2c-quality-1';
export const SENSITIVITY_POLICY = Object.freeze({
  contributionTolerance: 1e-9, dominantContributionShare: .8,
  fearThreshold: 20, maxSignalLagObservations: 20, maxJumpIntervals: 10,
  dateAlignmentPolicy: 'exact observed-date intersection; excluded slots break change pairs; no calendar-day interpolation',
  missingReasonPriority: ['SOURCE_HISTORY_NOT_STARTED','WARMUP','CURRENT_INPUT_LAG_OR_MISSING','MISSING_COMPONENT_AFTER_WARMUP','OTHER_UNRESOLVED']
});
const valid = x => typeof x === 'number' && Number.isFinite(x);
const day = d => Date.UTC(+d.slice(0,4), +d.slice(4,6)-1, +d.slice(6,8));
const gap = (a,b) => (day(b)-day(a))/86400000;
const maps = arrays => arrays.map(a => new Map(a.map(p => [p.date,p])));

export function trailingMean(points, n) {
  if (![3,5].includes(n)) throw Error('UNAPPROVED_SMOOTHING_WINDOW');
  return points.map((p,i) => {
    if (i < n-1) return {date:p.date,value:null,reason:'AVERAGE_WARMUP'};
    const values=points.slice(i-n+1,i+1).map(x=>x.value);
    return {date:p.date,value:values.every(valid)?values.reduce((a,b)=>a+b/n,0):null,
      reason:values.every(valid)?null:'MISSING_AVERAGE_INPUT'};
  });
}

export function smoothedScores(points, n, rollingScores) {
  const means=trailingMean(points,n);
  // Remove ONLY the initial structural warm-up, never intermediate missing slots.
  return [...means.slice(0,n-1),...rollingScores(means.slice(n-1),{inverse:true})];
}

export function commonDates(arrays) {
  if (!arrays.length) return new Set();
  const ms=maps(arrays);
  return new Set(arrays[0].filter(p=>ms.every(m=>valid(m.get(p.date)?.value))).map(p=>p.date));
}

// Null excluded dates instead of filtering before change/autocorrelation metrics.
export function alignedPoints(points, dates) {
  return points.map(p=>dates.has(p.date)?p:{...p,value:null});
}

export function evaluation(points, group, scoreQuality, dates=null) {
  const aligned=dates?alignedPoints(points,dates):points;
  const eligible=aligned.filter(p=>valid(p.value));
  return {evaluationStart:eligible[0]?.date??null,evaluationEnd:eligible.at(-1)?.date??null,
    evaluationObservationCount:eligible.length,comparisonGroup:group,
    dateAlignmentPolicy:SENSITIVITY_POLICY.dateAlignmentPolicy,quality:scoreQuality(aligned)};
}

export function jumpAttribution(points, weights, componentIds, rawSources=[], count=10) {
  const sum=weights.reduce((a,b)=>a+b,0),w=weights.map(x=>x/sum),sourceMaps=maps(rawSources);
  const intervals=[];let unmeasurableAdjacentIntervals=0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i];
    if(!valid(a.value)||!valid(b.value)) {unmeasurableAdjacentIntervals++;continue;}
    if(!a.componentScores?.every(valid)||!b.componentScores?.every(valid)||a.componentScores.length!==w.length||b.componentScores.length!==w.length) continue;
    const components=w.map((weight,k)=>({component:componentIds[k],previousScore:a.componentScores[k],score:b.componentScores[k],
      componentScoreChange:b.componentScores[k]-a.componentScores[k],weightedContribution:weight*(b.componentScores[k]-a.componentScores[k])}));
    const compositeChange=b.value-a.value,contributionSum=components.reduce((s,c)=>s+c.weightedContribution,0);
    const residual=contributionSum-compositeChange;
    if(Math.abs(residual)>SENSITIVITY_POLICY.contributionTolerance) throw Error('CONTRIBUTION_RECONCILIATION_FAILED');
    const absoluteSum=components.reduce((s,c)=>s+Math.abs(c.weightedContribution),0);
    const dominant=components.reduce((best,c)=>Math.abs(c.weightedContribution)>Math.abs(best.weightedContribution)?c:best,components[0]);
    const rawChecks=sourceMaps.map((m,k)=>({component:componentIds[k],zeroAtEitherEndpoint:[a.date,b.date].some(d=>m.get(d)?.value===0),
      invalidOrMissingAtEitherEndpoint:[a.date,b.date].some(d=>!valid(m.get(d)?.value))}));
    intervals.push({previousObservationDate:a.date,observationDate:b.date,calendarGapDays:gap(a.date,b.date),
      previousCompositeScore:a.value,compositeScore:b.value,compositeChange,components,contributionSum,residual,
      attribution:absoluteSum===0?'OTHER_UNRESOLVED':Math.abs(dominant.weightedContribution)/absoluteSum>=.8?'SINGLE_COMPONENT_DOMINANT':'MULTIPLE_COMPONENT_CHANGES',
      dominantComponent:absoluteSum?dominant.component:null,
      dateGapPresent:gap(a.date,b.date)>1,dateGapCause:'UNCONFIRMED_NOT_AUTOMATICALLY_MISSING',
      rawInputChecks:rawChecks,rawInputCausality:'UNCONFIRMED_ZERO_IS_NOT_AN_ERROR'});
  }
  return {tolerance:SENSITIVITY_POLICY.contributionTolerance,unmeasurableAdjacentIntervals,
    intervals:intervals.sort((a,b)=>Math.abs(b.compositeChange)-Math.abs(a.compositeChange)||a.observationDate.localeCompare(b.observationDate)).slice(0,Math.min(count,10))};
}

export function signalLagRelativeToRaw(raw, smooth) {
  const threshold=SENSITIVITY_POLICY.fearThreshold,maxLag=SENSITIVITY_POLICY.maxSignalLagObservations;
  const sm=new Map(smooth.map(p=>[p.date,p.value]));
  const result={threshold,maxSearchObservations:maxLag,searchUnit:'raw-series observation slots (not calendar days)',
    reference:'raw threshold crossing is a research reference, not market truth',eventCount:0,alreadyBelow:0,
    sameObservationEntry:0,delayedEntry:0,notEnteredWithinHorizon:0,rightCensored:0,missingEvaluation:0,
    lagObservationCounts:Array(maxLag+1).fill(0),meanLagObservations:null,meanCalendarLagDays:null};
  let lagTotal=0,calendarTotal=0,matched=0;
  for(let i=1;i<raw.length;i++) {
    if(!valid(raw[i-1].value)||!valid(raw[i].value)||raw[i-1].value<threshold||raw[i].value>=threshold)continue;
    result.eventCount++;
    const current=sm.get(raw[i].date),previous=sm.get(raw[i-1].date);
    if(!valid(current)||!valid(previous)){result.missingEvaluation++;continue;}
    if(current<threshold) {
      if(previous<threshold)result.alreadyBelow++;else result.sameObservationEntry++;
      result.lagObservationCounts[0]++;matched++;continue;
    }
    let resolved=false;
    for(let j=1;j<=maxLag;j++) {
      if(i+j>=raw.length){result.rightCensored++;resolved=true;break;}
      const next=sm.get(raw[i+j].date);
      if(!valid(next)||!valid(raw[i+j].value)){result.missingEvaluation++;resolved=true;break;}
      if(next<threshold){result.delayedEntry++;result.lagObservationCounts[j]++;lagTotal+=j;
        calendarTotal+=gap(raw[i].date,raw[i+j].date);matched++;resolved=true;break;}
    }
    if(!resolved)result.notEnteredWithinHorizon++;
  }
  result.meanLagObservations=matched?lagTotal/matched:null;
  result.meanCalendarLagDays=matched?calendarTotal/matched:null;
  return result;
}

export function missingBreakdown(composite, sources, warmupObservations) {
  const ms=maps(sources),indices=sources.map(s=>new Map(s.map((p,i)=>[p.date,i])));
  const thresholds=sources.map((s,k)=>s[warmupObservations[k]-1]?.date??null);
  const commonWarmupEnd=thresholds.every(Boolean)?[...thresholds].sort().at(-1):null;
  const counts=Object.fromEntries(SENSITIVITY_POLICY.missingReasonPriority.map(r=>[r,0]));
  let usable=0,after=0,afterUsable=0;
  for(const p of composite) {
    const post=commonWarmupEnd!==null&&p.date>=commonWarmupEnd;if(post)after++;
    if(valid(p.value)){usable++;if(post)afterUsable++;continue;}
    let reason;
    if(sources.some(s=>!s.length||p.date<s[0].date))reason='SOURCE_HISTORY_NOT_STARTED';
    else if(sources.some((s,k)=>thresholds[k]===null||p.date<thresholds[k]||indices[k].get(p.date)<warmupObservations[k]-1))reason='WARMUP';
    else if(ms.some(m=>!valid(m.get(p.date)?.value)))reason='CURRENT_INPUT_LAG_OR_MISSING';
    else if(p.componentScores?.some(v=>!valid(v)))reason='MISSING_COMPONENT_AFTER_WARMUP';
    else reason='OTHER_UNRESOLVED';
    counts[reason]++;
  }
  return {priority:SENSITIVITY_POLICY.missingReasonPriority,counts,missingScoreCount:composite.length-usable,
    overallObservedDateCoverage:{denominator:composite.length,usable,fraction:composite.length?usable/composite.length:null},
    afterCommonWarmupCoverage:{commonWarmupEnd,denominator:after,usable:afterUsable,fraction:after?afterUsable/after:null},
    requestedCalendarCoverage:'UNASSESSED_NO_EXPECTED_RELEASE_CALENDAR',
    dateAbsenceInterpretation:'missing aligned observation; network failure and publication lag remain UNCONFIRMED'};
}

export function runSensitivity({candidates,sources,models,modelSeries,requestWindow}, api) {
  const {rollingScores,scoreQuality,compositeScores,correlation}=api;
  const l0=candidates.LIQ_LEVEL_P252.points;
  const liquidation={L0:l0,L3:smoothedScores(sources.liquidation,3,rollingScores),L5:smoothedScores(sources.liquidation,5,rollingScores)};
  const groupDates=commonDates(Object.values(liquidation));
  const smoothing=Object.entries(liquidation).map(([id,points])=>({id,
    ownPeriod:evaluation(points,'liquidation-smoothing',scoreQuality),commonPeriod:evaluation(points,'liquidation-smoothing',scoreQuality,groupDates),
    totalWarmupObservations:id==='L0'?251:id==='L3'?253:255,
    ...(id==='L0'?{}:{signalLagRelativeToRaw:signalLagRelativeToRaw(l0,points)})}));
  const componentIds=['LEV_BLEND20_60','LIQ_LEVEL_P252','SPREAD_LEVEL_P252'];
  const raw=[sources.leverage,sources.liquidation,sources.creditSpread];
  const baseline=componentIds.map(id=>candidates[id].points);
  const baselineJumpAttribution=models.slice(0,3).map(m=>({id:m.id,...jumpAttribution(modelSeries.get(m.id),m.weights,componentIds,raw)}));
  const comparisons=[];
  for(const [id,points] of Object.entries(liquidation))for(const spread of ['SPREAD_LEVEL_P252','SPREAD_LEVEL_Z252']) {
    const ids=['LEV_BLEND20_60',id,spread],parts=[baseline[0],points,candidates[spread].points];
    comparisons.push({id:`EQUAL_${id}_${spread}`,ids,parts,points:id==='L0'&&spread==='SPREAD_LEVEL_P252'?modelSeries.get('MODEL_A_EQUAL'):compositeScores(parts,[1,1,1]),warmup:[312,id==='L0'?252:id==='L3'?254:256,252]});
  }
  const shared=commonDates(comparisons.map(c=>c.points));
  const pairCorrelations=(parts,ids,dates)=>parts.flatMap((a,i)=>parts.slice(i+1).map((b,j)=>({left:ids[i],right:ids[i+j+1],...correlation(alignedPoints(a,dates),alignedPoints(b,dates))})));
  const combinations=comparisons.map(c=>{
    const aligned=alignedPoints(c.points,shared),years=[...new Set([...shared].map(d=>d.slice(0,4)))].sort();
    return {id:c.id,componentCandidates:c.ids,weights:[1/3,1/3,1/3],productionEligible:false,
      ownPeriod:evaluation(c.points,'six-equal-combinations',scoreQuality),commonPeriod:evaluation(c.points,'six-equal-combinations',scoreQuality,shared),
      jumpAttribution:jumpAttribution(aligned,[1,1,1],c.ids,raw),componentCorrelations:pairCorrelations(c.parts,c.ids,shared),
      yearly:years.map(year=>{const dates=new Set([...shared].filter(d=>d.startsWith(year)));return {year,
        ...evaluation(c.points.filter(p=>p.date.startsWith(year)),'six-equal-combinations-year',scoreQuality,dates),
        jumpAttribution:jumpAttribution(alignedPoints(c.points,dates),[1,1,1],c.ids,raw,1),componentCorrelations:pairCorrelations(c.parts,c.ids,dates)};}),
      coverage:missingBreakdown(c.points,raw,c.warmup)};
  });
  const candidateComparisons=Object.values(candidates).map(c=>{
    const peers=Object.values(candidates).filter(p=>p.axis===c.axis);
    const dates=commonDates(peers.map(p=>p.points));
    return {id:c.id,independentCandidate:c.id!=='LIQ_LOG1P_P252',ownPeriod:evaluation(c.points,`normalization-${c.axis}`,scoreQuality),
      commonPeriod:evaluation(c.points,`normalization-${c.axis}`,scoreQuality,dates)};
  });
  const modelPoints=models.map(m=>modelSeries.get(m.id));
  const modelDates=commonDates(modelPoints);
  const modelEvaluations=new Map();
  const modelComparisons=models.map((m,i)=>{
    if(!modelEvaluations.has(modelPoints[i]))modelEvaluations.set(modelPoints[i],{ownPeriod:evaluation(modelPoints[i],'v69-models',scoreQuality),commonPeriod:evaluation(modelPoints[i],'v69-models',scoreQuality,modelDates)});
    return {id:m.id,...modelEvaluations.get(modelPoints[i])};
  });
  return {analysisVersion:SENSITIVITY_VERSION,policy:SENSITIVITY_POLICY,pointInTimeVerified:false,publicationLagStatus:'UNCONFIRMED',
    requestedWindow:requestWindow&&/^\d{8}$/.test(requestWindow.start)&&/^\d{8}$/.test(requestWindow.end)?{start:requestWindow.start,end:requestWindow.end}:null,
    historicalVintageVerified:false,productionEligible:false,finalWeights:null,
    baselineJumpAttribution,candidateComparisons,modelComparisons,smoothing,combinations,
    baselineCoverage:missingBreakdown(modelSeries.get('MODEL_A_EQUAL'),raw,[312,252,252]),
    modelReuse:{namedModelsRetained:true,uniqueCalculations:new Set(models.map(m=>JSON.stringify([m.componentCandidates,m.weights]))).size,totalLabels:models.length,duplicates:[['MODEL_B_MARKET_DIRECT','GRID_40_35_25'],['MODEL_C_STRESS_BALANCED','GRID_35_35_30']],
      cacheScope:'invocation-local; exact component bundle, weights and missing policy; no cross-input summary reuse'},
    limitations:['No real-data snapshot supplied to local fixture tests','No independent market prediction target','No release calendar or historical vintages supplied']};
}
