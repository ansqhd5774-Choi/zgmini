// Optional, official, account-authorized PRIVATE stock screener.
// Requires M2_BUSINESSQUANT_API_KEY. No login scraping, no public redistribution.
// Screening results are leads, never proof of robotics/humanoid revenue.
import https from 'node:https';

export const BQ_DOCS='https://businessquant.com/docs/api/screener';
export const BQ_UNIVERSE_DOCS='https://businessquant.com/docs/api/universe';
const API_ORIGIN='https://data.businessquant.com';
const MAX_RESPONSE_BYTES=24*1024*1024;

function requestJson(url,{method='GET',body=null,timeoutMs=25000}={}){
 return new Promise((resolve,reject)=>{
  const payload=body===null?null:JSON.stringify(body);
  const req=https.request(url,{method,timeout:timeoutMs,headers:{
   accept:'application/json','user-agent':'ZGminiInvestmentPrivateM2/1.0',
   ...(payload?{'content-type':'application/json','content-length':Buffer.byteLength(payload)}:{}),
  }},res=>{
   if(res.statusCode!==200){res.resume();reject(Error(`BUSINESSQUANT_HTTP_${res.statusCode}`));return;}
   let total=0;const chunks=[];
   res.on('data',chunk=>{total+=chunk.length;if(total>MAX_RESPONSE_BYTES)req.destroy(Error('BUSINESSQUANT_RESPONSE_TOO_LARGE'));else chunks.push(chunk)});
   res.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(Error('BUSINESSQUANT_INVALID_JSON'))}});
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(Error('BUSINESSQUANT_TIMEOUT')));
  req.on('error',error=>reject(Error(/^BUSINESSQUANT_/.test(error.message)?error.message:'BUSINESSQUANT_NETWORK_FAILURE')));
  if(payload)req.write(payload);
  req.end();
 });
}

export function downloadBusinessQuantUniverse(apiKey){
 if(!apiKey||typeof apiKey!=='string')throw Error('BUSINESSQUANT_KEY_NOT_CONFIGURED');
 const url=new URL('/universe',API_ORIGIN);
 url.searchParams.set('security_type','Equity');
 url.searchParams.set('api_key',apiKey);
 return requestJson(url);
}

export function downloadBusinessQuantScreen(apiKey,{conditions,page=1,limit=500}={}){
 if(!apiKey||typeof apiKey!=='string')throw Error('BUSINESSQUANT_KEY_NOT_CONFIGURED');
 if(typeof conditions!=='string'||!conditions.trim())throw Error('BUSINESSQUANT_CONDITIONS_MISSING');
 const url=new URL('/screener',API_ORIGIN);
 url.searchParams.set('page',String(page));url.searchParams.set('limit',String(limit));
 url.searchParams.set('api_key',apiKey);
 // Discovery only: do not request financial statement metrics at this stage.
 return requestJson(url,{method:'POST',body:{conditions}});
}

function marketKey(exchange){
 const normalized=String(exchange||'').trim().toUpperCase();
 return normalized==='AMEX'||normalized==='NYSE AMERICAN'?'NYSE_AMERICAN':normalized;
}

// Classify the *screening lane*, not the issuer's actual products or revenue.
// Software RPA is not a physical robot, despite the word "automation".
export function businessQuantLane(industry){
 const name=String(industry||'').trim().toLowerCase();
 if(/\b(business process automation|robotic process automation|workflow automation)\b/.test(name))
  return 'SOFTWARE_AUTOMATION_SEPARATE';
 if(/\brobotics?\b|\bmechatronics\b/.test(name))return 'ROBOTICS_INDUSTRY_CANDIDATE';
 if(/\b(industrial|factory|manufacturing|warehouse|logistics)\s+automation\b/.test(name))
  return 'INDUSTRIAL_AUTOMATION_REVIEW';
 return 'OTHER_AUTOMATION_UNCLASSIFIED';
}

// Only explicit robotics / automation terms; no broad Industrial/Tech guesswork.
export function targetedIndustries(data){
 const values=new Set();
 for(const row of data){
  const industry=String(row?.industry||'').trim();
  if(/\b(robotics?|automation|mechatronics)\b/i.test(industry))values.add(industry);
 }
 return [...values].sort();
}

export function buildIndustryCondition(industries){
 const valid=industries.filter(value=>typeof value==='string'&&value.length>0&&!value.includes("'")&&!value.includes('"'));
 if(valid.length===0)return null;
 return valid.map(value=>`"industry" = '${value}'`).join(' OR ');
}

export function analyzeBusinessQuantUniverse(payload,usUniverse,retrievedAt){
 if(usUniverse?.status!=='READY'||!Array.isArray(usUniverse.listings))throw Error('BUSINESSQUANT_EXCHANGE_DIRECTORY_REQUIRED');
 const data=payload?.data;
 if(!Array.isArray(data)||!Number.isFinite(payload?.metadata?.total_records)||!data.length)
  throw Error('BUSINESSQUANT_UNIVERSE_BAD_RESPONSE');
 if(payload.metadata.total_records!==data.length)throw Error('BUSINESSQUANT_UNIVERSE_INCOMPLETE');
 const listings=new Map(usUniverse.listings.map(x=>[`${marketKey(x.market)}:${x.ticker}`,x]));
 const matching=[];
 for(const row of data){
  if(row?.security_type!=='Equity'||typeof row.ticker!=='string')continue;
  const market=marketKey(row.exchange),symbol=row.ticker.trim().toUpperCase();
  const listing=listings.get(`${market}:${symbol}`);
  if(!listing)continue;
  matching.push({ticker:symbol,market,company:listing.name,sector:String(row.sector||''),industry:String(row.industry||''),
   screeningLane:businessQuantLane(row.industry)});
 }
 const industries=targetedIndustries(matching);
 return {status:'UNIVERSE_CLASSIFIED',source:BQ_UNIVERSE_DOCS,retrievedAt,
  provider:'BUSINESSQUANT',totalProviderEquities:data.length,usExchangeMatched:matching.length,
  targetIndustries:industries,industryCandidates:matching.filter(row=>industries.includes(row.industry)),
  screeningStatus:industries.length?'SCREEN_REQUIRED':'NO_EXPLICIT_ROBOTICS_INDUSTRY',
  limitations:'산업 문자열에 로봇·자동화가 있는 기업만 후보화. 별도 사업 실체/휴머노이드 매출 검증 전이며, 관련기업 전체가 아님.'};
}

export function analyzeBusinessQuantScreen(payload,classified){
 const rows=payload?.data,meta=payload?.metadata;
 if(!Array.isArray(rows)||!Number.isFinite(meta?.total_records)||!Number.isFinite(meta?.total_pages))
  throw Error('BUSINESSQUANT_SCREEN_BAD_RESPONSE');
 if(meta.total_pages>1)throw Error('BUSINESSQUANT_SCREEN_MORE_PAGES');
 const eligible=new Map();
 for(const candidate of classified.industryCandidates){
  const bucket=eligible.get(candidate.ticker)||[];
  bucket.push(candidate);
  eligible.set(candidate.ticker,bucket);
 }
 const matches=[];
 for(const row of rows){
  const symbol=String(row.ticker||'').toUpperCase();
  const matchesBySymbol=eligible.get(symbol)||[];
  // The screener response can omit exchange; ambiguous symbols cannot be joined safely.
  if(matchesBySymbol.length!==1)continue;
  const base=matchesBySymbol[0];
  matches.push({...base,businessVerified:false,humanoidVerified:false,investmentRanking:null});
 }
 const laneCounts={};
 for(const row of matches)laneCounts[row.screeningLane]=(laneCounts[row.screeningLane]||0)+1;
 return {...classified,status:'READY',screeningStatus:'PROFESSIONAL_FUNDAMENTAL_SCREEN_LEADS_ONLY',
  screenedTotal:meta.total_records,screenedMatches:matches,screenedMatchCount:matches.length,laneCounts,
  physicalReviewCandidates:matches.filter(row=>['ROBOTICS_INDUSTRY_CANDIDATE','INDUSTRIAL_AUTOMATION_REVIEW'].includes(row.screeningLane)),
  softwareOnlyCandidates:matches.filter(row=>row.screeningLane==='SOFTWARE_AUTOMATION_SEPARATE')};
}

export async function runBusinessQuantPrivate({apiKey,usUniverse,retrievedAt,universeLoader=downloadBusinessQuantUniverse,
 screenerLoader=downloadBusinessQuantScreen}={}){
 if(!apiKey)return {status:'NEEDS_API_KEY',screeningStatus:'NOT_CONFIGURED',provider:'BUSINESSQUANT',
  screenedMatchCount:0,screenedMatches:[]};
 try{
  const universe=analyzeBusinessQuantUniverse(await universeLoader(apiKey),usUniverse,retrievedAt);
  const conditions=buildIndustryCondition(universe.targetIndustries);
  if(!conditions)return {...universe,status:'NO_NARROW_INDUSTRY',screenedMatchCount:0,screenedMatches:[]};
  const screened=await screenerLoader(apiKey,{conditions,page:1,limit:5000});
  return analyzeBusinessQuantScreen(screened,universe);
 }catch(error){return {status:'BLOCKED',reason:String(error?.message||'BUSINESSQUANT_ERROR').replace(/api_key=[^\s&]+/gi,'api_key=REDACTED'),
  provider:'BUSINESSQUANT',screeningStatus:'ERROR_NOT_SUBSTITUTED',screenedMatchCount:0,screenedMatches:[]};}
}
