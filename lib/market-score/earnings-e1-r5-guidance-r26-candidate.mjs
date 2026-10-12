import {htmlToVisibleText} from "./earnings-e1-r5-guidance-r17.mjs";
import {classifyR24GuidanceCandidateFromText} from "./earnings-e1-r5-guidance-r24-candidate.mjs";

const clean=value=>String(value??"").trim();
const normalize=value=>String(value??"").replace(/[\t\r ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();

export const E1_R5_R26_GUIDANCE_CANDIDATE_POLICY=Object.freeze({
  version:"E1-R5-R26-GUIDANCE-CANDIDATE-R1",
  researchOnly:true,
  productionActivation:false,
  formulaChanged:false,
  scoringGateChanged:false,
  networkCalls:0,
  dbWrites:0,
  rawTextPublication:false,
  changes:Object.freeze({
    suppressAccountingDiscontinuedOperations:true,
    recognizeStandaloneEarningsGuidance:true,
  }),
  aggregation:Object.freeze({upPlusFlat:"UP",downPlusFlat:"DOWN",upPlusDown:"MIXED",withdrawEligibleForBreadth:false}),
});

const accountingAuthorityPattern=/\b(?:ASC\s*\d{2,4}|accounting standards codification|financial accounting standards board|FASB|accounting guidance|U\.?S\.?\s+GAAP)\b/i;
const discontinuedOperationsPattern=/\bdiscontinued\s+operations?\b/i;

const supplementalEarningsPatterns=Object.freeze({
  UP:/\b(?:rais(?:e|es|ed|ing)|increas(?:e|es|ed|ing)|boost(?:s|ed|ing)?|lift(?:s|ed|ing)?|upgrad(?:e|es|ed|ing)|improv(?:e|es|ed|ing))\b[^.!?;\n]{0,100}\b(?:earnings\s+(?:guidance|outlook|forecast)|(?:guidance|outlook|forecast)\s+(?:for\s+)?earnings)\b/gi,
  DOWN:/\b(?:lower(?:s|ed|ing)?|reduc(?:e|es|ed|ing)|cut(?:s|ting)?|decreas(?:e|es|ed|ing)|downgrad(?:e|es|ed|ing))\b[^.!?;\n]{0,100}\b(?:earnings\s+(?:guidance|outlook|forecast)|(?:guidance|outlook|forecast)\s+(?:for\s+)?earnings)\b/gi,
  FLAT:/\b(?:reaffirm(?:s|ed|ing)?|reiterat(?:e|es|ed|ing)|maintain(?:s|ed|ing)?)\b[^.!?;\n]{0,100}\b(?:earnings\s+(?:guidance|outlook|forecast)|(?:guidance|outlook|forecast)\s+(?:for\s+)?earnings)\b/gi,
});

function sentenceBounds(text,index,endIndex){
  const left=text.slice(0,index);const leftBreak=Math.max(left.lastIndexOf("."),left.lastIndexOf("!"),left.lastIndexOf("?"),left.lastIndexOf(";"),left.lastIndexOf("\n"));
  const right=text.slice(endIndex);const candidates=[right.indexOf("."),right.indexOf("!"),right.indexOf("?"),right.indexOf(";"),right.indexOf("\n")].filter(v=>v>=0);
  const rightBreak=candidates.length?endIndex+Math.min(...candidates)+1:Math.min(text.length,endIndex+180);
  return {start:Math.max(0,leftBreak+1),end:Math.min(text.length,rightBreak)};
}

function isAccountingWithdrawalFalsePositive(signal){
  if(signal?.direction!=="WITHDRAW")return false;
  const match=clean(signal?.match);const context=clean(signal?.context);
  if(discontinuedOperationsPattern.test(match))return true;
  return discontinuedOperationsPattern.test(context)&&accountingAuthorityPattern.test(context);
}

function supplementalEarningsSignals(text){
  const normalized=normalize(text);const out=[];
  for(const [direction,pattern] of Object.entries(supplementalEarningsPatterns)){
    const regex=new RegExp(pattern.source,pattern.flags);
    for(const match of normalized.matchAll(regex)){
      const index=match.index??0;const endIndex=index+match[0].length;const bounds=sentenceBounds(normalized,index,endIndex);const context=clean(normalized.slice(bounds.start,bounds.end));
      if(accountingAuthorityPattern.test(context)&&/\baccounting\b/i.test(context))continue;
      out.push({direction,index,metrics:["EARNINGS"],match:clean(match[0]),context});
    }
  }
  return out;
}

function mergeSignals(baseSignals,supplemental){
  const rows=[];const byKey=new Map();
  for(const signal of [...baseSignals,...supplemental].sort((a,b)=>(a.index??0)-(b.index??0)||String(a.direction).localeCompare(String(b.direction)))){
    const key=`${signal.direction}|${signal.index??0}`;const existing=byKey.get(key);
    if(existing){existing.metrics=[...new Set([...(existing.metrics??[]),...(signal.metrics??[])])];if(!existing.context&&signal.context)existing.context=signal.context;continue;}
    const copy={...signal,metrics:[...new Set(signal.metrics??[])]};byKey.set(key,copy);rows.push(copy);
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

export function classifyR26GuidanceCandidateFromText(text){
  const base=classifyR24GuidanceCandidateFromText(text);
  const retained=(base?.signals??[]).filter(signal=>!isAccountingWithdrawalFalsePositive(signal));
  const signals=mergeSignals(retained,supplementalEarningsSignals(text));
  const aggregate=aggregateDirection(signals);const counts={UP:0,DOWN:0,FLAT:0,WITHDRAW:0};const metricCounts={EARNINGS:0,REVENUE:0,MARGIN:0,CASH_FLOW:0};
  for(const signal of signals){if(signal.direction in counts)counts[signal.direction]++;for(const metric of signal.metrics??[]){if(metric in metricCounts)metricCounts[metric]++;}}
  return {...aggregate,counts,metricCounts,signals};
}

export function classifyR26GuidanceCandidateFromHtml(html){return classifyR26GuidanceCandidateFromText(htmlToVisibleText(html));}
