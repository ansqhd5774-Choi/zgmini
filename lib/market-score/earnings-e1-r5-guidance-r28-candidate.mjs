import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";
import {classifyR26GuidanceCandidateFromText} from "./earnings-e1-r5-guidance-r26-candidate.mjs";

export const E1_R5_R28_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R28-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  changes:Object.freeze({
    suppressLowerEndRangePositioning:true,
    suppressGrowthDecreaseLabelBinding:true,
  }),
  aggregation:Object.freeze({upPlusFlat:"UP",downPlusFlat:"DOWN",upPlusDown:"MIXED",withdrawEligibleForBreadth:false}),
});

const lowerEndRangePositionPattern=/\b(?:at|toward|towards|near)\s+(?:the\s+)?lower\s+end\s+of\b[^.!?;\n]{0,180}\b(?:guidance|outlook|forecast)\b/i;
const growthDecreaseLabelPattern=/\b(?:organic\s+)?(?:sales|revenue)?\s*growth\s*\/\s*\(\s*decrease\s*\)/i;

function isR28FalseDownSignal(signal){
  if(signal?.direction!=="DOWN")return false;
  const context=String(signal?.context??"");
  const match=String(signal?.match??"");
  if(lowerEndRangePositionPattern.test(context)||lowerEndRangePositionPattern.test(match))return true;
  if(growthDecreaseLabelPattern.test(context)||growthDecreaseLabelPattern.test(match))return true;
  return false;
}

function aggregateDirection(signals){
  const dirs=new Set(signals.map(item=>item.direction));
  if(dirs.has("WITHDRAW"))return {status:"WITHDRAW",direction:"WITHDRAW",eligibleForBreadth:false};
  const up=dirs.has("UP"),down=dirs.has("DOWN"),flat=dirs.has("FLAT");
  if(up&&down)return {status:"MIXED",direction:"MIXED",eligibleForBreadth:false};
  if(up)return {status:"CLASSIFIED",direction:"UP",eligibleForBreadth:true};
  if(down)return {status:"CLASSIFIED",direction:"DOWN",eligibleForBreadth:true};
  if(flat)return {status:"CLASSIFIED",direction:"FLAT",eligibleForBreadth:true};
  return {status:"UNCLASSIFIED",direction:null,eligibleForBreadth:false};
}

export function classifyR28GuidanceCandidateFromText(text){
  const base=classifyR26GuidanceCandidateFromText(text);
  const signals=(base?.signals??[]).filter(signal=>!isR28FalseDownSignal(signal));
  const aggregate=aggregateDirection(signals);
  const counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0};
  const metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of signals){
    if(signal.direction in counts)counts[signal.direction]++;
    for(const metric of signal.metrics??[]){if(metric in metricCounts)metricCounts[metric]++;}
  }
  return {...aggregate,counts,metricCounts,signals};
}

export function classifyR28GuidanceCandidateFromHtml(html){return classifyR28GuidanceCandidateFromText(htmlToVisibleText(html));}
