// Private adaptive ETF scoring candidate. Never writes prices, D1, feeds or schedules.
// Keeps R188's 40:20:40 axes, metric weights and 252-session midrank when possible.
// Shorter histories use only real observed metrics with their remaining weights renormalized.
const WINDOW=252;
const MIN_RANK_SAMPLES=20;
const SPECS={
 trend:[['m125',.5,false],['r60',.3,false],['r20',.2,false]],
 relativeStrength:[['rs20',.25,false],['rs60',.45,false],['rs125',.3,false]],
 volatility:[['rv20',.4,true],['dsv20',.35,true],['dd63',.25,false]]
};
const AXIS_WEIGHTS={trend:.4,relativeStrength:.2,volatility:.4};
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const mean=values=>values.reduce((total,x)=>total+x,0)/values.length;
const std=values=>{const m=mean(values);return Math.sqrt(mean(values.map(v=>(v-m)**2)));};

export function scoreAdaptiveTimeline(rows){
 if(!Array.isArray(rows)||rows.some((row,i)=>
  typeof row?.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||
  !Number.isFinite(Date.parse(row.date+'T00:00:00Z'))||
  new Date(row.date+'T00:00:00Z').toISOString().slice(0,10)!==row.date||
  (i>0&&row.date<=rows[i-1].date)||
  (row.own!==null&&!valid(row.own))||(row.spy!==null&&!valid(row.spy)))){
  throw Object.assign(new Error('ADAPTIVE_INVALID_REAL_SESSION_ROWS'),{code:'ADAPTIVE_INVALID_REAL_SESSION_ROWS'});
 }
 const own=rows.map(x=>x.own),spy=rows.map(x=>x.spy),n=rows.length;
 const metrics=Array.from({length:n},()=>({}));
 const validRange=(start,end)=>start>=0&&own.slice(start,end+1).every(valid);
 for(let i=0;i<n;i++){
  if(!valid(own[i]))continue;
  const row=metrics[i];
  if(validRange(i-20,i)){
   row.r20=own[i]/own[i-20]-1;
   const returns=[];
   for(let j=i-19;j<=i;j++)returns.push(own[j]/own[j-1]-1);
   row.rv20=std(returns)*Math.sqrt(252);
   row.dsv20=Math.sqrt(252*mean(returns.map(r=>Math.min(r,0)**2)));
  }
  if(validRange(i-60,i))row.r60=own[i]/own[i-60]-1;
  if(validRange(i-62,i))row.dd63=own[i]/Math.max(...own.slice(i-62,i+1))-1;
  if(validRange(i-124,i))row.m125=own[i]/mean(own.slice(i-124,i+1))-1;
  for(const span of [20,60,125]){
   if(i>=span&&valid(own[i-span])&&valid(spy[i])&&valid(spy[i-span])&&validRange(i-span,i)){
    row['rs'+span]=(own[i]/own[i-span]-1)-(spy[i]/spy[i-span]-1);
   }
  }
 }
 return rows.map((row,i)=>{
  const axes={},activeMetrics={},samples={};
  for(const [axis,spec] of Object.entries(SPECS)){
   const available=[];
   for(const [key,weight,inverted] of spec){
    const current=metrics[i][key];
    if(!Number.isFinite(current))continue;
    const window=metrics.slice(Math.max(0,i-WINDOW+1),i+1)
     .map(values=>values[key]).filter(Number.isFinite);
    if(window.length<MIN_RANK_SAMPLES)continue;
    const below=window.filter(v=>v<current).length;
    const equals=window.filter(v=>v===current).length;
    const rank=100*(below+.5*equals)/window.length;
    available.push({key,weight,value:inverted?100-rank:rank});
    samples[key]=window.length;
   }
   activeMetrics[axis]=available.map(entry=>entry.key);
   if(!available.length)continue;
   const totalWeight=available.reduce((total,entry)=>total+entry.weight,0);
   axes[axis]=available.reduce((total,entry)=>total+entry.value*entry.weight,0)/totalWeight;
  }
  const complete=Object.keys(axes).length===3&&valid(row.own)&&valid(row.spy);
  if(!complete)return {date:row.date,score:null,status:'INSUFFICIENT_REAL_OBSERVATIONS',
   activeMetrics,samples};
  const value=axes.trend*AXIS_WEIGHTS.trend+
   axes.relativeStrength*AXIS_WEIGHTS.relativeStrength+
   axes.volatility*AXIS_WEIGHTS.volatility;
  if(!Number.isFinite(value)||value<0||value>100)throw Error('ADAPTIVE_BAD_SCORE');
  const parity=Object.values(SPECS).every(spec=>spec.every(([key])=>samples[key]===WINDOW));
  return {date:row.date,score:value,status:parity?'R188_COMPATIBLE':'ADAPTIVE_PROVISIONAL',
   activeMetrics,samples};
 });
}
