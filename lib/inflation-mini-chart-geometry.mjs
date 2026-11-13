// Shared by the 12-domain economic indicators and Inflation R2 mini charts.
const DAY=/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH=/^\d{4}-(0[1-9]|1[0-2])$/;
const WIDTH=112,HEIGHT=32,PAD_X=3,PAD_Y=3;
const finite=value=>typeof value==='number'&&Number.isFinite(value);

/** @typedef {{date:string,value:number,breakBefore?:boolean}} MiniTrendPoint */
/** Return null rather than silently interpreting a malformed date as an array index. */
export function miniTrendTimestamp(date){
 if(typeof date!=='string')return null;
 const day=MONTH.test(date)?date+'-01':date;
 if(!DAY.test(day))return null;
 const time=Date.parse(day+'T00:00:00Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===day?time:null;
}

/** @param {MiniTrendPoint[]|null|undefined} points */
export function cleanInflationMiniTrend(points){
 return (Array.isArray(points)?points:[])
  .filter(point=>miniTrendTimestamp(point?.date)!==null&&finite(point?.value))
  .sort((a,b)=>a.date.localeCompare(b.date));
}

/** @param {MiniTrendPoint[]} points */
export function inflationMiniChartPath(points){
 if(!Array.isArray(points)||points.length<2)return '';
 const times=points.map(point=>miniTrendTimestamp(point?.date));
 if(times.some(time=>time===null)||points.some(point=>!finite(point?.value)))return '';
 const minX=Math.min(...times),maxX=Math.max(...times),rangeX=maxX-minX||1;
 const values=points.map(point=>point.value),minValue=Math.min(...values),maxValue=Math.max(...values);
 const rawRange=maxValue-minValue;
 const yPad=rawRange>0?rawRange*.12:Math.max(Math.abs(maxValue),1)*.02;
 const minY=minValue-yPad,maxY=maxValue+yPad,rangeY=maxY-minY||1;
 return points.map((point,index)=>{
  const x=PAD_X+(WIDTH-PAD_X*2)*(times[index]-minX)/rangeX;
  const y=PAD_Y+(HEIGHT-PAD_Y*2)*(1-(point.value-minY)/rangeY);
  return `${index===0||point.breakBefore?'M':'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
 }).join(' ');
}
