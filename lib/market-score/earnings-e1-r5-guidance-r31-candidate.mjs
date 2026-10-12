import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";
import {classifyR30GuidanceCandidateFromText} from "./earnings-e1-r5-guidance-r30-candidate.mjs";

const clean=value=>String(value??"").trim();
const normalize=value=>String(value??"").replace(/[\t\r ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();

export const E1_R5_R31_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R31-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  changes:Object.freeze({
    recognizeExplicitCurrentVsPreviousCoreRevision:true,
    recognizePreviousCurrentGuidanceTableRevision:true,
    preserveR30Classifications:true,
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
function sentenceBounds(text,index,endIndex){const left=text.slice(0,index),leftBreak=Math.max(left.lastIndexOf("."),left.lastIndexOf("!"),left.lastIndexOf("?"),left.lastIndexOf(";"),left.lastIndexOf("\n"));const right=text.slice(endIndex),candidates=[right.indexOf("."),right.indexOf("!"),right.indexOf("?"),right.indexOf(";"),right.indexOf("\n")].filter(v=>v>=0),rightBreak=candidates.length?endIndex+Math.min(...candidates)+1:Math.min(text.length,endIndex+260);return {start:Math.max(0,leftBreak+1),end:Math.min(text.length,rightBreak)};}
function aggregateDirection(signals){const dirs=new Set(signals.map(item=>item.direction));if(dirs.has("WITHDRAW"))return {status:"WITHDRAW",direction:"WITHDRAW",eligibleForBreadth:false};const up=dirs.has("UP"),down=dirs.has("DOWN"),flat=dirs.has("FLAT");if(up&&down)return {status:"MIXED",direction:"MIXED",eligibleForBreadth:false};if(up)return {status:"CLASSIFIED",direction:"UP",eligibleForBreadth:true};if(down)return {status:"CLASSIFIED",direction:"DOWN",eligibleForBreadth:true};if(flat)return {status:"CLASSIFIED",direction:"FLAT",eligibleForBreadth:true};return {status:"UNCLASSIFIED",direction:null,eligibleForBreadth:false};}
function rankState(value){const v=String(value??"").toLowerCase();if(/^(?:up|higher)$/.test(v))return 1;if(v==="flat")return 0;if(/^(?:down|lower)$/.test(v))return -1;return null;}
function numeric(value){const raw=String(value??"").trim();if(!raw)return null;const n=Number(raw.replace(/[$,+()]/g,""));return Number.isFinite(n)?n:null;}
function midpoint(a,b){return b==null?a:(a+b)/2;}
function directionFromDelta(current,previous){if(current==null||previous==null)return null;const d=current-previous;if(Math.abs(d)<1e-9)return "FLAT";return d>0?"UP":"DOWN";}

function explicitPreviousStateSignals(text){
  const normalized=normalize(text),signals=[];
  const pattern=new RegExp(String.raw`\b(?:the\s+company\s+)?(?:now\s+)?expect(?:s|ed|ing)?\b[^.!?;\n]{0,160}\b${coreMetricSource}\b[^.!?;\n]{0,160}\b(?:roughly\s+)?(up|higher|flat|down|lower)\b[^.!?;\n]{0,80}\(\s*(?:versus|vs\.?)\s+(up|higher|flat|down|lower)\s+previously\s*\)`,"gi");
  for(const match of normalized.matchAll(pattern)){
    const current=rankState(match[1]),previous=rankState(match[2]),direction=directionFromDelta(current,previous),metrics=metricKinds(match[0]);if(!direction||direction==="FLAT"||!metrics.length)continue;const index=match.index??0,endIndex=index+match[0].length,bounds=sentenceBounds(normalized,index,endIndex);signals.push({direction,index,metrics,match:clean(match[0]),context:clean(normalized.slice(bounds.start,bounds.end)),source:"R31_EXPLICIT_STATE_VS_PREVIOUS"});
  }
  return signals;
}

function explicitPreviousNumericSignals(text){
  const normalized=normalize(text),signals=[];
  const num=String.raw`[-+]?\$?\d+(?:\.\d+)?`;
  const unit=String.raw`(?:\s*(?:%|billion|million))?`;
  const pattern=new RegExp(String.raw`\b${coreMetricSource}\b[^.!?;\n]{0,100}?(?:\bof\b|\bat\b|\bto\s+be\b|\brange\s+of\b)?\s*(${num})${unit}(?:\s+to\s+(${num})${unit})?[^.!?;\n]{0,40}\(\s*previously\s+(${num})${unit}(?:\s+to\s+(${num})${unit})?\s*\)`,"gi");
  for(const match of normalized.matchAll(pattern)){
    const c1=numeric(match[1]),c2=numeric(match[2]),p1=numeric(match[3]),p2=numeric(match[4]);if(c1==null||p1==null)continue;const direction=directionFromDelta(midpoint(c1,c2),midpoint(p1,p2)),metrics=metricKinds(match[0]);if(!direction||direction==="FLAT"||!metrics.length)continue;const index=match.index??0,endIndex=index+match[0].length,bounds=sentenceBounds(normalized,index,endIndex);signals.push({direction,index,metrics,match:clean(match[0]),context:clean(normalized.slice(bounds.start,bounds.end)),source:"R31_EXPLICIT_NUMERIC_PREVIOUS"});
  }
  return signals;
}

function previousCurrentTableSignals(text){
  const normalized=normalize(text),signals=[];
  const header=/\bPrevious\s+FY\d{2,4}\s+Guidance\s+Current\s+FY\d{2,4}\s+Guidance\b/i.exec(normalized);if(!header)return signals;
  const start=header.index??0,end=Math.min(normalized.length,start+1800),section=normalized.slice(start,end);
  const pattern=/\b(total\s+revenue)\s*:\s*[^%]{0,120}?\bUp\s*~?\s*(\d+(?:\.\d+)?)%\s+Up\s*~?\s*(\d+(?:\.\d+)?)(?:%\s*-\s*(\d+(?:\.\d+)?)%)?/gi;
  for(const match of section.matchAll(pattern)){
    const previous=numeric(match[2]),currentLow=numeric(match[3]),currentHigh=numeric(match[4]),direction=directionFromDelta(midpoint(currentLow,currentHigh),previous);if(!direction||direction==="FLAT")continue;const index=start+(match.index??0),endIndex=index+match[0].length,bounds=sentenceBounds(normalized,index,endIndex);signals.push({direction,index,metrics:["REVENUE"],match:clean(match[0]),context:clean(normalized.slice(bounds.start,bounds.end)),source:"R31_PREVIOUS_CURRENT_GUIDANCE_TABLE"});
  }
  return signals;
}

function collectR31Supplemental(text){return [...explicitPreviousStateSignals(text),...explicitPreviousNumericSignals(text),...previousCurrentTableSignals(text)];}
function mergeSignals(baseSignals,supplemental){const rows=[],seen=new Set();for(const signal of [...baseSignals,...supplemental].sort((a,b)=>(a.index??0)-(b.index??0)||String(a.direction).localeCompare(String(b.direction)))){const key=`${signal.direction}|${signal.index??0}|${(signal.metrics??[]).slice().sort().join(",")}`;if(seen.has(key))continue;seen.add(key);rows.push({...signal,metrics:unique(signal.metrics??[])});}return rows;}

export function classifyR31GuidanceCandidateFromText(text){
  const base=classifyR30GuidanceCandidateFromText(text);if(base?.direction)return base;
  const signals=mergeSignals(base?.signals??[],collectR31Supplemental(text)),aggregate=aggregateDirection(signals),counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0},metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of signals){if(signal.direction in counts)counts[signal.direction]++;for(const metric of signal.metrics??[]){if(metric in metricCounts)metricCounts[metric]++;}}
  return {...aggregate,counts,metricCounts,signals};
}
export function classifyR31GuidanceCandidateFromHtml(html){return classifyR31GuidanceCandidateFromText(htmlToVisibleText(html));}
