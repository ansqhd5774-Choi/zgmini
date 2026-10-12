const clean=value=>String(value??"").trim();

export const E1_R5_R17_SEC_POLICY=Object.freeze({
  version:"E1-R5-R17-SEC-GUIDANCE-R1",
  authority:"SEC EDGAR",
  host:"www.sec.gov",
  maxRequestsPerRun:100,
  requestIntervalMs:600,
  maxDocumentBytes:20_000_000,
  researchOnly:true,
  productionActivation:false,
  rawTextPublication:false,
});

const namedEntities=Object.freeze({
  amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",ndash:"-",mdash:"-",hellip:"...",
});

function decodeEntities(value){
  return String(value??"").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,key)=>{
    const lower=key.toLowerCase();
    if(lower.startsWith("#x")){
      const code=Number.parseInt(lower.slice(2),16);
      return Number.isFinite(code)&&code>0&&code<=0x10ffff?String.fromCodePoint(code):" ";
    }
    if(lower.startsWith("#")){
      const code=Number.parseInt(lower.slice(1),10);
      return Number.isFinite(code)&&code>0&&code<=0x10ffff?String.fromCodePoint(code):" ";
    }
    return namedEntities[lower]??" ";
  });
}

export function htmlToVisibleText(html){
  let text=String(html??"");
  text=text.replace(/<!--[\s\S]*?-->/g," ");
  text=text.replace(/<(script|style|noscript|svg|ix:hidden)\b[^>]*>[\s\S]*?<\/\1>/gi," ");
  text=text.replace(/<\/?(?:p|div|br|tr|li|h[1-6]|table|section|article|header|footer)\b[^>]*>/gi,"\n");
  text=text.replace(/<[^>]+>/g," ");
  text=decodeEntities(text);
  return text.replace(/[\t\r ]+/g," ").replace(/\n\s*\n+/g,"\n").trim();
}

const signalPatterns=Object.freeze({
  WITHDRAW:Object.freeze([
    /\b(?:withdraw(?:s|n|ing)?|suspend(?:s|ed|ing)?|discontinue(?:s|d|ing)?|rescind(?:s|ed|ing)?)\b.{0,90}\b(?:guidance|outlook|forecast)\b/gi,
    /\bno longer\s+(?:provides?|providing)\b.{0,60}\b(?:guidance|outlook|forecast)\b/gi,
  ]),
  UP:Object.freeze([
    /\b(?:raise(?:s|d|ing)?|increase(?:s|d|ing)?|boost(?:s|ed|ing)?|lift(?:s|ed|ing)?|upgrade(?:s|d|ing)?)\b.{0,90}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b.{0,90}\b(?:raised|increased|boosted|lifted|upgraded|higher)\b/gi,
  ]),
  DOWN:Object.freeze([
    /\b(?:lower(?:s|ed|ing)?|reduce(?:s|d|ing)?|cut(?:s|ting)?|decrease(?:s|d|ing)?|downgrade(?:s|d|ing)?)\b.{0,90}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b.{0,90}\b(?:lowered|reduced|cut|decreased|downgraded|lower)\b/gi,
  ]),
  FLAT:Object.freeze([
    /\b(?:reaffirm(?:s|ed|ing)?|reiterate(?:s|d|ing)?|maintain(?:s|ed|ing)?)\b.{0,90}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b.{0,90}\b(?:unchanged|reaffirmed|reiterated|maintained)\b/gi,
  ]),
});

function hypotheticalPrefix(text,index){
  const prefix=text.slice(Math.max(0,index-48),index).toLowerCase();
  return /\b(?:may|might|could|would|potentially)\b/.test(prefix);
}

function countPatternHits(text,patterns){
  let hits=0;
  for(const pattern of patterns){
    const regex=new RegExp(pattern.source,pattern.flags);
    for(const match of text.matchAll(regex)){
      if(hypotheticalPrefix(text,match.index??0))continue;
      hits++;
    }
  }
  return hits;
}

export function classifyGuidanceDirectionFromText(text){
  const normalized=clean(text).replace(/\s+/g," ");
  const hits=Object.fromEntries(Object.entries(signalPatterns).map(([direction,patterns])=>[direction,countPatternHits(normalized,patterns)]));
  const present=Object.entries(hits).filter(([,count])=>count>0).map(([direction])=>direction);
  if(present.length===0)return {status:"UNCLASSIFIED",direction:null,eligibleForBreadth:false,hits};
  if(present.length>1)return {status:"MIXED",direction:"MIXED",eligibleForBreadth:false,hits};
  const direction=present[0];
  return {status:"CLASSIFIED",direction,eligibleForBreadth:["UP","FLAT","DOWN"].includes(direction),hits};
}

export function classifyGuidanceDirectionFromHtml(html){
  return classifyGuidanceDirectionFromText(htmlToVisibleText(html));
}

function validCik(value){return /^\d{1,10}$/.test(clean(value));}
function validAccession(value){return /^\d{10}-\d{2}-\d{6}$/.test(clean(value));}
function safeDocument(value){return /^[A-Za-z0-9_.-]{1,255}$/.test(clean(value))&&!/[\\/]/.test(clean(value));}

export function buildSecArchiveDocumentUrl({cik,accessionNumber,document}){
  const cikText=clean(cik).replace(/^0+/,"")||"0";
  const accession=clean(accessionNumber);
  const file=clean(document);
  if(!validCik(cikText)||cikText==="0"||!validAccession(accession)||!safeDocument(file))return null;
  const accessionPath=accession.replaceAll("-","");
  return `https://www.sec.gov/Archives/edgar/data/${cikText}/${accessionPath}/${file}`;
}

function anchorText(value){return htmlToVisibleText(value).toLowerCase();}
function likelyExhibit(href,label){
  const h=href.toLowerCase(),t=label.toLowerCase();
  return /(?:^|[^a-z0-9])(?:ex(?:hibit)?[-_. ]?99(?:[-_. ]?1)?|99[-_. ]1)(?:[^a-z0-9]|$)/i.test(`${h} ${t}`)||/\b(?:press release|earnings release)\b/i.test(t);
}

export function extractSecExhibitLinks(html,{baseUrl,maxLinks=3}={}){
  let base;
  try{base=new URL(baseUrl);}catch{return [];}
  if(base.protocol!=="https:"||base.hostname!==E1_R5_R17_SEC_POLICY.host)return [];
  const baseDir=base.pathname.slice(0,base.pathname.lastIndexOf("/")+1);
  const links=[];const seen=new Set();
  for(const match of String(html??"").matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const href=decodeEntities(match[1]);const label=anchorText(match[2]);
    if(!likelyExhibit(href,label))continue;
    try{
      const url=new URL(href,base);
      if(url.protocol!=="https:"||url.hostname!==E1_R5_R17_SEC_POLICY.host)continue;
      if(!url.pathname.startsWith(baseDir))continue;
      if(!/\.(?:html?|txt)$/i.test(url.pathname))continue;
      url.hash="";
      const key=url.href;
      if(seen.has(key))continue;
      seen.add(key);links.push(key);
      if(links.length>=maxLinks)break;
    }catch{}
  }
  return links;
}
