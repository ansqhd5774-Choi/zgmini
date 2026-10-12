import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";
import {classifyR29GuidanceCandidateFromText} from "./earnings-e1-r5-guidance-r29-candidate.mjs";

const clean=value=>String(value??"").trim();
const normalize=value=>String(value??"").replace(/[\t\r ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();

export const E1_R5_R30_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R30-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  changes:Object.freeze({
    suppressR29NearbyBindingFalsePositives:true,
    preserveAmbiguousUpdateAndExceptionGuards:true,
    suppressExternalAndNonCoreGuidance:true,
    recognizeCoreExpectationReiteration:true,
    recognizeExplicitOutlookImprovementVsPriorGuidance:true,
  }),
  aggregation:Object.freeze({upPlusFlat:"UP",downPlusFlat:"DOWN",upPlusDown:"MIXED",withdrawEligibleForBreadth:false}),
});

const coreMetricPatterns=Object.freeze({
  EARNINGS:/\b(?:earnings per share|earnings per diluted share|adjusted eps|diluted eps|\beps\b|net income|adjusted ebitda|\bebitda\b|operating income|operating profit|adjusted operating income|adjusted operating profit)\b/i,
  REVENUE:/\b(?:revenue|revenues|net sales|organic sales|sales growth|sales)\b/i,
  MARGIN:/\b(?:operating margin|adjusted operating margin|ebitda margin|gross margin|profit margin|margin)\b/i,
  CASH_FLOW:/\b(?:free cash flow|operating cash flow|cash flow from operations|cash provided by operating activities|cash flow)\b/i,
});
const coreMetricSource=String.raw`(?:earnings per share|earnings per diluted share|adjusted eps|diluted eps|eps|net income|adjusted ebitda|ebitda|operating income|operating profit|adjusted operating income|adjusted operating profit|revenue|revenues|net sales|organic sales|sales growth|operating margin|adjusted operating margin|ebitda margin|gross margin|profit margin|free cash flow|operating cash flow|cash flow from operations|cash provided by operating activities|cash flow)`;
const nonCoreGuidancePattern=/\b(?:capital spending|capital expenditures?|capex|operating expenses?|opex|expense plan|expense outlook|expense guidance|selling general and administrative|sg&a|tax rate|interest expense|share repurchases?|dividends?|production volumes?|production guidance|shipments?|headcount|bookings?|order rate|sales volume|revpar|net new arr|annual recurring revenue|arr growth)\b/i;
const externalGuidancePattern=/(?:\b(?:ftc|fda|sec|fasb|regulatory|regulator|government|agency|financial accounting standards board|accounting standards codification)\b[^.!?;\n]{0,100}\bguidance\b|\bguidance\b[^.!?;\n]{0,100}\b(?:ftc|fda|sec|fasb|regulatory|regulator|government|agency|financial accounting standards board|accounting standards codification)\b)/i;
const nominalPriorGuidanceChangePattern=/\b(?:increase|decrease)\s+from\s+(?:prior|previous)\s+(?:guidance|outlook|forecast)\b/i;
const coreMetricExceptionPattern=new RegExp(String.raw`\b(?:with\s+the\s+exception\s+of|except\s+for)\b[^.!?;\n]{0,140}\b${coreMetricSource}\b`,"i");
const ambiguousCoreUpdatePattern=new RegExp(String.raw`\b(?:update(?:s|d|ing)?|revis(?:e|es|ed|ing))\b[^.!?;\n]{0,160}\b${coreMetricSource}\b(?:[^.!?;\n]{0,80}\b(?:guidance|outlook|forecast)\b)?`,"i");
const yoyComparisonPattern=/\b(?:compared\s+(?:with|to)|versus|vs\.?)\s+(?:the\s+)?(?:prior\s+year|previous\s+year|20\d{2})\b/i;
const priorGuidanceReferencePattern=/\b(?:prior|previous|earlier|june|march|may|april|july|august|september|october|november|december|january|february)\s+(?:guidance|outlook|forecast)\b/i;
const operationalOutlookPattern=/\bimprov(?:e|es|ed|ing)\b[^.!?;\n]{0,80}\boutlook\b[^.!?;\n]{0,100}\b(?:operations?|business|market|industry|demand|supply)\b|\bimprov(?:ing|ed)\s+outlook\s+for\s+(?:our\s+)?(?:operations?|business|market|industry|demand|supply)/i;
const unrelatedDecreaseHeadingPattern=/\b(?:supply|cost|price|rate|impact|volume)\s+(?:impact\s+)?decreas(?:e|es|ed|ing)\b/i;

function metricKinds(text){const out=[],value=String(text??"");for(const [kind,pattern] of Object.entries(coreMetricPatterns)){if(pattern.test(value))out.push(kind);}return out;}
function unique(values){return [...new Set(values)];}
function sentenceBounds(text,index,endIndex){const left=text.slice(0,index),leftBreak=Math.max(left.lastIndexOf("."),left.lastIndexOf("!"),left.lastIndexOf("?"),left.lastIndexOf(";"),left.lastIndexOf("\n"));const right=text.slice(endIndex),candidates=[right.indexOf("."),right.indexOf("!"),right.indexOf("?"),right.indexOf(";"),right.indexOf("\n")].filter(v=>v>=0),rightBreak=candidates.length?endIndex+Math.min(...candidates)+1:Math.min(text.length,endIndex+260);return {start:Math.max(0,leftBreak+1),end:Math.min(text.length,rightBreak)};}
function isR29Supplemental(signal){return String(signal?.source??"").startsWith("R29_");}
function suppressR29Signal(signal){
  const match=String(signal?.match??""),context=String(signal?.context??""),text=`${match} ${context}`;
  if(externalGuidancePattern.test(text))return true;
  if(nonCoreGuidancePattern.test(text)&&metricKinds(text).length===0)return true;
  if(!isR29Supplemental(signal))return false;
  if(signal?.direction==="DOWN"&&nominalPriorGuidanceChangePattern.test(text))return true;
  if(signal?.direction==="FLAT"&&coreMetricExceptionPattern.test(text))return true;
  if(signal?.direction==="FLAT"&&ambiguousCoreUpdatePattern.test(text))return true;
  if((signal?.direction==="UP"||signal?.direction==="DOWN")&&yoyComparisonPattern.test(text)&&!priorGuidanceReferencePattern.test(text))return true;
  if(signal?.direction==="UP"&&operationalOutlookPattern.test(text)&&metricKinds(match).length===0)return true;
  if(signal?.direction==="DOWN"&&unrelatedDecreaseHeadingPattern.test(text)&&metricKinds(match).length===0)return true;
  return false;
}

function collectR30Supplemental(text){
  const normalized=normalize(text),signals=[],seen=new Set();
  const flatExpectation=new RegExp(String.raw`\b(?:reaffirm(?:s|ed|ing)?|reiterat(?:e|es|ed|ing)|maintain(?:s|ed|ing)?)\b[^.!?;\n]{0,100}\b(?:expectation|expectations)\b[^.!?;\n]{0,140}\b${coreMetricSource}\b`,"gi");
  for(const match of normalized.matchAll(flatExpectation)){
    const index=match.index??0,endIndex=index+match[0].length,metrics=metricKinds(match[0]);if(!metrics.length)continue;const bounds=sentenceBounds(normalized,index,endIndex),key=`FLAT|${index}|${metrics.join(",")}`;if(seen.has(key))continue;seen.add(key);signals.push({direction:"FLAT",index,metrics,match:clean(match[0]),context:clean(normalized.slice(bounds.start,bounds.end)),source:"R30_CORE_EXPECTATION_REITERATION"});
  }
  const outlookImprovement=new RegExp(String.raw`\b(?:full[- ]year\s+)?outlook\b[^.!?;\n]{0,100}\b(?:operational\s+)?improv(?:ement|ed|ing)\b[^.!?;\n]{0,140}\b${coreMetricSource}\b[^.!?;\n]{0,100}\b(?:compared\s+(?:with|to)|versus)\b[^.!?;\n]{0,60}\b(?:prior|previous|earlier|january|february|march|april|may|june|july|august|september|october|november|december)?\s*(?:guidance|outlook|forecast)\b`,"gi");
  for(const match of normalized.matchAll(outlookImprovement)){
    const index=match.index??0,endIndex=index+match[0].length,metrics=metricKinds(match[0]);if(!metrics.length)continue;const bounds=sentenceBounds(normalized,index,endIndex),key=`UP|${index}|${metrics.join(",")}`;if(seen.has(key))continue;seen.add(key);signals.push({direction:"UP",index,metrics,match:clean(match[0]),context:clean(normalized.slice(bounds.start,bounds.end)),source:"R30_OUTLOOK_IMPROVEMENT_VS_PRIOR_GUIDANCE"});
  }
  return signals;
}
function mergeSignals(baseSignals,supplemental){const rows=[],seen=new Set();for(const signal of [...baseSignals,...supplemental].sort((a,b)=>(a.index??0)-(b.index??0)||String(a.direction).localeCompare(String(b.direction)))){const key=`${signal.direction}|${signal.index??0}|${(signal.metrics??[]).slice().sort().join(",")}`;if(seen.has(key))continue;seen.add(key);rows.push({...signal,metrics:unique(signal.metrics??[])});}return rows;}
function aggregateDirection(signals){const dirs=new Set(signals.map(item=>item.direction));if(dirs.has("WITHDRAW"))return {status:"WITHDRAW",direction:"WITHDRAW",eligibleForBreadth:false};const up=dirs.has("UP"),down=dirs.has("DOWN"),flat=dirs.has("FLAT");if(up&&down)return {status:"MIXED",direction:"MIXED",eligibleForBreadth:false};if(up)return {status:"CLASSIFIED",direction:"UP",eligibleForBreadth:true};if(down)return {status:"CLASSIFIED",direction:"DOWN",eligibleForBreadth:true};if(flat)return {status:"CLASSIFIED",direction:"FLAT",eligibleForBreadth:true};return {status:"UNCLASSIFIED",direction:null,eligibleForBreadth:false};}

export function classifyR30GuidanceCandidateFromText(text){
  const base=classifyR29GuidanceCandidateFromText(text),filtered=(base?.signals??[]).filter(signal=>!suppressR29Signal(signal)),signals=mergeSignals(filtered,collectR30Supplemental(text)),aggregate=aggregateDirection(signals),counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0},metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of signals){if(signal.direction in counts)counts[signal.direction]++;for(const metric of signal.metrics??[]){if(metric in metricCounts)metricCounts[metric]++;}}
  return {...aggregate,counts,metricCounts,signals};
}
export function classifyR30GuidanceCandidateFromHtml(html){return classifyR30GuidanceCandidateFromText(htmlToVisibleText(html));}
