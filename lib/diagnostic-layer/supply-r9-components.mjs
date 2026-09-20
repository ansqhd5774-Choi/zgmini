import {supplyShockSafety} from './model.mjs';
import {normalizeRows} from './series-math.mjs';
import {buildGscpiScore} from './nyfed-worldbank-components.mjs';

const finite=value=>typeof value==='number'&&Number.isFinite(value);

function monthKey(date){
  return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?date.slice(0,7):null;
}
function shiftMonth(month,delta){
  const m=/^(\d{4})-(\d{2})$/.exec(month??'');if(!m)return null;
  const total=Number(m[1])*12+Number(m[2])-1+delta,y=Math.floor(total/12),mo=total-y*12+1;
  return `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}`;
}
function lastByMonth(rows){
  const map=new Map();
  for(const row of normalizeRows(rows))map.set(monthKey(row.observationDate),row.value);
  return map;
}
function safeLogRatio(a,b){return a>0&&b>0?Math.log(a/b):null;}
function trailingPercentile(values,index,{lookback=240,minValid=60,inverse=false}={}){
  const current=values[index];if(!finite(current))return null;
  const start=Math.max(0,index-lookback+1);
  const ref=values.slice(start,index+1).filter(finite);
  if(ref.length<minValid)return null;
  let lower=0,equal=0;
  for(const value of ref){if(value<current)lower++;else if(value===current)equal++;}
  const rank=(lower+0.5*equal)/ref.length;
  return 100*(inverse?1-rank:rank);
}

export function buildSupplyShockR9({
  gscpi=[],
  wti=[],
  gasoline=[],
  copper=[],
  industrialProduction=[],
  headlineCpi=[],
  coreCpi=[],
} = {}){
  const gscpiScored=buildGscpiScore(gscpi).score;
  const gscpiMap=new Map(gscpiScored.map(row=>[monthKey(row.observationDate),row.value]));
  const w=lastByMonth(wti),g=lastByMonth(gasoline),cu=lastByMonth(copper),
    ip=lastByMonth(industrialProduction),cpi=lastByMonth(headlineCpi),core=lastByMonth(coreCpi);
  const months=[...new Set([...w.keys(),...g.keys(),...cu.keys(),...ip.keys(),...cpi.keys(),...core.keys(),...gscpiMap.keys()])].filter(Boolean).sort();

  const raw=months.map(month=>{
    const oil= w.get(month), oil1=w.get(shiftMonth(month,-1)), oil3=w.get(shiftMonth(month,-3));
    const gas= g.get(month), gas1=g.get(shiftMonth(month,-1)), gas3=g.get(shiftMonth(month,-3));
    const cop= cu.get(month), cop1=cu.get(shiftMonth(month,-1)), cop3=cu.get(shiftMonth(month,-3));
    const ipv=ip.get(month), ip3=ip.get(shiftMonth(month,-3));
    const c=cpi.get(month), c12=cpi.get(shiftMonth(month,-12));
    const cc=core.get(month), cc12=core.get(shiftMonth(month,-12));
    const oilShock=[safeLogRatio(oil,oil1),safeLogRatio(oil,oil3)].every(finite)?Math.max(0,safeLogRatio(oil,oil1),safeLogRatio(oil,oil3)):null;
    const gasolineShock=[safeLogRatio(gas,gas1),safeLogRatio(gas,gas3)].every(finite)?Math.max(0,safeLogRatio(gas,gas1),safeLogRatio(gas,gas3)):null;
    const copperShock=[safeLogRatio(cop,cop1),safeLogRatio(cop,cop3)].every(finite)?Math.max(0,safeLogRatio(cop,cop1),safeLogRatio(cop,cop3)):null;
    const ip3m=ipv>0&&ip3>0?100*((ipv/ip3)**4-1):null;
    const cpiYoy=c>0&&c12>0?100*(c/c12-1):null;
    const coreYoy=cc>0&&cc12>0?100*(cc/cc12-1):null;
    const headlineCoreGap=finite(cpiYoy)&&finite(coreYoy)?cpiYoy-coreYoy:null;
    return {month,observationDate:`${month}-01`,oilShock,gasolineShock,copperShock,industrialProduction3mAnn:ip3m,headlineCoreGap};
  });

  const arrays={
    oil:raw.map(row=>row.oilShock),
    gasoline:raw.map(row=>row.gasolineShock),
    copper:raw.map(row=>row.copperShock),
    ip:raw.map(row=>row.industrialProduction3mAnn),
    gap:raw.map(row=>row.headlineCoreGap),
  };

  const rows=raw.map((row,index)=>{
    const scores={
      gscpi:gscpiMap.get(row.month)??null,
      oilShock:trailingPercentile(arrays.oil,index,{lookback:240,minValid:60,inverse:true}),
      gasolineShock:trailingPercentile(arrays.gasoline,index,{lookback:240,minValid:60,inverse:true}),
      copperShock:trailingPercentile(arrays.copper,index,{lookback:240,minValid:60,inverse:true}),
      industrialProduction:trailingPercentile(arrays.ip,index,{lookback:240,minValid:60,inverse:false}),
      headlineCoreGap:trailingPercentile(arrays.gap,index,{lookback:240,minValid:60,inverse:true}),
    };
    const final=supplyShockSafety(scores);
    return {
      ...row,
      gscpiScore:scores.gscpi,
      oilScore:scores.oilShock,
      gasolineScore:scores.gasolineShock,
      copperScore:scores.copperShock,
      industrialProductionScore:scores.industrialProduction,
      headlineCoreGapScore:scores.headlineCoreGap,
      status:final.status,
      score:final.score,
      missing:final.missing,
    };
  });

  return {
    status:rows.length&&rows.at(-1)?.status==='READY'?'READY_CURRENT_VINTAGE':'PARTIAL',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    percentileContract:'TRAILING_240_MONTHLY_EXPANDING_UNTIL_FULL_MIN60',
    rows,
  };
}
