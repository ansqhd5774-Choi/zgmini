export const COMPOSITE_VERSION='kr-fg-2f-1.0.0';
export const WEIGHTS=Object.freeze({leverage:0.5,liquidationInverse:0.5});
export const TOLERANCE=1e-10;
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const dateValid=d=>typeof d==='string'&&/^\d{8}$/.test(d)&&new Date(Date.parse(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00:00Z`)).toISOString().slice(0,10).replaceAll('-','')===d;
export function calculateComposite(g,p){
 if(!valid(g)||!valid(p)||Math.abs(WEIGHTS.leverage+WEIGHTS.liquidationInverse-1)>TOLERANCE)return null;
 return WEIGHTS.leverage*g+WEIGHTS.liquidationInverse*(100-p);
}
export function describeScore(score){
 if(!valid(score))return {displayScore:null,stageCode:null,stageLabel:null};
 const displayScore=Number(score.toFixed(1));
 const [stageCode,stageLabel]=displayScore<25?['EXTREME_FEAR','극단적 공포']:displayScore<45?['FEAR','공포']:displayScore<=55?['NEUTRAL','중립']:displayScore<=75?['GREED','탐욕']:['EXTREME_GREED','극단적 탐욕'];
 return {displayScore,stageCode,stageLabel};
}
function indexHistory(history=[]){
 const map=new Map();
 for(const p of history){
  let ok=false;try{ok=dateValid(p.date);}catch{}if(!ok)continue;
  const value=valid(p.score)?p.score:null;
  // Conflicting duplicate dates fail closed; never select an arbitrary row.
  map.set(p.date,map.has(p.date)&&map.get(p.date)!==value?null:value);
 }
 return map;
}
export function buildComposite(indicators=[],now=new Date()){
 const credit=indicators.find(i=>i.id==='LEV_BLEND20_60'),capital=indicators.find(i=>i.id==='L3_PRESSURE_P252');
 const g=indexHistory(credit?.history),p=indexHistory(capital?.history);
 const dates=[...new Set([...g.keys(),...p.keys()])].sort();
 const history=dates.slice(-366).map(date=>{const score=calculateComposite(g.get(date),p.get(date));return {date,score,...describeScore(score)};});
 const last=history.findLast(x=>x.score!==null),previous=last?history.slice(0,history.indexOf(last)).findLast(x=>x.score!==null):null;
 const reasons=[];
 if(last){
  if(last.date!==dates.at(-1)||credit?.observationDate!==last.date||capital?.observationDate!==last.date)reasons.push('COMMON_DATE_LAG');
  if(credit?.status!=='READY'||capital?.status!=='READY')reasons.push('COMPONENT_NOT_READY');
  if(now.getTime()-Date.parse(`${last.date.slice(0,4)}-${last.date.slice(4,6)}-${last.date.slice(6,8)}T00:00:00Z`)>7*86400000)reasons.push('OBSERVATION_DELAY');
 }
 const components=last?[{id:'LEV_BLEND20_60',inputScore:g.get(last.date),orientedScore:g.get(last.date),weight:WEIGHTS.leverage,weightedContribution:WEIGHTS.leverage*g.get(last.date)},{id:'L3_PRESSURE_P252',inputScore:p.get(last.date),orientedScore:100-p.get(last.date),weight:WEIGHTS.liquidationInverse,weightedContribution:WEIGHTS.liquidationInverse*(100-p.get(last.date))}]:[];
 return {id:'ZGMINI_KR_FG_2F',name:'ZGmini 한국 공포·탐욕지수',beta:true,methodologyVersion:COMPOSITE_VERSION,
  status:last?(reasons.length?'STALE':'READY'):[credit,capital].some(i=>i?.status==='WARMUP')?'WARMUP':'UNAVAILABLE',staleReason:reasons.length?reasons.join(','):null,
  score:last?.score??null,...describeScore(last?.score),scoreScale:{min:0,max:100},observationDate:last?.date??null,previousObservationDate:previous?.date??null,changePoints:previous?last.score-previous.score:null,
  history,weights:WEIGHTS,components,historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',pointInTimeVerified:false,sourcePublishedAt:null,
  sourceAttribution:'금융위원회 공공데이터포털 · 금융투자협회종합통계정보 · ZGmini 자체 가공',
  briefMethodology:'신용융자 확대 정도와 반대매매 압력의 역점수를 각 50% 반영한 2요소 베타 지수입니다.',
  stagePolicy:'소수점 1자리 displayScore 기준: 25 미만 극단적 공포, 45 미만 공포, 55 이하 중립, 75 이하 탐욕, 그 이상 극단적 탐욕. 베타 운영 기준이며 최적 비중 또는 공식기관 승인 기준이 아닙니다.'};
}
