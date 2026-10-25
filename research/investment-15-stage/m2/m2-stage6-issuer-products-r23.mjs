// R23: fetch CURRENT, publicly accessible company-owned product pages.
// Four investor-relations article endpoints returned HTTP 403 on Windows R22.
// These are distinct company-published product/blog pages, not 403 workarounds.
// No financial statement parsing, no archived snapshots, no grade assignment.
import https from 'node:https';

export const PRODUCT_SOURCE_CATALOG=Object.freeze([
 {ticker:'RR',market:'NASDAQ',publisher:'Richtech Robotics',
  host:'richtechrobotics.com',date:null,
  url:'https://richtechrobotics.com/solutions/dex',
  title:'Dex is an industrial humanoid robot',
  markers:['Dex is an industrial humanoid robot','Mobile platform','LiDAR','NVIDIA Jetson Thor'],
  segment:'HUMANOID_PRODUCT_SPECIFICATION_ONLY',
  description:'회사 제품 페이지에 DEX 산업용 휴머노이드의 구성과 사양이 설명되어 있습니다. 실사용·판매·매출은 확인하지 않았습니다.'},
 {ticker:'SERV',market:'NASDAQ',publisher:'Serve Robotics',
  host:'www.serverobotics.com',date:'2026-08-17',
  url:'https://www.serverobotics.com/blog/serve-teams-up-with-wonder-and-grubhub-amid-a-new-wave-of-expansion/',
  title:'Serve Teams Up with Wonder and Grubhub Amid a New Wave of Expansion',
  markers:['Serve Teams Up with Wonder and Grubhub','robot delivery','Grubhub','Diligent Robotics','Moxi'],
  segment:'AUTONOMOUS_DELIVERY_AND_HOSPITAL_SERVICE_ROBOTS',
  description:'회사 블로그에 자율 배송 로봇과 Moxi 병원 서비스 로봇 사업이 설명되어 있습니다. 범용 휴머노이드로 분류하지 않습니다.'},
 {ticker:'PDYN',market:'NASDAQ',publisher:'Palladyne AI',
  host:'www.palladyneai.com',date:'2026-09-08',
  url:'https://www.palladyneai.com/press-releases/palladyne-ai-and-fanuc-america-announce-strategic-collaboration-to-advance-intelligent-robotic-automation/',
  title:'Palladyne AI and FANUC America Announce Strategic Collaboration',
  markers:['Palladyne AI','FANUC America','industrial robot','physical AI software'],
  segment:'PHYSICAL_AI_ROBOTICS_SOFTWARE',
  description:'회사 보도자료에 FANUC 산업용 로봇과 피지컬 AI 소프트웨어 협력이 설명되어 있습니다. 자체 휴머노이드 판매로 간주하지 않습니다.'},
 {ticker:'VHUB',market:'NASDAQ',publisher:'VenHub Global',
  host:'www.venhub.com',date:null,
  url:'https://www.venhub.com/',
  title:'The Future Of Retail. Fully Autonomous. Always On.',
  markers:['VenHub','Smart Store','robotics','24/7','Automated Fulfillment'],
  segment:'AUTONOMOUS_RETAIL_SMART_STORES',
  description:'회사 제품 소개에 로봇을 통한 주문 자동 이행과 무인 Smart Store가 설명되어 있습니다. 범용 휴머노이드 사업으로 간주하지 않습니다.'},
]);

const allowedUrls=new Set(PRODUCT_SOURCE_CATALOG.map(item=>item.url));

export function downloadIssuerProductPage(url,{timeoutMs=15000,maxBytes=1600000}={},redirects=0){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||!allowedUrls.has(parsed.href)||parsed.username||parsed.password)
  return Promise.reject(Error('ISSUER_SOURCE_NOT_ALLOWLISTED'));
 return new Promise((resolve,reject)=>{
  const req=https.get(parsed,{timeout:timeoutMs,headers:{
   accept:'text/html','accept-encoding':'identity',
   'user-agent':'ZGminiM2PrivateIssuerEvidence/1.0 (https://zgmini.kr)',
  }},res=>{
   if([301,302,307,308].includes(res.statusCode)&&res.headers.location){
    let next;
    try{next=new URL(res.headers.location,parsed)}catch{res.resume();reject(Error('ISSUER_REDIRECT_INVALID'));return;}
    res.resume();
    if(redirects>=2||next.protocol!=='https:'||next.hostname!==parsed.hostname||
       next.pathname.replace(/\/$/,'')!==parsed.pathname.replace(/\/$/,'')){
     reject(Error('ISSUER_REDIRECT_NOT_ALLOWLISTED'));return;
    }
    resolve(downloadIssuerProductPage(next.href,{timeoutMs,maxBytes},redirects+1));return;
   }
   if(res.statusCode!==200){res.resume();reject(Error('ISSUER_HTTP_'+res.statusCode));return;}
   const chunks=[];let size=0;
   res.on('data',chunk=>{
    size+=chunk.length;
    if(size>maxBytes)req.destroy(Error('ISSUER_PAGE_TOO_LARGE'));
    else chunks.push(chunk);
   });
   res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
   res.on('error',reject);
  });
  req.on('timeout',()=>req.destroy(Error('ISSUER_TIMEOUT')));
  req.on('error',reject);
 });
}

function articleText(html,title){
 if(typeof html!=='string'||html.length>1600000)return null;
 const plain=html.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/\s+/g,' ').trim();
 const start=plain.toLowerCase().indexOf(title.toLowerCase());
 if(start<0)return null;
 let content=plain.slice(start);
 const disclaimer=content.search(/forward[- ]looking statements/i);
 if(disclaimer>=0)content=content.slice(0,disclaimer);
 return content.slice(0,26000);
}

export function verifyIssuerProductPage(source,html,retrievedAt){
 const text=articleText(html,source.title);
 if(!text)return {status:'BLOCKED',reason:'ISSUER_ARTICLE_TITLE_OR_BODY_NOT_FOUND'};
 const missing=source.markers.filter(marker=>!text.toLowerCase().includes(marker.toLowerCase()));
 if(missing.length)return {status:'BLOCKED',reason:'ISSUER_ARTICLE_MARKERS_NOT_FOUND',missingCount:missing.length};
 return {status:'ISSUER_PRODUCT_CLAIM_OBSERVED',ticker:source.ticker,
  segment:source.segment,publisher:source.publisher,sourceDate:source.date||'NOT_PUBLISHED',checkedAt:retrievedAt,
  sourceUrl:source.url,sourceTitle:source.title,description:source.description,
  evidenceLevel:'ISSUER_SELF_DESCRIPTION_ONLY',independentlyVerified:false,
  humanoidRevenueVerified:false,financialMetricsUsed:false,scorecardGrade:null};
}

export async function runIssuerProductVerification({businessQuant,retrievedAt,fetchPage=downloadIssuerProductPage}={}){
 const candidates=(businessQuant?.physicalReviewCandidates||[]);
 if(businessQuant?.status!=='READY')return {status:'BLOCKED',reason:'PRIVATE_INDUSTRY_SCREEN_NOT_READY',items:[],matched:0,requested:0};
 const seen=new Set();const unique=[];
 for(const item of candidates){
  const id=item.market+':'+item.ticker;
  if(seen.has(id))continue;
  seen.add(id);unique.push(item);
 }
 const items=await Promise.all(unique.map(async company=>{
  const source=PRODUCT_SOURCE_CATALOG.find(x=>x.market===company.market&&x.ticker===company.ticker);
  if(!source)return {market:company.market,ticker:company.ticker,company:company.company,
   status:'NO_ALLOWLISTED_ISSUER_SOURCE',reason:'DIRECT_SOURCE_RESEARCH_REQUIRED'};
  try{
   const observed=verifyIssuerProductPage(source,await fetchPage(source.url),retrievedAt);
   return {market:company.market,ticker:company.ticker,company:company.company,...observed};
  }catch(error){return {market:company.market,ticker:company.ticker,company:company.company,
   status:'BLOCKED',reason:String(error?.message||'ISSUER_NETWORK_FAILED').slice(0,120)};}
 }));
 const matched=items.filter(item=>item.status==='ISSUER_PRODUCT_CLAIM_OBSERVED').length;
 return {status:matched===items.length?'READY':matched?'PARTIAL':'BLOCKED',
  retrievedAt,items,matched,requested:unique.length,
  claimBoundary:'발행사 제품·사업 설명 확인만 수행하며 계약·납품·매출·독립 검증·15개 점수는 별도입니다.'};
}
