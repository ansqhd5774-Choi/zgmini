// R24/R25: current issuer-originated standalone earnings releases ONLY.
// R25 uses separately published Nasdaq issuer content after another publisher
// returned HTTP 403 on the user's own Windows runtime.
// This lane is deliberately separate from archived financial statements and
// scorecard inputs. It never fetches regulator filings or their mirrors.
import https from 'node:https';

export const EARNINGS_RELEASE_CATALOG=Object.freeze([
 {ticker:'PDYN',market:'NASDAQ',company:'Palladyne AI',
  url:'https://www.palladyneai.com/press-releases/q2-2026-results-revenue-jumps-470-palladyne-ai/',
  publisher:'Palladyne AI',publishedAt:'2026-08-06',
  title:'Palladyne AI Reports Second Quarter 2026 Results',
  periodStart:'2026-04-01',periodEnd:'2026-06-30',
  revenueMillionUsd:5.8,
  requiredText:['Palladyne AI Reports Second Quarter 2026 Results',
   'June 30, 2026',
   'Revenue increased 470% year-over-year and 63% sequentially to $5.8 million'],
  distribution:'COMPANY_OWNED_WEBSITE'},
 {ticker:'SERV',market:'NASDAQ',company:'Serve Robotics',
  url:'https://www.nasdaq.com/press-release/serve-robotics-announces-second-quarter-2026-results-2026-08-06',
  publisher:'Serve Robotics via Nasdaq',publishedAt:'2026-08-06',
  title:'Serve Robotics Announces Second Quarter 2026 Results',
  periodStart:'2026-04-01',periodEnd:'2026-06-30',
  revenueMillionUsd:3.2,
  requiredText:['Serve Robotics Announces Second Quarter 2026 Results',
   'second quarter ended June 30, 2026',
   'Revenue of $3.2 million, increasing 9% sequentially and 404% year-over-year'],
  distribution:'ISSUER_RELEASE_SYNDICATED_BY_EXCHANGE_PUBLISHER'},
]);

const ALLOWLIST=new Set(EARNINGS_RELEASE_CATALOG.map(r=>r.url));

export function fetchAllowedEarningsRelease(url,{timeoutMs=15000,maxBytes=800000}={}){
 let parsed;
 try{parsed=new URL(url)}catch{return Promise.reject(Error('EARNINGS_URL_INVALID'))}
 if(parsed.protocol!=='https:'||!ALLOWLIST.has(parsed.href)||parsed.username||parsed.password)
  return Promise.reject(Error('EARNINGS_SOURCE_NOT_ALLOWLISTED'));
 return new Promise((resolve,reject)=>{
  const req=https.get(parsed,{timeout:timeoutMs,headers:{
   accept:'text/html','accept-encoding':'identity',
   'user-agent':'ZGminiM2ReadOnlyEarnings/1.0 (https://zgmini.kr)',
  }},res=>{
   // Redirects may lead to an unreviewed document: fail closed, no follow-up.
   if(res.statusCode!==200){res.resume();reject(Error('EARNINGS_HTTP_'+res.statusCode));return;}
   if(!String(res.headers['content-type']||'').toLowerCase().includes('text/html')){
    res.resume();reject(Error('EARNINGS_CONTENT_TYPE_UNEXPECTED'));return;
   }
   let size=0;const chunks=[];
   res.on('data',chunk=>{
    size+=chunk.length;
    if(size>maxBytes)req.destroy(Error('EARNINGS_DOCUMENT_TOO_LARGE'));
    else chunks.push(chunk);
   });
   res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
   res.on('error',reject);
   res.on('aborted',()=>reject(Error('EARNINGS_RESPONSE_ABORTED')));
  });
  req.on('timeout',()=>req.destroy(Error('EARNINGS_TIMEOUT')));
  req.on('error',reject);
 });
}

function releaseText(html,title){
 if(typeof html!=='string'||html.length>800000||html.length<500)return null;
 const text=html.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&#0*36;|&dollar;/gi,'$').replace(/&#39;|&apos;/gi,"'")
  .replace(/\s+/g,' ').replace(/\s+([,.:;!?])/g,'$1').trim();
 const index=text.toLowerCase().indexOf(title.toLowerCase());
 if(index<0)return null;
 let article=text.slice(index);
 const disclaimer=article.search(/forward[- ]looking statements/i);
 if(disclaimer>=0)article=article.slice(0,disclaimer);
 return article.slice(0,65000);
}

export function verifyAllowedEarningsRelease(source,html,retrievedAt){
 if(!EARNINGS_RELEASE_CATALOG.some(item=>item.url===source?.url&&
  item.ticker===source.ticker&&item.market===source.market))
  return {status:'BLOCKED',reason:'EARNINGS_SOURCE_NOT_ALLOWLISTED'};
 const body=releaseText(html,source.title);
 if(!body)return {status:'BLOCKED',reason:'EARNINGS_RELEASE_TITLE_OR_BODY_NOT_FOUND'};
 const missing=source.requiredText.filter(marker=>!body.toLowerCase().includes(marker.toLowerCase()));
 if(missing.length)return {status:'BLOCKED',reason:'EARNINGS_EXACT_FACTS_NOT_CONFIRMED',missingCount:missing.length};
 return {status:'ISSUER_SELF_REPORTED_EARNINGS_OBSERVED',ticker:source.ticker,
  sourceUrl:source.url,sourceTitle:source.title,publisher:source.publisher,
  sourceDate:source.publishedAt,retrievedAt,distribution:source.distribution,
  periodStart:source.periodStart,periodEnd:source.periodEnd,
  companyWideRevenue:{value:source.revenueMillionUsd,unit:'USD_MILLION',precision:'ONE_DECIMAL_REPORTED'},
  independentlyVerified:false,issuerSelfReported:true,
  humanoidRevenueVerified:false,scorecardGrade:null,
  useInOriginalCalculators:false,valuationVerified:false};
}

export async function runAllowedEarningsVerification({businessQuant,retrievedAt,
 fetchPage=fetchAllowedEarningsRelease}={}){
 if(businessQuant?.status!=='READY')return {status:'BLOCKED',
  reason:'PRIVATE_INDUSTRY_SCREEN_NOT_READY',items:[],matched:0,requested:0,
  sourceBoundary:'ISSUER_SELF_REPORTED_NOT_INDEPENDENTLY_VERIFIED'};
 const candidates=businessQuant.physicalReviewCandidates||[];
 const seen=new Set(),unique=[];
 for(const candidate of candidates){
  const key=candidate.market+':'+candidate.ticker;
  if(seen.has(key))continue;
  seen.add(key);unique.push(candidate);
 }
 const items=await Promise.all(unique.map(async candidate=>{
  const base={market:candidate.market,ticker:candidate.ticker,
   company:candidate.company||candidate.ticker};
  const source=EARNINGS_RELEASE_CATALOG.find(s=>s.market===candidate.market&&s.ticker===candidate.ticker);
  if(!source)return {...base,status:'NO_ALLOWLISTED_ISSUER_EARNINGS_RELEASE',
   reason:'STANDALONE_ORIGINAL_EARNINGS_SOURCE_NOT_FOUND'};
  try{return {...base,...verifyAllowedEarningsRelease(source,await fetchPage(source.url),retrievedAt)};}
  catch(error){return {...base,status:'BLOCKED',
   reason:String(error?.message||'EARNINGS_NETWORK_ERROR').slice(0,120)};}
 }));
 const matched=items.filter(x=>x.status==='ISSUER_SELF_REPORTED_EARNINGS_OBSERVED').length;
 return {status:!unique.length?'BLOCKED':matched===unique.length?'READY':matched?'PARTIAL':'BLOCKED',
  retrievedAt,items,matched,requested:unique.length,
  sourceBoundary:'기업 발표 회사 전체 매출만 확인. 독립 검증·로봇 사업별 매출·원본 15개 점수는 평가하지 않음.'};
}
