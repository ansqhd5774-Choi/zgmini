import {bondVolatilityScore} from './model.mjs';
import {normalizeRows,expandingPercentileValues} from './series-math.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);

export function sampleStd(values) {
  const x = values.filter(finite);
  if (x.length < 2) return null;
  const mean = x.reduce((sum,v)=>sum+v,0)/x.length;
  return Math.sqrt(x.reduce((sum,v)=>sum+(v-mean)**2,0)/(x.length-1));
}

export function buildTreasuryTenorVolatility(rows = []) {
  const normalized=normalizeRows(rows);
  const changes=[];
  const rv20=[];
  for(let i=0;i<normalized.length;i++){
    const change=i===0?null:100*(normalized[i].value-normalized[i-1].value);
    changes.push(change);
    const rv=i>=20?sampleStd(changes.slice(i-19,i+1)):null;
    rv20.push(rv);
  }
  const scores=expandingPercentileValues(rv20,{inverse:true,minValid:252});
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
