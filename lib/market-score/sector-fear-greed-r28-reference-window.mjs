export const SECTOR_FEAR_GREED_R28_WINDOWS=Object.freeze([126,189,252]);

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;

export function percentileWindow(values,current,window){
  const clean=(Array.isArray(values)?values:[]).filter(finite);
  const size=Number(window);
  if(!finite(current)||!Number.isInteger(size)||size<1||clean.length<size)return null;
  const sample=clean.slice(-size);
  let below=0,equal=0;
  for(const value of sample){if(value<current)below++;else if(value===current)equal++;}
  return clamp(100*(below+0.5*equal)/sample.length,0,100);
}

export function scoreRawAxis(rows,spec,window){
  const source=(Array.isArray(rows)?rows:[]).filter(row=>row&&typeof row.date==="string");
  const metrics=Array.isArray(spec?.metrics)?spec.metrics:[];
  const size=Number(window);
  if(!metrics.length||!Number.isInteger(size)||size<1)return [];
  const histories=Object.fromEntries(metrics.map(metric=>[metric.key,[]]));
  const output=[];
  for(const row of source){
    let valid=true;
    for(const metric of metrics){const value=Number(row[metric.key]);if(!finite(value)){valid=false;break;}histories[metric.key].push(value);}
    if(!valid)continue;
    if(metrics.some(metric=>histories[metric.key].length<size))continue;
    let score=0;
    for(const metric of metrics){
      const values=histories[metric.key],current=values.at(-1),pct=percentileWindow(values,current,size);
      if(!finite(pct)){valid=false;break;}
      const transformed=metric.invert?100-pct:pct;
      score+=Number(metric.weight)*transformed;
    }
    if(valid)output.push({date:row.date,score:clamp(score,0,100)});
  }
  return output;
}

export function scoreRawAxisFullAvailable(rows,spec){
  const source=(Array.isArray(rows)?rows:[]).filter(row=>row&&typeof row.date==="string");
  if(!source.length)return null;
  const metrics=Array.isArray(spec?.metrics)?spec.metrics:[];
  if(!metrics.length)return null;
  let score=0;
  for(const metric of metrics){
    const values=source.map(row=>Number(row[metric.key])).filter(finite);
    if(!values.length)return null;
    const pct=percentileWindow(values,values.at(-1),values.length);
    if(!finite(pct))return null;
    score+=Number(metric.weight)*(metric.invert?100-pct:pct);
  }
  return clamp(score,0,100);
}

export function alignSeries(left,right){
  const map=new Map((Array.isArray(right)?right:[]).filter(row=>finite(row?.score)).map(row=>[row.date,row.score]));
  return (Array.isArray(left)?left:[]).filter(row=>finite(row?.score)&&map.has(row.date)).map(row=>({date:row.date,left:row.score,right:map.get(row.date)}));
}

function pearsonPairs(pairs){
  if(!Array.isArray(pairs)||pairs.length<3)return null;
  const xs=pairs.map(row=>row.left),ys=pairs.map(row=>row.right),mx=mean(xs),my=mean(ys);
  let cov=0,vx=0,vy=0;
  for(let i=0;i<xs.length;i++){const dx=xs[i]-mx,dy=ys[i]-my;cov+=dx*dy;vx+=dx*dx;vy+=dy*dy;}
  return vx>0&&vy>0?cov/Math.sqrt(vx*vy):null;
}

function ranks(values){
  const indexed=values.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value),out=Array(values.length);
  for(let i=0;i<indexed.length;){let j=i+1;while(j<indexed.length&&indexed[j].value===indexed[i].value)j++;const rank=(i+j-1)/2+1;for(let k=i;k<j;k++)out[indexed[k].index]=rank;i=j;}
  return out;
}

export function correlation(left,right,{method="pearson"}={}){
  const pairs=alignSeries(left,right);
  if(method==="pearson")return pearsonPairs(pairs);
  if(method!=="spearman"||pairs.length<3)return null;
  const rx=ranks(pairs.map(row=>row.left)),ry=ranks(pairs.map(row=>row.right));
  return pearsonPairs(rx.map((value,index)=>({left:value,right:ry[index]})));
}

function quantile(values,p){
  const sorted=values.filter(finite).sort((a,b)=>a-b);if(!sorted.length)return null;
  const pos=(sorted.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);
  return lo===hi?sorted[lo]:sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo);
}

export function summarizeScoreSeries(rows){
  const source=(Array.isArray(rows)?rows:[]).filter(row=>finite(row?.score));
  if(!source.length)return {n:0,current:null,mean:null,lag1:null,p95AbsDelta:null,extremeShare:null,firstMean:null,secondMean:null,meanShift:null};
  const values=source.map(row=>row.score),deltas=[];
  for(let i=1;i<values.length;i++)deltas.push(Math.abs(values[i]-values[i-1]));
  const lagPairs=values.slice(1).map((value,index)=>({left:values[index],right:value}));
  const half=Math.floor(values.length/2),first=values.slice(0,half),second=values.slice(half),firstMean=first.length?mean(first):null,secondMean=second.length?mean(second):null;
  return {n:values.length,current:values.at(-1),mean:mean(values),lag1:pearsonPairs(lagPairs),p95AbsDelta:quantile(deltas,.95),extremeShare:values.filter(value=>value<=24||value>=76).length/values.length,firstMean,secondMean,meanShift:finite(firstMean)&&finite(secondMean)?secondMean-firstMean:null};
}

export function buildCompositeSeries(axisSeries,weights){
  const names=Object.keys(weights??{}),maps=Object.fromEntries(names.map(name=>[name,new Map((axisSeries?.[name]??[]).map(row=>[row.date,row.score]))]));
  if(!names.length)return [];
  const dateSets=names.map(name=>new Set(maps[name].keys()));
  const dates=[...dateSets[0]].filter(date=>dateSets.every(set=>set.has(date))).sort();
  return dates.map(date=>({date,score:names.reduce((sum,name)=>sum+Number(weights[name])*maps[name].get(date),0)}));
}

export function currentComposite(axisScores,weights){
  let score=0;
  for(const [name,weight] of Object.entries(weights??{})){const value=Number(axisScores?.[name]);if(!finite(value))return null;score+=Number(weight)*value;}
  return score;
}

export function rankCorrelationByKey(left,right){
  const keys=Object.keys(left??{}).filter(key=>finite(left[key])&&finite(right?.[key])).sort();
  if(keys.length<3)return null;
  const rx=ranks(keys.map(key=>left[key])),ry=ranks(keys.map(key=>right[key]));
  return pearsonPairs(rx.map((value,index)=>({left:value,right:ry[index]})));
}
