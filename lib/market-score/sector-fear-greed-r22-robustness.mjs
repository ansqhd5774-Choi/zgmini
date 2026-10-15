export const R22_ROBUSTNESS_WARNING_THRESHOLD=0.70;

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;

export function pearsonCorrelation(left=[],right=[]){
  if(left.length!==right.length||left.length<20)return null;
  const x=left.map(Number),y=right.map(Number);
  if(!x.every(finite)||!y.every(finite))return null;
  const mx=mean(x),my=mean(y);let num=0,dx=0,dy=0;
  for(let i=0;i<x.length;i++){
    const a=x[i]-mx,b=y[i]-my;num+=a*b;dx+=a*a;dy+=b*b;
  }
  return dx>0&&dy>0?num/Math.sqrt(dx*dy):null;
}

function averageRanks(values){
  const pairs=values.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value||a.index-b.index),ranks=new Array(values.length);
  let i=0;
  while(i<pairs.length){
    let j=i+1;while(j<pairs.length&&pairs[j].value===pairs[i].value)j++;
    const rank=(i+1+j)/2;
    for(let k=i;k<j;k++)ranks[pairs[k].index]=rank;
    i=j;
  }
  return ranks;
}

export function spearmanCorrelation(left=[],right=[]){
  if(left.length!==right.length||left.length<20)return null;
  const x=left.map(Number),y=right.map(Number);
  if(!x.every(finite)||!y.every(finite))return null;
  return pearsonCorrelation(averageRanks(x),averageRanks(y));
}

export function splitChronologicalHistory(history=[]){
  const clean=(Array.isArray(history)?history:[])
    .filter(row=>typeof row?.date==="string"&&finite(row?.lotteryDemand)&&finite(row?.speculativeVolume))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const mid=Math.floor(clean.length/2);
  return {all:clean,first:clean.slice(0,mid),second:clean.slice(mid)};
}

function median(values){
  const clean=values.filter(finite).sort((a,b)=>a-b);if(!clean.length)return null;
  const mid=Math.floor(clean.length/2);return clean.length%2?clean[mid]:(clean[mid-1]+clean[mid])/2;
}

export function summarizeMemberCoverage(rows=[]){
  const members=(Array.isArray(rows)?rows:[]).map(row=>Number(row?.memberObservations)).filter(finite);
  const quartiles=(Array.isArray(rows)?rows:[]).map(row=>Number(row?.quartileSize)).filter(finite);
  return {
    observations:rows.length,
    memberMin:members.length?Math.min(...members):null,
    memberMedian:median(members),
    memberMax:members.length?Math.max(...members):null,
    quartileMedian:median(quartiles),
  };
}

export function alignedCorrelation(leftRows,leftKey,rightRows,rightKey,{method="pearson"}={}){
  const right=new Map((Array.isArray(rightRows)?rightRows:[]).filter(row=>typeof row?.date==="string"&&finite(row?.[rightKey])).map(row=>[row.date,row[rightKey]]));
  const x=[],y=[];
  for(const row of Array.isArray(leftRows)?leftRows:[]){
    if(typeof row?.date!=="string"||!finite(row?.[leftKey])||!right.has(row.date))continue;
    x.push(row[leftKey]);y.push(right.get(row.date));
  }
  const fn=method==="spearman"?spearmanCorrelation:pearsonCorrelation;
  return {observations:x.length,correlation:fn(x,y)};
}

export function maxAbsCorrelation(items=[]){
  const values=items.map(item=>Math.abs(Number(item?.correlation))).filter(finite);
  return values.length?Math.max(...values):null;
}
