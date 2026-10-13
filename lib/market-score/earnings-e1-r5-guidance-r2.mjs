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

function comparisonPeriodMention(value,index){
  const s=text(value);
  const before=s.slice(Math.max(0,index-48),index);
  return /\b(?:over|versus|vs\.?|compared\s+(?:to|with))\s+(?:the\s+)?(?:prior\s+)?$/i.test(before);
}

function guidancePeriodMentions(value){
  const s=text(value).replace(/\s+/g," ");
  if(!s)return [];
  const specs=[
    {
      re:/\b(q[1-4]|first|second|third|fourth|1st|2nd|3rd|4th)[- ]*(?:fiscal\s+)?quarter(?:\s+(?:of\s+)?(?:fiscal\s+)?(?:year\s+)?)?\s*(20\d{2})\b/gi,
      key:match=>`FY${match[2]}Q${quarterNumber(match[1])}`,
    },
    {
      re:/\b(?:fiscal\s+)?(q[1-4])\s*(20\d{2})\b/gi,
      key:match=>`FY${match[2]}Q${quarterNumber(match[1])}`,
    },
    {
      re:/\b(20\d{2})\s*(q[1-4])\b/gi,
      key:match=>`FY${match[1]}Q${quarterNumber(match[2])}`,
    },
    {
      re:/\b(q[1-4])\s*fy\s*([0-9]{2})\b/gi,
      key:match=>`FY${fourDigitFy(match[2])}Q${quarterNumber(match[1])}`,
    },
    {
      re:/\b(?:fiscal\s+)?(?:year|fy|full[- ]year)\s*(20\d{2})\b/gi,
      key:match=>`FY${match[1]}`,
    },
    {
      re:/\b(?:fiscal|fy)\s*(20\d{2})\b/gi,
      key:match=>`FY${match[1]}`,
    },
    {
      re:/\bfy\s*([0-9]{2})\b/gi,
      key:match=>`FY${fourDigitFy(match[1])}`,
    },
    {
      re:/\b(20\d{2})\s+(?:fiscal\s+)?(?:year|fy|full[- ]year)\b/gi,
      key:match=>`FY${match[1]}`,
    },
    {
      re:/\b(20\d{2})\s+(?:financial\s+)?(?:guidance|outlook)\b/gi,
      key:match=>`FY${match[1]}`,
    },
  ];
  const out=[];
  for(const spec of specs){
    for(const match of s.matchAll(spec.re)){
      const index=match.index??0;
      if(comparisonPeriodMention(s,index))continue;
      const key=spec.key(match);
      if(!key||/null/.test(key))continue;
      out.push({key,index,end:index+match[0].length});
    }
  }
  const dedup=new Map();
  for(const row of out){
    const key=`${row.index}|${row.end}|${row.key}`;
    if(!dedup.has(key))dedup.set(key,row);
  }
  return [...dedup.values()];
}

function nearestGuidancePeriodKey(segment,range){
  const start=Math.max(0,range.index-260);
  const end=Math.min(segment.length,range.index+range.match.length+160);
  const local=segment.slice(start,end);
  const localRangeStart=range.index-start;
  const localRangeEnd=localRangeStart+range.match.length;
  const mentions=guidancePeriodMentions(local);
  if(!mentions.length)return null;
  mentions.sort((a,b)=>{
    const da=a.end<=localRangeStart?localRangeStart-a.end:a.index>=localRangeEnd?a.index-localRangeEnd:0;
    const db=b.end<=localRangeStart?localRangeStart-b.end:b.index>=localRangeEnd?b.index-localRangeEnd:0;
    if(da!==db)return da-db;
    const aside=a.end<=localRangeStart?0:1;
    const bside=b.end<=localRangeStart?0:1;
    if(aside!==bside)return aside-bside;
    return b.index-a.index;
  });
  return mentions[0]?.key??null;
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
      const combined=paragraphs.slice(p,p+width).join(" ");
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

function localGuidanceContext(segment,range,context){
  const start=Math.max(0,range.index-180);
  const end=Math.min(segment.length,range.index+range.match.length+100);
  const local=segment.slice(start,end);
  return {
    periodKey:nearestGuidancePeriodKey(segment,range)??normalizeGuidancePeriodKey(local)??context.periodKey,
    basis:classifyGuidanceBasis(local)??context.basis,
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
  const ready={...context,...local,low:range.low,high:range.high};
  return {...ready,midpoint:guidanceMidpoint(ready)};
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

export function extractSecEpsGuidance(value,metadata={}){
  const segments=candidateSegments(value).filter(segment=>forwardCue(segment)||isGuidanceWithdrawal(segment));
  const parsed=segments.map((segment,index)=>({...parseGuidanceSegment(segment,metadata),segmentIndex:index}));
  const ready=parsed.filter(row=>row.status==="READY");
  const dedup=new Map();
  for(const row of ready){
    const key=[row.periodKey,row.metric,row.basis,row.unit,row.low,row.high].join("|");
    if(!dedup.has(key))dedup.set(key,row);
  }
  return {
    status:dedup.size?"READY":"MISSING",
    candidates:[...dedup.values()],
    rejected:parsed.filter(row=>row.status!=="READY"),
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
