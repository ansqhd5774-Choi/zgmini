// Authorized read-only topical discovery: one Wikimedia Action API request,
// then independent exact issuer-name intersection with Nasdaq Trader listings.
// Wikimedia examples are NOT full coverage, financial screens, or validation
// of humanoid revenue. We never infer subsidiary -> listed-parent ownership.
import https from 'node:https';

export const ROBOTICS_WIKIPEDIA_SOURCE='https://en.wikipedia.org/wiki/List_of_robotics_companies';
export const ROBOTICS_WIKIPEDIA_API='https://en.wikipedia.org/w/api.php?action=parse&page=List_of_robotics_companies&prop=wikitext&format=json';
export const ROBOTICS_US_CATEGORY_SOURCE='https://en.wikipedia.org/wiki/Category:Robotics_companies_of_the_United_States';
export const ROBOTICS_US_CATEGORY_API='https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category%3ARobotics_companies_of_the_United_States&cmtype=page&cmlimit=250&format=json';
const MAX_BYTES=256*1024;

function downloadWikipedia(url,{timeoutMs=12000}={}){
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{timeout:timeoutMs,headers:{
   'user-agent':'ZGminiInvestmentBot/1.0 (https://zgmini.kr)',accept:'application/json',
  }},res=>{
   if(res.statusCode!==200){res.resume();reject(Error(`WIKIMEDIA_HTTP_${res.statusCode}`));return;}
   const parts=[];let size=0;
   res.on('data',part=>{
    size+=part.length;
    if(size>MAX_BYTES)req.destroy(Error('WIKIMEDIA_RESPONSE_TOO_LARGE'));
    else parts.push(part);
   });
   res.on('end',()=>resolve(Buffer.concat(parts).toString('utf8')));
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(Error('WIKIMEDIA_TIMEOUT')));
  req.on('error',reject);
 });
}

export function downloadRoboticsCompanyList(options){return downloadWikipedia(ROBOTICS_WIKIPEDIA_API,options);}
export function downloadRoboticsUsCategory(options){return downloadWikipedia(ROBOTICS_US_CATEGORY_API,options);}

export function parseRoboticsUsCategory(json){
 const data=typeof json==='string'?JSON.parse(json):json;
 const entries=data?.query?.categorymembers;
 if(!Array.isArray(entries)||entries.length<20||data.continue)throw Error('WIKIMEDIA_US_CATEGORY_BAD_RESPONSE');
 return entries.filter(x=>x.ns===0&&typeof x.title==='string')
  .map(x=>({name:x.title.replace(/\s*\(company\)\s*$/i,''),
   country:'United States category',page:x.title,
   categorySource:ROBOTICS_US_CATEGORY_SOURCE}));
}

export function mergeRoboticsNames(world,usCategory){
 const index=new Map();
 for(const candidate of [...world,...usCategory]){
  const key=normalizeCompanyName(candidate.name);
  if(key.length<5)continue;
  if(!index.has(key))index.set(key,candidate);
 }
 return [...index.values()];
}

export function parseRoboticsCompanyList(json){
 const data=typeof json==='string'?JSON.parse(json):json;
 if(data?.parse?.title!=='List of robotics companies')throw Error('WIKIMEDIA_WRONG_PAGE');
 const wikitext=data.parse.wikitext?.['*'];
 if(typeof wikitext!=='string'||!wikitext.includes('==Notable examples by country=='))throw Error('WIKIMEDIA_BAD_FORMAT');
 let collecting=false,country=null;
 const names=[];
 const normalized=new Set();
 for(const raw of wikitext.split(/\r?\n/)){
  if(raw==='==Notable examples by country=='){collecting=true;continue;}
  if(!collecting)continue;
  if(/^==[^=]/.test(raw))break;
  const heading=raw.match(/^===([^=]+)===$/);
  if(heading){country=heading[1].trim();continue;}
  if(!country||!raw.startsWith('* '))continue;
  const wikilink=raw.match(/^\*\s+\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  const text=wikilink?(wikilink[2]||wikilink[1]):raw.slice(2).trim();
  const company=text.replace(/\s*\([^)]*\)\s*$/,'').replace(/\{\{[^}]+\}\}/g,'').trim();
  if(!/^[\p{L}\p{N}]/u.test(company)||company.length<3)continue;
  const key=country+'|'+company.toLocaleLowerCase('en-US');
  if(normalized.has(key))continue;
  normalized.add(key);
  names.push({name:company,country,page:wikilink?wikilink[1]:null});
 }
 if(names.length<25||!names.some(x=>x.country==='United States'))throw Error('WIKIMEDIA_LIST_MISSING_OR_TOO_SHORT');
 return names;
}

// Match normalized *issuer names*, never substring or ticker coincidences.
export function normalizeCompanyName(s){
 let clean=String(s||'').replace(/\s+-\s+.*$/,'').replace(/\s*\([^)]*\)\s*$/,'');
 clean=clean.replace(/\s+(?:(?:class|series)\s+[A-Z0-9]+\s+)?(?:ordinary\s+shares|common\s+(?:stock|shares)|american\s+depositary\s+(?:shares|receipts))\s*$/i,'');
 const suffix=/(?:\s|[,.-])+(?:incorporated|corporation|holdings?|inc|corp|ltd|limited|plc|co|group|sa|ag|se|nv)\.?\s*$/i;
 while(suffix.test(clean))clean=clean.replace(suffix,'');
 return clean.replace(/[^a-z0-9]/gi,'').toLowerCase();
}

export function discoverRoboticsListedCompanies(names,usUniverse,retrievedAt){
 if(usUniverse?.status!=='READY'||!Array.isArray(usUniverse.listings))return {
  status:'BLOCKED',reason:'US_LISTING_DIRECTORY_REQUIRED',source:ROBOTICS_WIKIPEDIA_SOURCE,
  matchingCount:0,companyCandidates:[],themeRelevance:'BROAD_ROBOTICS_ONLY_NOT_HUMANOID'};
 const index=new Map();
 for(const listing of usUniverse.listings){
  const key=normalizeCompanyName(listing.name);
  if(key.length<5)continue;
  const existing=index.get(key)||[];
  existing.push(listing);
  index.set(key,existing);
 }
 const matches=new Map();
 for(const candidate of names){
  const key=normalizeCompanyName(candidate.name);
  if(key.length<5)continue;
  for(const listing of index.get(key)||[]){
   const id=`${listing.market}:${listing.ticker}`;
   if(!matches.has(id))matches.set(id,{
    ticker:listing.ticker,company:listing.name,market:listing.market,
    topicalName:candidate.name,sourceCountry:candidate.country,
    source:ROBOTICS_WIKIPEDIA_SOURCE,
    discoveryEvidence:'TOPICAL_WIKIMEDIA_NAME_AND_US_EXCHANGE_MATCH_ONLY',
    businessVerified:false,humanoidVerified:false,revenueVerified:false,
    investmentRanking:null,
   });
  }
 }
 const companyCandidates=[...matches.values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
 return {status:'READY',source:ROBOTICS_WIKIPEDIA_SOURCE,retrievedAt,
  candidatePool:names.length,matchingCount:companyCandidates.length,companyCandidates,
  themeRelevance:'BROAD_ROBOTICS_ONLY_NOT_HUMANOID',
  financialScreening:'NOT_PERFORMED',
  license:'WIKIPEDIA_CC_BY_SA_4_0_ATTRIBUTION',
  limitation:'Wikipedia의 불완전한 로봇기업 예시를 미국 상장 심볼에 정확한 발행사 이름으로 교차한 조사 출발점. 휴머노이드 관련성, 자회사 귀속, 재무, 최신 산업분류는 미검증.'};
}
