import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";

const clean=value=>String(value??"").trim();
const normalize=value=>String(value??"").replace(/[\t\r ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();

export const E1_R5_R22_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R22-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  aggregation:Object.freeze({upPlusFlat:"UP",downPlusFlat:"DOWN",upPlusDown:"MIXED",withdrawEligibleForBreadth:false}),
});

const coreMetricPatterns=Object.freeze({
  EARNINGS:/\b(?:earnings per share|adjusted eps|diluted eps|\beps\b|net income|adjusted ebitda|\bebitda\b|operating income|operating profit|adjusted operating income|adjusted operating profit)\b/i,
  REVENUE:/\b(?:revenue|revenues|net sales|organic sales|sales growth|sales)\b/i,
  MARGIN:/\b(?:operating margin|adjusted operating margin|ebitda margin|gross margin|profit margin|margin)\b/i,
  CASH_FLOW:/\b(?:free cash flow|operating cash flow|cash flow from operations|cash provided by operating activities|cash flow)\b/i,
});

const excludedMetricPattern=/\b(?:capital expenditures?|capex|operating expenses?|opex|selling general and administrative|sg&a|tax rate|interest expense|share repurchases?|dividends?|production volumes?|production|shipments?|headcount|bookings?|order rate|industry outlook|market outlook|policy outlook|commodity outlook|sales volume)\b/i;
const externalGuidancePattern=new RegExp(String.raw`(?:\b(?:ftc|fda|sec|fasb|regulatory|regulator|government|agency|financial accounting standards board|accounting standards codification)\b[^.!?;\n]{0,80}\bguidance\b|\bguidance\b[^.!?;\n]{0,80}\b(?:ftc|fda|sec|fasb|regulatory|regulator|government|agency|financial accounting standards board|accounting standards codification)\b)`,"i");
const historicalMetricSubjectPattern=/\b(?:revenue|revenues|sales|net sales|earnings|eps|net income|ebitda|operating income|operating profit|margin|cash flow|capital expenditures?|capex)\s*$/i;
const nominalPriorGuidanceChangePattern=/\b(?:increase|decrease)\s+from\s+(?:prior|previous)\s+(?:guidance|outlook|forecast)\b/i;

const signalPatterns=Object.freeze({
  WITHDRAW:Object.freeze([
    /\b(?:withdraw(?:s|n|ing)?|suspend(?:s|ed|ing)?|discontinue(?:s|d|ing)?|rescind(?:s|ed|ing)?)\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\bwill\s+not\s+(?:be\s+)?(?:provide|providing|issue|issuing)\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\bno\s+longer\s+(?:provide|provides|providing|issue|issues|issuing)\b[^.!?;\n]{0,100}\b(?:guidance|outlook|forecast)\b/gi,
  ]),
  UP:Object.freeze([
    /\b(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|lift(?:s|ed|ing)?|upgrad(?:e|es|ed|ing)|improv(?:e|es|ed|ing))\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,50}\b(?:is|was|has\s+been|have\s+been|now)?\s*(?:raised|increased|boosted|lifted|upgraded|improved)\b/gi,
  ]),
  DOWN:Object.freeze([
    /\b(?:lower(?:s|ed|ing)?|reduc(?:e|es|ed|ing)|cut(?:s|ting)?|decreas(?:e|es|ed|ing)|downgrad(?:e|es|ed|ing))\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,50}\b(?:is|was|has\s+been|have\s+been|now)?\s*(?:lowered|reduced|cut|decreased|downgraded)\b/gi,
  ]),
  FLAT:Object.freeze([
    /\b(?:reaffirm(?:s|ed|ing)?|reiterat(?:e|es|ed|ing)|maintain(?:s|ed|ing)?)\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,50}\b(?:is|was|remains?|remain|has\s+been|have\s+been)?\s*(?:unchanged|reaffirmed|reiterated|maintained)\b/gi,
    /\b(?:no\s+change\s+to|no\s+impact\s+to|unchanged)\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
  ]),
});

function sentenceBounds(text,index,endIndex){
  const left=text.slice(0,index);const leftBreak=Math.max(left.lastIndexOf("."),left.lastIndexOf("!"),left.lastIndexOf("?"),left.lastIndexOf(";"),left.lastIndexOf("\n"));
  const right=text.slice(endIndex);const candidates=[right.indexOf("."),right.indexOf("!"),right.indexOf("?"),right.indexOf(";"),right.indexOf("\n")].filter(v=>v>=0);
  const rightBreak=candidates.length?endIndex+Math.min(...candidates)+1:Math.min(text.length,endIndex+180);
  return {start:Math.max(0,leftBreak+1),end:Math.min(text.length,rightBreak)};
}
function metricKinds(text){
  const t=String(text??"");const out=[];
  for(const [kind,pattern] of Object.entries(coreMetricPatterns)){if(pattern.test(t))out.push(kind);}
  if(/\bsales\s+volume\b/i.test(t)){const i=out.indexOf("REVENUE");if(i>=0&&!/\b(?:revenue|revenues|net sales|organic sales|sales growth)\b/i.test(t))out.splice(i,1);}
  return out;
}
function unique(values){return [...new Set(values)];}
function hypotheticalPrefix(text,index){const prefix=text.slice(Math.max(0,index-48),index).toLowerCase();return /\b(?:may|might|could|would|potentially)\b/.test(prefix);}
function historicalMetricSubject(text,index){const prefix=text.slice(Math.max(0,index-48),index);return historicalMetricSubjectPattern.test(prefix);}

function boundMetrics({direction,patternIndex,normalized,index,endIndex,match,sentenceStart,sentenceEnd}){
  if(direction==="WITHDRAW")return [];
  const direct=metricKinds(match);
  if(excludedMetricPattern.test(match)&&direct.length===0)return [];
  if(patternIndex===0){const suffix=normalized.slice(endIndex,Math.min(sentenceEnd,endIndex+90));return unique([...direct,...metricKinds(suffix)]);}
  if(patternIndex===1){const prefix=normalized.slice(Math.max(sentenceStart,index-90),index);return unique([...metricKinds(prefix),...direct]);}
  const sentence=normalized.slice(sentenceStart,sentenceEnd);return unique([...direct,...metricKinds(sentence)]);
}

function collectSignals(text){
  const normalized=normalize(text);const signals=[];const seen=new Set();
  for(const [direction,patterns] of Object.entries(signalPatterns)){
    for(let patternIndex=0;patternIndex<patterns.length;patternIndex++){
      const regex=new RegExp(patterns[patternIndex].source,patterns[patternIndex].flags);
      for(const match of normalized.matchAll(regex)){
        const index=match.index??0;const endIndex=index+match[0].length;
        if(direction!=="WITHDRAW"&&hypotheticalPrefix(normalized,index))continue;
        if((direction==="UP"||direction==="DOWN")&&patternIndex===0&&historicalMetricSubject(normalized,index))continue;
        if((direction==="UP"||direction==="DOWN")&&patternIndex===0&&nominalPriorGuidanceChangePattern.test(match[0]))continue;
        const bounds=sentenceBounds(normalized,index,endIndex);const sentence=normalized.slice(bounds.start,bounds.end);
        if(externalGuidancePattern.test(sentence))continue;
        const metrics=boundMetrics({direction,patternIndex,normalized,index,endIndex,match:match[0],sentenceStart:bounds.start,sentenceEnd:bounds.end});
        if(direction!=="WITHDRAW"&&metrics.length===0)continue;
        const key=`${direction}|${index}|${metrics.join(",")}`;if(seen.has(key))continue;seen.add(key);
        signals.push({direction,index,metrics,match:clean(match[0]),context:clean(sentence)});
      }
    }
  }
  signals.sort((a,b)=>a.index-b.index||a.direction.localeCompare(b.direction));return signals;
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
export function classifyR22GuidanceCandidateFromText(text){
  const signals=collectSignals(text);const aggregate=aggregateDirection(signals);const counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0};const metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of signals){counts[signal.direction]++;for(const metric of signal.metrics){if(metric in metricCounts)metricCounts[metric]++;}}
  return {...aggregate,counts,metricCounts,signals};
}
export function classifyR22GuidanceCandidateFromHtml(html){return classifyR22GuidanceCandidateFromText(htmlToVisibleText(html));}
