"use client";
import "./inflation-mini-chart-r1.css";

export type InflationMiniTrendPoint={date:string;value:number};

const WIDTH=112;
const HEIGHT=32;
const PAD_X=3;
const PAD_Y=3;
const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);

function cleaned(points:InflationMiniTrendPoint[]|undefined){
 return (Array.isArray(points)?points:[])
  .filter(point=>typeof point?.date==="string"&&finite(point?.value))
  .sort((a,b)=>a.date.localeCompare(b.date));
}
function pathFor(points:InflationMiniTrendPoint[]){
 const times=points.map((point,index)=>{
  const time=Date.parse(`${point.date}T00:00:00Z`);
  return Number.isFinite(time)?time:index;
 });
 const minX=Math.min(...times),maxX=Math.max(...times),rangeX=maxX-minX||1;
 const values=points.map(point=>point.value),minValue=Math.min(...values),maxValue=Math.max(...values);
 const rawRange=maxValue-minValue;
 const yPad=rawRange>0?rawRange*.12:Math.max(Math.abs(maxValue),1)*.02;
 const minY=minValue-yPad,maxY=maxValue+yPad,rangeY=maxY-minY||1;
 return points.map((point,index)=>{
  const x=PAD_X+(WIDTH-PAD_X*2)*(times[index]-minX)/rangeX;
  const y=PAD_Y+(HEIGHT-PAD_Y*2)*(1-(point.value-minY)/rangeY);
  return `${index===0?"M":"L"}${x.toFixed(2)} ${y.toFixed(2)}`;
 }).join(" ");
}

export function InflationMiniChart({label,points}:{label:string;points?:InflationMiniTrendPoint[]}){
 const data=cleaned(points);
 if(data.length<2)return <span className="inflation-mini-chart-empty" aria-label={`${label} 최근 1년 추이 자료 부족`}>—</span>;
 return <svg className="inflation-mini-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`${label} 최근 1년 추이`}>
  <path className="inflation-mini-chart-line" d={pathFor(data)}/>
 </svg>;
}
