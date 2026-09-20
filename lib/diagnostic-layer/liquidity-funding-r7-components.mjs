import {fundingStressScore} from './model.mjs';
import {normalizeRows} from './series-math.mjs';
import {sampleStd} from './bond-vol-r6-components.mjs';

const finite=value=>typeof value==='number'&&Number.isFinite(value);

function prefixInversePercentile(values,index,minValid){
  const current=values[index];
  if(!finite(current))return null;
  const ref=values.slice(0,index+1).filter(finite);
  if(ref.length<minValid)return null;
  let lower=0,equal=0;
  for(const value of ref){
    if(value<current)lower++;
    else if(value===current)equal++;
  }
  return 100*(1-(lower+0.5*equal)/ref.length);
}

function mapRows(rows){
  return new Map(normalizeRows(rows).map(row=>[row.observationDate,row.value]));
}

function latestLE(rows,date){
  let answer=null;
  for(const row of rows){
    if(row.observationDate<=date)answer=row;
    else break;
  }
  return answer;
}

function scoreSeries(rows,minValid){
  const normalized=normalizeRows(rows);
  const values=normalized.map(row=>row.value);
  return normalized.map((row,index)=>({
    observationDate:row.observationDate,
    rawValue:row.value,
    score:prefixInversePercentile(values,index,minValid),
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
} = {}){
  const p=mapRows(primaryCredit),s=mapRows(secondaryCredit),b=mapRows(btfp),o=mapRows(otherCreditExtensions);
  const assets=normalizeRows(totalCommercialBankAssets);
  const dates=[...new Set([...p.keys(),...s.keys(),...b.keys(),...o.keys()])].sort();
  const raw=[];
  for(const observationDate of dates){
    const qualifiedOther=qualifyOtherCreditExtensions(observationDate,o.get(observationDate));
    const parts=[p.get(observationDate)??0,s.get(observationDate)??0,b.get(observationDate)??0,qualifiedOther];
    const asset=latestLE(assets,observationDate);
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
} = {}){
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
  const scoreMaps={
    sofrIorb:new Map(aScore.map(row=>[row.observationDate,row.score])),
    obfrIorb:new Map(bScore.map(row=>[row.observationDate,row.score])),
    repoGap:new Map(cScore.map(row=>[row.observationDate,row.score])),
    sofrIorbRv20:new Map(dScore.map(row=>[row.observationDate,row.score])),
  };
  const bankRows=(bankEmergency?.rows??[]).filter(row=>finite(row.score)).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));

  const dates=[...new Set([
    ...aScore.map(r=>r.observationDate),...bScore.map(r=>r.observationDate),
    ...cScore.map(r=>r.observationDate),...dScore.map(r=>r.observationDate),
  ])].sort();

  const latestScoreLE=(map,date)=>{
    let answer=null;
    for(const [d,score] of map){
      if(d<=date&&finite(score))answer={observationDate:d,score};
      if(d>date)break;
    }
    return answer;
  };

  const rows=[];
  for(const observationDate of dates){
    const current={
      sofrIorb:latestScoreLE(scoreMaps.sofrIorb,observationDate),
      obfrIorb:latestScoreLE(scoreMaps.obfrIorb,observationDate),
      repoGap:latestScoreLE(scoreMaps.repoGap,observationDate),
      sofrIorbRv20:latestScoreLE(scoreMaps.sofrIorbRv20,observationDate),
    };
    const bank=latestLE(bankRows,observationDate);
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
