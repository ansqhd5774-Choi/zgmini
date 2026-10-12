import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";
import {classifyR31GuidanceCandidateFromText} from "./earnings-e1-r5-guidance-r31-candidate.mjs";

const clean=value=>String(value??"").trim();
const normalize=value=>String(value??"").replace(/[\t\r ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();

export const E1_R5_R32_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R32-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  changes:Object.freeze({
    recognizeFootnotedPreviousCurrentGuidanceTable:true,
    recognizeBroadFinancialGuidanceReaffirmation:true,
    recognizeRangeReplacingPriorFloor:true,
    preserveR31Classifications:true,
  }),
  aggregation:Object.freeze({upPlusFlat:"UP",downPlusFlat:"DOWN",upPlusDown:"MIXED",withdrawEligibleForBreadth:false}),
});

const coreMetricPatterns=Object.freeze({
  EARNINGS:/\b(?:earnings per share|earnings per diluted share|adjusted eps|diluted eps|\beps\b|net income|adjusted ebitda|\bebitda\b|operating income|operating profit|adjusted operating income|adjusted operating profit)\b/i,
  REVENUE:/\b(?:revenue|revenues|net sales|organic sales|sales growth|sales)\b/i,
  MARGIN:/\b(?:operating margin|adjusted operating margin|ebitda margin|gross profit margin|gross margin|profit margin|margin)\b/i,
  CASH_FLOW:/\b(?:free cash flow|operating cash flow|cash flow from operations|cash provided by operating activities|cash flow)\b/i,
});
const coreMetricSource=String.raw`(?:earnings per share|earnings per diluted share|adjusted eps|diluted eps|eps|net income|adjusted ebitda|ebitda|operating income|operating profit|adjusted operating income|adjusted operating profit|revenue|revenues|net sales|organic sales|sales growth|sales|operating margin|adjusted operating margin|ebitda margin|gross profit margin|gross margin|profit margin|free cash flow|operating cash flow|cash flow from operations|cash provided by operating activities|cash flow)`;

function metricKinds(text){const out=[],value=String(text??"");for(const [kind,pattern] of Object.entries(coreMetricPatterns)){if(pattern.test(value))out.push(kind);}return out;}
function unique(values){return [...new Set(values)];}
function sentenceBounds(text,index,endIndex){const left=text.slice(0,index),leftBreak=Math.max(left.lastIndexOf("."),left.lastIndexOf("!"),left.lastIndexOf("?"),left.lastIndexOf(";"),left.lastIndexOf("\n"));const right=text.slice(endIndex),candidates=[right.indexOf("."),right.indexOf("!"),right.indexOf("?"),right.indexOf(";"),right.indexOf("\n")].filter(v=>v>=0),rightBreak=candidates.length?endIndex+Math.min(...candidates)+1:Math.min(text.length,endIndex+320);return {start:Math.max(0,leftBreak+1),end:Math.min(text.length,rightBreak)};}
function aggregateDirection(signals){const dirs=new Set(signals.map(item=>item.direction));if(dirs.has("WITHDRAW"))return {status:"WITHDRAW",direction:"WITHDRAW",eligibleForBreadth:false};const up=dirs.has("UP"),down=dirs.has("DOWN"),flat=dirs.has("FLAT");if(up&&down)return {status:"MIXED",direction:"MIXED",eligibleForBreadth:false};if(up)return {status:"CLASSIFIED",direction:"UP",eligibleForBreadth:true};if(down)return {status:"CLASSIFIED",direction:"DOWN",eligibleForBreadth:true};if(flat)return {status:"CLASSIFIED",direction:"FLAT",eligibleForBreadth:true};return {status:"UNCLASSIFIED",direction:null,eligibleForBreadth:false};}
function numeric(value){const raw=String(value??"").trim();if(!raw)return null;const n=Number(raw.replace(/[$,+()]/g,""));return Number.isFinite(n)?n:null;}
function midpoint(a,b){return b==null?a:(a+b)/2;}
function directionFromDelta(current,previous){if(current==null||previous==null)return null;const d=current-previous;if(Math.abs(d)<1e-9)return "FLAT";return d>0?"UP":"DOWN";}

function footnotedPreviousCurrentTableSignals(text){
  const normalized=normalize(text),signals=[];
  const header=/\bPrevious\s+FY\d{2,4}\s+Guidance(?:\s*\d+(?:\s*,\s*\d+)*)?\s+Current\s+FY\d{2,4}\s+Guidance(?:\s*\d+(?:\s*,\s*\d+)*)?\b/i.exec(normalized);
  if(!header)return signals;
  const start=header.index??0,end=Math.min(normalized.length,start+2000),section=normalized.slice(start,end);
  const pattern=/\b(total\s+revenue)\s*:\s*[^%]{0,140}?\bUp\s*~?\s*(\d+(?:\.\d+)?)%\s+Up\s*~?\s*(\d+(?:\.\d+)?)(?:%\s*-\s*(\d+(?:\.\d+)?)%)?/gi;
  for(const match of section.matchAll(pattern)){
    const previous=numeric(match[2]),currentLow=numeric(match[3]),currentHigh=numeric(match[4]),direction=directionFromDelta(midpoint(currentLow,currentHigh),previous);
    if(!direction||direction==="FLAT")continue;
    const index=start+(match.index??0),endIndex=index+match[0].length,bounds=sentenceBounds(normalized,index,endIndex);
    signals.push({direction,index,metrics:["REVENUE"],match:clean(match[0]),context:clean(normalized.slice(bounds.start,bounds.end)),source:"R32_FOOTNOTED_PREVIOUS_CURRENT_GUIDANCE_TABLE"});
  }
  return signals;
}

function titleOnlyContext(text,index){
  const before=text.slice(Math.max(0,index-220),index).toLowerCase();
  return /(?:press|news)\s+release[^.!?\n]{0,160}\b(?:entitled|dated|labeled)\b/.test(before);
}
function broadFinancialFlatSignals(text){
  const normalized=normalize(text),signals=[];
  const pattern=/\b(?:reaffirm(?:s|ed|ing)?|reiterat(?:e|es|ed|ing)|maintain(?:s|ed|ing)?)\b[^.!?;\n]{0,180}?\b(?:(?:full[- ]year\s+\d{4}|\d{4})\s+)?(?:financial\s+)?(?:guidance|outlook)\b/gi;
  for(const match of normalized.matchAll(pattern)){
    const index=match.index??0,endIndex=index+match[0].length,bounds=sentenceBounds(normalized,index,endIndex),sentence=clean(normalized.slice(bounds.start,bounds.end));
    if(titleOnlyContext(normalized,index))continue;
    if(/\b(?:except|exception|excluding|other\s+than|update(?:d|s|ing)?|revis(?:e|ed|es|ing)|rais(?:e|ed|es|ing)|lower(?:ed|s|ing)?)\b/i.test(sentence))continue;
    signals.push({direction:"FLAT",index,metrics:["FINANCIAL_GUIDANCE"],match:clean(match[0]),context:sentence,source:"R32_BROAD_FINANCIAL_REAFFIRMATION"});
  }
  return signals;
}

function priorFloorReplacementSignals(text){
  const normalized=normalize(text),signals=[];
  const num=String.raw`[-+]?\$?\d+(?:\.\d+)?`;
  const pattern=new RegExp(String.raw`\b(${coreMetricSource})\b[^.!?;\n]{0,160}?\b(?:range\s+of\s+)?(${num})\s+to\s+(${num})\s*\.\s*(?:This|The)\s+updated\s+range\s+replaces\s+(?:its\s+)?prior\s+expectation\s+of\s+at\s+least\s+(${num})`,"gi");
  for(const match of normalized.matchAll(pattern)){
    const low=numeric(match[2]),high=numeric(match[3]),priorFloor=numeric(match[4]);
    if(low==null||high==null||priorFloor==null)continue;
    const currentMid=midpoint(low,high);
    if(!(low<priorFloor&&currentMid<priorFloor))continue;
    const index=match.index??0,endIndex=index+match[0].length,bounds=sentenceBounds(normalized,index,endIndex),metrics=metricKinds(match[1]);
    if(!metrics.length)continue;
    signals.push({direction:"DOWN",index,metrics,match:clean(match[0]),context:clean(normalized.slice(bounds.start,bounds.end)),source:"R32_RANGE_REPLACES_PRIOR_FLOOR"});
  }
  return signals;
}

function collectR32Supplemental(text){return [...footnotedPreviousCurrentTableSignals(text),...broadFinancialFlatSignals(text),...priorFloorReplacementSignals(text)];}
function mergeSignals(baseSignals,supplemental){const rows=[],seen=new Set();for(const signal of [...baseSignals,...supplemental].sort((a,b)=>(a.index??0)-(b.index??0)||String(a.direction).localeCompare(String(b.direction)))){const key=`${signal.direction}|${signal.index??0}|${(signal.metrics??[]).slice().sort().join(",")}`;if(seen.has(key))continue;seen.add(key);rows.push({...signal,metrics:unique(signal.metrics??[])});}return rows;}

export function classifyR32GuidanceCandidateFromText(text){
  const base=classifyR31GuidanceCandidateFromText(text);if(base?.direction)return base;
  const signals=mergeSignals(base?.signals??[],collectR32Supplemental(text)),aggregate=aggregateDirection(signals),counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0},metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of signals){if(signal.direction in counts)counts[signal.direction]++;for(const metric of signal.metrics??[]){if(metric in metricCounts)metricCounts[metric]++;}}
  return {...aggregate,counts,metricCounts,signals};
}
export function classifyR32GuidanceCandidateFromHtml(html){return classifyR32GuidanceCandidateFromText(htmlToVisibleText(html));}
