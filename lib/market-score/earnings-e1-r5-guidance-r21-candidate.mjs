import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";

const clean=value=>String(value??"").trim();
const normalize=value=>String(value??"").replace(/[\t\r ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();

export const E1_R5_R21_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R21-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  aggregation:Object.freeze({
    upPlusFlat:"UP",
    downPlusFlat:"DOWN",
    upPlusDown:"MIXED",
    withdrawEligibleForBreadth:false,
  }),
});

const coreMetricPatterns=Object.freeze({
  EARNINGS:/\b(?:earnings per share|adjusted eps|diluted eps|\beps\b|net income|adjusted ebitda|\bebitda\b|operating income|operating profit|adjusted operating income|adjusted operating profit)\b/i,
  REVENUE:/\b(?:revenue|revenues|net sales|organic sales|sales growth|sales)\b/i,
  MARGIN:/\b(?:operating margin|adjusted operating margin|ebitda margin|gross margin|profit margin|margin)\b/i,
  CASH_FLOW:/\b(?:free cash flow|operating cash flow|cash flow from operations|cash provided by operating activities|cash flow)\b/i,
});

const excludedMetricPattern=/\b(?:capital expenditures?|capex|operating expenses?|opex|selling general and administrative|sg&a|tax rate|interest expense|share repurchases?|dividends?|production volumes?|production|shipments?|headcount|bookings?|order rate|industry outlook|market outlook|policy outlook|commodity outlook)\b/i;
const regulatoryGuidancePattern=/\b(?:ftc|fda|sec|fasb|gaap|regulatory|regulator|government|agency|accounting)\b[^.!?;\n]{0,50}\bguidance\b/i;
const historicalMetricSubjectPattern=/\b(?:revenue|revenues|sales|net sales|earnings|eps|net income|ebitda|operating income|operating profit|margin|cash flow|capital expenditures?|capex)\s*$/i;

const signalPatterns=Object.freeze({
  WITHDRAW:Object.freeze([
    /\b(?:withdraw(?:s|n|ing)?|suspend(?:s|ed|ing)?|discontinue(?:s|d|ing)?|rescind(?:s|ed|ing)?)\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:will|does|did|would)\s+not\s+(?:be\s+)?(?:provide|provides|providing|issue|issues|issuing)\b[^.!?;\n]{0,100}\b(?:guidance|outlook|forecast)\b/gi,
    /\bno\s+longer\s+(?:provide|provides|providing|issue|issues|issuing)\b[^.!?;\n]{0,100}\b(?:guidance|outlook|forecast)\b/gi,
  ]),
  UP:Object.freeze([
    /\b(?:raise(?:s|d|ing)?|increase(?:s|d|ing)?|boost(?:s|ed|ing)?|lift(?:s|ed|ing)?|upgrade(?:s|d|ing)?|improve(?:s|d|ing)?)\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,50}\b(?:is|was|has\s+been|have\s+been|now)?\s*(?:raised|increased|boosted|lifted|upgraded|improved)\b/gi,
  ]),
  DOWN:Object.freeze([
    /\b(?:lower(?:s|ed|ing)?|reduce(?:s|d|ing)?|cut(?:s|ting)?|decrease(?:s|d|ing)?|downgrade(?:s|d|ing)?)\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,50}\b(?:is|was|has\s+been|have\s+been|now)?\s*(?:lowered|reduced|cut|decreased|downgraded)\b/gi,
  ]),
  FLAT:Object.freeze([
    /\b(?:reaffirm(?:s|ed|ing)?|reiterate(?:s|d|ing)?|maintain(?:s|ed|ing)?)\b[^.!?;\n]{0,120}\b(?:guidance|outlook|forecast)\b/gi,
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
  const out=[];for(const [kind,pattern] of Object.entries(coreMetricPatterns)){if(pattern.test(text))out.push(kind);}return out;
}

function hypotheticalPrefix(text,index){
  const prefix=text.slice(Math.max(0,index-48),index).toLowerCase();
  return /\b(?:may|might|could|would|potentially)\b/.test(prefix);
}

function historicalMetricSubject(text,index){
  const prefix=text.slice(Math.max(0,index-48),index);
  return historicalMetricSubjectPattern.test(prefix);
}

function collectSignals(text){
  const normalized=normalize(text);const signals=[];const seen=new Set();
  for(const [direction,patterns] of Object.entries(signalPatterns)){
    for(let patternIndex=0;patternIndex<patterns.length;patternIndex++){
      const pattern=patterns[patternIndex];const regex=new RegExp(pattern.source,pattern.flags);
      for(const match of normalized.matchAll(regex)){
        const index=match.index??0;const endIndex=index+match[0].length;
        if(direction!=="WITHDRAW"&&hypotheticalPrefix(normalized,index))continue;
        if((direction==="UP"||direction==="DOWN")&&patternIndex===0&&historicalMetricSubject(normalized,index))continue;
        const bounds=sentenceBounds(normalized,index,endIndex);const sentence=normalized.slice(bounds.start,bounds.end);
        if(regulatoryGuidancePattern.test(sentence))continue;
        const directMetrics=metricKinds(match[0]);
        if(direction!=="WITHDRAW"&&excludedMetricPattern.test(match[0])&&directMetrics.length===0)continue;
        const expandedMetrics=directMetrics.length?directMetrics:metricKinds(sentence);
        if(direction!=="WITHDRAW"&&expandedMetrics.length===0)continue;
        const key=`${direction}|${index}|${expandedMetrics.join(",")}`;if(seen.has(key))continue;seen.add(key);
        signals.push({direction,index,metrics:expandedMetrics,match:clean(match[0]),context:clean(sentence)});
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

export function classifyR21GuidanceCandidateFromText(text){
  const signals=collectSignals(text);const aggregate=aggregateDirection(signals);
  const counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0};const metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of signals){counts[signal.direction]++;for(const metric of signal.metrics){if(metric in metricCounts)metricCounts[metric]++;}}
  return {...aggregate,counts,metricCounts,signals};
}

export function classifyR21GuidanceCandidateFromHtml(html){return classifyR21GuidanceCandidateFromText(htmlToVisibleText(html));}
