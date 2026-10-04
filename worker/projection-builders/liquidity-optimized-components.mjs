import {fundingStressScore,bondVolatilityScore} from '../../lib/diagnostic-layer/model.mjs';
import {normalizeRows} from '../../lib/diagnostic-layer/series-math.mjs';

const finite=value=>typeof value==='number'&&Number.isFinite(value);

export function expandingPercentileValues(values,{inverse=false,minValid=1}={}){
  const finiteValues=values.filter(finite);
  const unique=[...new Set(finiteValues)].sort((a,b)=>a-b);
  const indexOf=value=>{
    let lo=0,hi=unique.length-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1,cur=unique[mid];
      if(cur<value)lo=mid+1;
      else if(cur>value)hi=mid-1;
      else return mid+1;
    }
    return 0;
  };
  const tree=new Int32Array(unique.length+1);
  const add=(index,delta)=>{for(let i=index;i<tree.length;i+=i&-i)tree[i]+=delta};
  const sum=index=>{let total=0;for(let i=index;i>0;i-=i&-i)total+=tree[i];return total};
  const out=new Array(values.length).fill(null);
  let valid=0;
  for(let i=0;i<values.length;i++){
    const value=values[i];
    if(!finite(value))continue;
    const idx=indexOf(value);
    add(idx,1);valid++;
    if(valid<minValid)continue;
    const lower=sum(idx-1),equal=sum(idx)-lower;
    const rank=(lower+0.5*equal)/valid;
    out[i]=100*(inverse?1-rank:rank);
  }
  return out;
}

function expandingPercentileRowsOptimized(rows,{inverse=false,minValid=1}={}){
  const normalized=normalizeRows(rows);
  const scores=expandingPercentileValues(normalized.map(row=>row.value),{inverse,minValid});
  const out=[];
  for(let i=0;i<normalized.length;i++){
    if(scores[i]===null)continue;
    out.push({
      observationDate:normalized[i].observationDate,
      value:scores[i],
      rawValue:normalized[i].value,
      validHistory:i+1,
    });
  }
  return out;
}

function normalizePositiveRows(rows){
  return normalizeRows(rows).filter(row=>row.value>0);
}

function lagDifferenceRows(rows,lagObservations){
  const normalized=normalizeRows(rows),out=[];
  for(let i=lagObservations;i<normalized.length;i+=1){
    const current=normalized[i],prior=normalized[i-lagObservations];
    out.push({
      observationDate:current.observationDate,
      value:current.value-prior.value,
      sourceValue:current.value,
      lagValue:prior.value,
      lagObservations,
    });
  }
  return out;
}

function yoyGrowthRows(rows,lagObservations=12){
  const normalized=normalizePositiveRows(rows),out=[];
  for(let i=lagObservations;i<normalized.length;i+=1){
    const current=normalized[i],prior=normalized[i-lagObservations];
    if(!(prior.value>0))continue;
    out.push({
      observationDate:current.observationDate,
      value:100*(current.value/prior.value-1),
      sourceValue:current.value,
      lagValue:prior.value,
      lagObservations,
    });
  }
  return out;
}

function mergeRawAndScore(rawRows,scoredRows){
  const scoreByDate=new Map(scoredRows.map(row=>[row.observationDate,row]));
  return rawRows.map(row=>({
    ...row,
    score:scoreByDate.get(row.observationDate)?.value??null,
    validHistory:scoreByDate.get(row.observationDate)?.validHistory??null,
  }));
}

export function buildBankReservesR1(rows=[]){
  const raw=normalizeRows(rows);
  const scored=expandingPercentileRowsOptimized(raw,{inverse:false,minValid:52});
  return {
    revision:'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    component:'bankReserves',
    transform:'WEEKLY_LEVEL_EXPANDING_PERCENTILE',
    minHistory:52,
    historyUnit:'WEEKLY_OBSERVATIONS',
    status:scored.length?'READY_CURRENT_VINTAGE':'INSUFFICIENT_HISTORY',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    rows:mergeRawAndScore(raw,scored),
  };
}

export function buildTgaR1(rows=[]){
  const raw=lagDifferenceRows(rows,4);
  const scored=expandingPercentileRowsOptimized(
    raw.map(row=>({observationDate:row.observationDate,value:row.value})),
    {inverse:true,minValid:52},
  );
  return {
    revision:'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    component:'tga',
    transform:'4_WEEK_CHANGE_INVERSE_EXPANDING_PERCENTILE',
    changeDefinition:'CURRENT_MINUS_4_PRIOR_WEEKLY_OBSERVATIONS',
    minHistory:52,
    historyUnit:'VALID_4_WEEK_CHANGES',
    status:scored.length?'READY_CURRENT_VINTAGE':'INSUFFICIENT_HISTORY',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    rows:mergeRawAndScore(raw,scored),
  };
}

export function buildOnRrpR1(rows=[]){
  const raw=lagDifferenceRows(rows,20);
  const scored=expandingPercentileRowsOptimized(
    raw.map(row=>({observationDate:row.observationDate,value:row.value})),
    {inverse:true,minValid:252},
  );
  return {
    revision:'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    component:'onRrp',
    transform:'20_BUSINESS_DAY_CHANGE_INVERSE_EXPANDING_PERCENTILE',
    changeDefinition:'CURRENT_MINUS_20_PRIOR_DAILY_OBSERVATIONS',
    minHistory:252,
    historyUnit:'VALID_20_BUSINESS_DAY_CHANGES',
    status:scored.length?'READY_CURRENT_VINTAGE':'INSUFFICIENT_HISTORY',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    rows:mergeRawAndScore(raw,scored),
  };
}

export function buildM2R1(rows=[]){
  const raw=yoyGrowthRows(rows,12);
  const scored=expandingPercentileRowsOptimized(
    raw.map(row=>({observationDate:row.observationDate,value:row.value})),
    {inverse:false,minValid:60},
  );
  return {
    revision:'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    component:'m2',
    transform:'YOY_GROWTH_EXPANDING_PERCENTILE',
    growthDefinition:'100*(CURRENT/LAG12-1)',
    minHistory:60,
    historyUnit:'VALID_YOY_MONTHLY_GROWTH_OBSERVATIONS',
    status:scored.length?'READY_CURRENT_VINTAGE':'INSUFFICIENT_HISTORY',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    rows:mergeRawAndScore(raw,scored),
  };
}

export function sampleStd(values){
  const x=values.filter(finite);
  if(x.length<2)return null;
  const mean=x.reduce((sum,v)=>sum+v,0)/x.length;
  return Math.sqrt(x.reduce((sum,v)=>sum+(v-mean)**2,0)/(x.length-1));
}

export function buildTreasuryTenorVolatility(rows=[]){
  const normalized=normalizeRows(rows),changes=[],rv20=[];
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

export function buildBondVolatilityR6({y2=[],y5=[],y10=[],y30=[]}={}){
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

function mapRows(rows){
  return new Map(normalizeRows(rows).map(row=>[row.observationDate,row.value]));
}

function carryLatestRows(rows,dates){
  const sorted=[...(rows??[])].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const out=new Map();let cursor=0,answer=null;
  for(const date of dates){
    while(cursor<sorted.length&&sorted[cursor].observationDate<=date){answer=sorted[cursor];cursor++;}
    out.set(date,answer);
  }
  return out;
}

function scoreSeries(rows,minValid){
  const normalized=normalizeRows(rows);
  const scores=expandingPercentileValues(normalized.map(row=>row.value),{inverse:true,minValid});
  return normalized.map((row,index)=>({
    observationDate:row.observationDate,
    rawValue:row.value,
    score:scores[index],
  }));
}

export function qualifyOtherCreditExtensions(observationDate,value){
  if(!finite(value))return null;
  if(observationDate>='2023-03-15'&&observationDate<='2023-11-30')return value;
  return value===0?0:null;
}

export function buildBankEmergencyR7({
  primaryCredit=[],
  secondaryCredit=[],
  btfp=[],
  otherCreditExtensions=[],
  totalCommercialBankAssets=[],
}={}){
  const p=mapRows(primaryCredit),s=mapRows(secondaryCredit),b=mapRows(btfp),o=mapRows(otherCreditExtensions);
  const assets=normalizeRows(totalCommercialBankAssets);
  const dates=[...new Set([...p.keys(),...s.keys(),...b.keys(),...o.keys()])].sort();
  const assetByDate=carryLatestRows(assets,dates),raw=[];
  for(const observationDate of dates){
    const qualifiedOther=qualifyOtherCreditExtensions(observationDate,o.get(observationDate));
    const parts=[p.get(observationDate)??0,s.get(observationDate)??0,b.get(observationDate)??0,qualifiedOther];
    const asset=assetByDate.get(observationDate);
    const complete=parts.every(finite)&&finite(asset?.value)&&asset.value>0;
    const emergencyFunding=complete?parts.reduce((sum,v)=>sum+v,0):null;
    const emergencyRatio=complete?emergencyFunding/(asset.value*1000):null;
    raw.push({observationDate,qualifiedOtherCredit:qualifiedOther,emergencyFunding,assetsBillion:asset?.value??null,emergencyRatio});
  }
  const scored=scoreSeries(raw.filter(row=>finite(row.emergencyRatio)).map(row=>({observationDate:row.observationDate,value:row.emergencyRatio})),52);
  const scoreByDate=new Map(scored.map(row=>[row.observationDate,row.score]));
  const rows=raw.map(row=>({...row,score:scoreByDate.get(row.observationDate)??null}));
  return {
    status:rows.some(row=>finite(row.score))?'READY_CURRENT_VINTAGE':'PARTIAL',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    rows,
  };
}

export function buildFundingStressR7({
  sofr=[],
  iorb=[],
  obfr=[],
  dvpRepo=[],
  triPartyRepo=[],
  bankEmergency,
}={}){
  const ms=mapRows(sofr),mi=mapRows(iorb),mo=mapRows(obfr),md=mapRows(dvpRepo),mt=mapRows(triPartyRepo);
  const abDates=[...new Set([...ms.keys(),...mi.keys(),...mo.keys()])].sort();
  const aRows=[],bRows=[],spreadRows=[];
  for(const observationDate of abDates){
    const s=ms.get(observationDate),i=mi.get(observationDate),o=mo.get(observationDate);
    if(finite(s)&&finite(i)){
      const spread=s-i;
      aRows.push({observationDate,value:Math.max(0,spread)});
      spreadRows.push({observationDate,value:spread});
    }
    if(finite(o)&&finite(i))bRows.push({observationDate,value:Math.max(0,o-i)});
  }
  const cRows=[...md.keys()].filter(date=>mt.has(date)).sort().map(observationDate=>({
    observationDate,value:Math.abs(md.get(observationDate)-mt.get(observationDate)),
  }));
  const dRows=[];
  for(let index=0;index<spreadRows.length;index++){
    if(index<19)continue;
    const rv=sampleStd(spreadRows.slice(index-19,index+1).map(row=>row.value));
    if(finite(rv))dRows.push({observationDate:spreadRows[index].observationDate,value:rv});
  }
  const aScore=scoreSeries(aRows,252),bScore=scoreSeries(bRows,252),cScore=scoreSeries(cRows,252),dScore=scoreSeries(dRows,252);
  const bankRows=(bankEmergency?.rows??[]).filter(row=>finite(row.score)).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const dates=[...new Set([
    ...aScore.map(r=>r.observationDate),...bScore.map(r=>r.observationDate),
    ...cScore.map(r=>r.observationDate),...dScore.map(r=>r.observationDate),
  ])].sort();
  const carry={
    sofrIorb:carryLatestRows(aScore.filter(row=>finite(row.score)),dates),
    obfrIorb:carryLatestRows(bScore.filter(row=>finite(row.score)),dates),
    repoGap:carryLatestRows(cScore.filter(row=>finite(row.score)),dates),
    sofrIorbRv20:carryLatestRows(dScore.filter(row=>finite(row.score)),dates),
    bank:carryLatestRows(bankRows,dates),
  };
  const rows=[];
  for(const observationDate of dates){
    const current={
      sofrIorb:carry.sofrIorb.get(observationDate),
      obfrIorb:carry.obfrIorb.get(observationDate),
      repoGap:carry.repoGap.get(observationDate),
      sofrIorbRv20:carry.sofrIorbRv20.get(observationDate),
    };
    const bank=carry.bank.get(observationDate);
    const final=fundingStressScore({
      sofrIorb:current.sofrIorb?.score??null,
      obfrIorb:current.obfrIorb?.score??null,
      repoGap:current.repoGap?.score??null,
      sofrIorbRv20:current.sofrIorbRv20?.score??null,
      bankEmergency:bank?.score??null,
    });
    rows.push({
      observationDate,
      sofrIorbScore:current.sofrIorb?.score??null,
      obfrIorbScore:current.obfrIorb?.score??null,
      repoGapScore:current.repoGap?.score??null,
      sofrIorbRv20Score:current.sofrIorbRv20?.score??null,
      bankEmergencyScore:bank?.score??null,
      bankEmergencyObservationDate:bank?.observationDate??null,
      status:final.status,
      score:final.score,
      missing:final.missing,
    });
  }
  return {
    status:rows.some(row=>row.status==='READY')?'READY_CURRENT_VINTAGE':'PARTIAL',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    carryPolicy:'AS_OF_CARRY_ONLY_NO_INTERPOLATION',
    components:{aRows,bRows,cRows,dRows,aScore,bScore,cScore,dScore},
    rows,
  };
}
