export const V2_COMPOSITE_VERSION='kr-fg-2f-cs-2.0.0';
export const V2_INDEX_ID='ZGMINI_KR_FG_2F_CS';
export const V2_COMPONENT_WINDOW=252;
export const V2_COMPONENT_EMA_ALPHA=0.5;
export const V2_CORPORATE_WINDOW_DAYS=20;
export const V2_CORPORATE_MAX_PENALTY=10;
export const V2_INPUT_CACHE_MS=60*60*1000;
export const V2_WEIGHTS=Object.freeze({leverage:0.5,liquidation:0.5});
export const V2_SEVERE_OPERATIONS=Object.freeze([
 {id:'DEFAULT',op:'getDishDiscInfo_V2',label:'부도발생'},
 {id:'BUSINESS_SUSPENSION',op:'getBusiSuspDiscInfo_V2',label:'영업정지'},
 {id:'REHABILITATION',op:'getReviProcDiscInfo_V2',label:'회생절차개시신청'},
 {id:'DISSOLUTION',op:'getDissReasDiscInfo_V2',label:'해산사유발생'},
 {id:'CREDITOR_MANAGEMENT',op:'getProcByCredBankDiscInfo_V2',label:'채권은행등의관리절차개시'},
]);
const KOFIA_BASE='https://apis.data.go.kr/1160100/service/GetKofiaStatisticsInfoService/';
const DISC_BASE='https://apis.data.go.kr/1160100/service/GetDiscInfoService_V2/';
const DAY=86400000;
const TOLERANCE=1e-10;
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const parseNumber=value=>{
 if(value===null||value===undefined||value==='')return null;
 const number=Number(String(value).replaceAll(',',''));
 return Number.isFinite(number)?number:null;
};
const dateValid=value=>typeof value==='string'&&/^\d{8}$/.test(value);
const epoch=date=>Date.parse(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`);
const koreaDate=now=>new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10).replaceAll('-','');
const decodeKey=value=>{
 if(typeof value!=='string'||!value.trim())return null;
 try{return /%[0-9a-f]{2}/i.test(value)?decodeURIComponent(value):value;}catch{return value;}
};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function responseHeader(body){
 const header=body?.response?.header??body?.header??{};
 return {code:header?.resultCode??body?.resultCode??null,msg:header?.resultMsg??body?.resultMsg??null};
}
function responseItems(body){
 const item=body?.response?.body?.items?.item??body?.body?.items?.item??body?.items?.item??body?.items;
 return Array.isArray(item)?item:item&&typeof item==='object'?[item]:[];
}
function responseTotalCount(body){
 const value=Number(body?.response?.body?.totalCount??body?.body?.totalCount??body?.totalCount);
 return Number.isFinite(value)?value:null;
}
async function fetchJson(fetcher,url){
 try{
  const response=await fetcher(url,{headers:{Accept:'application/json'}});
  const text=await response.text();
  let body=null;
  try{body=JSON.parse(text.replace(/^\uFEFF/,''));}catch{return {ok:false,status:response.status,error:'INVALID_JSON',body:null};}
  return {ok:response.ok,status:response.status,error:null,body};
 }catch{return {ok:false,status:null,error:'FETCH_FAILED',body:null};}
}
async function fetchAll(fetcher,base,key,operation,params={}){
 const rows=[],pageSize=1000;
 let pageNo=1,totalCount=null;
 while(pageNo<=100){
  const url=new URL(operation,base);
  url.searchParams.set('serviceKey',key);
  url.searchParams.set('resultType','json');
  url.searchParams.set('pageNo',String(pageNo));
  url.searchParams.set('numOfRows',String(pageSize));
  for(const [name,value] of Object.entries(params))if(value!==null&&value!==undefined&&value!=='')url.searchParams.set(name,String(value));
  const result=await fetchJson(fetcher,url);
  const header=responseHeader(result.body);
  if(result.status!==200||(header.code!==null&&String(header.code)!=='00')){
   return {ok:false,rows:[],error:result.error??`UPSTREAM_${result.status??'ERROR'}`,resultCode:header.code,resultMsg:header.msg,totalCount};
  }
  const page=responseItems(result.body);
  if(totalCount===null)totalCount=responseTotalCount(result.body);
  rows.push(...page);
  if(page.length===0||(totalCount!==null&&rows.length>=totalCount)||page.length<pageSize)break;
  pageNo+=1;
  await sleep(40);
 }
 if(totalCount!==null&&rows.length<totalCount)return {ok:false,rows:[],error:'SOURCE_INCOMPLETE',totalCount};
 return {ok:true,rows,totalCount,error:null};
}
function dedupeSeries(rows,dateKey,valueKey,{min=0}={}){
 const map=new Map();
 for(const row of rows){
  const date=row?.[dateKey],value=parseNumber(row?.[valueKey]);
  if(!dateValid(date))continue;
  const normalized=value!==null&&value>=min?value:null;
  if(!map.has(date))map.set(date,normalized);
  else if(map.get(date)!==normalized)map.set(date,null);
 }
 return [...map.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value}));
}
function ratioSeries(numerator,denominator,multiplier=1){
 const denominatorMap=new Map(denominator.map(point=>[point.date,point.value]));
 return numerator.map(point=>{
  const denominatorValue=denominatorMap.get(point.date);
  return {date:point.date,value:finite(point.value)&&finite(denominatorValue)&&denominatorValue>0?point.value/denominatorValue*multiplier:null};
 });
}
function rollingZ(series,window,{transform=value=>value,inverse=false}={}){
 return series.map((point,index)=>{
  if(index+1<window||!finite(point.value))return {date:point.date,value:null,z:null};
  const windowPoints=series.slice(index-window+1,index+1);
  if(windowPoints.some(item=>!finite(item.value)))return {date:point.date,value:null,z:null};
  const values=windowPoints.map(item=>transform(item.value));
  if(values.some(value=>!finite(value)))return {date:point.date,value:null,z:null};
  const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
  const variance=values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length;
  const sd=Math.sqrt(variance),current=transform(point.value);
  const z=sd>0?(current-mean)/sd:0,clipped=clamp(z,-3,3);
  const mapped=50+clipped*(50/3);
  return {date:point.date,value:inverse?100-mapped:mapped,z};
 });
}
function ema(series,alpha){
 let previous=null;
 return series.map(point=>{
  if(!finite(point.value))return {...point,value:null};
  previous=previous===null?point.value:alpha*point.value+(1-alpha)*previous;
  return {...point,value:previous};
 });
}
function normalizeEvents(rows=[]){
 const map=new Map();
 for(const row of rows){
  const date=row?.basDt,crno=typeof row?.crno==='string'?row.crno.trim():'';
  if(!dateValid(date)||!crno)continue;
  const key=`${date}|${crno}`;
  if(!map.has(key))map.set(key,{date,crno});
 }
 return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function trailingUniqueCompanies(baseDates,events,days){
 return baseDates.map(date=>{
  const end=epoch(date),start=end-days*DAY,set=new Set();
  for(const event of events){
   const time=epoch(event.date);
   if(time>end)break;
   if(time>=start)set.add(event.crno);
  }
  return {date,value:set.size};
 });
}
export function describeV2Score(score){
 if(!validScore(score))return {displayScore:null,stageCode:null,stageLabel:null};
 const displayScore=Number(score.toFixed(1));
 const [stageCode,stageLabel]=displayScore<25?['EXTREME_FEAR','극단적 공포']:displayScore<45?['FEAR','공포']:displayScore<=55?['NEUTRAL','중립']:displayScore<=75?['GREED','탐욕']:['EXTREME_GREED','극단적 탐욕'];
 return {displayScore,stageCode,stageLabel};
}
export function calculateCorporatePenalty(stressZ){
 if(!finite(stressZ))return null;
 return V2_CORPORATE_MAX_PENALTY*clamp(stressZ,0,3)/3;
}
export function calculateV2Score(leverageScore,liquidationScore,stressZ){
 if(!validScore(leverageScore)||!validScore(liquidationScore)||!finite(stressZ)||Math.abs(V2_WEIGHTS.leverage+V2_WEIGHTS.liquidation-1)>TOLERANCE)return null;
 const base=V2_WEIGHTS.leverage*leverageScore+V2_WEIGHTS.liquidation*liquidationScore;
 const penalty=calculateCorporatePenalty(stressZ);
 return clamp(base-penalty,0,100);
}
export function buildV2FromRows({creditRows=[],capitalRows=[],disclosureRows=[]}={},now=new Date()){
 const cutoff=koreaDate(now);
 const currentCreditRows=creditRows.filter(row=>dateValid(row?.basDt)&&row.basDt<=cutoff);
 const currentCapitalRows=capitalRows.filter(row=>dateValid(row?.basDt)&&row.basDt<=cutoff);
 const currentDisclosureRows=disclosureRows.filter(row=>dateValid(row?.basDt)&&row.basDt<=cutoff);
 const credit=dedupeSeries(currentCreditRows,'basDt','crdTrFingWhl');
 const deposits=dedupeSeries(currentCapitalRows,'basDt','invrDpsgAmt');
 const liquidation=dedupeSeries(currentCapitalRows,'basDt','brkTrdUcolMnyVsOppsTrdAmt');
 const leverageRaw=ratioSeries(credit,deposits,100);
 const leverage=ema(rollingZ(leverageRaw,V2_COMPONENT_WINDOW),V2_COMPONENT_EMA_ALPHA);
 const liquidationScore=ema(rollingZ(liquidation,V2_COMPONENT_WINDOW,{transform:value=>Math.log1p(value),inverse:true}),V2_COMPONENT_EMA_ALPHA);
 const corporateRaw=trailingUniqueCompanies(leverageRaw.map(point=>point.date),normalizeEvents(currentDisclosureRows),V2_CORPORATE_WINDOW_DAYS);
 const corporateZ=rollingZ(corporateRaw,V2_COMPONENT_WINDOW);
 const lMap=new Map(leverage.map(point=>[point.date,point.value]));
 const qMap=new Map(liquidationScore.map(point=>[point.date,point.value]));
 const zMap=new Map(corporateZ.map(point=>[point.date,point.z]));
 const cMap=new Map(corporateRaw.map(point=>[point.date,point.value]));
 const dates=[...new Set([...lMap.keys(),...qMap.keys(),...zMap.keys()])].sort();
 const fullHistory=dates.map(date=>{
  const leverageScore=lMap.get(date),liquidationValue=qMap.get(date),stressZ=zMap.get(date);
  const score=calculateV2Score(leverageScore,liquidationValue,stressZ);
  return {date,score,...describeV2Score(score)};
 });
 const last=fullHistory.findLast(point=>point.score!==null),previous=last?fullHistory.slice(0,fullHistory.indexOf(last)).findLast(point=>point.score!==null):null;
 const latestInputDate=dates.at(-1)??null,reasons=[];
 if(last){
  if(last.date!==latestInputDate)reasons.push('COMMON_DATE_LAG');
  if(now.getTime()-epoch(last.date)>7*DAY)reasons.push('OBSERVATION_DELAY');
 }
 const history=fullHistory.slice(-366);
 const leverageScore=last?lMap.get(last.date):null,liquidationValue=last?qMap.get(last.date):null,stressZ=last?zMap.get(last.date):null;
 const corporateCount=last?cMap.get(last.date):null,penalty=last?calculateCorporatePenalty(stressZ):null;
 const base=last&&validScore(leverageScore)&&validScore(liquidationValue)?V2_WEIGHTS.leverage*leverageScore+V2_WEIGHTS.liquidation*liquidationValue:null;
 const components=last?[
  {id:'KR_LEVERAGE_INTENSITY_Z252_E50',role:'CORE',inputScore:leverageScore,orientedScore:leverageScore,weight:V2_WEIGHTS.leverage,weightedContribution:V2_WEIGHTS.leverage*leverageScore},
  {id:'KR_LIQUIDATION_LOG_Z252_INV_E50',role:'CORE',inputScore:liquidationValue,orientedScore:liquidationValue,weight:V2_WEIGHTS.liquidation,weightedContribution:V2_WEIGHTS.liquidation*liquidationValue},
  {id:'KR_CORPORATE_STRESS_PENALTY',role:'PENALTY',inputScore:corporateCount,orientedScore:stressZ,weight:0,weightedContribution:penalty===0?0:-penalty,penaltyPoints:penalty,stressZ,windowDays:V2_CORPORATE_WINDOW_DAYS},
 ]:[];
 return {
  id:V2_INDEX_ID,name:'ZGmini 한국 공포·탐욕지수',beta:true,methodologyVersion:V2_COMPOSITE_VERSION,
  status:last?(reasons.length?'STALE':'READY'):dates.length<V2_COMPONENT_WINDOW?'WARMUP':'UNAVAILABLE',
  staleReason:reasons.length?reasons.join(','):null,
  score:last?.score??null,...describeV2Score(last?.score),scoreScale:{min:0,max:100},
  observationDate:last?.date??null,previousObservationDate:previous?.date??null,changePoints:previous?last.score-previous.score:null,
  history,weights:V2_WEIGHTS,components,baseScore:base,corporateStressPenalty:penalty,corporateStressZ:stressZ,corporateStressCompanyCount:corporateCount,
  historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',pointInTimeVerified:false,sourcePublishedAt:null,
  sourceAttribution:'금융위원회 공공데이터포털 · 금융투자협회종합통계정보 · 공시정보조회서비스 · ZGmini 자체 가공',
  briefMethodology:'신용융자/투자자예탁금과 실제 반대매매금액을 각각 50% 반영하고, 최근 20일 심각 기업공시 스트레스가 평상 이상일 때 최대 10점을 감점하는 V2 지수입니다.',
  stagePolicy:'소수점 1자리 displayScore 기준: 25 미만 극단적 공포, 45 미만 공포, 55 이하 중립, 75 이하 탐욕, 그 이상 극단적 탐욕.',
  warmup:{componentObservations:V2_COMPONENT_WINDOW,corporateWindowDays:V2_CORPORATE_WINDOW_DAYS},
 };
}
let cachedInputs=null;
let cachedAt=0;
let inFlight=null;
export async function loadV2Inputs(env,context={}){
 const now=Date.now();
 if(cachedInputs&&now-cachedAt<V2_INPUT_CACHE_MS)return cachedInputs;
 if(inFlight)return inFlight;
 inFlight=(async()=>{
  const fscKey=decodeKey(env?.FSC_API_KEY),disclosureKey=decodeKey(env?.FSC_DISCLOSURE_API_KEY);
  if(!fscKey||!disclosureKey)return {ok:false,error:'V2_SECRET_MISSING'};
  const fetcher=context.fetch??fetch;
  const [credit,capital,...disclosures]=await Promise.all([
   fetchAll(fetcher,KOFIA_BASE,fscKey,'getGrantingOfCreditBalanceInfo',{beginBasDt:'20210101'}),
   fetchAll(fetcher,KOFIA_BASE,fscKey,'getSecuritiesMarketTotalCapitalInfo',{beginBasDt:'20210101'}),
   ...V2_SEVERE_OPERATIONS.map(item=>fetchAll(fetcher,DISC_BASE,disclosureKey,item.op)),
  ]);
  if(!credit.ok||!capital.ok||disclosures.some(result=>!result.ok))return {ok:false,error:'V2_SOURCE_UNAVAILABLE'};
  const value={ok:true,creditRows:credit.rows,capitalRows:capital.rows,disclosureRows:disclosures.flatMap(result=>result.rows)};
  cachedInputs=value;cachedAt=Date.now();return value;
 })().finally(()=>{inFlight=null;});
 return inFlight;
}
export async function buildCompositeV2(env,context={},now=new Date()){
 const inputs=await loadV2Inputs(env,context);
 if(!inputs.ok)return {id:V2_INDEX_ID,name:'ZGmini 한국 공포·탐욕지수',beta:true,methodologyVersion:V2_COMPOSITE_VERSION,status:'UNAVAILABLE',staleReason:inputs.error,score:null,...describeV2Score(null),scoreScale:{min:0,max:100},observationDate:null,previousObservationDate:null,changePoints:null,history:[],weights:V2_WEIGHTS,components:[],historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',pointInTimeVerified:false,sourcePublishedAt:null,sourceAttribution:'금융위원회 공공데이터포털 · 금융투자협회종합통계정보 · 공시정보조회서비스 · ZGmini 자체 가공',briefMethodology:'V2 입력자료를 확인할 수 없습니다.',stagePolicy:'소수점 1자리 displayScore 기준: 25 미만 극단적 공포, 45 미만 공포, 55 이하 중립, 75 이하 탐욕, 그 이상 극단적 탐욕.'};
 return buildV2FromRows(inputs,now);
}
export function __resetV2CacheForTests(){cachedInputs=null;cachedAt=0;inFlight=null;}
