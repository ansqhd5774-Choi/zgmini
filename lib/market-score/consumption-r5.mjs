export const CONSUMPTION_R5 = 'CONSUMPTION_R5';
export const R5_WEIGHTS = Object.freeze({D:30,Y:25,L:15,H:20,B:10});
const finite = value => typeof value === 'number' && Number.isFinite(value);
const month = date => /^\d{4}-\d{2}-01$/.test(date ?? '') && +date.slice(5,7)>0 && +date.slice(5,7)<13 ? +date.slice(0,4)*12 + +date.slice(5,7)-1 : null;
const dateOf = index => `${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}-01`;

// Ties receive the midpoint rank. The current observation is never in its own reference distribution.
export function consumptionPercentile(value, history, expectedCount) {
  const valid=history.filter(finite);
  if (!finite(value) || history.length !== expectedCount || valid.length<Math.ceil(expectedCount*.9)) return null;
  return 100*(valid.filter(x=>x<value).length+0.5*valid.filter(x=>x===value).length)/valid.length;
}

// Inputs are already stored, with actual release dates attached. No network or fabricated release lag.
export function calculateConsumptionR5(input, {asOfDate}={}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate??'')) throw Error('R5_INVALID_ASOF');
  const maps = {};
  for (const [id, rows] of Object.entries(input?.series??{})) {
    maps[id]=new Map();
    for (const row of rows) {
      const index=month(row.observationDate);
      if(index===null) throw Error('R5_INVALID_OBSERVATION_DATE');
      if(maps[id].has(index)) throw Error('R5_DUPLICATE_OBSERVATION');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(row.availableDate??'')) throw Error('R5_RELEASE_DATE_REQUIRED');
      maps[id].set(index,row);
    }
  }
  const value=(id,index,cutoff)=>{
    const row=maps[id]?.get(index);
    return row && row.availableDate<=cutoff && finite(row.value) ? row.value : null;
  };
  const growth=(id,index,lag,cutoff,annualize=false)=>{
    const a=value(id,index,cutoff),b=value(id,index-lag,cutoff);
    return a>0&&b>0 ? 100*((a/b)**(annualize?12/lag:1)-1) : null;
  };
  const definitions=[
    ['pce3','D','실질 소비 최근 3개월',.40,'% 연율',1,(i,c)=>growth('realPce',i,3,c,true)],
    ['pce12','D','실질 소비 전년 대비',.35,'%',1,(i,c)=>growth('realPce',i,12,c)],
    ['perCapita','D','1인당 실질 소비 전년 대비',.25,'%',1,(i,c)=>growth('realPcePerCapita',i,12,c)],
    ['income3','Y','실질 가처분소득 최근 3개월',.60,'% 연율',1,(i,c)=>growth('realIncome',i,3,c,true)],
    ['income12','Y','실질 가처분소득 전년 대비',.40,'%',1,(i,c)=>growth('realIncome',i,12,c)],
    ['employment','L','고용인구비율 전년 대비 변화',.50,'%p',1,(i,c)=>{const a=value('employmentRatio',i,c),b=value('employmentRatio',i-12,c);return finite(a)&&finite(b)?a-b:null;}],
    ['payroll','L','실질 총급여 전년 대비',.50,'%',1,(i,c)=>growth('realPayroll',i,12,c)],
    ['saving','H','개인 저축률',.25,'%',1,(i,c)=>value('savingRate',i,c)],
    ['debt','H','소비자 부채 상환부담률',.35,'%',3,(i,c)=>value('consumerDebtService',i,c)],
    ['delinquency','H','소비자대출 연체율',.40,'%',3,(i,c)=>value('consumerDelinquency',i,c)],
    ['diffusion','B','세부 소비 증가 비중',.50,'%',1,(i,c)=>{
      const ids=input?.categoryIds??[];
      if(!ids.length||new Set(ids).size!==ids.length)return null;
      const g=ids.map(id=>growth(id,i,3,c));
      return g.every(finite)?100*g.filter(x=>x>0).length/g.length:null;
    }],
    ['goods','B','실질 상품 소비 전년 대비',.25,'%',1,(i,c)=>growth('realGoods',i,12,c)],
    ['services','B','실질 서비스 소비 전년 대비',.25,'%',1,(i,c)=>growth('realServices',i,12,c)],
  ];
  const results=[];
  // Keep reference data separate from the 13-month public output. A full 10-year reference is required.
  const indices=[...(maps.realPce?.keys()??[])].filter(i=>dateOf(i)<=asOfDate&&maps.realPce.get(i).availableDate<=asOfDate).sort((a,b)=>a-b).slice(-13);
  for(const index of indices){
    const date=dateOf(index);
    const cutoff=index===indices.at(-1)?asOfDate:maps.realPce.get(index).availableDate;
    const indicators=definitions.map(([id,area,name,weight,unit,step,feature])=>{
      let observed=index;
      if(step===3){
        const seriesId=id==='debt'?'consumerDebtService':'consumerDelinquency';
        const available=[...(maps[seriesId]?.keys()??[])].filter(i=>i<=index&&finite(value(seriesId,i,cutoff))).sort((a,b)=>a-b);
        observed=available.at(-1);
      }
      const raw=observed===undefined?null:feature(observed,cutoff);
      const reference=observed===undefined?[]:Array.from({length:120/step},(_,j)=>feature(observed-(j+1)*step,cutoff));
      let score=id==='diffusion'?raw:consumptionPercentile(raw,reference,120/step);
      if(['debt','delinquency'].includes(id)&&finite(score))score=100-score;
      if(step===3&&observed!==undefined&&index-observed>6)score=null;
      return {id,area,name,weight:R5_WEIGHTS[area]*weight,areaWeight:weight*100,value:raw,unit,score,status:finite(score)?'READY':'PARTIAL',referenceCount:reference.filter(finite).length,referenceExpected:120/step,observationDate:observed===undefined?null:dateOf(observed),source:input?.sources?.[id]??null};
    });
    const areas=Object.keys(R5_WEIGHTS).map(id=>{
      const parts=indicators.filter(x=>x.area===id);
      return {id,weight:R5_WEIGHTS[id],score:parts.every(x=>finite(x.score))?parts.reduce((s,x)=>s+x.score*x.areaWeight/100,0):null};
    });
    const ready=areas.every(x=>finite(x.score));
    results.push({date,status:ready?'READY':'PARTIAL',score:ready?areas.reduce((s,x)=>s+x.score*x.weight/100,0):null,areas,indicators,missingFactors:indicators.filter(x=>x.status!=='READY').map(x=>x.id)});
  }
  const latest=results.at(-1);
  const index=indices.at(-1),pce=index===undefined?null:growth('realPce',index,3,asOfDate,true),income=index===undefined?null:growth('realIncome',index,3,asOfDate,true),prior=index===undefined?null:growth('realPce',index-3,3,asOfDate,true);
  const diagnostics=[['gap','소비–소득 증가율 격차',finite(pce)&&finite(income)?pce-income:null],['acceleration','소비 가속·둔화',finite(pce)&&finite(prior)?pce-prior:null]].map(([id,name,value])=>({id,name,value,score:null,weight:0,unit:'%p',status:finite(value)?'READY':'PARTIAL',observationDate:latest?.date??null,source:'BEA U20306 / T20600 · 점수 합산 제외'}));
  return {status:latest?.status??'PARTIAL',score:latest?.score??null,methodologyVersion:CONSUMPTION_R5,updatedAt:latest?.date??null,asOfDate,indicators:[...(latest?.indicators??[]),...diagnostics],areas:latest?.areas??[],missingFactors:latest?.missingFactors??['R5_INPUT_PENDING'],trend:results.map(x=>({date:x.date,value:x.score,status:x.status})),historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,interpretation:'소비·소득·고용·가계 금융 여력·소비 확산의 종합 참고 지수. 50점은 역사적 중앙 수준이며 확률이 아닙니다.',rows:results};
}
