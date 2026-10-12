import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";
import {classifyR28GuidanceCandidateFromText} from "./earnings-e1-r5-guidance-r28-candidate.mjs";

const clean=value=>String(value??"").trim();
const normalize=value=>String(value??"").replace(/[\t\r ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();

export const E1_R5_R29_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R29-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  changes:Object.freeze({
    bindCompanyWideDirectionalRevisionToNearbyCoreGuidance:true,
    recognizePeriodInsertedCoreMetricRevision:true,
    preserveR28FalseDownGuards:true,
  }),
  aggregation:Object.freeze({upPlusFlat:"UP",downPlusFlat:"DOWN",upPlusDown:"MIXED",withdrawEligibleForBreadth:false}),
});

const coreMetricPatterns=Object.freeze({
  EARNINGS:/\b(?:earnings per share|earnings per diluted share|adjusted eps|diluted eps|\beps\b|net income|adjusted ebitda|\bebitda\b|operating income|operating profit|adjusted operating income|adjusted operating profit)\b/i,
  REVENUE:/\b(?:revenue|revenues|net sales|organic sales|sales growth|sales)\b/i,
  MARGIN:/\b(?:operating margin|adjusted operating margin|ebitda margin|gross margin|profit margin|margin)\b/i,
  CASH_FLOW:/\b(?:free cash flow|operating cash flow|cash flow from operations|cash provided by operating activities|cash flow)\b/i,
});

const excludedScopePattern=/\b(?:capital expenditures?|capex|operating expenses?|opex|selling general and administrative|sg&a|tax rate|interest expense|share repurchases?|dividends?|production volumes?|production guidance|shipments?|headcount|bookings?|order rate|industry outlook|market outlook|policy outlook|commodity outlook|sales volume|revpar)\b/i;
const guidanceWordPattern=/\b(?:guidance|outlook|forecast)\b/i;
const futureContextPattern=/\b(?:guidance|outlook|forecast|expects?|expected|now expects?|range|prior|previous|previously|revised|current)\b/i;
const lowerEndRangePositionPattern=/\b(?:at|toward|towards|near)\s+(?:the\s+)?lower\s+end\s+of\b[^.!?;\n]{0,180}\b(?:guidance|outlook|forecast)\b/i;
const growthDecreaseLabelPattern=/\b(?:organic\s+)?(?:sales|revenue)?\s*growth\s*\/\s*\(\s*decrease\s*\)/i;

const genericPatterns=Object.freeze({
  UP:Object.freeze([
    /\b(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|lift(?:s|ed|ing)?|upgrad(?:e|es|ed|ing)|improv(?:e|es|ed|ing))\b[^.!?;\n]{0,100}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,70}\b(?:raised|increased|boosted|lifted|upgraded|improved)\b/gi,
  ]),
  DOWN:Object.freeze([
    /\b(?:lower(?:s|ed|ing)?|reduc(?:e|es|ed|ing)|cut(?:s|ting)?|decreas(?:e|es|ed|ing)|downgrad(?:e|es|ed|ing))\b[^.!?;\n]{0,100}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,70}\b(?:lowered|reduced|cut|decreased|downgraded)\b/gi,
  ]),
  FLAT:Object.freeze([
    /\b(?:reaffirm(?:s|ed|ing)?|reiterat(?:e|es|ed|ing)|maintain(?:s|ed|ing)?)\b[^.!?;\n]{0,100}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,70}\b(?:remains?|remain|is|was|has\s+been|have\s+been)?\s*(?:unchanged|reaffirmed|reiterated|maintained)\b/gi,
  ]),
});

function metricKinds(text){
  const t=String(text??"");const out=[];
  for(const [kind,pattern] of Object.entries(coreMetricPatterns)){if(pattern.test(t))out.push(kind);}
  if(/\bsales\s+volume\b/i.test(t)){const i=out.indexOf("REVENUE");if(i>=0&&!/\b(?:revenue|revenues|net sales|organic sales|sales growth)\b/i.test(t))out.splice(i,1);}
  return out;
}
function unique(values){return [...new Set(values)];}
function sentenceBounds(text,index,endIndex){
  const left=text.slice(0,index);const leftBreak=Math.max(left.lastIndexOf("."),left.lastIndexOf("!"),left.lastIndexOf("?"),left.lastIndexOf(";"),left.lastIndexOf("\n"));
  const right=text.slice(endIndex);const candidates=[right.indexOf("."),right.indexOf("!"),right.indexOf("?"),right.indexOf(";"),right.indexOf("\n")].filter(v=>v>=0);
  const rightBreak=candidates.length?endIndex+Math.min(...candidates)+1:Math.min(text.length,endIndex+240);
  return {start:Math.max(0,leftBreak+1),end:Math.min(text.length,rightBreak)};
}
function nearbyCoreKinds(normalized,index,endIndex){
  const start=Math.max(0,index-120),end=Math.min(normalized.length,endIndex+1800),window=normalized.slice(start,end),out=[];
  for(const [kind,pattern] of Object.entries(coreMetricPatterns)){
    const regex=new RegExp(pattern.source,"gi");
    for(const match of window.matchAll(regex)){
      const i=match.index??0;const around=window.slice(Math.max(0,i-180),Math.min(window.length,i+match[0].length+220));
      if(futureContextPattern.test(around)){out.push(kind);break;}
    }
  }
  return unique(out);
}
function companyWidePhrase(match){
  const t=clean(match);
  if(excludedScopePattern.test(t))return false;
  const before=t.split(/\b(?:guidance|outlook|forecast)\b/i)[0]??"";
  if(/\b(?:production|capital expenditures?|capex|bookings?|shipments?|sales volume|revpar|tax|interest)\b/i.test(before))return false;
  return true;
}
function directMetricKinds(match){
  if(excludedScopePattern.test(match)&&metricKinds(match).length===0)return [];
  return metricKinds(match);
}
function isR28FalseDownContext(value){
  const text=String(value??"");
  return lowerEndRangePositionPattern.test(text)||growthDecreaseLabelPattern.test(text);
}
function collectSupplemental(text){
  const normalized=normalize(text),signals=[],seen=new Set();
  for(const [direction,patterns] of Object.entries(genericPatterns)){
    for(const pattern of patterns){
      const regex=new RegExp(pattern.source,pattern.flags);
      for(const match of normalized.matchAll(regex)){
        const index=match.index??0,endIndex=index+match[0].length,bounds=sentenceBounds(normalized,index,endIndex),sentence=normalized.slice(bounds.start,bounds.end);
        if(direction==="DOWN"&&(isR28FalseDownContext(match[0])||isR28FalseDownContext(sentence)))continue;
        let metrics=directMetricKinds(match[0]);
        if(metrics.length===0){
          if(!companyWidePhrase(match[0]))continue;
          metrics=nearbyCoreKinds(normalized,index,endIndex);
        }
        if(metrics.length===0)continue;
        if(direction!=="FLAT"&&/\b(?:may|might|could|would|potentially)\b/i.test(normalized.slice(Math.max(0,index-48),index)))continue;
        const key=`${direction}|${index}|${metrics.join(",")}`;if(seen.has(key))continue;seen.add(key);
        signals.push({direction,index,metrics,match:clean(match[0]),context:clean(sentence),source:"R29_NEARBY_CORE_BINDING"});
      }
    }
  }

  const directPatterns=Object.freeze({
    UP:/\b(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|lift(?:s|ed|ing)?|upgrad(?:e|es|ed|ing)|improv(?:e|es|ed|ing))\b[^.!?;\n]{0,90}\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,90}\b(?:earnings per share|earnings per diluted share|adjusted eps|diluted eps|eps|net income|adjusted ebitda|ebitda|operating income|operating profit|revenue|revenues|net sales|organic sales|sales growth|operating margin|adjusted operating margin|gross margin|free cash flow|operating cash flow|cash flow)\b/gi,
    DOWN:/\b(?:lower(?:s|ed|ing)?|reduc(?:e|es|ed|ing)|cut(?:s|ting)?|decreas(?:e|es|ed|ing)|downgrad(?:e|es|ed|ing))\b[^.!?;\n]{0,90}\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,90}\b(?:earnings per share|earnings per diluted share|adjusted eps|diluted eps|eps|net income|adjusted ebitda|ebitda|operating income|operating profit|revenue|revenues|net sales|organic sales|sales growth|operating margin|adjusted operating margin|gross margin|free cash flow|operating cash flow|cash flow)\b/gi,
    FLAT:/\b(?:reaffirm(?:s|ed|ing)?|reiterat(?:e|es|ed|ing)|maintain(?:s|ed|ing)?)\b[^.!?;\n]{0,90}\b(?:guidance|outlook|forecast)\b[^.!?;\n]{0,90}\b(?:earnings per share|earnings per diluted share|adjusted eps|diluted eps|eps|net income|adjusted ebitda|ebitda|operating income|operating profit|revenue|revenues|net sales|organic sales|sales growth|operating margin|adjusted operating margin|gross margin|free cash flow|operating cash flow|cash flow)\b/gi,
  });
  for(const [direction,pattern] of Object.entries(directPatterns)){
    const regex=new RegExp(pattern.source,pattern.flags);
    for(const match of normalized.matchAll(regex)){
      if(direction==="DOWN"&&isR28FalseDownContext(match[0]))continue;
      if(excludedScopePattern.test(match[0]))continue;
      const index=match.index??0,endIndex=index+match[0].length,metrics=metricKinds(match[0]);if(metrics.length===0)continue;
      const bounds=sentenceBounds(normalized,index,endIndex),key=`${direction}|${index}|${metrics.join(",")}`;if(seen.has(key))continue;seen.add(key);
      signals.push({direction,index,metrics,match:clean(match[0]),context:clean(normalized.slice(bounds.start,bounds.end)),source:"R29_PERIOD_INSERTED_DIRECT"});
    }
  }
  signals.sort((a,b)=>a.index-b.index||a.direction.localeCompare(b.direction));return signals;
}
function mergeSignals(baseSignals,supplemental){
  const rows=[],seen=new Set();
  for(const signal of [...baseSignals,...supplemental].sort((a,b)=>(a.index??0)-(b.index??0)||String(a.direction).localeCompare(String(b.direction)))){
    const key=`${signal.direction}|${signal.index??0}|${(signal.metrics??[]).slice().sort().join(",")}`;if(seen.has(key))continue;seen.add(key);rows.push({...signal,metrics:unique(signal.metrics??[])});
  }
  return rows;
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

export function classifyR29GuidanceCandidateFromText(text){
  const base=classifyR28GuidanceCandidateFromText(text),signals=mergeSignals(base?.signals??[],collectSupplemental(text)),aggregate=aggregateDirection(signals),counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0},metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of signals){if(signal.direction in counts)counts[signal.direction]++;for(const metric of signal.metrics??[]){if(metric in metricCounts)metricCounts[metric]++;}}
  return {...aggregate,counts,metricCounts,signals};
}

export function classifyR29GuidanceCandidateFromHtml(html){return classifyR29GuidanceCandidateFromText(htmlToVisibleText(html));}