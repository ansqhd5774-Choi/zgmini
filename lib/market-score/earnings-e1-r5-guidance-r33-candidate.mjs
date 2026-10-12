import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";
import {classifyR32GuidanceCandidateFromText} from "./earnings-e1-r5-guidance-r32-candidate.mjs";

export const E1_R5_R33_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R33-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  changes:Object.freeze({
    hardenBroadFinancialReaffirmation:true,
    excludeSegmentSpecificMaintenance:true,
    excludeForwardLookingBoilerplate:true,
    excludeNonCoreOutlookReaffirmation:true,
    preserveOtherR32Classifications:true,
  }),
  aggregation:Object.freeze({upPlusFlat:"UP",downPlusFlat:"DOWN",upPlusDown:"MIXED",withdrawEligibleForBreadth:false}),
});

function clean(value){return String(value??"").trim();}
function unique(values){return [...new Set(values)];}
function aggregateDirection(signals){const dirs=new Set(signals.map(item=>item.direction));if(dirs.has("WITHDRAW"))return {status:"WITHDRAW",direction:"WITHDRAW",eligibleForBreadth:false};const up=dirs.has("UP"),down=dirs.has("DOWN"),flat=dirs.has("FLAT");if(up&&down)return {status:"MIXED",direction:"MIXED",eligibleForBreadth:false};if(up)return {status:"CLASSIFIED",direction:"UP",eligibleForBreadth:true};if(down)return {status:"CLASSIFIED",direction:"DOWN",eligibleForBreadth:true};if(flat)return {status:"CLASSIFIED",direction:"FLAT",eligibleForBreadth:true};return {status:"UNCLASSIFIED",direction:null,eligibleForBreadth:false};}

function isStrictBroadFinancialReaffirmation(signal){
  if(signal?.source!=="R32_BROAD_FINANCIAL_REAFFIRMATION")return true;
  const match=clean(signal?.match),context=clean(signal?.context),haystack=`${match} ${context}`;
  if(/\bforward[- ]looking statements?\b/i.test(haystack)&&/\b(?:identified|words?|expressions?|when we discuss)\b/i.test(haystack))return false;
  if(/\b(?:prepared foods|international|business|operating|reportable)?\s*segments?\b/i.test(context))return false;
  if(/\bnet bookings?\b/i.test(haystack)&&!/\bfinancial\s+(?:guidance|outlook)\b/i.test(match))return false;
  const explicitFinancial=/\bfinancial\s+(?:guidance|outlook)\b/i.test(match);
  const explicitFullYear=/\bfull[- ]year\s+\d{4}\s+(?:financial\s+)?(?:guidance|outlook)\b/i.test(match);
  const explicitYearFinancial=/\b\d{4}\s+financial\s+(?:guidance|outlook)\b/i.test(match);
  return explicitFinancial||explicitFullYear||explicitYearFinancial;
}

function recompute(signals){
  const filtered=(signals??[]).filter(isStrictBroadFinancialReaffirmation),aggregate=aggregateDirection(filtered),counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0},metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of filtered){if(signal.direction in counts)counts[signal.direction]++;for(const metric of unique(signal.metrics??[])){if(metric in metricCounts)metricCounts[metric]++;}}
  return {...aggregate,counts,metricCounts,signals:filtered};
}

export function classifyR33GuidanceCandidateFromText(text){
  const r32=classifyR32GuidanceCandidateFromText(text);
  return recompute(r32?.signals??[]);
}
export function classifyR33GuidanceCandidateFromHtml(html){return classifyR33GuidanceCandidateFromText(htmlToVisibleText(html));}
