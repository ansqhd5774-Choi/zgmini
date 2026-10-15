export const SECTOR_FEAR_GREED_R24_DYNAMICS_METHOD="SECTOR-FEAR-GREED-R2.4-DYNAMICS-R1";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return null;const middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};

export function quantileR24(values=[],q=0.5){
  const sorted=(Array.isArray(values)?values:[]).filter(finite).sort((a,b)=>a-b);
  if(!sorted.length||!finite(q)||q<0||q>1)return null;
  if(sorted.length===1)return sorted[0];
  const position=(sorted.length-1)*q,lower=Math.floor(position),upper=Math.ceil(position);
  if(lower===upper)return sorted[lower];
  const weight=position-lower;
  return sorted[lower]*(1-weight)+sorted[upper]*weight;
}

export function pearsonR24(a=[],b=[]){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||a.length<2)return null;
  const pairs=a.map((value,index)=>[value,b[index]]).filter(([x,y])=>finite(x)&&finite(y));
  if(pairs.length<2)return null;
  const xs=pairs.map(([x])=>x),ys=pairs.map(([,y])=>y),xm=mean(xs),ym=mean(ys);
  let numerator=0,xss=0,yss=0;
  for(let i=0;i<pairs.length;i++){const dx=xs[i]-xm,dy=ys[i]-ym;numerator+=dx*dy;xss+=dx*dx;yss+=dy*dy;}
  if(!(xss>0)||!(yss>0))return null;
  return numerator/Math.sqrt(xss*yss);
}

export function summarizeR24Dynamics(rows=[]){
  const ordered=[...(Array.isArray(rows)?rows:[])].filter(row=>finite(row?.score)).sort((a,b)=>String(a?.date??"").localeCompare(String(b?.date??"")));
  const scores=ordered.map(row=>row.score);
  if(!scores.length)return {n:0,dateStart:null,dateEnd:null,min:null,p05:null,p25:null,median:null,p75:null,p95:null,max:null,std:null,p95p05Span:null,extremeFearShare:null,fearShare:null,neutralShare:null,greedShare:null,extremeGreedShare:null,uniqueScoreCount:0,lag1Correlation:null,meanAbsSequentialChange:null,p95AbsSequentialChange:null,minMembers:null,medianMembers:null,minQuartileSize:null,medianQuartileSize:null};
  const m=mean(scores),std=Math.sqrt(mean(scores.map(value=>(value-m)**2))),changes=[];
  for(let i=1;i<scores.length;i++)changes.push(Math.abs(scores[i]-scores[i-1]));
  const members=ordered.map(row=>row?.memberObservations).filter(finite),quartiles=ordered.map(row=>row?.quartileSize).filter(finite),unique=new Set(scores.map(value=>Number(value.toFixed(10))).filter(finite));
  const lag1=scores.length>1?pearsonR24(scores.slice(0,-1),scores.slice(1)):null;
  const p05=quantileR24(scores,0.05),p95=quantileR24(scores,0.95);
  return {
    n:scores.length,
    dateStart:ordered[0]?.date??null,
    dateEnd:ordered.at(-1)?.date??null,
    min:Math.min(...scores),
    p05,
    p25:quantileR24(scores,0.25),
    median:quantileR24(scores,0.50),
    p75:quantileR24(scores,0.75),
    p95,
    max:Math.max(...scores),
    std,
    p95p05Span:finite(p05)&&finite(p95)?p95-p05:null,
    extremeFearShare:scores.filter(value=>value<25).length/scores.length,
    fearShare:scores.filter(value=>value>=25&&value<45).length/scores.length,
    neutralShare:scores.filter(value=>value>=45&&value<=55).length/scores.length,
    greedShare:scores.filter(value=>value>55&&value<=75).length/scores.length,
    extremeGreedShare:scores.filter(value=>value>75).length/scores.length,
    uniqueScoreCount:unique.size,
    lag1Correlation:lag1,
    meanAbsSequentialChange:changes.length?mean(changes):null,
    p95AbsSequentialChange:changes.length?quantileR24(changes,0.95):null,
    minMembers:members.length?Math.min(...members):null,
    medianMembers:members.length?median(members):null,
    minQuartileSize:quartiles.length?Math.min(...quartiles):null,
    medianQuartileSize:quartiles.length?median(quartiles):null
  };
}
