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
    .replace(/<\/p\s*>/gi,"\n")
    .replace(/<\/div\s*>/gi,"\n")
    .replace(/<[^>]+>/g," ");
  for(const [entity,replacement] of Object.entries(ENTITIES))out=out.split(entity).join(replacement);
  return out
    .replace(/\r/g,"\n")
    .replace(/[\t\f\v]+/g," ")
    .replace(/[ ]{2,}/g," ")
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

export function normalizeGuidancePeriodKey(value){
  const s=text(value).replace(/\s+/g," ");
  if(!s)return null;
  let match=s.match(/\b(?:fiscal\s+)?(?:year|fy|full[- ]year)\s*(20\d{2})\b/i);
  if(match)return `FY${match[1]}`;
  match=s.match(/\b(20\d{2})\s+(?:fiscal\s+)?(?:year|fy|full[- ]year)\b/i);
  if(match)return `FY${match[1]}`;
  match=s.match(/\b(q[1-4]|first|second|third|fourth|1st|2nd|3rd|4th)\s*(?:fiscal\s+)?quarter(?:\s+of)?\s*(20\d{2})\b/i);
  if(match){
    const q=quarterNumber(match[1]);
    return q?`FY${match[2]}Q${q}`:null;
  }
  match=s.match(/\b(?:fiscal\s+)?(q[1-4])\s*(20\d{2})\b/i);
  if(match)return `FY${match[2]}Q${quarterNumber(match[1])}`;
  match=s.match(/\b(20\d{2})\s*(q[1-4])\b/i);
  if(match)return `FY${match[1]}Q${quarterNumber(match[2])}`;
  return null;
}

export function classifyGuidanceBasis(value){
  const s=text(value);
  if(!s)return null;
  if(/\b(?:non[- ]?gaap|adjusted)\b/i.test(s))return "ADJUSTED";
  if(/\bgaap\b/i.test(s))return "GAAP";
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
  return /\b(?:guidance|outlook|forecast|expects?|expected|projects?|projected|anticipates?|raises?|raised|lowers?|lowered|narrows?|narrowed|reaffirms?|reaffirmed|maintains?|maintained|updates?|updated)\b/i.test(s);
}

function epsCue(value){
  const s=text(value);
  return /\b(?:adjusted\s+|non[- ]?gaap\s+|gaap\s+)?(?:diluted\s+)?(?:eps|earnings\s+per\s+(?:diluted\s+)?share)\b/i.test(s);
}

function parseNumber(token){
  const s=text(token).replace(/[$,\s]/g,"");
  if(!s)return null;
  const paren=s.match(/^\((\d+(?:\.\d+)?)\)$/);
  if(paren)return -Number(paren[1]);
  const value=Number(s);
  return Number.isFinite(value)?value:null;
}

function findEpsRange(value){
  const s=text(value);
  if(!s)return null;
  const patterns=[
    /(?:eps|earnings\s+per\s+(?:diluted\s+)?share)[^\n.;:]{0,120}?\$?\s*(\(?-?\d+(?:\.\d+)?\)?)\s*(?:to|through|–|—|-)\s*\$?\s*(\(?-?\d+(?:\.\d+)?\)?)/i,
    /\$?\s*(\(?-?\d+(?:\.\d+)?\)?)\s*(?:to|through|–|—|-)\s*\$?\s*(\(?-?\d+(?:\.\d+)?\)?)[^\n.;:]{0,120}?(?:eps|earnings\s+per\s+(?:diluted\s+)?share)/i,
  ];
  for(const pattern of patterns){
    const match=s.match(pattern);
    if(!match)continue;
    const low=parseNumber(match[1]);
    const high=parseNumber(match[2]);
    if(!finite(low)||!finite(high)||low>high)continue;
    return {low,high};
  }
  return null;
}

function candidateSegments(value){
  const normalized=normalizeSecGuidanceText(value);
  if(!normalized)return [];
  const paragraphs=normalized.split(/\n+/).map(text).filter(Boolean);
  const segments=[];
  for(const paragraph of paragraphs){
    segments.push(paragraph);
    const sentences=paragraph.split(/(?<=[.!?])\s+(?=[A-Z0-9$])/).map(text).filter(Boolean);
    for(let i=0;i<sentences.length;i++){
      segments.push(sentences[i]);
      if(i+1<sentences.length)segments.push(`${sentences[i]} ${sentences[i+1]}`);
    }
  }
  return [...new Set(segments)].filter(segment=>segment.length<=2500);
}

export function parseGuidanceSegment(value,{cik=null,ticker=null,accession=null,form="8-K",filedAt=null,acceptedAt=null}={}){
  const segment=text(value);
  const availableAt=isoTime(acceptedAt)||isoTime(filedAt);
  const base={
    source:"SEC_EDGAR_8K_EARNINGS_RELEASE_TEXT",
    cik:text(cik)||null,
    ticker:text(ticker).toUpperCase()||null,
    accession:text(accession)||null,
    form:text(form).toUpperCase()||null,
    filedAt:isoTime(filedAt),
    acceptedAt:isoTime(acceptedAt),
    availableAt,
    metric:"EPS",
    unit:"USD/SHARE",
  };
  if(!E1_R5_GUIDANCE_R2_CONTRACT.acceptedForms.includes(base.form))return {...base,status:"MISSING",reason:"FORM_NOT_ACCEPTED"};
  if(!availableAt)return {...base,status:"MISSING",reason:"AVAILABLE_AT_MISSING"};
  if(isGuidanceWithdrawal(segment))return {...base,status:"MISSING",reason:"GUIDANCE_WITHDRAWN",withdrawn:true};
  if(!forwardCue(segment)||!epsCue(segment))return {...base,status:"MISSING",reason:"FORWARD_EPS_CONTEXT_MISSING"};
  const periodKey=normalizeGuidancePeriodKey(segment);
  if(!periodKey)return {...base,status:"MISSING",reason:"TARGET_PERIOD_UNRESOLVED"};
  const basis=classifyGuidanceBasis(segment);
  if(!basis)return {...base,status:"MISSING",reason:"BASIS_UNRESOLVED",periodKey};
  const range=findEpsRange(segment);
  if(!range)return {...base,status:"MISSING",reason:"EPS_RANGE_UNRESOLVED",periodKey,basis};
  const ready={...base,status:"READY",reason:null,periodKey,basis,low:range.low,high:range.high,withdrawn:false};
  return {...ready,midpoint:guidanceMidpoint(ready)};
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
