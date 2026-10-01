export const EMPLOYMENT_R54_METHOD="EMPLOYMENT_R54_STORED_4FACTOR_R1";
export const EMPLOYMENT_R54_CANDIDATE="EMPLOYMENT_R54_CANDIDATE_R1";

export const EMPLOYMENT_R54_WEIGHTS=Object.freeze({
  unemployment:0.30,
  payrollMomentum:0.30,
  claims4w:0.20,
  claimsBreadth:0.20,
});

export const EMPLOYMENT_R54_INDICATORS=Object.freeze([
  Object.freeze({id:"employment-41",name:"실업률",unit:"%"}),
  Object.freeze({id:"employment-42",name:"비농업고용 3M 평균 증감",unit:"천명/월"}),
  Object.freeze({id:"employment-43",name:"신규 실업수당 4W 평균",unit:"건"}),
  Object.freeze({id:"employment-44",name:"주 실업수당 개선 비율",unit:"%"}),
]);

const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clamp100=v=>Math.max(0,Math.min(100,v));
const dateOk=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

function normalize(rows=[]){
  const map=new Map();
  for(const row of rows??[]){
    const observationDate=row?.observationDate??row?.observation_date??row?.date;
    const value=Number(row?.value);
    if(!dateOk(observationDate)||!finite(value))continue;
    map.set(observationDate,{observationDate,value});
  }
  return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

function percentile(values,current){
  const xs=(values??[]).filter(finite);
  if(!xs.length||!finite(current))return null;
  let below=0,equal=0;
  for(const value of xs){
    if(value<current)below++;
    else if(value===current)equal++;
  }
  return 100*(below+0.5*equal)/xs.length;
}

function trailingPercentile(rows,currentValue,{limit,minValid,invert=false}={}){
  const xs=(rows??[]).slice(-limit).map(x=>x.value).filter(finite);
  if(xs.length<minValid)return null;
  const p=percentile(xs,currentValue);
  return p==null?null:clamp100(invert?100-p:p);
}

function scoredSeries(rows,{limit,minValid,invert=false,direct=false}={}){
  const out=[];
  for(let i=0;i<(rows??[]).length;i++){
    const row=rows[i];
    let score=null;
    if(direct)score=clamp100(row.value);
    else{
      const start=Math.max(0,i-limit+1);
      const xs=rows.slice(start,i+1).map(x=>x.value).filter(finite);
      if(xs.length>=minValid){
        const p=percentile(xs,row.value);
        score=p==null?null:clamp100(invert?100-p:p);
      }
    }
    out.push({...row,score});
  }
  return out;
}

function latestAtOrBefore(rows,date){
  let found=null;
  for(const row of rows??[]){
    if(row.observationDate>date)break;
    if(finite(row.score))found=row;
  }
  return found;
}

function monthKeyShift(date,delta){
  const [y,m]=String(date).slice(0,7).split("-").map(Number);
  if(!Number.isInteger(y)||!Number.isInteger(m))return null;
  const d=new Date(Date.UTC(y,m-1+delta,1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-01`;
}

function payrollMomentumRows(payrollRows=[]){
  const rows=normalize(payrollRows);
  const map=new Map(rows.map(x=>[x.observationDate,x.value]));
  const out=[];
  for(const row of rows){
    const lag=map.get(monthKeyShift(row.observationDate,-3));
    if(!finite(lag))continue;
    out.push({observationDate:row.observationDate,value:(row.value-lag)/3});
  }
  return out;
}

function claimsWeeklyTotalsFromRaw(rows=[]){
  const byDate=new Map();
  for(const row of rows??[]){
    const id=String(row?.logicalSeriesId??row?.logical_series_id??"");
    if(id!=="STATE_INITIAL_CLAIMS")continue;
    const observationDate=row?.observationDate??row?.observation_date;
    const geography=String(row?.geographyCode??row?.geography_code??"");
    const value=Number(row?.value);
    if(!dateOk(observationDate)||!geography||!finite(value)||value<0)continue;
    const bucket=byDate.get(observationDate)??new Map();
    bucket.set(geography,value);
    byDate.set(observationDate,bucket);
  }
  return [...byDate.entries()]
    .map(([observationDate,bucket])=>({
      observationDate,
      value:[...bucket.values()].reduce((a,b)=>a+b,0),
      geographyCount:bucket.size,
    }))
    .filter(x=>x.geographyCount>=51)
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

function claims4wFromWeeklyTotals(rows=[]){
  const weekly=normalize(rows);
  const out=[];
  for(let i=3;i<weekly.length;i++){
    const window=weekly.slice(i-3,i+1);
    out.push({
      observationDate:weekly[i].observationDate,
      value:window.reduce((s,x)=>s+x.value,0)/4,
    });
  }
  return out;
}

function claims4wRows(rows=[]){
  return claims4wFromWeeklyTotals(claimsWeeklyTotalsFromRaw(rows));
}

function claimsBreadthRows(rows=[]){
  const byState=new Map();
  for(const row of rows??[]){
    const id=String(row?.logicalSeriesId??row?.logical_series_id??"");
    if(id!=="STATE_INITIAL_CLAIMS")continue;
    const observationDate=row?.observationDate??row?.observation_date;
    const geography=String(row?.geographyCode??row?.geography_code??"");
    const value=Number(row?.value);
    if(!dateOk(observationDate)||!geography||!finite(value)||value<0)continue;
    const list=byState.get(geography)??[];
    list.push({observationDate,value});
    byState.set(geography,list);
  }
  const state4w=new Map();
  for(const [state,list] of byState){
    list.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
    for(let i=3;i<list.length;i++){
      const window=list.slice(i-3,i+1);
      const date=list[i].observationDate;
      const avg=window.reduce((sum,x)=>sum+x.value,0)/4;
      const bucket=state4w.get(date)??new Map();
      bucket.set(state,avg);
      state4w.set(date,bucket);
    }
  }
  const dates=[...state4w.keys()].sort();
  const out=[];
  for(let i=4;i<dates.length;i++){
    const current=state4w.get(dates[i]),prior=state4w.get(dates[i-4]);
    if(!current||!prior)continue;
    let eligible=0,improved=0;
    for(const [state,value] of current){
      const p=prior.get(state);
      if(!finite(p))continue;
      eligible++;
      if(value<=p)improved++;
    }
    if(eligible>=51)out.push({observationDate:dates[i],value:100*improved/eligible});
  }
  return out;
}

function indicator(def,{score=null,value=null,observationDate=null,source=null,status=null}={}){
  const ready=finite(score)&&score>=0&&score<=100&&finite(value)&&dateOk(observationDate);
  return {
    id:def.id,name:def.name,label:def.name,
    status:status??(ready?"READY":"PARTIAL"),
    score:ready?score:null,
    value:ready?value:null,
    unit:def.unit,
    observationDate:ready?observationDate:null,
    asOfDate:ready?observationDate:null,
    source:ready?source:null,
    sourceKey:def.id,
    missing:ready?[]:["EMPLOYMENT_R54_FACTOR_MISSING"],
  };
}

export function buildEmploymentR54Candidate({
  unemploymentRows=[],
  payrollLevelRows=[],
  shadowRows=[],
  claimsWeeklyTotalRows=null,
  claimsBreadthScoreRows=null,
  asOfDate="9999-12-31",
}={}){
  const unemployment=normalize(unemploymentRows).filter(x=>x.observationDate<=asOfDate);
  const payrollMomentum=payrollMomentumRows(payrollLevelRows).filter(x=>x.observationDate<=asOfDate);
  const claims4w=(Array.isArray(claimsWeeklyTotalRows)
    ? claims4wFromWeeklyTotals(claimsWeeklyTotalRows)
    : claims4wRows(shadowRows)).filter(x=>x.observationDate<=asOfDate);
  const claimsBreadth=(Array.isArray(claimsBreadthScoreRows)
    ? normalize(claimsBreadthScoreRows)
    : claimsBreadthRows(shadowRows)).filter(x=>x.observationDate<=asOfDate);

  const u=unemployment.at(-1)??null;
  const p=payrollMomentum.at(-1)??null;
  const c=claims4w.at(-1)??null;
  const b=claimsBreadth.at(-1)??null;

  const unemploymentScores=scoredSeries(unemployment,{limit:120,minValid:60,invert:true});
  const payrollScores=scoredSeries(payrollMomentum,{limit:120,minValid:60,invert:false});
  const claimsScores=scoredSeries(claims4w,{limit:52,minValid:26,invert:true});
  const breadthScores=scoredSeries(claimsBreadth,{direct:true});

  const uScore=unemploymentScores.at(-1)?.score??null;
  const pScore=payrollScores.at(-1)?.score??null;
  const cScore=claimsScores.at(-1)?.score??null;
  const bScore=breadthScores.at(-1)?.score??null;

  const indicators=[
    indicator(EMPLOYMENT_R54_INDICATORS[0],{score:uScore,value:u?.value,observationDate:u?.observationDate,source:"BLS / UNRATE"}),
    indicator(EMPLOYMENT_R54_INDICATORS[1],{score:pScore,value:p?.value,observationDate:p?.observationDate,source:"BLS / PAYEMS"}),
    indicator(EMPLOYMENT_R54_INDICATORS[2],{score:cScore,value:c?.value,observationDate:c?.observationDate,source:"DOL ETA 539 / stored state claims"}),
    indicator(EMPLOYMENT_R54_INDICATORS[3],{score:bScore,value:b?.value,observationDate:b?.observationDate,source:"DOL ETA 539 / stored state claims breadth"}),
  ];

  const scores=indicators.map(x=>x.score);
  const ready=scores.every(finite);
  const score=ready?clamp100(
    EMPLOYMENT_R54_WEIGHTS.unemployment*scores[0]+
    EMPLOYMENT_R54_WEIGHTS.payrollMomentum*scores[1]+
    EMPLOYMENT_R54_WEIGHTS.claims4w*scores[2]+
    EMPLOYMENT_R54_WEIGHTS.claimsBreadth*scores[3]
  ):null;

  const payrollScoreMap=new Map(payrollScores.filter(x=>finite(x.score)).map(x=>[x.observationDate,x]));
  const trend=[];
  for(const uRow of unemploymentScores){
    if(!finite(uRow.score))continue;
    const pRow=payrollScoreMap.get(uRow.observationDate);
    if(!pRow||!finite(pRow.score))continue;
    const cRow=latestAtOrBefore(claimsScores,uRow.observationDate);
    const bRow=latestAtOrBefore(breadthScores,uRow.observationDate);
    if(!cRow||!bRow)continue;
    const value=clamp100(
      EMPLOYMENT_R54_WEIGHTS.unemployment*uRow.score+
      EMPLOYMENT_R54_WEIGHTS.payrollMomentum*pRow.score+
      EMPLOYMENT_R54_WEIGHTS.claims4w*cRow.score+
      EMPLOYMENT_R54_WEIGHTS.claimsBreadth*bRow.score
    );
    trend.push({label:uRow.observationDate,value});
  }

  return {
    id:"employment",
    name:"고용",
    methodologyVersion:EMPLOYMENT_R54_METHOD,
    status:ready?"READY":"PARTIAL",
    score,
    indicators,
    trend:trend.slice(-120),
    missingFactors:ready?[]:indicators.filter(x=>x.status!=="READY").map(x=>x.id),
    interpretation:"Employment R54 candidate: 실업률 30% + 비농업고용 3M 평균 증감 30% + 신규 실업수당 4W 평균 20% + 주 실업수당 개선 비율 20%. 백분위 산식은 저장된 과거 데이터만 사용하며 결측 가중치 재배분은 하지 않습니다.",
    asOfDate,
    calculationMode:"STORED_DATA_ONLY",
  };
}

export async function loadEmploymentR54CandidateFromStored(db,{
  unemploymentRows=[],
  payrollLevelRows=[],
  asOfDate="9999-12-31",
}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const table="market_score_employment_r4_shadow_current_v1";
  const recentDates=`SELECT DISTINCT observation_date FROM ${table}
    WHERE logical_series_id='STATE_INITIAL_CLAIMS' AND observation_date<=?
    ORDER BY observation_date DESC LIMIT 60`;
  const weeklyResult=await db.prepare(`WITH recent_dates AS (${recentDates})
    SELECT observation_date,SUM(value) AS value,COUNT(DISTINCT geography_code) AS geography_count
    FROM ${table}
    WHERE logical_series_id='STATE_INITIAL_CLAIMS'
      AND observation_date IN (SELECT observation_date FROM recent_dates)
    GROUP BY observation_date
    HAVING geography_count>=51
    ORDER BY observation_date`).bind(asOfDate).all();
  const breadthResult=await db.prepare(`WITH recent_dates AS (${recentDates}),
    base AS (
      SELECT geography_code,observation_date,value,
        AVG(value) OVER (
          PARTITION BY geography_code ORDER BY observation_date
          ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS avg4,
        COUNT(value) OVER (
          PARTITION BY geography_code ORDER BY observation_date
          ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
        ) AS n4
      FROM ${table}
      WHERE logical_series_id='STATE_INITIAL_CLAIMS'
        AND observation_date IN (SELECT observation_date FROM recent_dates)
    ),
    lagged AS (
      SELECT geography_code,observation_date,avg4,n4,
        LAG(avg4,4) OVER (PARTITION BY geography_code ORDER BY observation_date) AS prior4,
        LAG(n4,4) OVER (PARTITION BY geography_code ORDER BY observation_date) AS prior_n4
      FROM base
    ),
    agg AS (
      SELECT observation_date,
        SUM(CASE WHEN n4=4 AND prior_n4=4 AND prior4 IS NOT NULL THEN 1 ELSE 0 END) AS eligible,
        SUM(CASE WHEN n4=4 AND prior_n4=4 AND prior4 IS NOT NULL AND avg4<=prior4 THEN 1 ELSE 0 END) AS improved
      FROM lagged
      GROUP BY observation_date
    )
    SELECT observation_date,100.0*improved/eligible AS value
    FROM agg
    WHERE eligible>=51
    ORDER BY observation_date`).bind(asOfDate).all();
  const weeklyRows=Array.isArray(weeklyResult?.results)?weeklyResult.results:Array.isArray(weeklyResult)?weeklyResult:[];
  const breadthRows=Array.isArray(breadthResult?.results)?breadthResult.results:Array.isArray(breadthResult)?breadthResult:[];
  return buildEmploymentR54Candidate({
    unemploymentRows,payrollLevelRows,
    claimsWeeklyTotalRows:weeklyRows,
    claimsBreadthScoreRows:breadthRows,
    asOfDate,
  });
}
