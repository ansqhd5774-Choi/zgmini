import {
  guidanceBreadthRaw,
  guidanceMidpoint,
  guidanceRevisionPair,
  median,
} from "./earnings-e1-r5-forward-r2.mjs";

export const E1_R5_GUIDANCE_R2_VERSION="E1-R5-GUIDANCE-R2";

export const E1_R5_GUIDANCE_R2_CONTRACT=Object.freeze({
  status:"SHADOW_ONLY",
  productionActivation:false,
  source:"SEC_EDGAR_8K_EARNINGS_RELEASE_TEXT",
  acceptedForms:Object.freeze(["8-K","8-K/A"]),
  acceptedMetric:"EPS",
  acceptedBases:Object.freeze(["GAAP","ADJUSTED"]),
  acceptedUnit:"USD/SHARE",
  comparison:"SAME_ISSUER_TARGET_PERIOD_METRIC_BASIS_UNIT",
  withdrawalPolicy:"MISSING_NOT_DOWNGRADE",
  noPriorPolicy:"MISSING_NOT_NEUTRAL",
  ambiguousPolicy:"MISSING",
  rawTextPersistence:"OUTSIDE_THIS_PURE_MODULE",
});

const text=value=>typeof value==="string"?value.trim():"";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const isoTime=value=>{
  const s=text(value);
  if(!s)return null;
  const ms=Date.parse(s);
  return Number.isFinite(ms)?new Date(ms).toISOString():null;
};

const ENTITIES=Object.freeze({
  "&nbsp;":" ","&#160;":" ","&amp;":"&","&quot;":"\"","&#34;":"\"","&apos;":"'","&#39;":"'","&lt;":"<","&gt;":">",
});

export function normalizeSecGuidanceText(value){
  let out=String(value??"");
  out=out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?\s*>/gi,"\n")
    .replace(/<\/(?:p|div|tr|li|h[1-6])\s*>/gi,"\n")
    .replace(/<\/(?:td|th)\s*>/gi," | ")
    .replace(/<[^>]+>/g," ");
  for(const [entity,replacement] of Object.entries(ENTITIES))out=out.split(entity).join(replacement);
  return out
    .replace(/\r/g,"\n")
    .replace(/[\t\f\v]+/g," ")
    .replace(/[ ]{2,}/g," ")
    .replace(/\s*\|\s*/g," | ")
    .replace(/\n[ ]+/g,"\n")
    .replace(/[ ]+\n/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

function quarterNumber(token){
  const value=text(token).toLowerCase();
  if(/^q[1-4]$/.test(value))return Number(value.slice(1));
  if(["first","1st"].includes(value))return 1;
  if(["second","2nd"].includes(value))return 2;
  if(["third","3rd"].includes(value))return 3;
  if(["fourth","4th"].includes(value))return 4;
  return null;
}

function fourDigitFy(shortYear){
  const value=Number(shortYear);
  return Number.isInteger(value)&&value>=0&&value<=99?2000+value:null;
}

export function normalizeGuidancePeriodKey(value){
  const s=text(value).replace(/\s+/g," ");
  if(!s)return null;
  let match=s.match(/\b(?:fiscal\s+)?(?:year|fy|full[- ]year)\s*(20\d{2})\b/i);
  if(match)return `FY${match[1]}`;
  match=s.match(/\b(?:fiscal|fy)\s*(20\d{2})\b/i);
  if(match)return `FY${match[1]}`;
  match=s.match(/\bfy\s*([0-9]{2})\b/i);
  if(match)return `FY${fourDigitFy(match[1])}`;
  match=s.match(/\b(20\d{2})\s+(?:fiscal\s+)?(?:year|fy|full[- ]year)\b/i);
  if(match)return `FY${match[1]}`;
  match=s.match(/\b(q[1-4]|first|second|third|fourth|1st|2nd|3rd|4th)[- ]*(?:fiscal\s+)?quarter(?:\s+of)?\s*(20\d{2})\b/i);
  if(match){
    const q=quarterNumber(match[1]);
    return q?`FY${match[2]}Q${q}`:null;
  }
  match=s.match(/\b(?:fiscal\s+)?(q[1-4])\s*(20\d{2})\b/i);
  if(match)return `FY${match[2]}Q${quarterNumber(match[1])}`;
  match=s.match(/\b(20\d{2})\s*(q[1-4])\b/i);
  if(match)return `FY${match[1]}Q${quarterNumber(match[2])}`;
  match=s.match(/\b(q[1-4])\s*fy\s*([0-9]{2})\b/i);
  if(match)return `FY${fourDigitFy(match[2])}Q${quarterNumber(match[1])}`;
  match=s.match(/\b(20\d{2})\s+(?:financial\s+)?(?:guidance|outlook)\b/i);
  if(match)return `FY${match[1]}`;
  return null;
}

function comparisonPeriodMention(value,index,end=index){
  const s=typeof value==="string"?value:String(value??"");
  const before=s.slice(Math.max(0,index-96),index);
  const after=s.slice(end,Math.min(s.length,end+40));
  if(/\b(?:over|versus|vs\.?|compared\s+(?:to|with))\s+(?:the\s+)?(?:prior\s+)?$/i.test(before))return true;
  if(/\bbased\s+on(?:\s+(?:the\s+)?following)?[\s\S]{0,48}$/i.test(before)&&/^\s*(?:figures?|results?|amounts?)\b/i.test(after))return true;
  return false;
}

function guidancePeriodMentions(value){
  const s=typeof value==="string"?value:String(value??"");
  if(!s.trim())return [];
  const specs=[
    {
      re:/\b(q[1-4]|first|second|third|fourth|1st|2nd|3rd|4th)[- ]*(?:fiscal\s+)?quarter(?:\s+(?:of\s+)?(?:fiscal\s+)?(?:year\s+)?)?\s*(20\d{2})\b/gi,
      key:match=>`FY${match[2]}Q${quarterNumber(match[1])}`,
      resolution:"EXPLICIT_QUARTER",
    },
    {
      re:/\b(?:fiscal\s+)?(q[1-4])\s*(20\d{2})\b/gi,
      key:match=>`FY${match[2]}Q${quarterNumber(match[1])}`,
      resolution:"EXPLICIT_QUARTER",
    },
    {
      re:/\b(20\d{2})\s*(q[1-4])\b/gi,
      key:match=>`FY${match[1]}Q${quarterNumber(match[2])}`,
      resolution:"EXPLICIT_QUARTER",
    },
    {
      re:/\b(q[1-4])\s*fy\s*([0-9]{2})\b/gi,
      key:match=>`FY${fourDigitFy(match[2])}Q${quarterNumber(match[1])}`,
      resolution:"EXPLICIT_QUARTER",
    },
    {
      re:/\b(?:fiscal\s+)?(?:year|fy|full[- ]year)\s*(20\d{2})\b/gi,
      key:match=>`FY${match[1]}`,
      resolution:"EXPLICIT_YEAR",
    },
    {
      re:/\b(?:fiscal|fy)\s*(20\d{2})\b/gi,
      key:match=>`FY${match[1]}`,
      resolution:"EXPLICIT_YEAR",
    },
    {
      re:/\bfy\s*([0-9]{2})\b/gi,
      key:match=>`FY${fourDigitFy(match[1])}`,
      resolution:"EXPLICIT_YEAR",
    },
    {
      re:/\b(20\d{2})\s+(?:fiscal\s+)?(?:year|fy|full[- ]year)\b/gi,
      key:match=>`FY${match[1]}`,
      resolution:"EXPLICIT_YEAR",
    },
    {
      re:/\b(20\d{2})\s+(?:financial\s+)?(?:guidance|outlook)\b/gi,
      key:match=>`FY${match[1]}`,
      resolution:"EXPLICIT_YEAR",
    },
  ];
  const out=[];
  for(const spec of specs){
    for(const match of s.matchAll(spec.re)){
      const index=match.index??0;
      const end=index+match[0].length;
      if(comparisonPeriodMention(s,index,end))continue;
      const key=spec.key(match);
      if(!key||/null/.test(key))continue;
      out.push({key,index,end,resolution:spec.resolution});
    }
  }

  const annual=out.filter(row=>/^FY20\d{2}$/.test(row.key));
  const quarterOnlySpecs=[
    {re:/\b(q[1-4])\b/gi,q:match=>quarterNumber(match[1])},
    {re:/\b(first|second|third|fourth|1st|2nd|3rd|4th)\s+(?:fiscal\s+)?quarter\b/gi,q:match=>quarterNumber(match[1])},
  ];
  for(const spec of quarterOnlySpecs){
    for(const match of s.matchAll(spec.re)){
      const index=match.index??0;
      const end=index+match[0].length;
      if(out.some(row=>/^FY20\d{2}Q[1-4]$/.test(row.key)&&row.index<=index&&row.end>=end))continue;
      if(comparisonPeriodMention(s,index,end))continue;
      const q=spec.q(match);
      if(!q)continue;
      const anchors=annual.map(row=>{
        const distance=row.end<=index?index-row.end:row.index>=end?row.index-end:0;
        return {...row,distance};
      }).filter(row=>row.distance<=280).sort((a,b)=>a.distance-b.distance);
      if(!anchors.length)continue;
      if(anchors.length>1&&anchors[0].key!==anchors[1].key&&anchors[1].distance-anchors[0].distance<36)continue;
      out.push({key:`${anchors[0].key}Q${q}`,index,end,resolution:"INFERRED_QUARTER"});
    }
  }

  const dedup=new Map();
  for(const row of out){
    const key=`${row.index}|${row.end}|${row.key}`;
    const prior=dedup.get(key);
    if(!prior||prior.resolution==="EXPLICIT_YEAR")dedup.set(key,row);
  }
  return [...dedup.values()];
}

function periodMentionAffinity(value,row){
  const s=typeof value==="string"?value:String(value??"");
  const before=s.slice(Math.max(0,row.index-120),row.index);
  const after=s.slice(row.end,Math.min(s.length,row.end+120));
  const around=`${before} ${after}`;
  let score=0;
  if(/\b(?:guidance|outlook|forecast|expects?|expected|anticipates?|anticipated|projects?|projected|raises?|raised|reaffirms?|reaffirmed|reiterates?|reiterated|maintains?|maintained|updates?|updated)\b/i.test(around))score+=2;
  if(/\b(?:results?|reported|actual|achieved|ended)\b/i.test(around))score-=2;
  if(/\b(?:guidance|outlook|forecast)\s+(?:for\s+)?$/i.test(before.slice(-56)))score+=2;
  if(/\bfor\s+$/i.test(before.slice(-16)))score+=1;
  return score;
}

function periodSpecificity(row){
  if(/^FY20\d{2}Q[1-4]$/.test(row?.key??""))return row.resolution==="INFERRED_QUARTER"?2:3;
  if(/^FY20\d{2}$/.test(row?.key??""))return 1;
  return 0;
}

function periodBoundaryPenalty(value,row,rangeStart,rangeEnd){
  let between="";
  let afterRange=false;
  if(row.end<=rangeStart){
    between=value.slice(row.end,rangeStart);
  }else if(row.index>=rangeEnd){
    between=value.slice(rangeEnd,row.index);
    afterRange=true;
  }
  if(!between)return 0;
  const paragraphBreaks=(between.match(/\n/g)??[]).length;
  const sentenceBreaks=(between.match(/[.!?](?:\s|$)/g)??[]).length;
  const tableBreaks=(between.match(/[|]/g)??[]).length;
  if(afterRange)return paragraphBreaks*180+sentenceBreaks*260+tableBreaks*60;
  return paragraphBreaks*24+sentenceBreaks*18;
}

function nearestGuidancePeriod(segment,range){
  const start=Math.max(0,range.index-300);
  const end=Math.min(segment.length,range.index+range.match.length+220);
  const local=segment.slice(start,end);
  const localRangeStart=range.index-start;
  const localRangeEnd=localRangeStart+range.match.length;
  const mentions=guidancePeriodMentions(local);
  if(!mentions.length)return null;
  const ranked=mentions.map(row=>{
    const distance=row.end<=localRangeStart?localRangeStart-row.end:row.index>=localRangeEnd?row.index-localRangeEnd:0;
    const affinity=periodMentionAffinity(local,row);
    const specificity=periodSpecificity(row);
    const boundaryPenalty=periodBoundaryPenalty(local,row,localRangeStart,localRangeEnd);
    const quality=affinity*100+specificity*60-(row.resolution==="INFERRED_QUARTER"?10:0)-distance-boundaryPenalty;
    return {...row,distance,affinity,specificity,boundaryPenalty,quality};
  }).sort((a,b)=>b.quality-a.quality||a.distance-b.distance||b.specificity-a.specificity||b.index-a.index);
  return ranked[0]??null;
}


export function classifyGuidanceBasis(value){
  const s=text(value);
  if(!s)return null;
  const adjusted=/\b(?:non[- ]?gaap|adjusted)\b/i.test(s);
  const withoutNonGaap=s.replace(/\bnon[- ]?gaap\b/gi," ");
  const gaap=/\bgaap\b/i.test(withoutNonGaap);
  if(adjusted&&gaap)return null;
  if(adjusted)return "ADJUSTED";
  if(gaap)return "GAAP";
  return null;
}

export function isGuidanceWithdrawal(value){
  const s=text(value);
  if(!s)return false;
  return /\b(?:withdraw(?:s|n|ing)?|suspend(?:s|ed|ing)?|no\s+longer\s+provid(?:e|es|ing)|discontinue(?:s|d|ing)?)\b[^.\n]{0,80}\b(?:guidance|outlook|forecast)\b/i.test(s)
    || /\b(?:guidance|outlook|forecast)\b[^.\n]{0,80}\b(?:withdrawn|suspended|discontinued)\b/i.test(s);
}

function forwardCue(value){
  const s=text(value);
  return /\b(?:guidance|outlook|forecast|expects?|expected|projects?|projected|anticipates?|raises?|raised|increases?|increased|lowers?|lowered|decreases?|decreased|narrows?|narrowed|reaffirms?|reaffirmed|reiterates?|reiterated|maintains?|maintained|updates?|updated)\b/i.test(s);
}

function epsCue(value){
  const s=text(value);
  return /\b(?:adjusted\s+|non[- ]?gaap\s+|gaap\s+)?(?:diluted\s+)?(?:eps|earnings\s+per\s+(?:diluted\s+)?share|net\s+income\s+per\s+common\s+share(?:,\s*diluted)?)\b/i.test(s);
}

function parseNumber(token){
  const s=text(token).replace(/[$,\s]/g,"");
  if(!s)return null;
  const paren=s.match(/^\((\d+(?:\.\d+)?)\)$/);
  if(paren)return -Number(paren[1]);
  const value=Number(s);
  return Number.isFinite(value)?value:null;
}

const RANGE_RE=/\$?\s*(\(?-?\d+(?:\.\d+)?\)?)\s*(?:to|through|–|—|-)\s*\$?\s*(\(?-?\d+(?:\.\d+)?\)?)/gi;
const NON_EPS_METRIC_RE=/\b(?:revenue|sales|gross\s+margin|operating\s+margin|operating\s+income|free\s+cash\s+flow|cash\s+flow|cap(?:ital)?\s+expenditures?|capex|tax\s+rate|ebitda|closed\s+sales|bookings?)\b/i;

function calendarYearRange(low,high){
  return Number.isInteger(low)&&Number.isInteger(high)&&low>=1900&&low<=2100&&high>=1900&&high<=2100;
}

function allRanges(value){
  const s=text(value);
  const out=[];
  for(const match of s.matchAll(RANGE_RE)){
    const low=parseNumber(match[1]);
    const high=parseNumber(match[2]);
    if(!finite(low)||!finite(high)||low>high)continue;
    if(calendarYearRange(low,high))continue;
    const tail=s.slice((match.index??0)+match[0].length,(match.index??0)+match[0].length+16);
    if(/^\s*(?:%|percent\b)/i.test(tail))continue;
    out.push({low,high,index:match.index??0,match:match[0]});
  }
  return out;
}

function retrospectiveGuidanceRange(value,range){
  const s=text(value);
  const start=Math.max(0,range.index-220);
  const before=s.slice(start,range.index);
  return /\b(?:achieved|reported|delivered|was|were|landed|came\s+in)\b[\s\S]{0,180}\b(?:compared\s+(?:to|with)|versus)\s+(?:the\s+)?guidance\s+range(?:\s+of)?\s*$/i.test(before)
    || /\b(?:compared\s+(?:to|with)|versus)\s+(?:the\s+)?guidance\s+range(?:\s+of)?\s*$/i.test(before);
}

function findEpsRanges(value){
  const s=text(value);
  if(!s)return [];
  const cueRe=/(?:adjusted\s+|non[- ]?gaap\s+|gaap\s+)?(?:diluted\s+)?(?:eps|earnings\s+per\s+(?:diluted\s+)?share|net\s+income\s+per\s+common\s+share(?:,\s*diluted)?)/gi;
  const cues=[...s.matchAll(cueRe)].map(cue=>({
    start:cue.index??0,
    end:(cue.index??0)+cue[0].length,
  }));
  const candidates=[];
  for(const range of allRanges(s)){
    if(retrospectiveGuidanceRange(s,range))continue;
    const rangeEnd=range.index+range.match.length;
    let linked=false;
    for(const cue of cues){
      const distance=range.index>=cue.end?range.index-cue.end:cue.start>=rangeEnd?cue.start-rangeEnd:0;
      if(distance>180)continue;
      const between=range.index>=cue.end?s.slice(cue.end,range.index):s.slice(rangeEnd,cue.start);
      if(NON_EPS_METRIC_RE.test(between))continue;
      linked=true;
      break;
    }
    if(linked)candidates.push(range);
  }
  const dedup=new Map();
  for(const range of candidates){
    const key=`${range.index}|${range.low}|${range.high}`;
    if(!dedup.has(key))dedup.set(key,range);
  }
  return [...dedup.values()].sort((a,b)=>a.index-b.index);
}

function candidateSegments(value){
  const normalized=normalizeSecGuidanceText(value);
  if(!normalized)return [];
  const paragraphs=normalized.split(/\n+/).map(text).filter(Boolean);
  const segments=[];
  for(let p=0;p<paragraphs.length;p++){
    const paragraph=paragraphs[p];
    segments.push(paragraph);
    for(let width=2;width<=4&&p+width<=paragraphs.length;width++){
      const combined=paragraphs.slice(p,p+width).join("\n");
      if(combined.length<=2500)segments.push(combined);
    }
    const sentences=paragraph.split(/(?<=[.!?])\s+(?=[A-Z0-9$])/).map(text).filter(Boolean);
    for(let i=0;i<sentences.length;i++){
      segments.push(sentences[i]);
      if(i+1<sentences.length)segments.push(`${sentences[i]} ${sentences[i+1]}`);
    }
  }
  return [...new Set(segments)].filter(segment=>segment.length<=2500);
}

function guidanceBase({cik=null,ticker=null,accession=null,form="8-K",filedAt=null,acceptedAt=null}={}){
  return {
    source:"SEC_EDGAR_8K_EARNINGS_RELEASE_TEXT",
    cik:text(cik)||null,
    ticker:text(ticker).toUpperCase()||null,
    accession:text(accession)||null,
    form:text(form).toUpperCase()||null,
    filedAt:isoTime(filedAt),
    acceptedAt:isoTime(acceptedAt),
    availableAt:isoTime(acceptedAt)||isoTime(filedAt),
    metric:"EPS",
    unit:"USD/SHARE",
  };
}

function validateGuidanceContext(segment,metadata){
  const base=guidanceBase(metadata);
  if(!E1_R5_GUIDANCE_R2_CONTRACT.acceptedForms.includes(base.form))return {...base,status:"MISSING",reason:"FORM_NOT_ACCEPTED"};
  if(!base.availableAt)return {...base,status:"MISSING",reason:"AVAILABLE_AT_MISSING"};
  if(isGuidanceWithdrawal(segment))return {...base,status:"MISSING",reason:"GUIDANCE_WITHDRAWN",withdrawn:true};
  if(!forwardCue(segment)||!epsCue(segment))return {...base,status:"MISSING",reason:"FORWARD_EPS_CONTEXT_MISSING"};
  const periodKey=normalizeGuidancePeriodKey(segment);
  if(!periodKey)return {...base,status:"MISSING",reason:"TARGET_PERIOD_UNRESOLVED"};
  const basis=classifyGuidanceBasis(segment);
  if(!basis)return {...base,status:"MISSING",reason:"BASIS_UNRESOLVED",periodKey};
  return {...base,status:"READY",reason:null,periodKey,basis,withdrawn:false};
}

function rangeSuffixGuidancePeriod(segment,range){
  const tail=segment.slice(range.index+range.match.length,Math.min(segment.length,range.index+range.match.length+72));
  let match=tail.match(/^\s*(?:\|\s*)*(?:for|in)\s+(?:the\s+)?(?:fiscal\s+)?(?:year\s+)?(fy\s*)?(20\d{2}|[0-9]{2})\b/i);
  if(match){
    const year=match[2].length===2?fourDigitFy(match[2]):Number(match[2]);
    if(year)return {key:`FY${year}`,resolution:"RANGE_SUFFIX",specificity:4,quality:1200};
  }
  match=tail.match(/^\s*(?:\|\s*)*(?:for|in)\s+(?:the\s+)?(q[1-4]|first|second|third|fourth|1st|2nd|3rd|4th)(?:\s+(?:fiscal\s+)?quarter)?\b/i);
  if(!match)return null;
  const q=quarterNumber(match[1]);
  if(!q)return null;
  const annual=[...new Set(guidancePeriodMentions(segment).filter(row=>/^FY20\d{2}$/.test(row.key)).map(row=>row.key))];
  if(annual.length!==1)return null;
  return {key:`${annual[0]}Q${q}`,resolution:"RANGE_SUFFIX",specificity:4,quality:1200};
}

function localGuidanceContext(segment,range,context){
  const start=Math.max(0,range.index-180);
  const end=Math.min(segment.length,range.index+range.match.length+100);
  const local=segment.slice(start,end);
  const resolved=rangeSuffixGuidancePeriod(segment,range)??nearestGuidancePeriod(segment,range);
  const fallback=resolved?null:normalizeGuidancePeriodKey(local);
  return {
    periodKey:resolved?.key??fallback??null,
    basis:classifyGuidanceBasis(local)??context.basis,
    _periodQuality:resolved?.quality??(fallback?-250:null),
    _periodSpecificity:resolved?.specificity??(fallback?0:null),
    _periodResolution:resolved?.resolution??(fallback?"LOCAL_FALLBACK":null),
  };
}

export function parseGuidanceSegment(value,metadata={}){
  const segment=text(value);
  const context=validateGuidanceContext(segment,metadata);
  if(context.status!=="READY")return context;
  const ranges=findEpsRanges(segment);
  if(!ranges.length)return {...context,status:"MISSING",reason:"EPS_RANGE_UNRESOLVED"};
  if(ranges.length!==1)return {...context,status:"MISSING",reason:"EPS_RANGE_AMBIGUOUS"};
  const range=ranges[0];
  const local=localGuidanceContext(segment,range,context);
  if(!local.periodKey)return {...context,status:"MISSING",reason:"TARGET_PERIOD_LOCAL_UNRESOLVED"};
  const ready={...context,...local,low:range.low,high:range.high};
  return {...ready,midpoint:guidanceMidpoint(ready)};
}

function parseGuidanceSegmentCandidates(value,metadata={}){
  const segment=text(value);
  const context=validateGuidanceContext(segment,metadata);
  if(context.status!=="READY")return [context];
  const ranges=findEpsRanges(segment);
  if(ranges.length<=1)return [parseGuidanceSegment(segment,metadata)];
  const ready=[];
  for(const range of ranges){
    const local=localGuidanceContext(segment,range,context);
    if(!local.periodKey)return [{...context,status:"MISSING",reason:"TARGET_PERIOD_LOCAL_UNRESOLVED"}];
    const row={...context,...local,low:range.low,high:range.high};
    ready.push({...row,midpoint:guidanceMidpoint(row)});
  }
  const periods=ready.map(row=>row.periodKey);
  if(new Set(periods).size!==ready.length)return [{...context,status:"MISSING",reason:"EPS_RANGE_AMBIGUOUS"}];
  return ready;
}

export function parseDirectGuidanceRevisionSegment(value,metadata={}){
  const segment=text(value);
  const context=validateGuidanceContext(segment,metadata);
  if(context.status!=="READY")return {...context,current:null,previous:null};
  const ranges=findEpsRanges(segment);
  if(ranges.length!==2)return {...context,status:"MISSING",reason:"DIRECT_PAIR_UNRESOLVED",current:null,previous:null};

  let currentRange=null;
  let previousRange=null;
  const lower=segment.toLowerCase();
  const firstEnd=ranges[0].index+ranges[0].match.length;
  const between=lower.slice(firstEnd,ranges[1].index);
  if(/\bfrom\b/.test(between)){
    currentRange=ranges[0];
    previousRange=ranges[1];
  }else{
    const header=lower.slice(0,Math.min(ranges[0].index,600));
    const priorIndex=Math.max(header.lastIndexOf("prior"),header.lastIndexOf("previous"));
    const currentIndex=Math.max(header.lastIndexOf("current"),header.lastIndexOf("updated"));
    if(priorIndex>=0&&currentIndex>priorIndex){
      previousRange=ranges[0];
      currentRange=ranges[1];
    }
  }
  if(!currentRange||!previousRange)return {...context,status:"MISSING",reason:"DIRECT_PAIR_ORDER_UNRESOLVED",current:null,previous:null};

  const local=localGuidanceContext(segment,currentRange,context);
  if(!local.periodKey)return {...context,status:"MISSING",reason:"TARGET_PERIOD_LOCAL_UNRESOLVED",current:null,previous:null};
  const common={
    source:context.source,cik:context.cik,ticker:context.ticker,accession:context.accession,
    form:context.form,filedAt:context.filedAt,acceptedAt:context.acceptedAt,availableAt:context.availableAt,
    metric:context.metric,unit:context.unit,periodKey:local.periodKey,basis:local.basis,withdrawn:false,
  };
  const current={...common,low:currentRange.low,high:currentRange.high};
  const previous={...common,low:previousRange.low,high:previousRange.high};
  const pair=guidanceRevisionPair(current,previous);
  if(pair.status!=="READY")return {...context,status:"MISSING",reason:pair.reason,current:null,previous:null};
  return {
    ...context,
    ...local,
    status:"READY",
    reason:null,
    comparisonSource:"SAME_FILING_RESTATED_PRIOR_CURRENT",
    current:{...current,midpoint:guidanceMidpoint(current)},
    previous:{...previous,midpoint:guidanceMidpoint(previous)},
    raw:pair.raw,
  };
}

function resolveCandidatePeriodConflicts(rows){
  const exact=new Map();
  for(const row of rows){
    const key=[row.periodKey,row.metric,row.basis,row.unit,row.low,row.high].join("|");
    const prior=exact.get(key);
    if(!prior||(row._periodQuality??-Infinity)>(prior._periodQuality??-Infinity))exact.set(key,row);
  }

  const byRange=new Map();
  for(const row of exact.values()){
    const key=[row.metric,row.basis,row.unit,row.low,row.high].join("|");
    if(!byRange.has(key))byRange.set(key,[]);
    byRange.get(key).push(row);
  }

  const resolved=[];
  for(const group of byRange.values()){
    if(group.length===1){
      resolved.push(group[0]);
      continue;
    }
    const ranked=[...group].sort((a,b)=>
      (b._periodSpecificity??0)-(a._periodSpecificity??0)
      ||(b._periodQuality??-Infinity)-(a._periodQuality??-Infinity)
      ||String(a.periodKey).localeCompare(String(b.periodKey))
    );
    const top=ranked[0];
    const second=ranked[1];
    const specificityLead=(top._periodSpecificity??0)>(second._periodSpecificity??0);
    const qualityLead=(top._periodQuality??-Infinity)-(second._periodQuality??-Infinity);
    if((specificityLead&&(top._periodQuality??-Infinity)>=(second._periodQuality??-Infinity)-80)||qualityLead>=120){
      resolved.push(top);
    }
  }
  return resolved;
}

function annualSectionGuidanceCandidates(value,metadata={}){
  const normalized=normalizeSecGuidanceText(value);
  if(!normalized)return [];
  const paragraphs=normalized.split(/\n+/).map(text).filter(Boolean);
  const out=[];
  let section=null;
  for(let index=0;index<paragraphs.length;index++){
    const paragraph=paragraphs[index];
    const cleanRow=paragraph.replace(/\s*\|\s*/g," ").replace(/\s+/g," ").trim();
    const headingKey=normalizeGuidancePeriodKey(cleanRow);
    const annualHeading=headingKey&&/^FY20\d{2}$/.test(headingKey)&&/^(?:fiscal\s+year|full[- ]year|fy)\b/i.test(cleanRow)&&cleanRow.length<=80;
    const quarterHeading=/^(?:(?:first|second|third|fourth|1st|2nd|3rd|4th)\s+(?:fiscal\s+)?quarter|q[1-4]\b)/i.test(cleanRow)&&cleanRow.length<=80;
    if(annualHeading){section={periodKey:headingKey,heading:cleanRow,remaining:14};continue;}
    if(quarterHeading||/^(?:forward-looking statements|about\s+)/i.test(cleanRow)){section=null;continue;}
    if(!section)continue;
    section.remaining-=1;
    if(section.remaining<0){section=null;continue;}
    if(!epsCue(paragraph)||!findEpsRanges(paragraph).length)continue;
    const rowPeriod=normalizeGuidancePeriodKey(cleanRow);
    if(rowPeriod&&rowPeriod!==section.periodKey)continue;
    const synthetic=`${section.heading} guidance\n${paragraph}`;
    for(const parsed of parseGuidanceSegmentCandidates(synthetic,metadata)){
      if(parsed.status!=="READY")continue;
      out.push({...parsed,periodKey:section.periodKey,_periodQuality:1600,_periodSpecificity:4,_periodResolution:"SECTION_HEADING",segmentIndex:`section:${index}`});
    }
  }
  return out;
}

function annualTableGuidanceCandidates(value,metadata={}){
  const normalized=normalizeSecGuidanceText(value);
  if(!normalized)return [];
  const base=guidanceBase(metadata);
  if(!E1_R5_GUIDANCE_R2_CONTRACT.acceptedForms.includes(base.form)||!base.availableAt)return [];
  const headingRe=/(?:^|[\n|])\s*((?:fiscal\s+year|full[- ]year)\s+(20\d{2}))\s*(?=[|\n]|$)/gi;
  const headings=[...normalized.matchAll(headingRe)].map(match=>({index:match.index??0,end:(match.index??0)+match[0].length,periodKey:`FY${match[2]}`}));
  const out=[];
  for(let h=0;h<headings.length;h++){
    const heading=headings[h];
    let end=Math.min(normalized.length,heading.index+2600,headings[h+1]?.index??Infinity);
    const tail=normalized.slice(heading.end,end);
    const stop=tail.search(/\n\s*(?:(?:first|second|third|fourth|1st|2nd|3rd|4th)\s+(?:fiscal\s+)?quarter|q[1-4]\b|forward-looking statements\b|about\s+[A-Z])/i);
    if(stop>=0)end=heading.end+stop;
    const section=normalized.slice(heading.index,end);
    const labels=[...section.matchAll(/\b(?:adjusted|adj\.)\s+eps(?:\s*\d+)?\s*\|/gi)];
    if(!labels.length)continue;
    for(const label of labels){
      const rowStart=label.index??0;
      const rowWindow=section.slice(rowStart,Math.min(section.length,rowStart+420));
      const ranges=allRanges(rowWindow);
      if(!ranges.length)continue;
      const versioned=/\boriginal\s+from\b/i.test(section)&&/\bas\s+of\b/i.test(section);
      if(!versioned&&ranges.length!==1)continue;
      const range=versioned?ranges[ranges.length-1]:ranges[0];
      const row={...base,status:"READY",reason:null,periodKey:heading.periodKey,basis:"ADJUSTED",withdrawn:false,low:range.low,high:range.high,_periodQuality:2200,_periodSpecificity:6,_periodResolution:versioned?"REVISION_TABLE_LATEST":"ANNUAL_TABLE_ROW"};
      out.push({...row,midpoint:guidanceMidpoint(row),segmentIndex:`annual-table:${heading.index}:${rowStart}`});
      break;
    }
  }
  return out;
}

function publicGuidanceCandidate(row){
  const {
    _periodQuality,
    _periodSpecificity,
    _periodResolution,
    ...publicRow
  }=row;
  return publicRow;
}

export function extractSecEpsGuidance(value,metadata={}){
  const segments=candidateSegments(value).filter(segment=>forwardCue(segment)||isGuidanceWithdrawal(segment));
  const parsed=segments.flatMap((segment,index)=>parseGuidanceSegmentCandidates(segment,metadata).map(row=>({...row,segmentIndex:index})));
  const sectionParsed=annualSectionGuidanceCandidates(value,metadata);
  const tableParsed=annualTableGuidanceCandidates(value,metadata);
  const ready=[...parsed,...sectionParsed,...tableParsed].filter(row=>row.status==="READY");
  const resolved=resolveCandidatePeriodConflicts(ready);
  return {
    status:resolved.length?"READY":"MISSING",
    candidates:resolved.map(publicGuidanceCandidate),
    rejected:parsed.filter(row=>row.status!=="READY").map(publicGuidanceCandidate),
    scannedSegments:segments.length,
  };
}

export function extractSecGuidanceRevisionPairs(value,metadata={}){
  const segments=candidateSegments(value).filter(segment=>forwardCue(segment)&&epsCue(segment));
  const parsed=segments.map((segment,index)=>({...parseDirectGuidanceRevisionSegment(segment,metadata),segmentIndex:index}));
  const ready=parsed.filter(row=>row.status==="READY");
  const dedup=new Map();
  for(const row of ready){
    const key=[
      row.periodKey,row.basis,row.current?.low,row.current?.high,row.previous?.low,row.previous?.high,
    ].join("|");
    if(!dedup.has(key))dedup.set(key,row);
  }
  return {
    status:dedup.size?"READY":"MISSING",
    pairs:[...dedup.values()],
    rejected:parsed.filter(row=>row.status!=="READY"),
    scannedSegments:segments.length,
  };
}

export function selectGuidanceAsOf(rows,{asOf,periodKey=null,basis=null}={}){
  const asOfMs=Date.parse(text(asOf));
  if(!Number.isFinite(asOfMs))return null;
  const candidates=(rows??[]).filter(row=>{
    if(row?.status!=="READY")return false;
    const at=Date.parse(text(row.availableAt));
    if(!Number.isFinite(at)||at>asOfMs)return false;
    if(periodKey&&row.periodKey!==periodKey)return false;
    if(basis&&row.basis!==basis)return false;
    return true;
  });
  candidates.sort((a,b)=>Date.parse(b.availableAt)-Date.parse(a.availableAt));
  return candidates[0]??null;
}

export function classifyGuidanceDirection(current,previous,{epsilon=1e-12}={}){
  const pair=guidanceRevisionPair(current,previous);
  if(pair.status!=="READY")return {status:"MISSING",reason:pair.reason,direction:null,raw:null};
  const raw=pair.raw;
  const direction=Math.abs(raw)<=epsilon?"SAME":raw>0?"UP":"DOWN";
  return {status:"READY",reason:null,direction,raw};
}

export function buildGuidanceShadowDiagnostic(issuerPairs){
  const pairs=Array.isArray(issuerPairs)?issuerPairs:[];
  const ready=[];
  const reasons={};
  const directions={up:0,same:0,down:0};
  for(const row of pairs){
    const result=classifyGuidanceDirection(row?.current,row?.previous);
    if(result.status!=="READY"){
      const reason=result.reason??"UNKNOWN";
      reasons[reason]=(reasons[reason]??0)+1;
      continue;
    }
    ready.push(result.raw);
    if(result.direction==="UP")directions.up++;
    else if(result.direction==="DOWN")directions.down++;
    else directions.same++;
  }
  const comparableCount=ready.length;
  const totalCount=pairs.length;
  return {
    status:comparableCount?"READY":"MISSING",
    s12aRaw:median(ready),
    s13Raw:guidanceBreadthRaw(directions),
    comparableCount,
    totalCount,
    coverage:totalCount?comparableCount/totalCount:null,
    directions,
    missingReasons:reasons,
  };
}
