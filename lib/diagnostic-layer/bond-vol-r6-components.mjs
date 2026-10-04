import {bondVolatilityScore} from './model.mjs';
import {normalizeRows} from './series-math.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);

export function sampleStd(values) {
  const x = values.filter(finite);
  if (x.length < 2) return null;
  const mean = x.reduce((sum,v)=>sum+v,0)/x.length;
  return Math.sqrt(x.reduce((sum,v)=>sum+(v-mean)**2,0)/(x.length-1));
}

function prefixInversePercentile(values,index,minValid) {
  const current=values[index];
  if (!finite(current)) return null;
  const ref=values.slice(0,index+1).filter(finite);
  if (ref.length<minValid) return null;
  let lower=0,equal=0;
  for(const value of ref){
    if(value<current)lower++;
    else if(value===current)equal++;
  }
  return 100*(1-(lower+0.5*equal)/ref.length);
}

export function buildTreasuryTenorVolatility(rows = []) {
  const normalized=normalizeRows(rows);
  const changes=[];
  const rv20=[];
  const scores=[];
  for(let i=0;i<normalized.length;i++){
    const change=i===0?null:100*(normalized[i].value-normalized[i-1].value);
    changes.push(change);
    const rv=i>=20?sampleStd(changes.slice(i-19,i+1)):null;
    rv20.push(rv);
    scores.push(prefixInversePercentile(rv20,i,252));
  }
  return normalized.map((row,i)=>({
    observationDate:row.observationDate,
    yield:row.value,
    dyBp:changes[i],
    rv20:rv20[i],
    score:scores[i],
  }));
}

export function buildBondVolatilityR6({y2=[],y5=[],y10=[],y30=[]} = {}) {
  const legs={
    y2:buildTreasuryTenorVolatility(y2),
    y5:buildTreasuryTenorVolatility(y5),
    y10:buildTreasuryTenorVolatility(y10),
    y30:buildTreasuryTenorVolatility(y30),
  };
  const maps=Object.fromEntries(Object.entries(legs).map(([key,rows])=>[key,new Map(rows.map(row=>[row.observationDate,row]))]));
  const dates=[...new Set(Object.values(legs).flatMap(rows=>rows.map(row=>row.observationDate)))].sort();
  const rows=[];
  for(const observationDate of dates){
    const legScores=Object.fromEntries(Object.keys(legs).map(key=>[key,maps[key].get(observationDate)?.score??null]));
    const final=bondVolatilityScore(legScores);
    rows.push({
      observationDate,
      y2Score:legScores.y2,
      y5Score:legScores.y5,
      y10Score:legScores.y10,
      y30Score:legScores.y30,
      status:final.status,
      score:final.score,
    });
  }
  return {
    status:rows.some(row=>row.status==='READY')?'READY_CURRENT_VINTAGE':'INSUFFICIENT_HISTORY',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    stdConvention:'SAMPLE_N_MINUS_1',
    legs,
    rows,
  };
}
